use color_eyre::eyre::Result;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast, mpsc};
use tokio::task::JoinHandle;

use server::{
    AppState, ReceivedMessage, ServerConfig, ServerMessage, ServerState, ServerStatus,
    external::create_external_router, find_local_ip,
};

#[derive(Debug)]
pub struct ServerManager {
    message_sender: mpsc::UnboundedSender<ServerMessage>,
    server_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    shutdown_sender: Arc<Mutex<Option<tokio::sync::oneshot::Sender<()>>>>,
}

impl ServerManager {
    pub fn new(message_sender: mpsc::UnboundedSender<ServerMessage>) -> Self {
        Self {
            message_sender,
            server_handle: Arc::new(Mutex::new(None)),
            shutdown_sender: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn start_server(&self) -> Result<()> {
        // 既にサーバーが起動している場合は何もしない
        let mut handle_guard = self.server_handle.lock().await;
        if handle_guard.is_some() {
            let _ = self
                .message_sender
                .send(ServerMessage::Log("Server is already running".to_string()));
            return Ok(());
        }
        // 初期状態を送信
        let _ = self
            .message_sender
            .send(ServerMessage::StatusUpdate(ServerStatus {
                state: ServerState::Starting,
                nickname: None,
                ip: None,
                port: None,
            }));
        let _ = self
            .message_sender
            .send(ServerMessage::Log("Starting server...".to_string()));

        let Some(ip) = find_local_ip() else {
            let _ = self
                .message_sender
                .send(ServerMessage::Log("No local IP found".to_string()));
            let _ = self
                .message_sender
                .send(ServerMessage::StatusUpdate(ServerStatus {
                    state: ServerState::Error("No local IP found".to_string()),
                    nickname: None,
                    ip: None,
                    port: None,
                }));
            return Ok(());
        };
        let _ = self
            .message_sender
            .send(ServerMessage::Log(format!("Found local IP: {}", ip)));

        // 設定をロードまたは作成
        let config = match ServerConfig::load_or_create() {
            Ok(config) => {
                let _ = self
                    .message_sender
                    .send(ServerMessage::Log("Config loaded successfully".to_string()));
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
                        let _ =
                            self.message_sender
                                .send(ServerMessage::StatusUpdate(ServerStatus {
                                    state: ServerState::Error(format!(
                                        "Config creation failed: {}",
                                        e
                                    )),
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
        let (message_broadcaster, dummy_receiver) = broadcast::channel(100);
        let config_arc = Arc::new(Mutex::new(config.clone()));

        // ダミーレシーバーを保持してチャンネルが閉じることを防ぐ
        let _dummy_receiver = dummy_receiver;

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
                let _ = self
                    .message_sender
                    .send(ServerMessage::StatusUpdate(ServerStatus {
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

        // シャットダウン用のチャンネルを作成
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        let mut shutdown_guard = self.shutdown_sender.lock().await;
        *shutdown_guard = Some(shutdown_tx);
        drop(shutdown_guard);

        // サーバーが正常に起動したことを通知
        let _ = self
            .message_sender
            .send(ServerMessage::StatusUpdate(ServerStatus {
                state: ServerState::Running,
                nickname: Some(config.nickname.clone()),
                ip: Some(ip.to_string()),
                port: Some(port),
            }));

        // サーバータスクを起動
        let message_sender = self.message_sender.clone();
        let config_clone = config.clone();
        let ip_clone = ip;
        let handle = tokio::spawn(async move {
            let external_serve = axum::serve(external_listener, external_app);

            // graceful shutdownを実装
            tokio::select! {
                result = external_serve => {
                    if let Err(e) = result {
                        let _ = message_sender.send(ServerMessage::Log(format!("External server error: {}", e)));
                        let _ = message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
                            state: ServerState::Error(format!("Server error: {}", e)),
                            nickname: Some(config_clone.nickname.clone()),
                            ip: Some(ip_clone.to_string()),
                            port: Some(port),
                        }));
                    }
                }
                _ = shutdown_rx => {
                    let _ = message_sender.send(ServerMessage::Log("Server shutdown requested".to_string()));
                }
            }

            let _ = message_sender.send(ServerMessage::StatusUpdate(ServerStatus {
                state: ServerState::Stopped,
                nickname: Some(config_clone.nickname.clone()),
                ip: Some(ip_clone.to_string()),
                port: Some(port),
            }));
            let _ = message_sender.send(ServerMessage::Log("Server ended".to_string()));
        });

        *handle_guard = Some(handle);
        Ok(())
    }

    pub async fn stop_server(&self) -> Result<()> {
        let mut handle_guard = self.server_handle.lock().await;
        let mut shutdown_guard = self.shutdown_sender.lock().await;

        if let Some(shutdown_tx) = shutdown_guard.take() {
            let _ = self
                .message_sender
                .send(ServerMessage::Log("Stopping server...".to_string()));
            let _ = shutdown_tx.send(());
        }

        if let Some(handle) = handle_guard.take() {
            let _ = handle.await;
        }

        let _ = self
            .message_sender
            .send(ServerMessage::Log("Server stopped".to_string()));
        Ok(())
    }
}
