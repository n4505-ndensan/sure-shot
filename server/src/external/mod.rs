pub mod events;
pub mod ping;
pub mod send;

use crate::AppState;
use axum::Router;
use std::net::IpAddr;
use tower_http::cors::CorsLayer;

pub fn create_external_router(app_state: AppState, ip: IpAddr) -> Router {
    let router = Router::new();

    // 各ルートハンドラーを適用
    let router = ping::external_ping(router, app_state.clone());
    let router = events::external_events(router, app_state.clone());
    let router = send::external_send_message(router, app_state.clone(), ip);

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
