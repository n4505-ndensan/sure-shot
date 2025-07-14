pub mod auth;
pub mod events;
pub mod messages;
pub mod ping;
pub mod send;

// auth.rsから認証関数を再エクスポート
pub use auth::verify_token;

use crate::{AppState, ServerMessage};
use axum::{
    Router,
    extract::{Request, State},
    middleware::{self, Next},
    response::Response,
};
use std::time::Instant;
use tower_http::cors::CorsLayer;

pub fn create_external_router(app_state: AppState) -> Router {
    let router = Router::new();

    // 各ルートハンドラーを適用
    let router = ping::external_ping(router, app_state.clone());
    let router = auth::external_auth(router, app_state.clone());
    let router = events::external_events(router, app_state.clone());
    let router = messages::external_get_messages(router, app_state.clone());
    let router = send::external_send_message(router, app_state.clone());

    // APIログミドルウェアを追加
    let router = router.layer(middleware::from_fn_with_state(
        app_state.clone(),
        api_logger_middleware,
    ));

    // CORS設定を追加
    router.layer(
        CorsLayer::new()
            .allow_origin(axum::http::HeaderValue::from_static("*"))
            .allow_methods([
                axum::http::Method::GET,
                axum::http::Method::POST,
                axum::http::Method::OPTIONS,
            ])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::ACCEPT,
                axum::http::header::AUTHORIZATION,
            ]),
    )
}

// APIのリクエスト/レスポンスをログ記録するミドルウェア
async fn api_logger_middleware(
    State(app_state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let start_time = Instant::now();
    let method = request.method().clone();
    let path = request.uri().path().to_string();
    let query = request.uri().query().unwrap_or("").to_string();

    // リクエストの記録
    let request_log = if query.is_empty() {
        format!("→ {} {}", method, path)
    } else {
        format!("→ {} {}?{}", method, path, query)
    };

    if let Some(ref log_sender) = app_state.log_sender {
        let _ = log_sender.send(ServerMessage::Log(request_log));
    }

    // 次のハンドラーを実行
    let response = next.run(request).await;

    // レスポンスの記録
    let duration = start_time.elapsed();
    let status = response.status();
    let response_log = format!(
        "← {} {} -> {} ({:.2}ms)",
        method,
        path,
        status.as_u16(),
        duration.as_millis() as f64
    );

    if let Some(ref log_sender) = app_state.log_sender {
        let _ = log_sender.send(ServerMessage::Log(response_log));
    }

    response
}
