use axum::{Router, routing::get};
use local_ip_address::list_afinet_netifas;
use server::whoami::whoami;
use std::net::{IpAddr, SocketAddr};
use tower_http::cors::CorsLayer;

fn find_local_ip() -> Option<IpAddr> {
    let ifaces = list_afinet_netifas().ok()?;
    for (_name, ip) in ifaces {
        if let IpAddr::V4(ipv4) = ip {
            if ipv4.octets()[0] == 192 {
                return Some(IpAddr::V4(ipv4));
            }
        }
    }
    None
}

use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct PongResponse {
    message: String,
    name: String,
}

// ポートチェック用の共通関数
async fn check_open_ports(ip: IpAddr, port_range: std::ops::RangeInclusive<u16>) -> Vec<u16> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    for port in port_range {
        let addr = SocketAddr::new(ip, port);
        let task = tokio::spawn(async move {
            let result = tokio::time::timeout(
                Duration::from_millis(100),
                tokio::net::TcpStream::connect(addr),
            )
            .await;

            match result {
                Ok(Ok(_)) => Some(port),
                _ => None,
            }
        });
        tasks.push(task);
    }

    let results = join_all(tasks).await;
    let mut open_ports = Vec::new();

    for result in results {
        if let Ok(Some(port)) = result {
            open_ports.push(port);
        }
    }

    open_ports
}

// 各ポートの/pingエンドポイントをチェックする関数
async fn ping_servers(ip: IpAddr, ports: Vec<u16>) -> Vec<ServerInfo> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    for port in ports {
        let task = tokio::spawn(async move {
            let client = reqwest::Client::new();
            let url = format!("http://{}:{}/ping", ip, port);
            
            let result = tokio::time::timeout(
                Duration::from_millis(500),
                client.get(&url).send()
            ).await;

            match result {
                Ok(Ok(response)) => {
                    if response.status().is_success() {
                        match response.json::<PongResponse>().await {
                            Ok(pong) => Some(ServerInfo {
                                port,
                                status: "active".to_string(),
                                message: pong.message,
                                name: pong.name,
                            }),
                            Err(_) => Some(ServerInfo {
                                port,
                                status: "unknown".to_string(),
                                message: "Invalid response".to_string(),
                                name: "unknown".to_string(),
                            }),
                        }
                    } else {
                        Some(ServerInfo {
                            port,
                            status: "error".to_string(),
                            message: format!("HTTP {}", response.status()),
                            name: "unknown".to_string(),
                        })
                    }
                }
                _ => Some(ServerInfo {
                    port,
                    status: "unreachable".to_string(),
                    message: "Connection failed".to_string(),
                    name: "unknown".to_string(),
                }),
            }
        });
        tasks.push(task);
    }

    let results = join_all(tasks).await;
    let mut server_infos = Vec::new();

    for result in results {
        if let Ok(Some(info)) = result {
            server_infos.push(info);
        }
    }

    server_infos
}

#[derive(Serialize)]
struct ServerInfo {
    port: u16,
    status: String,
    message: String,
    name: String,
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let Some(ip) = find_local_ip() else {
        println!("No local IP found");
        return;
    };
    println!("Found local IP: {}", ip);

    let port = 8000;
    let addr = SocketAddr::new(ip, port);

    let app = Router::new()
        .route(
            "/ping",
            get(|| async {
                let username = whoami();
                let response = PongResponse {
                    message: "Pong".to_string(),
                    name: username,
                };
                axum::Json(response)
            }),
        )
        .route("/available_ports", {
            let ip = ip.clone();
            get(move || {
                let ip = ip.clone();
                async move {
                    let open_ports = check_open_ports(ip, 8000..=8009).await;

                    #[derive(serde::Serialize)]
                    struct PortCheckResponse {
                        open_ports: Vec<u16>,
                        total_checked: u16,
                    }

                    let response = PortCheckResponse {
                        open_ports,
                        total_checked: 10,
                    };
                    axum::Json(response)
                }
            })
        })
        .route("/ping_servers", {
            let ip = ip.clone();
            get(move || {
                let ip = ip.clone();
                async move {
                    // まず開いているポートをチェック
                    let open_ports = check_open_ports(ip, 8000..=8009).await;
                    
                    // 各サーバーの/pingエンドポイントをチェック
                    let server_infos = ping_servers(ip, open_ports).await;

                    #[derive(serde::Serialize)]
                    struct PingServersResponse {
                        servers: Vec<ServerInfo>,
                        total_found: usize,
                    }

                    let response = PingServersResponse {
                        total_found: server_infos.len(),
                        servers: server_infos,
                    };
                    axum::Json(response)
                }
            })
        })
        .layer(CorsLayer::new().allow_origin(axum::http::HeaderValue::from_static("*")));

    println!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", ip, port))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
