package com.plugin.carbine_notifications

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.webkit.WebView
import android.widget.Toast
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@InvokeArg
internal class StartServiceArgs {
    // Accept either camelCase or snake_case keys
    var serverUrl: String? = null
    var server_url: String? = null
}

@InvokeArg
internal class StopServiceArgs {
    // Empty for now
}

@TauriPlugin
class CarbineNotificationsPlugin(private val activity: Activity): Plugin(activity) {

    override fun load(webView: WebView) {
        // Plugin loaded
        activity.window?.setSoftInputMode(
            android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
            android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
        )
    }

    @Command
    fun startBackgroundService(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(StartServiceArgs::class.java)
            
            Log.d("CarbineNotifications", "Starting background service with Args: ${args.toString()}")
            Log.d("CarbineNotifications", "Starting background service with URL: ${args.serverUrl}")
            
            val intent = Intent(activity, BackgroundNotificationService::class.java).apply {
                putExtra("server_url", args.serverUrl)
            }
            
            activity.startForegroundService(intent)
            
            Log.d("CarbineNotifications", "Background service started successfully")
            
            val ret = JSObject()
            ret.put("isRunning", true)
            ret.put("lastCheck", System.currentTimeMillis().toString())
            ret.put("messageCount", 0)
            ret.put("errorMessage", null)
            
            invoke.resolve(ret)
        } catch (e: Exception) {
            Log.e("CarbineNotifications", "Failed to start background service", e)
            
            val ret = JSObject()
            ret.put("isRunning", false)
            ret.put("lastCheck", null)
            ret.put("messageCount", 0)
            ret.put("errorMessage", e.message)
            
            invoke.resolve(ret)
        }
    }

    @Command
    fun stopBackgroundService(invoke: Invoke) {
        try {
            Log.d("CarbineNotifications", "Stopping background service")
            
            val intent = Intent(activity, BackgroundNotificationService::class.java)
            activity.stopService(intent)
            
            Log.d("CarbineNotifications", "Background service stopped")
            
            val ret = JSObject()
            ret.put("success", true)
            
            invoke.resolve(ret)
        } catch (e: Exception) {
            Log.e("CarbineNotifications", "Failed to stop background service", e)
            
            val ret = JSObject()
            ret.put("success", false)
            
            invoke.resolve(ret)
        }
    }

    @Command
    fun getServiceStatus(invoke: Invoke) {
        try {
            // サービスの状態を確認する実装
            val isRunning = BackgroundNotificationService.isServiceRunning()
            val messageCount = BackgroundNotificationService.getMessageCount()
            
            Log.d("CarbineNotifications", "Service status: running=$isRunning, messages=$messageCount")
            
            val ret = JSObject()
            ret.put("isRunning", isRunning)
            ret.put("lastCheck", if (isRunning) System.currentTimeMillis().toString() else null)
            ret.put("messageCount", messageCount)
            ret.put("errorMessage", null)
            
            invoke.resolve(ret)
        } catch (e: Exception) {
            Log.e("CarbineNotifications", "Failed to get service status", e)
            
            val ret = JSObject()
            ret.put("isRunning", false)
            ret.put("lastCheck", null)
            ret.put("messageCount", 0)
            ret.put("errorMessage", e.message)
            
            invoke.resolve(ret)
        }
    }
}