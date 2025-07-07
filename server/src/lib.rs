pub mod external;
pub mod internal;
pub mod whoami;

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};
use typeshare::typeshare;

// メッセージ保持とSSE配信用の状態
#[derive(Clone)]
pub struct AppState {
    pub messages: Arc<Mutex<Vec<ReceivedMessage>>>,
    pub message_broadcaster: broadcast::Sender<ReceivedMessage>,
    pub config: Arc<Mutex<ServerConfig>>,
}

// サーバー設定
#[derive(Serialize, Deserialize, Clone)]
pub struct ServerConfig {
    pub nickname: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            nickname: whoami::whoami().unwrap_or_else(|_| "Unknown".to_string()),
        }
    }
}

impl ServerConfig {
    pub fn load_or_create() -> Self {
        let config_path = "sure-shot-config.toml";
        use std::fs;
        use std::path::Path;

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

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_content = toml::to_string_pretty(self)?;
        std::fs::write("sure-shot-config.toml", config_content)?;
        Ok(())
    }
}

// API 応答の型定義
#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct PongResponse {
    pub message: String,
    pub name: String,
    pub is_self: bool,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct SendMessageRequest {
    pub to: String,
    pub message: String,
    pub message_type: String,
    pub attachments: Vec<Attachment>,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct SendMessageResponse {
    pub success: bool,
    pub message: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[typeshare]
pub struct ReceivedMessage {
    pub from: String,
    pub from_name: String,
    pub message: String,
    pub message_type: String,
    pub timestamp: String,
    pub is_self: bool,
    pub attachments: Vec<Attachment>,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct ReceiveMessageResponse {
    pub success: bool,
    pub message: String,
    pub received_at: String,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct UpdateNicknameRequest {
    pub nickname: String,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct UpdateNicknameResponse {
    pub success: bool,
    pub message: String,
    pub old_nickname: String,
    pub new_nickname: String,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct GetNicknameResponse {
    pub nickname: String,
}

#[derive(Serialize)]
#[typeshare]
pub struct ServerInfo {
    pub ip: String,
    pub port: u16,
    pub status: String,
    pub message: String,
    pub name: String,
    pub is_self: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[typeshare]
pub struct Attachment {
    pub id: String,
    pub filename: String,
    pub mime_type: String,
    #[typeshare(serialized_as = "number")]
    pub size: u64,
    pub data: String,
    pub thumbnail: Option<String>,
}

// ユーティリティ関数
use local_ip_address::list_afinet_netifas;
use std::net::IpAddr;

pub fn find_local_ip() -> Option<IpAddr> {
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

// サブネット内のIPアドレスをチェックする関数
pub async fn check_available_ips(local_ip: IpAddr, port: u16) -> Vec<IpAddr> {
    use futures::future::join_all;
    use std::net::SocketAddr;
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
pub async fn ping_servers_by_ip(ips: Vec<IpAddr>, port: u16, local_ip: IpAddr) -> Vec<ServerInfo> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    for ip in ips {
        let is_local = ip == local_ip;
        let task = tokio::spawn(async move {
            let client = reqwest::Client::new();
            let url = format!("http://{}:{}/ping", ip, port);

            let result =
                tokio::time::timeout(Duration::from_millis(1000), client.get(&url).send()).await;

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
pub async fn send_message_to_server(
    target_ip: &str,
    from_ip: &str,
    from_name: &str,
    message: &str,
    message_type: &str,
    attachments: &[Attachment],
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("http://{}:8000/receive", target_ip);

    let payload = ReceivedMessage {
        from: from_ip.to_string(),
        from_name: from_name.to_string(),
        message: message.to_string(),
        message_type: message_type.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        is_self: false,
        attachments: attachments.to_vec(),
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

// 全サーバーにメッセージを送信する関数
pub async fn send_message_to_all_servers(
    local_ip: IpAddr,
    from_ip: &str,
    from_name: &str,
    message: &str,
    message_type: &str,
    attachments: &[Attachment],
) -> Result<Vec<String>, String> {
    // まず利用可能なIPアドレスをチェック
    let available_ips = check_available_ips(local_ip, 8000).await;

    // 各サーバーの/pingエンドポイントをチェックして、アクティブなサーバーのみ取得
    let server_infos = ping_servers_by_ip(available_ips, 8000, local_ip).await;

    // 自分以外のアクティブなサーバーを抽出
    let other_servers: Vec<_> = server_infos
        .iter()
        .filter(|info| !info.is_self && info.status == "active")
        .collect();

    // if other_servers.is_empty() {
    //     return Err("No other active servers found".to_string());
    // }

    // 各サーバーにメッセージを送信
    let mut successful_sends = Vec::new();
    let mut failed_sends = Vec::new();

    for server in other_servers {
        let result = send_message_to_server(
            &server.ip,
            from_ip,
            from_name,
            message,
            message_type,
            attachments,
        )
        .await;

        match result {
            Ok(()) => successful_sends.push(server.ip.clone()),
            Err(err) => failed_sends.push(format!("{}: {}", server.ip, err)),
        }
    }

    if successful_sends.is_empty() {
        Err(format!(
            "Failed to send to all servers: {}",
            failed_sends.join(", ")
        ))
    } else if failed_sends.is_empty() {
        Ok(successful_sends)
    } else {
        // 部分的な成功
        Ok(successful_sends)
    }
}
