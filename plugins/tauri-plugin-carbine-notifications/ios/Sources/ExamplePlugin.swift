import SwiftRs
import Tauri
import UIKit
import WebKit

@_cdecl("init_plugin_carbine_notifications")
func initPlugin() -> Plugin {
  return ExamplePlugin()
}
