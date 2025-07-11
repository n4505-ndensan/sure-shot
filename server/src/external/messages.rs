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
                            Some(_device_id) => {
                                // 認証成功、メッセージを返却
                                let messages = state.messages.lock().await;
                                (StatusCode::OK, Json(messages.clone())).into_response()
                            }
                            None => {
                                // println!("Invalid or expired token: {}", token);
                                // 無効なトークン
                                (StatusCode::UNAUTHORIZED, Json("Invalid or expired token"))
                                    .into_response()
                            }
                        }
                    }
                    None => {
                        // println!("Token required");
                        // トークンが提供されていない
                        (StatusCode::UNAUTHORIZED, Json("Token required")).into_response()
                    }
                }
            }
        })
    })
}
