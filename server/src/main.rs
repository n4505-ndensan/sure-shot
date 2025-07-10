use server::{
    AppState, ReceivedMessage, ServerConfig, external::create_external_router, find_local_ip,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let Some(ip) = find_local_ip() else {
        println!("No local IP found");
        return;
    };
    println!("Found local IP: {}", ip);

    // 設定をロードまたは作成
    let config = match ServerConfig::load_or_create() {
        Ok(config) => config,
        Err(_) => {
            println!("設定ファイルが見つかりません。初期設定を開始します。");
            match ServerConfig::create_with_setup() {
                Ok(config) => config,
                Err(e) => {
                    eprintln!("設定の作成に失敗しました: {}", e);
                    return;
                }
            }
        }
    };

    println!("Server nickname: {}", config.nickname);
    println!("Authorized devices: {}", config.authorized_devices.len());

    // アプリケーション状態を初期化
    let messages = Arc::new(Mutex::new(Vec::<ReceivedMessage>::new()));
    let (message_broadcaster, _) = broadcast::channel(100);
    let config = Arc::new(Mutex::new(config));

    let app_state = AppState {
        messages: messages.clone(),
        message_broadcaster: message_broadcaster.clone(),
        config: config.clone(),
    };

    let port = 8000;
    let external_addr = SocketAddr::new(ip, port);
    // let internal_addr = SocketAddr::new(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)), port);

    // ルーターを作成
    let external_app = create_external_router(app_state.clone(), ip);

    println!(
        "External API listening on http://{} (accessible from network)",
        external_addr
    );

    // サーバーを起動
    let external_listener = tokio::net::TcpListener::bind(external_addr).await.unwrap();

    let external_serve = axum::serve(external_listener, external_app);

    // 全てのサーバーを同時に実行
    tokio::select! {
        result = external_serve => {
            if let Err(e) = result {
                eprintln!("External server error: {}", e);
            }
        }
    }
}
