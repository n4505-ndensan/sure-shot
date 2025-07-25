use super::verify_token;
use crate::AppState;
use axum::{
    Json,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing,
};

pub fn external_get_messages(router: routing::Router, app_state: AppState) -> routing::Router {
    router.route("/messages", {
        let state = app_state.clone();
        routing::get(move |headers: HeaderMap| {
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
                            Some(_) => {
                                // 認証成功、メッセージを返却
                                // データベースから最新のメッセージを取得
                                match state.message_store.get_recent_messages(100).await {
                                    Ok(messages) => {
                                        (StatusCode::OK, Json(messages)).into_response()
                                    }
                                    Err(e) => {
                                        eprintln!("Failed to get messages from database: {}", e);
                                        // フォールバック: メモリ内のメッセージを返す
                                        let messages = state.messages.lock().await;
                                        (StatusCode::OK, Json(messages.clone())).into_response()
                                    }
                                }
                            }
                            None => {
                                // 無効なトークン
                                (StatusCode::UNAUTHORIZED, Json("Invalid or expired token"))
                                    .into_response()
                            }
                        }
                    }
                    None => {
                        // トークンが提供されていない
                        (StatusCode::UNAUTHORIZED, Json("Token required")).into_response()
                    }
                }
            }
        })
    })
}
