use axum::{
    Router,
    extract::Json,
    response::Sse,
    response::sse::{Event, KeepAlive},
    routing::{get, post},
};
use local_ip_address::list_afinet_netifas;
use server::whoami::whoami;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};
use tokio_stream::{StreamExt, wrappers::BroadcastStream};
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
use std::fs;
use std::path::Path;
use typeshare::typeshare;

// メッセージ保持とSSE配信用の状態
#[derive(Clone)]
struct AppState {
    messages: Arc<Mutex<Vec<ReceivedMessage>>>,
    message_broadcaster: broadcast::Sender<ReceivedMessage>,
    config: Arc<Mutex<ServerConfig>>,
}

// サーバー設定
#[derive(Serialize, Deserialize, Clone)]
struct ServerConfig {
    nickname: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            nickname: whoami(), // デフォルトは端末のユーザー名
        }
    }
}

impl ServerConfig {
    fn load_or_create() -> Self {
        let config_path = "sure-shot-config.toml";

        if Path::new(config_path).exists() {
            match fs::read_to_string(config_path) {
                Ok(content) => match toml::from_str(&content) {
                    Ok(config) => return config,
                    Err(e) => eprintln!("Failed to parse config file: {}", e),
                },
                Err(e) => eprintln!("Failed to read config file: {}", e),
            }
        }

        // 設定ファイルが存在しないか読み込みに失敗した場合、デフォルト設定を作成
        let default_config = Self::default();
        if let Err(e) = default_config.save() {
            eprintln!("Failed to save default config: {}", e);
        }
        default_config
    }

    fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_content = toml::to_string_pretty(self)?;
        fs::write("sure-shot-config.toml", config_content)?;
        Ok(())
    }
}

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
async fn ping_servers_by_ip(ips: Vec<IpAddr>, port: u16, local_ip: IpAddr) -> Vec<ServerInfo> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    for ip in ips {
        let is_local = ip == local_ip;
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
                                is_self: is_local,
                            }),
                            Err(_) => Some(ServerInfo {
                                ip: ip.to_string(),
                                port,
                                status: "unknown".to_string(),
                                message: "Invalid response".to_string(),
                                name: "unknown".to_string(),
                                is_self: is_local,
                            }),
                        }
                    } else {
                        Some(ServerInfo {
                            ip: ip.to_string(),
                            port,
                            status: "error".to_string(),
                            message: format!("HTTP {}", response.status()),
                            name: "unknown".to_string(),
                            is_self: is_local,
                        })
                    }
                }
                _ => Some(ServerInfo {
                    ip: ip.to_string(),
                    port,
                    status: "unreachable".to_string(),
                    message: "Connection failed".to_string(),
                    name: "unknown".to_string(),
                    is_self: is_local,
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
        is_self: false, // 他の人から受信したメッセージとして扱う
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
#[typeshare]
struct PongResponse {
    message: String,
    name: String,
    is_self: bool,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
struct SendMessageRequest {
    to: String,           // 送信先のIP or 識別子
    message: String,      // メッセージ本文
    message_type: String, // メッセージタイプ（将来的に拡張用）
}

#[derive(Serialize, Deserialize)]
#[typeshare]
struct SendMessageResponse {
    success: bool,
    message: String,
    timestamp: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[typeshare]
struct ReceivedMessage {
    from: String,         // 送信元のIP
    from_name: String,    // 送信元の名前
    message: String,      // メッセージ本文
    message_type: String, // メッセージタイプ
    timestamp: String,    // 受信時刻
    is_self: bool,        // 自分のメッセージかどうか
}

#[derive(Serialize, Deserialize)]
#[typeshare]
struct ReceiveMessageResponse {
    success: bool,
    message: String,
    received_at: String,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
struct UpdateNicknameRequest {
    nickname: String,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
struct UpdateNicknameResponse {
    success: bool,
    message: String,
    old_nickname: String,
    new_nickname: String,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
struct GetNicknameResponse {
    nickname: String,
}

#[derive(Serialize)]
#[typeshare]
struct ServerInfo {
    ip: String,
    port: u16,
    status: String,
    message: String,
    name: String,
    is_self: bool,
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let Some(ip) = find_local_ip() else {
        println!("No local IP found");
        return;
    };
    println!("Found local IP: {}", ip);

    // アプリケーション状態の初期化
    let config = ServerConfig::load_or_create();
    println!("Using nickname: {}", config.nickname);

    let (message_broadcaster, _) = broadcast::channel(100);
    let app_state = AppState {
        messages: Arc::new(Mutex::new(Vec::new())),
        message_broadcaster,
        config: Arc::new(Mutex::new(config)),
    };

    let port = 8000;
    let external_addr = SocketAddr::new(ip, port);
    let internal_addr =
        SocketAddr::new(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)), port + 1);
    let localhost_addr = SocketAddr::new(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)), port);

    // 外部向けAPIサーバー (192.168.x.x:8000)
    let external_app = Router::new()
        .route("/ping", {
            let state = app_state.clone();
            get(move || {
                let state = state.clone();
                async move {
                    let config = state.config.lock().await;
                    let response = PongResponse {
                        message: "Pong".to_string(),
                        name: config.nickname.clone(),
                        is_self: true, // 自分自身からのレスポンス
                    };
                    axum::Json(response)
                }
            })
        })
        .route("/send", {
            let ip = ip.clone();
            let state = app_state.clone();
            post(move |Json(request): Json<SendMessageRequest>| {
                let ip = ip.clone();
                let state = state.clone();
                async move {
                    let config = state.config.lock().await;
                    let from_name = config.nickname.clone();
                    drop(config); // ロックを早期に解放

                    let from_ip = ip.to_string();

                    let result = send_message_to_server(
                        &request.to,
                        &from_ip,
                        &from_name,
                        &request.message,
                        &request.message_type,
                    )
                    .await;

                    // 送信成功時は自分のメッセージリストにも追加
                    if result.is_ok() {
                        let sent_message = ReceivedMessage {
                            from: from_ip.clone(),
                            from_name: from_name.clone(),
                            message: request.message.clone(),
                            message_type: request.message_type.clone(),
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            is_self: true, // 自分が送信したメッセージ
                        };

                        // 自分のメッセージリストに追加
                        {
                            let mut messages = state.messages.lock().await;
                            messages.push(sent_message.clone());

                            // 最新100件のみ保持
                            if messages.len() > 100 {
                                messages.remove(0);
                            }
                        }

                        // 自分のSSEクライアントにも配信
                        let _ = state.message_broadcaster.send(sent_message);
                    }

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
            let state = app_state.clone();
            let ip = ip.clone();
            post(move |Json(mut message): Json<ReceivedMessage>| {
                let state = state.clone();
                let ip = ip.clone();
                async move {
                    // 自分のIPと比較して is_self を設定
                    message.is_self = message.from == ip.to_string();

                    // メッセージをログに出力
                    println!(
                        "📨 Received message from {} ({}): {}",
                        message.from_name, message.from, message.message
                    );
                    println!(
                        "   Type: {}, Time: {}, Is Self: {}",
                        message.message_type, message.timestamp, message.is_self
                    );

                    // メッセージを保存
                    {
                        let mut messages = state.messages.lock().await;
                        messages.push(message.clone());

                        // 最新100件のみ保持
                        if messages.len() > 100 {
                            messages.remove(0);
                        }
                    }

                    // SSE経由でメッセージを配信
                    let _ = state.message_broadcaster.send(message);

                    let response = ReceiveMessageResponse {
                        success: true,
                        message: "Message received successfully".to_string(),
                        received_at: chrono::Utc::now().to_rfc3339(),
                    };

                    axum::Json(response)
                }
            })
        })
        .route("/messages", {
            let state = app_state.clone();
            get(move || {
                let state = state.clone();
                async move {
                    let messages = state.messages.lock().await;
                    axum::Json(messages.clone())
                }
            })
        })
        .route("/events", {
            let state = app_state.clone();
            get({
                let state = state.clone();
                || async move {
                    let receiver = state.message_broadcaster.subscribe();
                    let stream = BroadcastStream::new(receiver).filter_map(|msg| match msg {
                        Ok(message) => {
                            let json = serde_json::to_string(&message)
                                .unwrap_or_else(|_| "{}".to_string());
                            Some(Ok::<Event, std::convert::Infallible>(
                                Event::default().data(json),
                            ))
                        }
                        Err(_) => None,
                    });

                    Sse::new(stream).keep_alive(KeepAlive::default())
                }
            })
        })
        .route("/nickname", {
            let state = app_state.clone();
            get(move || {
                let state = state.clone();
                async move {
                    let config = state.config.lock().await;
                    let response = GetNicknameResponse {
                        nickname: config.nickname.clone(),
                    };
                    axum::Json(response)
                }
            })
        })
        .route("/update-nickname", {
            let state = app_state.clone();
            post(move |Json(request): Json<UpdateNicknameRequest>| {
                let state = state.clone();
                async move {
                    let mut config = state.config.lock().await;
                    let old_nickname = config.nickname.clone();

                    // ニックネームを更新
                    config.nickname = request.nickname.clone();

                    // 設定をファイルに保存
                    let save_result = config.save();

                    let response = match save_result {
                        Ok(()) => UpdateNicknameResponse {
                            success: true,
                            message: "Nickname updated successfully".to_string(),
                            old_nickname,
                            new_nickname: request.nickname,
                        },
                        Err(err) => UpdateNicknameResponse {
                            success: false,
                            message: format!("Failed to save nickname: {}", err),
                            old_nickname: old_nickname.clone(),
                            new_nickname: old_nickname,
                        },
                    };

                    axum::Json(response)
                }
            })
        })
        .layer(
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
        );

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
                    let server_infos = ping_servers_by_ip(available_ips, 8000, ip).await;

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
    println!(
        "Localhost API listening on http://{} (localhost only)",
        localhost_addr
    );

    // 3つのサーバーを並行して起動
    let external_listener = tokio::net::TcpListener::bind(external_addr).await.unwrap();
    let internal_listener = tokio::net::TcpListener::bind(internal_addr).await.unwrap();
    let localhost_listener = tokio::net::TcpListener::bind(localhost_addr).await.unwrap();

    let external_serve = axum::serve(external_listener, external_app.clone());
    let internal_serve = axum::serve(internal_listener, internal_app);
    let localhost_serve = axum::serve(localhost_listener, external_app);

    // 全てのサーバーを同時に実行
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
        result = localhost_serve => {
            if let Err(e) = result {
                eprintln!("Localhost server error: {}", e);
            }
        }
    }
}
