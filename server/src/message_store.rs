use crate::ReceivedMessage;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug)]
pub struct MessageStore {
    connection: Arc<Mutex<Connection>>,
}

impl MessageStore {
    pub fn new(db_path: Option<PathBuf>) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let path = db_path.unwrap_or_else(|| {
            let mut path = dirs::data_dir().expect("Could not find data directory");
            path.push("sure-shot");
            std::fs::create_dir_all(&path).expect("Failed to create data directory");
            path.push("messages.db");
            path
        });

        let conn = Connection::open(path)?;
        
        // テーブルを作成
        conn.execute(
            "CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                from_ip TEXT NOT NULL,
                from_name TEXT NOT NULL,
                is_self BOOLEAN NOT NULL,
                message_type TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // インデックスを作成
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp)",
            [],
        )?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_from_ip ON messages(from_ip)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON messages(created_at)",
            [],
        )?;

        Ok(Self {
            connection: Arc::new(Mutex::new(conn)),
        })
    }

    pub async fn save_message(&self, message: &ReceivedMessage) -> Result<i64, Box<dyn std::error::Error + Send + Sync>> {
        let json_data = serde_json::to_string(message)?;
        let conn = self.connection.lock().await;
        
        let id = conn.execute(
            "INSERT INTO messages (timestamp, from_ip, from_name, is_self, message_type, data) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (
                &message.timestamp,
                &message.from,
                &message.from_name,
                message.is_self,
                &message.message_type,
                &json_data,
            ),
        )?;

        Ok(id as i64)
    }

    pub async fn get_recent_messages(&self, limit: usize) -> Result<Vec<ReceivedMessage>, Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.connection.lock().await;
        let mut stmt = conn.prepare(
            "SELECT data FROM messages ORDER BY created_at DESC LIMIT ?1"
        )?;

        let message_iter = stmt.query_map([limit], |row| {
            let json_data: String = row.get(0)?;
            Ok(json_data)
        })?;

        let mut messages = Vec::new();
        for message_result in message_iter {
            match message_result {
                Ok(json_data) => {
                    match serde_json::from_str::<ReceivedMessage>(&json_data) {
                        Ok(message) => messages.push(message),
                        Err(e) => {
                            eprintln!("Failed to deserialize message: {}", e);
                            // 破損したメッセージはスキップ
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Database error: {}", e);
                }
            }
        }

        // 時系列順に戻す（最新が最後）
        messages.reverse();
        Ok(messages)
    }

    pub async fn get_messages_by_date_range(
        &self, 
        start_date: &str, 
        end_date: &str, 
        limit: Option<usize>
    ) -> Result<Vec<ReceivedMessage>, Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.connection.lock().await;
        
        let query = if let Some(limit_val) = limit {
            format!(
                "SELECT data FROM messages 
                 WHERE timestamp BETWEEN ?1 AND ?2 
                 ORDER BY timestamp ASC 
                 LIMIT {}",
                limit_val
            )
        } else {
            "SELECT data FROM messages 
             WHERE timestamp BETWEEN ?1 AND ?2 
             ORDER BY timestamp ASC".to_string()
        };

        let mut stmt = conn.prepare(&query)?;
        let message_iter = stmt.query_map([start_date, end_date], |row| {
            let json_data: String = row.get(0)?;
            Ok(json_data)
        })?;

        let mut messages = Vec::new();
        for message_result in message_iter {
            match message_result {
                Ok(json_data) => {
                    match serde_json::from_str::<ReceivedMessage>(&json_data) {
                        Ok(message) => messages.push(message),
                        Err(e) => {
                            eprintln!("Failed to deserialize message: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Database error: {}", e);
                }
            }
        }

        Ok(messages)
    }

    pub async fn get_message_count(&self) -> Result<i64, Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.connection.lock().await;
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM messages", [], |row| {
            row.get(0)
        })?;
        Ok(count)
    }

    pub async fn search_messages(&self, query: &str, limit: Option<usize>) -> Result<Vec<ReceivedMessage>, Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.connection.lock().await;
        
        let sql_query = if let Some(limit_val) = limit {
            format!(
                "SELECT data FROM messages 
                 WHERE data LIKE '%' || ?1 || '%' 
                 ORDER BY timestamp DESC 
                 LIMIT {}",
                limit_val
            )
        } else {
            "SELECT data FROM messages 
             WHERE data LIKE '%' || ?1 || '%' 
             ORDER BY timestamp DESC".to_string()
        };

        let mut stmt = conn.prepare(&sql_query)?;
        let message_iter = stmt.query_map([query], |row| {
            let json_data: String = row.get(0)?;
            Ok(json_data)
        })?;

        let mut messages = Vec::new();
        for message_result in message_iter {
            match message_result {
                Ok(json_data) => {
                    match serde_json::from_str::<ReceivedMessage>(&json_data) {
                        Ok(message) => messages.push(message),
                        Err(e) => {
                            eprintln!("Failed to deserialize message: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Database error: {}", e);
                }
            }
        }

        messages.reverse(); // 時系列順に戻す
        Ok(messages)
    }

    // データベースの整合性チェック
    pub async fn verify_integrity(&self) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.connection.lock().await;
        let result: Result<i64, rusqlite::Error> = conn.query_row("PRAGMA integrity_check", [], |row| {
            row.get(0)
        });
        
        match result {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}
