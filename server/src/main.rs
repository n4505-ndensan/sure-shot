use color_eyre::eyre::Result;
use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use ratatui::{
    DefaultTerminal, Frame,
    style::Stylize,
    text::Line,
    widgets::{Block, Paragraph},
};
use server::{
    AppState, ReceivedMessage, ServerConfig, external::create_external_router, find_local_ip,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{Mutex, broadcast};

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    println!("Starting application...");

    color_eyre::install()?;
    let terminal = ratatui::init();
    let tui_result = App::new().run(terminal);
    ratatui::restore();
    
    
    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

    // サーバーを起動
    let server_handle = tokio::spawn(async { run_server().await });


    // TUIが終了したらサーバーも停止
    server_handle.abort();

    println!("Application finished with TUI result: {:?}", tui_result);
    Ok(())
}

async fn run_server() -> Result<()> {
    println!("Starting server function...");

    let Some(ip) = find_local_ip() else {
        println!("No local IP found");
        return Ok(());
    };
    println!("Found local IP: {}", ip);

    // 設定をロードまたは作成
    let config = match ServerConfig::load_or_create() {
        Ok(config) => {
            println!("Config loaded successfully");
            config
        }
        Err(e) => {
            println!(
                "設定ファイルが見つかりません。初期設定を開始します。Error: {}",
                e
            );
            match ServerConfig::create_with_setup() {
                Ok(config) => {
                    println!("Config created successfully");
                    config
                }
                Err(e) => {
                    println!("設定の作成に失敗しました: {}", e);
                    return Ok(());
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

    // ルーターを作成
    let external_app = create_external_router(app_state.clone());

    // サーバーを起動
    println!("Binding to address: {}", external_addr);
    let external_listener = tokio::net::TcpListener::bind(external_addr).await?;

    println!(
        "External API listening on http://{} (accessible from network)",
        external_addr
    );

    let external_serve = axum::serve(external_listener, external_app);

    // サーバーを実行
    if let Err(e) = external_serve.await {
        println!("External server error: {}", e);
    }

    println!("Server ended");
    Ok(())
}

/// The main application which holds the state and logic of the application.
#[derive(Debug, Default)]
pub struct App {
    /// Is the application running?
    running: bool,
}

impl App {
    /// Construct a new instance of [`App`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Run the application's main loop.
    pub fn run(mut self, mut terminal: DefaultTerminal) -> Result<()> {
        self.running = true;
        while self.running {
            terminal.draw(|frame| self.render(frame))?;
            self.handle_crossterm_events()?;
        }
        Ok(())
    }

    /// Renders the user interface.
    ///
    /// This is where you add new widgets. See the following resources for more information:
    ///
    /// - <https://docs.rs/ratatui/latest/ratatui/widgets/index.html>
    /// - <https://github.com/ratatui/ratatui/tree/main/ratatui-widgets/examples>
    fn render(&mut self, frame: &mut Frame) {
        let title = Line::from("Ratatui Simple Template")
            .bold()
            .blue()
            .centered();
        let text = "Hello, Ratatui!\n\n\
            Created using https://github.com/ratatui/templates\n\
            Press `Esc`, `Ctrl-C` or `q` to stop running.";
        frame.render_widget(
            Paragraph::new(text)
                .block(Block::bordered().title(title))
                .centered(),
            frame.area(),
        )
    }

    /// Reads the crossterm events and updates the state of [`App`].
    ///
    /// If your application needs to perform work in between handling events, you can use the
    /// [`event::poll`] function to check if there are any events available with a timeout.
    fn handle_crossterm_events(&mut self) -> Result<()> {
        match event::read()? {
            // it's important to check KeyEventKind::Press to avoid handling key release events
            Event::Key(key) if key.kind == KeyEventKind::Press => self.on_key_event(key),
            Event::Mouse(_) => {}
            Event::Resize(_, _) => {}
            _ => {}
        }
        Ok(())
    }

    /// Handles the key events and updates the state of [`App`].
    fn on_key_event(&mut self, key: KeyEvent) {
        match (key.modifiers, key.code) {
            (_, KeyCode::Esc | KeyCode::Char('q'))
            | (KeyModifiers::CONTROL, KeyCode::Char('c') | KeyCode::Char('C')) => self.quit(),
            // Add other key handlers here.
            _ => {}
        }
    }

    /// Set running to false to quit the application.
    fn quit(&mut self) {
        self.running = false;
    }
}
