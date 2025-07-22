use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

// initializes the Kotlin plugin class
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<CarbineNotifications<R>> {
  let handle = api.register_android_plugin("com.plugin.carbine_notifications", "CarbineNotificationsPlugin")?;
  Ok(CarbineNotifications(handle))
}

/// Access to the carbine-notifications APIs.
pub struct CarbineNotifications<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> CarbineNotifications<R> {
  pub async fn start_background_service(&self, payload: StartServiceRequest) -> crate::Result<ServiceStatusResponse> {
    self
      .0
      .run_mobile_plugin("startBackgroundService", payload)
      .map_err(Into::into)
  }

  pub async fn stop_background_service(&self, payload: StopServiceRequest) -> crate::Result<StopServiceResponse> {
    self
      .0
      .run_mobile_plugin("stopBackgroundService", payload)
      .map_err(Into::into)
  }

  pub async fn get_service_status(&self) -> crate::Result<ServiceStatusResponse> {
    self
      .0
      .run_mobile_plugin("getServiceStatus", ())
      .map_err(Into::into)
  }
}
