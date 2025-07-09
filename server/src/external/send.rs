use crate::{AppState, ReceivedMessage, SendMessageRequest, SendMessageResponse};
use axum::{Json, routing};
use std::net::IpAddr;

pub fn external_send_message(
    router: routing::Router,
    app_state: AppState,
    ip: IpAddr,
) -> routing::Router {
    router.route("/send", {
        let state = app_state.clone();
        routing::post(move |Json(request): Json<SendMessageRequest>| {
            let state = state.clone();
            async move {
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
                    Err(err) => SendMessageResponse {
                        success: false,
                        message: format!("Failed to send message: {}", err),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                    },
                };

                Json(response)
            }
        })
    })
}
