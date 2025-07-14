use crate::server_manager::ServerManager;
use crate::ui::App;
use color_eyre::eyre::Result;
use std::sync::Arc;
use tokio::sync::mpsc;

mod server_manager;
mod ui;

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    color_eyre::install()?;

    // サーバーメッセージを送信するためのチャンネル
    let (message_sender, message_receiver) = mpsc::unbounded_channel();

    // サーバーマネージャーを作成し、UIと共有
    let server_manager = Arc::new(ServerManager::new(message_sender));

    // 初期状態でサーバーを起動
    let server_manager_clone = server_manager.clone();
    tokio::spawn(async move {
        if let Err(e) = server_manager_clone.start_server().await {
            eprintln!("Failed to start server: {}", e);
        }
    });

    // TUIを起動（server_managerを渡す）
    let terminal = ratatui::init();
    let tui_result = App::new(message_receiver, server_manager.clone())
        .run(terminal)
        .await;
    ratatui::restore();

    // サーバーを停止
    if let Err(e) = server_manager.stop_server().await {
        eprintln!("Failed to stop server: {}", e);
    }

    println!("Application finished with TUI result: {:?}", tui_result);
    Ok(())
}
