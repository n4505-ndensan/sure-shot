use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::CarbineNotifications;
#[cfg(mobile)]
use mobile::CarbineNotifications;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the carbine-notifications APIs.
pub trait CarbineNotificationsExt<R: Runtime> {
    fn carbine_notifications(&self) -> &CarbineNotifications<R>;
}

impl<R: Runtime, T: Manager<R>> crate::CarbineNotificationsExt<R> for T {
    fn carbine_notifications(&self) -> &CarbineNotifications<R> {
        self.state::<CarbineNotifications<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("carbine-notifications")
        // .invoke_handler()
        .setup(|app, api| {
            #[cfg(mobile)]
            let carbine_notifications = mobile::init(app, api)?;
            #[cfg(desktop)]
            let carbine_notifications = desktop::init(app, api)?;
            app.manage(carbine_notifications);
            Ok(())
        })
        .build()
}
