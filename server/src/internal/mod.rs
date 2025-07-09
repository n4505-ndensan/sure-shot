pub mod nickname;

use crate::{AppState, ServerInfo, check_available_ips, ping_servers_by_ip};
use axum::{Json, Router, routing};
use std::net::IpAddr;
use tower_http::cors::CorsLayer;

pub fn internal_available_ips(router: routing::Router, ip: IpAddr) -> routing::Router {
    router.route("/available_ips", {
        let ip = ip.clone();
        routing::get(move || {
            let ip = ip.clone();
            async move {
                let available_ips = check_available_ips(ip, 8000).await;

                #[derive(serde::Serialize)]
                struct IpCheckResponse {
                    available_ips: Vec<String>,
                    total_checked: u16,
                    subnet: String,
                }

                let subnet = if let IpAddr::V4(ipv4) = ip {
                    let octets = ipv4.octets();
                    format!("{}.{}.{}.0/24", octets[0], octets[1], octets[2])
                } else {
                    "unknown".to_string()
                };

                let response = IpCheckResponse {
                    available_ips: available_ips.iter().map(|ip| ip.to_string()).collect(),
                    total_checked: 254,
                    subnet,
                };
                Json(response)
            }
        })
    })
}

pub fn internal_ping_servers(router: routing::Router, ip: IpAddr) -> routing::Router {
    router.route("/ping_servers", {
        let ip = ip.clone();
        routing::get(move || {
            let ip = ip.clone();
            async move {
                // まず利用可能なIPアドレスをチェック
                let available_ips = check_available_ips(ip, 8000).await;

                println!(
                    "{}: Available IPs: {:?} (total: {})",
                    ip,
                    available_ips,
                    available_ips.len()
                );

                // 各サーバーの/pingエンドポイントをチェック
                let server_infos = ping_servers_by_ip(available_ips, 8000, ip).await;

                println!("{}: Server infos: {:?}", ip, server_infos);

                #[derive(serde::Serialize)]
                struct PingServersResponse {
                    servers: Vec<ServerInfo>,
                    total_found: usize,
                }

                let response = PingServersResponse {
                    total_found: server_infos.len(),
                    servers: server_infos,
                };
                Json(response)
            }
        })
    })
}

pub fn internal_get_messages(router: routing::Router, app_state: AppState) -> routing::Router {
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

pub fn create_internal_router(app_state: AppState, ip: IpAddr) -> Router {
    let router = Router::new();

    // 各ルートハンドラーを適用
    let router = internal_available_ips(router, ip);
    let router = internal_ping_servers(router, ip);
    let router = internal_get_messages(router, app_state.clone());
    let router = nickname::internal_get_nickname(router, app_state.clone());
    let router = nickname::internal_update_nickname(router, app_state.clone());

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
