use color_eyre::eyre::Result;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast, mpsc};
use tokio::task::JoinHandle;

use server::{
    AppState, ReceivedMessage, ServerConfig, ServerMessage, ServerState, ServerStatus,
    external::create_external_router, find_local_ip, message_store::MessageStore,
};

#[derive(Debug)]
pub struct ServerManager {
    message_sender: mpsc::UnboundedSender<ServerMessage>,
    server_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    shutdown_sender: Arc<Mutex<Option<tokio::sync::oneshot::Sender<()>>>>,
    app_state: Arc<Mutex<Option<AppState>>>, // AppStateを保持
}

impl ServerManager {
    pub fn new(message_sender: mpsc::UnboundedSender<ServerMessage>) -> Self {
        Self {
            message_sender,
            server_handle: Arc::new(Mutex::new(None)),
            shutdown_sender: Arc::new(Mutex::new(None)),
            app_state: Arc::new(Mutex::new(None)),
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

        // 設定をロード（事前にmain()でセットアップ済み）
        let config = match ServerConfig::load_or_create() {
            Ok(config) => {
                let _ = self
                    .message_sender
                    .send(ServerMessage::Log("Config loaded successfully".to_string()));
                config
            }
            Err(e) => {
                let _ = self
                    .message_sender
                    .send(ServerMessage::Log(format!("Failed to load config: {}", e)));
                let _ = self
                    .message_sender
                    .send(ServerMessage::StatusUpdate(ServerStatus {
                        state: ServerState::Error(format!("Config load failed: {}", e)),
                        nickname: None,
                        ip: Some(ip.to_string()),
                        port: None,
                    }));
                return Ok(());
            }
        };

        let _ = self.message_sender.send(ServerMessage::Log(format!(
            "Server nickname: {}",
            config.nickname
        )));

        // アプリケーション状態を初期化
        let messages = Arc::new(Mutex::new(Vec::<ReceivedMessage>::new()));
        let (message_broadcaster, dummy_receiver) = broadcast::channel(100);
        let config_arc = Arc::new(Mutex::new(config.clone()));

        // メッセージストアを初期化
        let message_store = match MessageStore::new(None) {
            Ok(store) => Arc::new(store),
            Err(e) => {
                let _ = self.message_sender.send(ServerMessage::Log(format!(
                    "Failed to initialize message store: {}",
                    e
                )));
                let _ = self
                    .message_sender
                    .send(ServerMessage::StatusUpdate(ServerStatus {
                        state: ServerState::Error(format!("Message store init failed: {}", e)),
                        nickname: Some(config.nickname.clone()),
                        ip: Some(ip.to_string()),
                        port: None,
                    }));
                return Ok(());
            }
        };

        // 既存のメッセージをロード
        match message_store.get_recent_messages(100).await {
            Ok(stored_messages) => {
                let mut messages_guard = messages.lock().await;
                *messages_guard = stored_messages;
                let _ = self.message_sender.send(ServerMessage::Log(format!(
                    "Loaded {} stored messages",
                    messages_guard.len()
                )));
            }
            Err(e) => {
                let _ = self.message_sender.send(ServerMessage::Log(format!(
                    "Failed to load stored messages: {}",
                    e
                )));
            }
        }

        // ダミーレシーバーを保持してチャンネルが閉じることを防ぐ
        let _dummy_receiver = dummy_receiver;

        let app_state = AppState {
            messages: messages.clone(),
            message_broadcaster: message_broadcaster.clone(),
            config: config_arc.clone(),
            log_sender: Some(self.message_sender.clone()),
            message_store: message_store.clone(),
        };

        // AppStateを保存
        {
            let mut app_state_guard = self.app_state.lock().await;
            *app_state_guard = Some(app_state.clone());
        }

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

    // ログ設定を変更するメソッド
    pub async fn toggle_request_logs(&self) -> Result<()> {
        if let Some(app_state) = self.get_app_state().await {
            let mut config = app_state.config.lock().await;
            config.log_config.show_requests = !config.log_config.show_requests;
            let _ = config.save();
            let status = if config.log_config.show_requests {
                "enabled"
            } else {
                "disabled"
            };
            let _ = self
                .message_sender
                .send(ServerMessage::Log(format!("Request logging {}", status)));
        }
        Ok(())
    }

    pub async fn toggle_response_logs(&self) -> Result<()> {
        if let Some(app_state) = self.get_app_state().await {
            let mut config = app_state.config.lock().await;
            config.log_config.show_responses = !config.log_config.show_responses;
            let _ = config.save();
            let status = if config.log_config.show_responses {
                "enabled"
            } else {
                "disabled"
            };
            let _ = self
                .message_sender
                .send(ServerMessage::Log(format!("Response logging {}", status)));
        }
        Ok(())
    }

    pub async fn toggle_quiet_mode(&self) -> Result<()> {
        if let Some(app_state) = self.get_app_state().await {
            let mut config = app_state.config.lock().await;
            if config.log_config.quiet_endpoints.is_empty() {
                // Quiet mode を有効にする
                config.log_config.quiet_endpoints = vec![
                    "/ping".to_string(),
                    "/auth/verify".to_string(),
                    "/events".to_string(),
                ];
                let _ = self.message_sender.send(ServerMessage::Log(
                    "Quiet mode enabled for /ping, /auth/verify, /events".to_string(),
                ));
            } else {
                // Quiet mode を無効にする
                config.log_config.quiet_endpoints.clear();
                let _ = self
                    .message_sender
                    .send(ServerMessage::Log("Quiet mode disabled".to_string()));
            }
            let _ = config.save();
        }
        Ok(())
    }

    // AppStateを取得するヘルパーメソッド
    async fn get_app_state(&self) -> Option<AppState> {
        let app_state_guard = self.app_state.lock().await;
        app_state_guard.clone()
    }
}
