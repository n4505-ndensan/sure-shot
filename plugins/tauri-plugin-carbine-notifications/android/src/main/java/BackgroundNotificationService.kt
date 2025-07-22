package com.plugin.carbine_notifications

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.*
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
import android.util.Log

class BackgroundNotificationService : Service() {
    
    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "sure_shot_background"
        private const val TAG = "BackgroundNotificationService"
        
        @Volatile
        private var isRunning = false
        
        @Volatile
        private var messageCount = 0
        
        fun isServiceRunning(): Boolean = isRunning
        fun getMessageCount(): Int = messageCount
    }
    
    private var serverUrl: String? = null
    
    private var serviceJob: Job? = null
    private lateinit var notificationManager: NotificationManager
    
    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        Log.d(TAG, "Service created")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand called with intent: $intent")
        Log.d(TAG, "Intent extras: ${intent?.extras}")
        
        serverUrl = intent?.getStringExtra("server_url")
        
        Log.d(TAG, "Extracted serverUrl: '$serverUrl'")
        Log.d(TAG, "serverUrl is null: ${serverUrl == null}")
        Log.d(TAG, "serverUrl is empty: ${serverUrl?.isEmpty()}")
        
        Log.d(TAG, "Service started with URL: $serverUrl")
        Log.d(TAG, "Starting foreground service and background work...")
        
        // フォアグラウンド通知を開始
        startForeground(NOTIFICATION_ID, createForegroundNotification())
        
        // サービス開始の即時通知を表示
        showStatusNotification("Sure Shot Service Started", "Background service is now running")
        
        startBackgroundWork()
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        serviceJob?.cancel()
        Log.d(TAG, "Service destroyed")
        
        // サービス停止の通知を表示
        showStatusNotification("Sure Shot Service Stopped", "Background service has been stopped")
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Sure Shot Background Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps sure-shot connected in background"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Sure Shot")
            .setContentText("Listening for messages in background")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }
    
    private fun startBackgroundWork() {
        isRunning = true
        Log.d(TAG, "Starting background work... isRunning = $isRunning")
        
        serviceJob = CoroutineScope(Dispatchers.IO).launch {
            Log.d(TAG, "Background coroutine started")
            
            // SSE接続を試行、失敗したら定期ポーリングにフォールバック
            try {
                if (serverUrl != null) {
                    Log.d(TAG, "Attempting SSE connection to: $serverUrl")
                    showStatusNotification("Connecting...", "Attempting to connect to server")
                    connectToSSE()
                } else {
                    Log.e(TAG, "Server URL is null")
                    showStatusNotification("Error", "Server URL is null")
                }
            } catch (e: Exception) {
                Log.e(TAG, "SSE connection failed, falling back to polling", e)
                showStatusNotification("Connection Failed", "Falling back to polling mode")
                startPolling()
            }
        }
    }
    
    private suspend fun connectToSSE() {
        try {
            val url = URL("$serverUrl/events")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "GET"
                setRequestProperty("Accept", "text/event-stream")
                setRequestProperty("Cache-Control", "no-cache")
                connectTimeout = 30000
                readTimeout = 0 // 無制限
            }
            
            Log.d(TAG, "Connecting to SSE: ${url}")
            
            val reader = BufferedReader(InputStreamReader(connection.inputStream))
            Log.d(TAG, "SSE connection established successfully!")
            showStatusNotification("Connected", "Successfully connected to server")
            
            var line: String? = null
            
            while (isRunning && reader.readLine().also { line = it } != null) {
                line?.let { processSSELine(it) }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "SSE connection error", e)
            showStatusNotification("Connection Error", "SSE connection failed: ${e.message}")
            if (isRunning) {
                delay(5000) // 5秒待ってから再接続
                Log.d(TAG, "Attempting to reconnect...")
                connectToSSE()
            }
        }
    }
    
    private fun processSSELine(line: String) {
        Log.d(TAG, "Received SSE line: $line")
        
        if (line.startsWith("data: ")) {
            try {
                val jsonData = line.substring(6) // "data: " を除去
                Log.d(TAG, "Processing message data: $jsonData")
                
                val messageJson = JSONObject(jsonData)
                
                val fromIp = messageJson.optString("from")
                val fromName = messageJson.optString("from_name", "Unknown")
                val message = messageJson.optString("message", "")
                
                Log.d(TAG, "Message from $fromName ($fromIp): $message")
                
                Log.d(TAG, "Showing notification for external message")
                showMessageNotification(fromName, message)
                messageCount++
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse SSE message", e)
            }
        }
    }
    
    private suspend fun startPolling() {
        while (isRunning) {
            try {
                checkForNewMessages()
                delay(30000) // 30秒間隔でポーリング
            } catch (e: Exception) {
                Log.e(TAG, "Polling error", e)
                delay(60000) // エラー時は1分待つ
            }
        }
    }
    
    private suspend fun checkForNewMessages() {
        try {
            val url = URL("$serverUrl/messages")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "GET"
                connectTimeout = 15000
                readTimeout = 15000
            }
            
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().readText()
                // メッセージのチェックと通知ロジックをここに実装
                Log.d(TAG, "Polling response: $response")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check messages", e)
        }
    }
    
    private fun showMessageNotification(fromName: String, message: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("New message from $fromName")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
            
        notificationManager.notify(
            System.currentTimeMillis().toInt(), // 一意のID
            notification
        )
        
        Log.d(TAG, "Notification shown: $fromName - $message")
    }
    
    private fun showStatusNotification(title: String, message: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
            
        notificationManager.notify(
            System.currentTimeMillis().toInt(), // 一意のID
            notification
        )
        
        Log.d(TAG, "Status notification: $title - $message")
    }
}
