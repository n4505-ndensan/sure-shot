use color_eyre::eyre::Result;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, broadcast};

use server::{
    AppState, ReceivedMessage, ServerConfig, ServerMessage, ServerState, ServerStatus,
    external::create_external_router, find_local_ip,
};

pub struct ServerManager {
    message_sender: mpsc::UnboundedSender<ServerMessage>,
}

impl ServerManager {
    pub fn new(message_sender: mpsc::UnboundedSender<ServerMessage>) -> Self {
        Self { message_sender }
    }

    pub async fn run_server(&self) -> Result<()> {
        // 初期状態を送信
        let _ = self.message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
            state: ServerState::Starting,
            nickname: None,
            ip: None,
            port: None,
        }));
        let _ = self.message_sender.send(ServerMessage::Log("Starting server...".to_string()));

        let Some(ip) = find_local_ip() else {
            let _ = self.message_sender.send(ServerMessage::Log("No local IP found".to_string()));
            let _ = self.message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
                state: ServerState::Error("No local IP found".to_string()),
                nickname: None,
                ip: None,
                port: None,
            }));
            return Ok(());
        };
        let _ = self.message_sender.send(ServerMessage::Log(format!("Found local IP: {}", ip)));

        // 設定をロードまたは作成
        let config = match ServerConfig::load_or_create() {
            Ok(config) => {
                let _ = self.message_sender.send(ServerMessage::Log("Config loaded successfully".to_string()));
                config
            }
            Err(e) => {
                let _ = self.message_sender.send(ServerMessage::Log(format!(
                    "設定ファイルが見つかりません。初期設定を開始します。Error: {}",
                    e
                )));
                match ServerConfig::create_with_setup() {
                    Ok(config) => {
                        let _ = self.message_sender.send(ServerMessage::Log(
                            "Config created successfully".to_string(),
                        ));
                        config
                    }
                    Err(e) => {
                        let _ = self.message_sender.send(ServerMessage::Log(format!(
                            "設定の作成に失敗しました: {}",
                            e
                        )));
                        let _ = self.message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
                            state: ServerState::Error(format!("Config creation failed: {}", e)),
                            nickname: None,
                            ip: Some(ip.to_string()),
                            port: None,
                        }));
                        return Ok(());
                    }
                }
            }
        };

        let _ = self.message_sender.send(ServerMessage::Log(format!(
            "Server nickname: {}",
            config.nickname
        )));
        let _ = self.message_sender.send(ServerMessage::Log(format!(
            "Authorized devices: {}",
            config.authorized_devices.len()
        )));

        // アプリケーション状態を初期化
        let messages = Arc::new(Mutex::new(Vec::<ReceivedMessage>::new()));
        let (message_broadcaster, _) = broadcast::channel(100);
        let config_arc = Arc::new(Mutex::new(config.clone()));

        let app_state = AppState {
            messages: messages.clone(),
            message_broadcaster: message_broadcaster.clone(),
            config: config_arc.clone(),
            log_sender: Some(self.message_sender.clone()),
        };

        let port = 8000;
        let external_addr = SocketAddr::new(ip, port);

        // ルーターを作成
        let external_app = create_external_router(app_state.clone());

        // サーバーを起動
        let _ = self.message_sender.send(ServerMessage::Log(format!(
            "Binding to address: {}",
            external_addr
        )));
        let external_listener = match tokio::net::TcpListener::bind(external_addr).await {
            Ok(listener) => listener,
            Err(e) => {
                let _ = self.message_sender.send(ServerMessage::Log(format!(
                    "Failed to bind to {}: {}",
                    external_addr, e
                )));
                let _ = self.message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
                    state: ServerState::Error(format!("Bind failed: {}", e)),
                    nickname: Some(config.nickname.clone()),
                    ip: Some(ip.to_string()),
                    port: Some(port),
                }));
                return Ok(());
            }
        };

        let _ = self.message_sender.send(ServerMessage::Log(format!(
            "External API listening on http://{} (accessible from network)",
            external_addr
        )));

        // サーバーが正常に起動したことを通知
        let _ = self.message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
            state: ServerState::Running,
            nickname: Some(config.nickname.clone()),
            ip: Some(ip.to_string()),
            port: Some(port),
        }));

        let external_serve = axum::serve(external_listener, external_app);

        // サーバーを実行
        if let Err(e) = external_serve.await {
            let _ = self.message_sender.send(ServerMessage::Log(format!("External server error: {}", e)));
            let _ = self.message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
                state: ServerState::Error(format!("Server error: {}", e)),
                nickname: Some(config.nickname.clone()),
                ip: Some(ip.to_string()),
                port: Some(port),
            }));
        } else {
            let _ = self.message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
                state: ServerState::Stopped,
                nickname: Some(config.nickname.clone()),
                ip: Some(ip.to_string()),
                port: Some(port),
            }));
        }

        let _ = self.message_sender.send(ServerMessage::Log("Server ended".to_string()));
        Ok(())
    }
}
