package com.sosrescue

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingSpinner: ProgressBar

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        // Permissions granted, reload or proceed
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        loadingSpinner = findViewById(R.id.loadingSpinner)

        setupPermissions()
        setupWebView()
    }

    private fun setupPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun setupWebView() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            setGeolocationEnabled(true)
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: android.webkit.GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
        }

        webView.addJavascriptInterface(ResQNativeBridge(this), "ResQNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                loadingSpinner.visibility = View.GONE
            }

            override fun onRenderProcessGone(view: WebView?, detail: android.webkit.RenderProcessGoneDetail?): Boolean {
                view?.loadUrl("file:///android_asset/index.html")
                return true
            }
        }

        webView.loadUrl("file:///android_asset/index.html")
    }

    var bleScanner: com.sosrescue.ble.BleScannerModule? = null
    var bleChatMesh: com.sosrescue.ble.BleChatMeshModule? = null

    fun ensureBleScanner(): com.sosrescue.ble.BleScannerModule {
        bleScanner?.let { return it }
        val created = com.sosrescue.ble.BleScannerModule(this) { address, rssi, profileJson ->
            val safeAddress = org.json.JSONObject.quote(address)
            val safeProfile = profileJson?.let { org.json.JSONObject.quote(it) } ?: "null"
            val js = "if (typeof window.onNativeBleBeaconDetected === 'function') window.onNativeBleBeaconDetected($safeAddress, $rssi, $safeProfile);"
            webView.evaluateJavascript(js, null)
        }
        bleScanner = created
        return created
    }

    private val sirenReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context?, intent: android.content.Intent?) {
            when (intent?.action) {
                com.sosrescue.ble.BleChatMeshModule.ACTION_INCOMING -> {
                    val address = org.json.JSONObject.quote(intent.getStringExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_PEER) ?: "")
                    val messageId = org.json.JSONObject.quote(intent.getStringExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_MESSAGE_ID) ?: "")
                    val text = org.json.JSONObject.quote(intent.getStringExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_TEXT) ?: "")
                    webView.post {
                        webView.evaluateJavascript("if (typeof window.onNativeBleChatMessage === 'function') window.onNativeBleChatMessage($address, $messageId, $text);", null)
                    }
                }
                com.sosrescue.ble.BleChatMeshModule.ACTION_DELIVERY -> {
                    val address = org.json.JSONObject.quote(intent.getStringExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_PEER) ?: "")
                    val messageId = org.json.JSONObject.quote(intent.getStringExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_MESSAGE_ID) ?: "")
                    val status = org.json.JSONObject.quote(intent.getStringExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_STATUS) ?: "failed")
                    val detail = org.json.JSONObject.quote(intent.getStringExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_TEXT) ?: "")
                    webView.post {
                        webView.evaluateJavascript("if (typeof window.onNativeBleChatDelivery === 'function') window.onNativeBleChatDelivery($messageId, $status, $detail, $address);", null)
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = android.content.IntentFilter(com.sosrescue.ble.BleChatMeshModule.ACTION_INCOMING)
        filter.addAction(com.sosrescue.ble.BleChatMeshModule.ACTION_DELIVERY)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(sirenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(sirenReceiver, filter)
        }
        webView.postDelayed({
            webView.evaluateJavascript(
                "if (document.getElementById('screenChat')?.classList.contains('active') && window.ResQNative) window.ResQNative.startBleChat();",
                null
            )
        }, 300L)
    }

    override fun onPause() {
        super.onPause()
        bleChatMesh?.stop()
        try {
            unregisterReceiver(sirenReceiver)
        } catch (e: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        bleScanner?.stopScanning()
        bleScanner = null
        bleChatMesh?.stop()
        bleChatMesh = null
    }

    class ResQNativeBridge(private val activity: MainActivity) {
        @android.webkit.JavascriptInterface
        fun isNative(): Boolean = true

        @android.webkit.JavascriptInterface
        fun startEmergencyBeacon(profileJson: String) {
            try {
                val serviceIntent = android.content.Intent(activity, com.sosrescue.service.VictimModeService::class.java).apply {
                    action = com.sosrescue.service.VictimModeService.ACTION_START
                    putExtra(com.sosrescue.service.VictimModeService.EXTRA_PROFILE_JSON, profileJson)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    activity.startForegroundService(serviceIntent)
                } else {
                    activity.startService(serviceIntent)
                }
            } catch (e: Exception) {
                android.util.Log.e("ResQNativeBridge", "Error starting victim mode", e)
            }
        }

        @android.webkit.JavascriptInterface
        fun stopEmergencyBeacon() {
            try {
                val serviceIntent = android.content.Intent(activity, com.sosrescue.service.VictimModeService::class.java).apply {
                    action = com.sosrescue.service.VictimModeService.ACTION_STOP
                }
                activity.startService(serviceIntent)
            } catch (e: Exception) {
                android.util.Log.e("ResQNativeBridge", "Error stopping victim mode", e)
            }
        }

        @android.webkit.JavascriptInterface
        fun startBleScanning() {
            activity.runOnUiThread {
                activity.ensureBleScanner().startScanning()
            }
        }

        @android.webkit.JavascriptInterface
        fun stopBleScanning() {
            activity.runOnUiThread {
                activity.bleScanner?.stopScanning()
            }
        }

        @android.webkit.JavascriptInterface
        fun startBleChat() {
            activity.runOnUiThread {
                if (activity.bleChatMesh == null) {
                    activity.bleChatMesh = com.sosrescue.ble.BleChatMeshModule(activity)
                }
                activity.bleChatMesh?.start()
            }
        }

        @android.webkit.JavascriptInterface
        fun sendBleChatMessage(messageId: Int, address: String, text: String) {
            activity.runOnUiThread {
                if (activity.bleChatMesh == null) {
                    activity.bleChatMesh = com.sosrescue.ble.BleChatMeshModule(activity)
                    activity.bleChatMesh?.start()
                }
                activity.bleChatMesh?.sendMessage(messageId, address, text)
            }
        }

        @android.webkit.JavascriptInterface
        fun triggerRemoteSiren(address: String, command: Int) {
            activity.runOnUiThread {
                activity.ensureBleScanner().triggerRemoteSiren(address, command) { succeeded ->
                    val safeAddress = org.json.JSONObject.quote(address)
                    activity.webView.post {
                        activity.webView.evaluateJavascript(
                            "if (typeof window.onNativeRemoteSirenResult === 'function') window.onNativeRemoteSirenResult($safeAddress, $command, $succeeded);",
                            null
                        )
                    }
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun triggerVibrate(ms: Long) {
            try {
                val vibrator = activity.getSystemService(android.content.Context.VIBRATOR_SERVICE) as? android.os.Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(android.os.VibrationEffect.createOneShot(ms, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(ms)
                }
            } catch (e: Exception) {
                android.util.Log.e("ResQNativeBridge", "Vibrate error", e)
            }
        }

        @android.webkit.JavascriptInterface
        fun setSystemVolume(volumePercent: Int) {
            try {
                val audioManager = activity.getSystemService(android.content.Context.AUDIO_SERVICE) as? android.media.AudioManager
                audioManager?.let { am ->
                    val maxVol = am.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC)
                    val targetVol = ((maxVol * volumePercent.coerceIn(0, 100)) / 100.0).toInt().coerceIn(0, maxVol)
                    am.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, targetVol, 0)
                }
            } catch (e: Exception) {
                android.util.Log.e("ResQNativeBridge", "Volume set error", e)
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
