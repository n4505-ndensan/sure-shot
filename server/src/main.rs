use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};
use server::{
    find_local_ip, AppState, ServerConfig, ReceivedMessage,
    external::create_external_router,
    internal::create_internal_router,
};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let Some(ip) = find_local_ip() else {
        println!("No local IP found");
        return;
    };
    println!("Found local IP: {}", ip);

    // 設定をロード
    let config = ServerConfig::load_or_create();
    println!("Server nickname: {}", config.nickname);

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
    let internal_addr = SocketAddr::new(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)), port);

    // ルーターを作成
    let external_app = create_external_router(app_state.clone(), ip);
    let internal_app = create_internal_router(app_state.clone(), ip);

    println!(
        "External API listening on http://{} (accessible from network)",
        external_addr
    );
    println!(
        "Internal API listening on http://{} (localhost only)",
        internal_addr
    );

    // サーバーを起動
    let external_listener = tokio::net::TcpListener::bind(external_addr).await.unwrap();
    let internal_listener = tokio::net::TcpListener::bind(internal_addr).await.unwrap();

    let external_serve = axum::serve(external_listener, external_app);
    let internal_serve = axum::serve(internal_listener, internal_app);
    
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
    }
}
