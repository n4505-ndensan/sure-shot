#[command]
pub(crate) async fn start_background_service<R: Runtime>(
    app: AppHandle<R>,
    payload: StartServiceRequest,
) -> Result<ServiceStatusResponse> {
+    log::info!("Rust start_background_service received server_url: {}", payload.server_url);
    #[cfg(target_os = "android")]
    {
        app.carbine_notifications().start_background_service(payload).await
    }
}