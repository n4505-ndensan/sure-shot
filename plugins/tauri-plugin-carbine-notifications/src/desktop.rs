use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<CarbineNotifications<R>> {
    Ok(CarbineNotifications(app.clone()))
}

/// Access to the carbine-notifications APIs.
pub struct CarbineNotifications<R: Runtime>(pub AppHandle<R>);

impl<R: Runtime> CarbineNotifications<R> {}
