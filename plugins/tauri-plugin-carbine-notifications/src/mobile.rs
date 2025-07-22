use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_carbine_notifications);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<CarbineNotifications<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin(
        "com.plugin.carbine_notifications",
        "CarbineNotificationsPlugin",
    )?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_carbine_notifications)?;
    Ok(CarbineNotifications(handle))
}

/// Access to the carbine-notifications APIs.
pub struct CarbineNotifications<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> CarbineNotifications<R> {}
