
use crate::{AppState};
use axum::{Json, routing};

pub fn external_get_messages(
    router: routing::Router,
    app_state: AppState,
) -> routing::Router {
    router.route("/messages", {
        let state = app_state.clone();
        routing::get(move || {
            let state = state.clone();
            async move {
                let messages = state.messages.lock().await;
                Json(messages.clone())
            }
        })
    })
}
