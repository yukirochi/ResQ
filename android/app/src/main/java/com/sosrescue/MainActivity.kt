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

    private val sirenReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context?, intent: android.content.Intent?) {
            webView.post {
                webView.evaluateJavascript("if (typeof toggleAudioSiren === 'function' && !isSirenActive) toggleAudioSiren();", null)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = android.content.IntentFilter(com.sosrescue.service.VictimModeService.ACTION_TRIGGER_SIREN)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(sirenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(sirenReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(sirenReceiver)
        } catch (e: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        bleScanner?.stopScanning()
        bleScanner = null
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
                if (activity.bleScanner == null) {
                    activity.bleScanner = com.sosrescue.ble.BleScannerModule(activity) { address, rssi, profileJson ->
                        val escapedProfile = profileJson?.replace("\\", "\\\\")?.replace("'", "\\'")?.replace("\n", " ")
                        val js = "if (typeof window.onNativeBleBeaconDetected === 'function') { window.onNativeBleBeaconDetected('$address', $rssi, ${if (escapedProfile != null) "'$escapedProfile'" else "null"}); }"
                        activity.webView.evaluateJavascript(js, null)
                    }
                }
                activity.bleScanner?.startScanning()
            }
        }

        @android.webkit.JavascriptInterface
        fun stopBleScanning() {
            activity.runOnUiThread {
                activity.bleScanner?.stopScanning()
            }
        }

        @android.webkit.JavascriptInterface
        fun triggerRemoteSiren(address: String, command: Int) {
            activity.runOnUiThread {
                activity.bleScanner?.triggerRemoteSiren(address, command)
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
