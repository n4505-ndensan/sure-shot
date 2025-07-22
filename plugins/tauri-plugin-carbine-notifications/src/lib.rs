use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(target_os = "android")]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(target_os = "android")]
use mobile::CarbineNotifications;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the carbine-notifications APIs.
#[cfg(target_os = "android")]
pub trait CarbineNotificationsExt<R: Runtime> {
  fn carbine_notifications(&self) -> &CarbineNotifications<R>;
}

#[cfg(target_os = "android")]
impl<R: Runtime, T: Manager<R>> crate::CarbineNotificationsExt<R> for T {
  fn carbine_notifications(&self) -> &CarbineNotifications<R> {
    self.state::<CarbineNotifications<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("carbine-notifications")
    .invoke_handler(tauri::generate_handler![
        commands::start_background_service,
        commands::stop_background_service,
        commands::get_service_status
    ])
    .setup(|app, api| {
      #[cfg(target_os = "android")]
      {
        let carbine_notifications = mobile::init(app, api)?;
        app.manage(carbine_notifications);
      }
      Ok(())
    })
    .build()
}
