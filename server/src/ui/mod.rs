use color_eyre::eyre::Result;
use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use ratatui::{
    DefaultTerminal, Frame,
    layout::{Constraint, Direction, Layout},
    style::{Style, Stylize},
    text::Line,
    widgets::{Block, Padding, Paragraph, Row, Table, Tabs},
};
use std::collections::VecDeque;
use tokio::sync::mpsc;

use server::{ServerMessage, ServerState, ServerStatus};

/// The main application which holds the state and logic of the application.
#[derive(Debug)]
pub struct App {
    /// Is the application running?
    running: bool,
    /// Server logs
    logs: VecDeque<String>,
    /// Message receiver channel
    message_receiver: mpsc::UnboundedReceiver<ServerMessage>,
    /// Current server status
    server_status: ServerStatus,
    /// Currently selected tab
    selected_tab: usize,
}

impl App {
    /// Const   ruct a new instance of [`App`].
    pub fn new(message_receiver: mpsc::UnboundedReceiver<ServerMessage>) -> Self {
        Self {
            running: true,
            logs: VecDeque::new(),
            message_receiver,
            server_status: ServerStatus {
                state: ServerState::Starting,
                nickname: None,
                ip: None,
                port: None,
            },
            selected_tab: 0, // デフォルトでLogsタブを選択
        }
    }

    /// Run the application's main loop.
    pub async fn run(mut self, mut terminal: DefaultTerminal) -> Result<()> {
        self.running = true;
        while self.running {
            // 新しいメッセージを受信
            while let Ok(message) = self.message_receiver.try_recv() {
                match message {
                    ServerMessage::Log(log_message) => {
                        self.logs.push_back(log_message);
                        // ログの最大数を制限（例：100行）
                        if self.logs.len() > 100 {
                            self.logs.pop_front();
                        }
                    }
                    ServerMessage::StatusUpdate(status) => {
                        self.server_status = status;
                    }
                }
            }

            terminal.draw(|frame| self.render(frame))?;

            // イベントをノンブロッキングでチェック
            if event::poll(std::time::Duration::from_millis(50))? {
                self.handle_crossterm_events()?;
            }

            // 少し待機してCPU使用率を下げる
            tokio::time::sleep(std::time::Duration::from_millis(16)).await;
        }
        Ok(())
    }

    /// Renders the user interface.
    fn render(&mut self, frame: &mut Frame) {
        // 画面を上下に分割
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3), // タイトル部分
                Constraint::Min(0),    // タブとコンテンツを含む全体部分
            ])
            .split(frame.area());

        // タイトル部分
        let title = Line::from("Magazine").bold().blue().left_aligned();

        // サーバーステータスを動的に生成
        let status_text = match &self.server_status.state {
            ServerState::Starting => "starting...".to_string(),
            ServerState::Running => {
                let name = self.server_status.nickname.as_deref().unwrap_or("unknown");
                let ip = self.server_status.ip.as_deref().unwrap_or("unknown");
                let port = self.server_status.port.unwrap_or(0);
                format!("running on {} / {}:{}", name, ip, port)
            }
            ServerState::Stopped => "stopped".to_string(),
            ServerState::Aborted => "aborted".to_string(),
            ServerState::Error(err) => format!("error - {}", err),
        };

        let title_paragraph = Paragraph::new(status_text)
            .block(
                Block::bordered()
                    .title(title)
                    .padding(Padding::horizontal(1)),
            )
            .left_aligned();
        frame.render_widget(title_paragraph, chunks[0]);

        // タブとコンテンツを含む統一されたエリア
        self.render_tabbed_content(frame, chunks[1]);
    }

    fn render_tabbed_content(&self, frame: &mut Frame, area: ratatui::layout::Rect) {
        // 全体を一つのボーダーで囲む
        let block = Block::bordered();
        let inner_area = block.inner(area);
        frame.render_widget(block, area);

        // 内部をタブ部分とコンテンツ部分に分割
        let tab_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // タブ部分（ボーダーなし）
                Constraint::Min(0),    // コンテンツ部分
            ])
            .split(inner_area);

        // タブ部分（ボーダーなし）
        let tab_titles = vec!["Logs", "Info"];
        let tabs = Tabs::new(tab_titles)
            .style(Style::default().white())
            .highlight_style(Style::default().yellow().bold())
            .select(self.selected_tab)
            .divider(" | ")
            .padding(" ", " ");
        frame.render_widget(tabs, tab_chunks[0]);

        // コンテンツ部分（選択されたタブに応じて変更）
        match self.selected_tab {
            0 => self.render_logs_content(frame, tab_chunks[1]),
            1 => self.render_info_content(frame, tab_chunks[1]),
            _ => self.render_logs_content(frame, tab_chunks[1]),
        }
    }

    fn render_logs_content(&self, frame: &mut Frame, area: ratatui::layout::Rect) {
        let log_text = if self.logs.is_empty() {
            "サーバーを起動中...".to_string()
        } else {
            self.logs
                .iter()
                .cloned()
                .collect::<Vec<String>>()
                .join("\n")
        };

        // 上部に水平線を描画
        let content_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // 水平線部分
                Constraint::Min(0),    // ログ内容部分
            ])
            .split(area);

        // 水平線を描画
        let separator = Block::default().borders(ratatui::widgets::Borders::TOP);
        frame.render_widget(separator, content_chunks[0]);

        let logs_container = Block::default()
            .borders(ratatui::widgets::Borders::NONE)
            .padding(Padding::horizontal(1));

        // ログ内容（ボーダーなし）
        let logs_paragraph = Paragraph::new(log_text)
            .scroll((self.logs.len().saturating_sub(20) as u16, 0))
            .block(logs_container);

        frame.render_widget(logs_paragraph, content_chunks[1]);
    }

    fn render_info_content(&self, frame: &mut Frame, area: ratatui::layout::Rect) {
        // 上部に水平線を描画
        let content_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // 水平線部分
                Constraint::Min(0),    // 設定内容部分
            ])
            .split(area);

        // 水平線を描画
        let separator = Block::default().borders(ratatui::widgets::Borders::TOP);
        frame.render_widget(separator, content_chunks[0]);

        let binding = self
            .server_status
            .port
            .map_or_else(|| "N/A".to_string(), |p| p.to_string());
        let rows = [
            Row::new(vec![
                "nickname",
                self.server_status.nickname.as_deref().unwrap_or("N/A"),
                "host name that will be shown on clients",
            ]),
            Row::new(vec![
                "ip",
                self.server_status.ip.as_deref().unwrap_or("N/A"),
                "IP address of the server",
            ]),
            Row::new(vec![
                "port",
                &binding,
                "port number the server is listening on",
            ]),
        ];

        // Columns widths are constrained in the same way as Layout...
        let widths = [
            Constraint::Length(15),
            Constraint::Length(25),
            Constraint::Min(0),
        ];

        let table_container = Block::new()
            .borders(ratatui::widgets::Borders::NONE)
            .padding(Padding::horizontal(1));
        let table = Table::new(rows, widths)
            .column_spacing(1)
            .header(Row::new(vec!["name", "value", "info"]).style(Style::new().bold().magenta()))
            .block(table_container)
            .row_highlight_style(Style::new().reversed())
            .column_highlight_style(Style::new().red())
            .cell_highlight_style(Style::new())
            .highlight_symbol(">>");

        frame.render_widget(table, content_chunks[1]);
    }

    /// Reads the crossterm events and updates the state of [`App`].
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

            // タブ切り替え
            (_, KeyCode::Left) => {
                if self.selected_tab > 0 {
                    self.selected_tab -= 1;
                }
            }
            (_, KeyCode::Right) => {
                if self.selected_tab < 1 {
                    // 現在は2つのタブ（0と1）
                    self.selected_tab += 1;
                }
            }

            // 数字キーでの直接タブ選択
            (_, KeyCode::Char('1')) => self.selected_tab = 0,
            (_, KeyCode::Char('2')) => self.selected_tab = 1,

            // その他のキーは無視
            _ => {}
        }
    }

    /// Set running to false to quit the application.
    fn quit(&mut self) {
        self.running = false;
    }
}
