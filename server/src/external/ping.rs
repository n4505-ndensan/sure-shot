use crate::{AppState, PongResponse};
use axum::{Json, routing};

pub fn external_ping(router: routing::Router, app_state: AppState) -> routing::Router {
    router.route("/ping", {
        let state = app_state.clone();
        routing::get(move || {
            let state = state.clone();
            async move {
                let config = state.config.lock().await;
                let response = PongResponse {
                    message: "Pong".to_string(),
                    name: config.nickname.clone(),
                    is_self: true, // 自分自身からのレスポンス
                };
                Json(response)
            }
        })
    })
}
