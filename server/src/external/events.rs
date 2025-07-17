use crate::AppState;
use axum::{
    response::Sse,
    response::sse::{Event, KeepAlive},
    routing,
};
use tokio_stream::{StreamExt, wrappers::BroadcastStream};

pub fn external_events(router: routing::Router, app_state: AppState) -> routing::Router {
    router.route("/events", {
        let state = app_state.clone();
        routing::get({
            let state = state.clone();
            || async move {
                // println!("New SSE client connected");
                let receiver = state.message_broadcaster.subscribe();
                let stream = BroadcastStream::new(receiver).filter_map(|msg| match msg {
                    Ok(message) => {
                        let json =
                            serde_json::to_string(&message).unwrap_or_else(|_| "{}".to_string());
                        // println!("Sending SSE message: {}", json);
                        Some(Ok::<Event, std::convert::Infallible>(
                            Event::default().data(json),
                        ))
                    }
                    Err(err) => {
                        // eprintln!("SSE broadcast error: {:?}", err);
                        None
                    }
                });

                Sse::new(stream).keep_alive(KeepAlive::default())
            }
        })
    })
}
