use axum::{
    Router,
    extract::Json,
    routing::{get, post},
};
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

use serde::{Deserialize, Serialize};

// サブネット内のIPアドレスをチェックする関数
async fn check_available_ips(local_ip: IpAddr, port: u16) -> Vec<IpAddr> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    // 現在のIPアドレスから/24サブネットの範囲を計算
    if let IpAddr::V4(ipv4) = local_ip {
        let octets = ipv4.octets();
        let base_ip = [octets[0], octets[1], octets[2], 0];

        // サブネット内の全IPアドレス（1-254）をチェック
        for host in 1..=254 {
            let target_ip = IpAddr::V4(std::net::Ipv4Addr::new(
                base_ip[0], base_ip[1], base_ip[2], host,
            ));

            let task = tokio::spawn(async move {
                let addr = SocketAddr::new(target_ip, port);
                let result = tokio::time::timeout(
                    Duration::from_millis(100),
                    tokio::net::TcpStream::connect(addr),
                )
                .await;

                match result {
                    Ok(Ok(_)) => Some(target_ip),
                    _ => None,
                }
            });
            tasks.push(task);
        }
    }

    let results = join_all(tasks).await;
    let mut available_ips = Vec::new();

    for result in results {
        if let Ok(Some(ip)) = result {
            available_ips.push(ip);
        }
    }

    available_ips
}

// 各IPの/pingエンドポイントをチェックする関数
async fn ping_servers_by_ip(ips: Vec<IpAddr>, port: u16) -> Vec<ServerInfo> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    for ip in ips {
        let task = tokio::spawn(async move {
            let client = reqwest::Client::new();
            let url = format!("http://{}:{}/ping", ip, port);

            let result =
                tokio::time::timeout(Duration::from_millis(500), client.get(&url).send()).await;

            match result {
                Ok(Ok(response)) => {
                    if response.status().is_success() {
                        match response.json::<PongResponse>().await {
                            Ok(pong) => Some(ServerInfo {
                                ip: ip.to_string(),
                                port,
                                status: "active".to_string(),
                                message: pong.message,
                                name: pong.name,
                            }),
                            Err(_) => Some(ServerInfo {
                                ip: ip.to_string(),
                                port,
                                status: "unknown".to_string(),
                                message: "Invalid response".to_string(),
                                name: "unknown".to_string(),
                            }),
                        }
                    } else {
                        Some(ServerInfo {
                            ip: ip.to_string(),
                            port,
                            status: "error".to_string(),
                            message: format!("HTTP {}", response.status()),
                            name: "unknown".to_string(),
                        })
                    }
                }
                _ => Some(ServerInfo {
                    ip: ip.to_string(),
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

// メッセージ送信機能
async fn send_message_to_server(
    target_ip: &str,
    from_ip: &str,
    from_name: &str,
    message: &str,
    message_type: &str,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:8000/receive", target_ip);

    let payload = ReceivedMessage {
        from: from_ip.to_string(),
        from_name: from_name.to_string(),
        message: message.to_string(),
        message_type: message_type.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    let result = tokio::time::timeout(
        std::time::Duration::from_millis(5000),
        client.post(&url).json(&payload).send(),
    )
    .await;

    match result {
        Ok(Ok(response)) => {
            if response.status().is_success() {
                Ok(())
            } else {
                Err(format!("HTTP error: {}", response.status()))
            }
        }
        Ok(Err(e)) => Err(format!("Request error: {}", e)),
        Err(_) => Err("Request timeout".to_string()),
    }
}

#[derive(Serialize, Deserialize)]
struct PongResponse {
    message: String,
    name: String,
}

#[derive(Serialize, Deserialize)]
struct SendMessageRequest {
    to: String,           // 送信先のIP or 識別子
    message: String,      // メッセージ本文
    message_type: String, // メッセージタイプ（将来的に拡張用）
}

#[derive(Serialize, Deserialize)]
struct SendMessageResponse {
    success: bool,
    message: String,
    timestamp: String,
}

#[derive(Serialize, Deserialize)]
struct ReceivedMessage {
    from: String,         // 送信元のIP
    from_name: String,    // 送信元の名前
    message: String,      // メッセージ本文
    message_type: String, // メッセージタイプ
    timestamp: String,    // 受信時刻
}

#[derive(Serialize, Deserialize)]
struct ReceiveMessageResponse {
    success: bool,
    message: String,
    received_at: String,
}

#[derive(Serialize)]
struct ServerInfo {
    ip: String,
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
    let external_addr = SocketAddr::new(ip, port);
    let internal_addr =
        SocketAddr::new(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)), port + 1);

    // 外部向けAPIサーバー (192.168.x.x:8000)
    let external_app = Router::new()
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
        .route("/send", {
            let ip = ip.clone();
            post(move |Json(request): Json<SendMessageRequest>| {
                let ip = ip.clone();
                async move {
                    let from_name = whoami();
                    let from_ip = ip.to_string();

                    let result = send_message_to_server(
                        &request.to,
                        &from_ip,
                        &from_name,
                        &request.message,
                        &request.message_type,
                    )
                    .await;

                    let response = match result {
                        Ok(()) => SendMessageResponse {
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

                    axum::Json(response)
                }
            })
        })
        .route("/receive", {
            post(|Json(message): Json<ReceivedMessage>| async move {
                // 現在は受信したメッセージをログに出力
                println!(
                    "📨 Received message from {} ({}): {}",
                    message.from_name, message.from, message.message
                );
                println!(
                    "   Type: {}, Time: {}",
                    message.message_type, message.timestamp
                );

                let response = ReceiveMessageResponse {
                    success: true,
                    message: "Message received successfully".to_string(),
                    received_at: chrono::Utc::now().to_rfc3339(),
                };

                axum::Json(response)
            })
        })
        .layer(CorsLayer::new().allow_origin(axum::http::HeaderValue::from_static("*")));

    // 内部管理APIサーバー (localhost:8001)
    let internal_app = Router::new()
        .route("/available_ips", {
            let ip = ip.clone();
            get(move || {
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
                    axum::Json(response)
                }
            })
        })
        .route("/ping_servers", {
            let ip = ip.clone();
            get(move || {
                let ip = ip.clone();
                async move {
                    // まず利用可能なIPアドレスをチェック
                    let available_ips = check_available_ips(ip, 8000).await;

                    // 各サーバーの/pingエンドポイントをチェック
                    let server_infos = ping_servers_by_ip(available_ips, 8000).await;

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

    println!(
        "External API listening on http://{} (accessible from network)",
        external_addr
    );
    println!(
        "Internal API listening on http://{} (localhost only)",
        internal_addr
    );

    // 両方のサーバーを並行して起動
    let external_listener = tokio::net::TcpListener::bind(external_addr).await.unwrap();
    let internal_listener = tokio::net::TcpListener::bind(internal_addr).await.unwrap();

    let external_serve = axum::serve(external_listener, external_app);
    let internal_serve = axum::serve(internal_listener, internal_app);

    // 両方のサーバーを同時に実行
    tokio::select! {
        result = external_serve => {
            if let Err(e) = result {
                eprintln!("External server error: {}", e);
            }
        }
        result = internal_serve => {
            if let Err(e) = result {
                eprintln!("Internal server error: {}", e);
            }
        }
    }
}
