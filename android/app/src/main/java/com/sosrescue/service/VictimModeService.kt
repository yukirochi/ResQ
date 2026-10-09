package com.sosrescue.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.media.AudioManager
import android.media.ToneGenerator
import androidx.core.app.NotificationCompat

class VictimModeService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null

    private var advertiserModule: com.sosrescue.ble.BleAdvertiserModule? = null
    private var gattServerModule: com.sosrescue.ble.GattServerModule? = null
    private val sirenHandler = Handler(Looper.getMainLooper())
    private var sirenTone: ToneGenerator? = null
    private var remoteSirenActive = false
    private var nextSirenToneHigh = true

    private val remoteSirenLoop = object : Runnable {
        override fun run() {
            if (!remoteSirenActive) return
            val tone = if (nextSirenToneHigh) ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD
                else ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK
            nextSirenToneHigh = !nextSirenToneHigh
            sirenTone?.startTone(tone, 450)
            sirenHandler.postDelayed(this, 500)
        }
    }

    companion object {
        const val CHANNEL_ID = "ResQ_Victim_Channel"
        const val NOTIFICATION_ID = 911
        const val ACTION_START = "ACTION_START_VICTIM_MODE"
        const val ACTION_STOP = "ACTION_STOP_VICTIM_MODE"
        const val EXTRA_PROFILE_JSON = "EXTRA_PROFILE_JSON"
        var isRunning = false
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ResQ:VictimModeWakeLock")
        wakeLock?.acquire(24 * 60 * 60 * 1000L) // 24 hours max
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopBleComponents()
            isRunning = false
            @Suppress("DEPRECATION")
            stopForeground(true)
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        val profileJson = intent?.getStringExtra(EXTRA_PROFILE_JSON) ?: "{}"
        startBleComponents(profileJson)
        isRunning = true

        return START_STICKY
    }

    private fun startBleComponents(profileJson: String) {
        if (advertiserModule == null) {
            advertiserModule = com.sosrescue.ble.BleAdvertiserModule(this)
        }
        if (gattServerModule == null) {
            gattServerModule = com.sosrescue.ble.GattServerModule(this)
        }

        // Ephemeral ID: 16 hex characters
        val ephemeralIdHex = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16)
        advertiserModule?.startAdvertising(
            ephemeralIdHex = ephemeralIdHex,
            statusByte = 1,
            onSuccess = {
                android.util.Log.d("VictimModeService", "Hardware BLE Beacon Advertising started successfully.")
            },
            onError = { err ->
                android.util.Log.e("VictimModeService", "BLE Advertising error: $err")
            }
        )

        gattServerModule?.startGattServer(isSos = true, profileJson = profileJson)
        gattServerModule?.onInboundChatMessageReceived = { address, messageId, message, senderDeviceId ->
            sendBroadcast(Intent(com.sosrescue.ble.BleChatMeshModule.ACTION_INCOMING)
                .setPackage(packageName)
                .putExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_PEER, address)
                .putExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_DEVICE_ID, senderDeviceId)
                .putExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_MESSAGE_ID, messageId)
                .putExtra(com.sosrescue.ble.BleChatMeshModule.EXTRA_TEXT, message))
        }
        gattServerModule?.onSirenCommandReceived = { cmd ->
            if (cmd == 1 || cmd == 0) {
                sirenHandler.post { setRemoteSirenActive(cmd == 1) }
            }
        }
    }

    private fun setRemoteSirenActive(active: Boolean) {
        if (remoteSirenActive == active) return
        remoteSirenActive = active
        sirenHandler.removeCallbacks(remoteSirenLoop)
        if (active) {
            try {
                sirenTone = ToneGenerator(AudioManager.STREAM_ALARM, 100)
                nextSirenToneHigh = true
                sirenHandler.post(remoteSirenLoop)
                android.util.Log.i("VictimModeService", "Remote siren started on this phone.")
            } catch (e: Exception) {
                remoteSirenActive = false
                android.util.Log.e("VictimModeService", "Unable to start remote siren on this phone.", e)
            }
        } else {
            sirenTone?.stopTone()
            sirenTone?.release()
            sirenTone = null
            android.util.Log.i("VictimModeService", "Remote siren stopped on this phone.")
        }
    }

    private fun stopBleComponents() {
        advertiserModule?.stopAdvertising()
        gattServerModule?.stopGattServer()
        advertiserModule = null
        gattServerModule = null
    }

    private fun createNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ResQ Emergency Beacon Active")
            .setContentText("Broadcasting BLE signal to rescue teams in range.")
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ResQ Victim Beacon",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Persistent notification required for background BLE rescue broadcasting."
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        setRemoteSirenActive(false)
        stopBleComponents()
        isRunning = false
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
    }
}
