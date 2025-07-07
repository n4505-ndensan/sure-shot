use axum::{routing, Json};
use crate::{AppState, SendMessageRequest, SendMessageResponse, ReceivedMessage, send_message_to_server, send_message_to_all_servers};
use std::net::IpAddr;

pub fn internal_send_message(router: routing::Router, app_state: AppState, ip: IpAddr) -> routing::Router {
    router.route("/send", {
        let ip = ip.clone();
        let state = app_state.clone();
        routing::post(move |Json(request): Json<SendMessageRequest>| {
            let ip = ip.clone();
            let state = state.clone();
            async move {
                let config = state.config.lock().await;
                let from_name = config.nickname.clone();
                drop(config); // ロックを早期に解放

                let from_ip = ip.to_string();

                // 送信先IPが空の場合は全サーバーに送信
                let result = if request.to.trim().is_empty() {
                    send_message_to_all_servers(
                        ip,
                        &from_ip,
                        &from_name,
                        &request.message,
                        &request.message_type,
                        &request.attachments,
                    )
                    .await
                    .map(|successful_ips| {
                        println!(
                            "📤 Broadcast message sent to {} servers: {:?}",
                            successful_ips.len(),
                            successful_ips
                        );
                    })
                } else {
                    send_message_to_server(
                        &request.to,
                        &from_ip,
                        &from_name,
                        &request.message,
                        &request.message_type,
                        &request.attachments,
                    )
                    .await
                    .map(|_| {
                        println!("📤 Message sent to {}", request.to);
                    })
                };

                // 送信成功時は自分のメッセージリストにも追加
                if result.is_ok() {
                    let sent_message = ReceivedMessage {
                        from: from_ip.clone(),
                        from_name: from_name.clone(),
                        message: request.message.clone(),
                        message_type: request.message_type.clone(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        is_self: true, // 自分が送信したメッセージ
                        attachments: request.attachments.clone(),
                    };

                    // 自分のメッセージリストに追加
                    {
                        let mut messages = state.messages.lock().await;
                        messages.push(sent_message.clone());

                        // 最新100件のみ保持
                        if messages.len() > 100 {
                            messages.remove(0);
                        }
                    }

                    // 自分のSSEクライアントにも配信
                    let _ = state.message_broadcaster.send(sent_message);
                }

                let response = match result {
                    Ok(()) => SendMessageResponse {
                        success: true,
                        message: if request.to.trim().is_empty() {
                            "Message broadcast to all servers successfully".to_string()
                        } else {
                            "Message sent successfully".to_string()
                        },
                        timestamp: chrono::Utc::now().to_rfc3339(),
                    },
                    Err(err) => SendMessageResponse {
                        success: false,
                        message: format!("Failed to send message: {}", err),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                    },
                };

                Json(response)
            }
        })
    })
}
