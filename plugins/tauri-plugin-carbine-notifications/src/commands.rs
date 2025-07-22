use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;

#[cfg(target_os = "android")]
use crate::CarbineNotificationsExt;

#[command]
pub(crate) async fn start_background_service<R: Runtime>(
    app: AppHandle<R>,
    payload: StartServiceRequest,
) -> Result<ServiceStatusResponse> {
    #[cfg(target_os = "android")]
    {
        app.carbine_notifications().start_background_service(payload).await
    }
    #[cfg(not(target_os = "android"))]
    {
        Err(crate::Error::PlatformNotSupported)
    }
}

#[command]
pub(crate) async fn stop_background_service<R: Runtime>(
    app: AppHandle<R>,
    payload: StopServiceRequest,
) -> Result<StopServiceResponse> {
    #[cfg(target_os = "android")]
    {
        app.carbine_notifications().stop_background_service(payload).await
    }
    #[cfg(not(target_os = "android"))]
    {
        Err(crate::Error::PlatformNotSupported)
    }
}

#[command]
pub(crate) async fn get_service_status<R: Runtime>(
    app: AppHandle<R>,
) -> Result<ServiceStatusResponse> {
    #[cfg(target_os = "android")]
    {
        app.carbine_notifications().get_service_status().await
    }
    #[cfg(not(target_os = "android"))]
    {
        Ok(ServiceStatusResponse {
            is_running: false,
            last_check: None,
            message_count: 0,
            error_message: Some("Platform not supported".to_string()),
        })
    }
}
