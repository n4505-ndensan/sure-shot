use crate::server_manager::ServerManager;
use crate::ui::App;
use color_eyre::eyre::Result;
use tokio::sync::mpsc;

mod server_manager;
mod ui;

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    color_eyre::install()?;

    // サーバーメッセージを送信するためのチャンネル
    let (message_sender, message_receiver) = mpsc::unbounded_channel();

    // サーバーマネージャーを作成し、別タスクで起動
    let server_manager = ServerManager::new(message_sender);
    let server_handle = tokio::spawn(async move { server_manager.run_server().await });

    // TUIを起動
    let terminal = ratatui::init();
    let tui_result = App::new(message_receiver).run(terminal).await;
    ratatui::restore();

    // サーバータスクを停止
    server_handle.abort();

    println!("Application finished with TUI result: {:?}", tui_result);
    Ok(())
}
