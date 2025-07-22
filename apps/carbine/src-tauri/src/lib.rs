// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use whoami::devicename;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostInfo {
    pub ip: String,
    pub port: u16,
    pub status: String,
    pub message: String,
    pub name: String,
    pub is_self: bool,
}

#[derive(Serialize, Deserialize)]
pub struct PongResponse {
    pub message: String,
    pub name: String,
    pub is_self: bool,
}

// Find the local IP address
pub fn find_local_ip() -> Option<IpAddr> {
    use local_ip_address::list_afinet_netifas;

    let ifaces = list_afinet_netifas().ok()?;
    for (_name, ip) in ifaces {
        if let IpAddr::V4(ipv4) = ip {
            if ipv4.octets()[0] == 192 {
                return Some(IpAddr::V4(ipv4));
            }
        }
    }
    None
}

// Check available IPs in the subnet
pub async fn check_available_ips(local_ip: IpAddr, port: u16) -> Vec<IpAddr> {
    use futures::future::join_all;
    use std::net::SocketAddr;
    use std::time::Duration;

    let mut tasks = Vec::new();

    // 現在のIPアドレスから/24サブネットの範囲を計算
    if let IpAddr::V4(ipv4) = local_ip {
        let octets = ipv4.octets();
        let base_ip = [octets[0], octets[1], octets[2], 0];

        // サブネット内の全IPアドレス（1-254）をチェック
        for host in 1..=254 {
            let target_ip = IpAddr::V4(std::net::Ipv4Addr::new(
                base_ip[0], base_ip[1], base_ip[2], host,
            ));

            let task = tokio::spawn(async move {
                let addr = SocketAddr::new(target_ip, port);
                let result = tokio::time::timeout(
                    Duration::from_millis(300), // 100ms -> 300msに延長
                    tokio::net::TcpStream::connect(addr),
                )
                .await;

                match result {
                    Ok(Ok(_)) => Some(target_ip),
                    _ => None,
                }
            });
            tasks.push(task);
        }
    }

    let results = join_all(tasks).await;
    let mut available_ips = Vec::new();

    for result in results {
        if let Ok(Some(ip)) = result {
            available_ips.push(ip);
        }
    }

    available_ips
}

// Ping servers by IP
pub async fn ping_servers_by_ip(ips: Vec<IpAddr>, port: u16, local_ip: IpAddr) -> Vec<HostInfo> {
    use futures::future::join_all;
    use std::time::Duration;

    let mut tasks = Vec::new();

    for ip in ips {
        let is_local = ip == local_ip;
        let task = tokio::spawn(async move {
            let client = reqwest::Client::new();
            let url = format!("http://{}:{}/ping", ip, port);

            // リトライ機能を実装
            let max_retries = 2;
            let mut last_error = None;

            for attempt in 1..=max_retries {
                let result = tokio::time::timeout(
                    Duration::from_millis(3000), // 1000ms -> 3000msに延長
                    client.get(&url).send(),
                )
                .await;

                match result {
                    Ok(Ok(response)) => {
                        if response.status().is_success() {
                            match response.json::<PongResponse>().await {
                                Ok(pong) => {
                                    return Some(HostInfo {
                                        ip: ip.to_string(),
                                        port,
                                        status: "active".to_string(),
                                        message: pong.message,
                                        name: pong.name,
                                        is_self: is_local,
                                    });
                                }
                                Err(_) => {
                                    return Some(HostInfo {
                                        ip: ip.to_string(),
                                        port,
                                        status: "unknown".to_string(),
                                        message: "Invalid response".to_string(),
                                        name: "unknown".to_string(),
                                        is_self: is_local,
                                    });
                                }
                            }
                        } else {
                            return Some(HostInfo {
                                ip: ip.to_string(),
                                port,
                                status: "error".to_string(),
                                message: format!("HTTP {}", response.status()),
                                name: "unknown".to_string(),
                                is_self: is_local,
                            });
                        }
                    }
                    Ok(Err(e)) => {
                        last_error = Some(format!("Request error: {}", e));
                        if attempt < max_retries {
                            tokio::time::sleep(Duration::from_millis(200 * attempt)).await;
                        }
                    }
                    Err(_) => {
                        last_error = Some("Timeout".to_string());
                        if attempt < max_retries {
                            tokio::time::sleep(Duration::from_millis(200 * attempt)).await;
                        }
                    }
                }
            }

            // 全てのリトライが失敗した場合
            Some(HostInfo {
                ip: ip.to_string(),
                port,
                status: "unreachable".to_string(),
                message: last_error.unwrap_or_else(|| "Connection failed".to_string()),
                name: "unknown".to_string(),
                is_self: is_local,
            })
        });
        tasks.push(task);
    }

    let results = join_all(tasks).await;
    let mut server_infos = Vec::new();

    for result in results {
        if let Ok(Some(info)) = result {
            server_infos.push(info);
        }
    }

    server_infos
}

#[tauri::command]
async fn get_device_name() -> Result<String, ()> {
    let device_name = devicename();
    Ok(device_name.clone())
}

#[tauri::command]
async fn find_host() -> Result<Vec<HostInfo>, String> {
    let Some(local_ip) = find_local_ip() else {
        return Err("Could not find local IP address".to_string());
    };

    let available_ips = check_available_ips(local_ip, 8000).await;
    let server_infos = ping_servers_by_ip(available_ips, 8000, local_ip).await;

    Ok(server_infos)
}

#[tauri::command]
async fn get_local_ip() -> Result<String, String> {
    match find_local_ip() {
        Some(ip) => Ok(ip.to_string()),
        None => Err("Could not find local IP address".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_machine_uid::init())
        .plugin(tauri_plugin_carbine_notifications::init())
        .invoke_handler(tauri::generate_handler![
            find_host,
            get_local_ip,
            get_device_name,
        ])
         .setup(|app| {
            #[cfg(mobile)]
            {
                app.handle().plugin(tauri_plugin_app_events::init())?;
            }
             Ok(())
         })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
