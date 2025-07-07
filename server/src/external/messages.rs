use crate::{AppState, ReceiveMessageResponse, ReceivedMessage};
use axum::{Json, routing};
use std::net::IpAddr;

pub fn external_receive_message(
    router: routing::Router,
    app_state: AppState,
    ip: IpAddr,
) -> routing::Router {
    router.route("/receive", {
        let state = app_state.clone();
        let ip = ip.clone();
        routing::post(move |Json(mut message): Json<ReceivedMessage>| {
            let state = state.clone();
            let ip = ip.clone();
            async move {
                // 自分のIPと比較して is_self を設定
                message.is_self = message.from == ip.to_string();

                // メッセージをログに出力
                println!(
                    "📨 Received message from {} ({}): {}",
                    message.from_name, message.from, message.message
                );
                println!(
                    "   Type: {}, Time: {}, Is Self: {}",
                    message.message_type, message.timestamp, message.is_self
                );

                // メッセージを保存
                {
                    let mut messages = state.messages.lock().await;
                    messages.push(message.clone());

                    // 最新100件のみ保持
                    if messages.len() > 100 {
                        messages.remove(0);
                    }
                }

                // SSE経由でメッセージを配信
                let _ = state.message_broadcaster.send(message);

                let response = ReceiveMessageResponse {
                    success: true,
                    message: "Message received successfully".to_string(),
                    received_at: chrono::Utc::now().to_rfc3339(),
                };

                Json(response)
            }
        })
    })
}
