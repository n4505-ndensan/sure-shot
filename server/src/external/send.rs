use super::verify_token;
use crate::{AppState, ReceivedMessage, SendMessageRequest, SendMessageResponse};
use axum::{
    Json,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing,
};

pub fn external_send_message(router: routing::Router, app_state: AppState) -> routing::Router {
    router.route("/send", {
        let state = app_state.clone();
        routing::post(
            move |headers: HeaderMap, Json(request): Json<SendMessageRequest>| {
                let state = state.clone();
                async move {
                    // Authorizationヘッダーからトークンを取得
                    let token = headers
                        .get("authorization")
                        .and_then(|header| header.to_str().ok())
                        .and_then(|auth_str| {
                            if auth_str.starts_with("Bearer ") {
                                Some(&auth_str[7..])
                            } else {
                                None
                            }
                        });

                    match token {
                        Some(token) => {
                            // トークンの検証
                            match verify_token(token).await {
                                Some(_device_id) => {
                                    // 認証成功、メッセージ処理を続行
                                    let config = state.config.lock().await;
                                    drop(config); // ロックを早期に解放

                                    let from_name = request.from_name.clone();
                                    let from_ip = request.from_ip.clone();

                                    let sent_message = ReceivedMessage {
                                        from: from_ip.clone(), // クライアントのIP
                                        from_name: from_name.clone(),
                                        message: request.message.clone(),
                                        message_type: request.message_type.clone(),
                                        timestamp: chrono::Utc::now().to_rfc3339(),
                                        is_self: false, // 外部からの送信なのでfalse
                                        attachments: request.attachments.clone(),
                                    };

                                    // 自分のメッセージリストに追加
                                    {
                                        let mut messages = state.messages.lock().await;
                                        messages.push(sent_message.clone());

                                        // 最新100件のみ保持
                                        if messages.len() > 100 {
                                            messages.remove(0);
                                        }
                                    }

                                    // 自分のSSEクライアントにも配信
                                    let result = state.message_broadcaster.send(sent_message);

                                    let response = match result {
                                        Ok(_) => SendMessageResponse {
                                            success: true,
                                            message: "Message sent successfully".to_string(),
                                            timestamp: chrono::Utc::now().to_rfc3339(),
                                        },
                                        Err(tokio::sync::broadcast::error::SendError(_)) => {
                                            // 受信者がいない場合でも成功とみなす
                                            SendMessageResponse {
                                                success: true,
                                                message: "Message stored (no active receivers)"
                                                    .to_string(),
                                                timestamp: chrono::Utc::now().to_rfc3339(),
                                            }
                                        }
                                    };

                                    (StatusCode::OK, Json(response)).into_response()
                                }
                                None => {
                                    // 無効なトークン
                                    let response = SendMessageResponse {
                                        success: false,
                                        message: "Invalid or expired token".to_string(),
                                        timestamp: chrono::Utc::now().to_rfc3339(),
                                    };
                                    (StatusCode::UNAUTHORIZED, Json(response)).into_response()
                                }
                            }
                        }
                        None => {
                            // トークンが提供されていない
                            let response = SendMessageResponse {
                                success: false,
                                message: "Token required".to_string(),
                                timestamp: chrono::Utc::now().to_rfc3339(),
                            };
                            (StatusCode::UNAUTHORIZED, Json(response)).into_response()
                        }
                    }
                }
            },
        )
    })
}
