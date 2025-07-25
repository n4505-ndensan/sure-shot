use crate::models::*;
use tauri::{command, AppHandle, Runtime};

#[command]
pub(crate) async fn start_background_service<R: Runtime>(
    app: AppHandle<R>,
    payload: StartServiceRequest,
) -> Result<ServiceStatusResponse, String> {
    #[cfg(mobile)]
    {
        let carbine_notifications = app.state::<crate::mobile::CarbineNotifications<R>>();
        carbine_notifications
            .0
            .run_mobile_plugin("startBackgroundService", payload)
            .map_err(|e| e.to_string())
    }
    #[cfg(desktop)]
    {
        let _ = (app, payload);
        // デスクトップ版の実装（今後実装予定）
        Ok(ServiceStatusResponse {
            is_running: false,
            last_check: None,
            message_count: 0,
            error_message: Some("Desktop implementation not yet available".to_string()),
        })
    }
}

#[command]
pub(crate) async fn stop_background_service<R: Runtime>(
    app: AppHandle<R>,
    payload: StopServiceRequest,
) -> Result<StopServiceResponse, String> {
    #[cfg(mobile)]
    {
        let carbine_notifications = app.state::<crate::mobile::CarbineNotifications<R>>();
        carbine_notifications
            .0
            .run_mobile_plugin("stopBackgroundService", payload)
            .map_err(|e| e.to_string())
    }
    #[cfg(desktop)]
    {
        let _ = (app, payload);
        // デスクトップ版の実装（今後実装予定）
        Ok(StopServiceResponse { success: false })
    }
}

#[command]
pub(crate) async fn get_service_status<R: Runtime>(
    app: AppHandle<R>,
) -> Result<ServiceStatusResponse, String> {
    #[cfg(mobile)]
    {
        let carbine_notifications = app.state::<crate::mobile::CarbineNotifications<R>>();
        let empty_payload: serde_json::Value = serde_json::json!({});
        carbine_notifications
            .0
            .run_mobile_plugin("getServiceStatus", empty_payload)
            .map_err(|e| e.to_string())
    }
    #[cfg(desktop)]
    {
        let _ = app;
        // デスクトップ版の実装（今後実装予定）
        Ok(ServiceStatusResponse {
            is_running: false,
            last_check: None,
            message_count: 0,
            error_message: Some("Desktop implementation not yet available".to_string()),
        })
    }
}
