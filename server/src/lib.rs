pub mod external;
pub mod whoami;

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast, mpsc};
use typeshare::typeshare;

#[derive(Debug, Clone)]
pub enum ServerMessage {
    Log(String),
    StatusUpdate(ServerStatus),
}

#[derive(Debug, Clone)]
pub struct ServerStatus {
    pub state: ServerState,
    pub nickname: Option<String>,
    pub ip: Option<String>,
    pub port: Option<u16>,
}

#[derive(Debug, Clone)]
pub enum ServerState {
    Starting,
    Running,
    Stopped,
    Aborted,
    Error(String),
}

// メッセージ保持とSSE配信用の状態
#[derive(Clone)]
pub struct AppState {
    pub messages: Arc<Mutex<Vec<ReceivedMessage>>>,
    pub message_broadcaster: broadcast::Sender<ReceivedMessage>,
    pub config: Arc<Mutex<ServerConfig>>,
    pub log_sender: Option<mpsc::UnboundedSender<ServerMessage>>,
}

// サーバー設定
#[derive(Serialize, Deserialize, Clone)]
pub struct ServerConfig {
    pub nickname: String,
    pub password_hash: String,
    pub authorized_devices: HashSet<String>, // IPアドレス or デバイスID
    pub salt: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        use sha2::{Digest, Sha256};
        use uuid::Uuid;

        let salt = Uuid::new_v4().to_string();
        let default_password = "admin"; // デフォルトパスワード
        let mut hasher = Sha256::new();
        hasher.update(default_password.as_bytes());
        hasher.update(salt.as_bytes());
        let password_hash = hex::encode(hasher.finalize());

        Self {
            nickname: whoami::whoami().unwrap_or_else(|_| "Unknown".to_string()),
            password_hash,
            authorized_devices: HashSet::new(),
            salt,
        }
    }
}

impl ServerConfig {
    pub fn get_config_path() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
        let mut path = dirs::data_dir().ok_or("Could not find data directory")?;
        path.push("sure-shot");
        std::fs::create_dir_all(&path)?;
        path.push("config.toml");
        Ok(path)
    }

    pub fn load_or_create() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path()?;

        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)?;
            let config: Self = toml::from_str(&content)?;
            return Ok(config);
        }

        // 設定ファイルが存在しない場合は新規作成
        Err("Config file not found. Please run initial setup.".into())
    }

    pub fn create_with_setup() -> Result<Self, Box<dyn std::error::Error>> {
        // サーバー名の設定
        print!(
            "サーバー名を入力してください (デフォルト: {}): ",
            whoami::whoami().unwrap_or_else(|_| "Unknown".to_string())
        );
        use std::io::{self, Write};
        io::stdout().flush()?;

        let mut nickname = String::new();
        io::stdin().read_line(&mut nickname)?;
        nickname = nickname.trim().to_string();

        if nickname.is_empty() {
            nickname = whoami::whoami().unwrap_or_else(|_| "Unknown".to_string());
        }

        // パスワードの設定
        let password = rpassword::read_password()?;

        if password.is_empty() {
            return Err("パスワードは空にできません".into());
        }

        // パスワード確認
        let password_confirm = rpassword::read_password()?;

        if password != password_confirm {
            return Err("パスワードが一致しません".into());
        }

        // パスワードをハッシュ化
        use sha2::{Digest, Sha256};
        use uuid::Uuid;

        let salt = Uuid::new_v4().to_string();
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        hasher.update(salt.as_bytes());
        let password_hash = hex::encode(hasher.finalize());

        let config = Self {
            nickname,
            password_hash,
            authorized_devices: HashSet::new(),
            salt,
        };

        config.save()?;

        Ok(config)
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path()?;
        let config_content = toml::to_string_pretty(self)?;
        std::fs::write(config_path, config_content)?;
        Ok(())
    }

    pub fn verify_password(&self, password: &str) -> bool {
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        hasher.update(self.salt.as_bytes());
        let password_hash = hex::encode(hasher.finalize());

        password_hash == self.password_hash
    }

    pub fn is_device_authorized(&self, device_id: &str) -> bool {
        self.authorized_devices.contains(device_id)
    }

    pub fn authorize_device(&mut self, device_id: String) {
        self.authorized_devices.insert(device_id);
    }

    pub fn revoke_device(&mut self, device_id: &str) {
        self.authorized_devices.remove(device_id);
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
    pub message: String,
    pub message_type: String,
    pub attachments: Vec<Attachment>,
    pub from_name: String,
    pub from_ip: String,
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
pub struct AuthRequest {
    pub password: String,
    pub device_id: String,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    pub token: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[typeshare]
pub struct AuthorizeDeviceRequest {
    pub device_id: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[typeshare]
pub struct HostInfo {
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
                    Duration::from_millis(300), // 100ms -> 300msに延長
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

// 各IPの/pingエンドポイントをチェックする関数（リトライ機能付き）
pub async fn ping_servers_by_ip(ips: Vec<IpAddr>, port: u16, local_ip: IpAddr) -> Vec<HostInfo> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    for ip in ips {
        let is_local = ip == local_ip;
        let task = tokio::spawn(async move {
            let client = reqwest::Client::new();
            let url = format!("http://{}:{}/ping", ip, port);

            // リトライ機能を実装
            let max_retries = 2;
            let mut last_error = None;

            for attempt in 1..=max_retries {
                let result = tokio::time::timeout(
                    Duration::from_millis(3000), // 1000ms -> 3000msに延長
                    client.get(&url).send(),
                )
                .await;

                match result {
                    Ok(Ok(response)) => {
                        if response.status().is_success() {
                            match response.json::<PongResponse>().await {
                                Ok(pong) => {
                                    return Some(HostInfo {
                                        ip: ip.to_string(),
                                        port,
                                        status: "active".to_string(),
                                        message: pong.message,
                                        name: pong.name,
                                        is_self: is_local,
                                    });
                                }
                                Err(_) => {
                                    return Some(HostInfo {
                                        ip: ip.to_string(),
                                        port,
                                        status: "unknown".to_string(),
                                        message: "Invalid response".to_string(),
                                        name: "unknown".to_string(),
                                        is_self: is_local,
                                    });
                                }
                            }
                        } else {
                            return Some(HostInfo {
                                ip: ip.to_string(),
                                port,
                                status: "error".to_string(),
                                message: format!("HTTP {}", response.status()),
                                name: "unknown".to_string(),
                                is_self: is_local,
                            });
                        }
                    }
                    Ok(Err(e)) => {
                        last_error = Some(format!("Request error: {}", e));
                        if attempt < max_retries {
                            tokio::time::sleep(Duration::from_millis(200 * attempt)).await;
                        }
                    }
                    Err(_) => {
                        last_error = Some("Timeout".to_string());
                        if attempt < max_retries {
                            tokio::time::sleep(Duration::from_millis(200 * attempt)).await;
                        }
                    }
                }
            }

            // 全てのリトライが失敗した場合
            Some(HostInfo {
                ip: ip.to_string(),
                port,
                status: "unreachable".to_string(),
                message: last_error.unwrap_or_else(|| "Connection failed".to_string()),
                name: "unknown".to_string(),
                is_self: is_local,
            })
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
