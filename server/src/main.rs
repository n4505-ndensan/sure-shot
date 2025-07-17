use crate::server_manager::ServerManager;
use crate::ui::App;
use color_eyre::eyre::Result;
use server::ServerConfig;
use std::sync::Arc;
use tokio::sync::mpsc;

mod server_manager;
mod ui;

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    color_eyre::install()?;

    // 設定ファイルの存在確認とセットアップ
    match ServerConfig::load_or_create() {
        Ok(_) => {
            // 設定ファイルが存在する場合は何もしない
        }
        Err(_) => {
            // 設定ファイルが存在しない場合はセットアップを実行
            println!("=== Sure-Shot Server 初期設定 ===");
            println!("設定ファイルが見つからないため、初期設定を開始します。");

            match ServerConfig::create_with_setup() {
                Ok(_) => {
                    println!("設定が正常に保存されました。サーバーを起動します...");
                }
                Err(e) => {
                    eprintln!("設定の作成に失敗しました: {}", e);
                    return Ok(());
                }
            }
        }
    }

    // サーバーメッセージを送信するためのチャンネル
    let (message_sender, message_receiver) = mpsc::unbounded_channel();

    // サーバーマネージャーを作成し、UIと共有
    let server_manager = Arc::new(ServerManager::new(message_sender));

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
