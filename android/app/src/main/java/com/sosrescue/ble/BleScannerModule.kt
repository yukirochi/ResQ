package com.sosrescue.ble

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

class BleScannerModule(
    private val context: Context,
    private val onBeaconFound: (deviceAddress: String, rssi: Int, profileJson: String?) -> Unit
) {
    companion object {
        const val TAG = "ResQ_BleScanner"
        val SERVICE_UUID: UUID = UUID.fromString("7e500001-b5a3-f393-e0a9-e50e24dcca9e")
        val PROFILE_CHAR_UUID: UUID = UUID.fromString("7e500003-b5a3-f393-e0a9-e50e24dcca9e")
        val SIREN_CHAR_UUID: UUID = UUID.fromString("7e500006-b5a3-f393-e0a9-e50e24dcca9e")
    }

    private var scanner: BluetoothLeScanner? = null
    private var isScanning = false
    private var scanRequested = false
    private var retryAttempt = 0
    private val mainHandler = Handler(Looper.getMainLooper())
    private val profileCache = mutableMapOf<String, String>()
    private val gattConnections = mutableMapOf<String, BluetoothGatt>()
    private val scanRetry = Runnable {
        if (scanRequested && !isScanning) startScanAttempt()
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            super.onScanResult(callbackType, result)
            if (result == null) return
            retryAttempt = 0

            val device = result.device ?: return
            val address = device.address ?: return
            val rssi = result.rssi
            val scanRecord = result.scanRecord

            // A chat-only peer also advertises the shared GATT service UUID. Only
            // lock the Radar onto devices carrying the SOS beacon service payload.
            val beaconPayload = scanRecord?.serviceData?.entries
                ?.firstOrNull { it.key.uuid == SERVICE_UUID }
                ?.value
            if (beaconPayload == null) return
            val stableDeviceId = beaconPayload.takeIf { it.size >= 4 }
                ?.take(4)?.joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }

            Log.d(TAG, "Discovered ResQ Beacon: $address, RSSI: $rssi dBm")

            // If we have profile cached for this device, deliver it right away
            val cachedProfile = profileCache[address]
            if (cachedProfile != null) {
                mainHandler.post {
                    onBeaconFound(address, rssi, mergeDeviceId(cachedProfile, stableDeviceId))
                }
            } else {
                mainHandler.post {
                    onBeaconFound(address, rssi, stableDeviceId?.let { "{\"deviceId\":\"$it\"}" })
                }
                // Connect via GATT in background to retrieve the full medical profile
                connectAndReadProfile(device)
            }
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>?) {
            super.onBatchScanResults(results)
            results?.forEach { onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, it) }
        }

        override fun onScanFailed(errorCode: Int) {
            super.onScanFailed(errorCode)
            isScanning = false
            Log.e(TAG, "BLE Scan failed with errorCode: $errorCode")
            scheduleScanRetry(errorCode)
        }
    }

    private fun mergeDeviceId(profileJson: String, deviceId: String?): String {
        if (deviceId == null) return profileJson
        return try {
            org.json.JSONObject(profileJson).put("deviceId", deviceId).toString()
        } catch (_: Exception) {
            "{\"deviceId\":\"$deviceId\"}"
        }
    }

    fun startScanning() {
        scanRequested = true
        if (isScanning) return
        mainHandler.removeCallbacks(scanRetry)
        startScanAttempt()
    }

    private fun startScanAttempt() {
        if (!scanRequested || isScanning) return
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = bluetoothManager?.adapter

        if (adapter == null || !adapter.isEnabled) {
            Log.w(TAG, "Bluetooth not enabled. Cannot start BLE scanning.")
            scheduleScanRetry(-1)
            return
        }

        scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            Log.e(TAG, "BluetoothLeScanner not available.")
            scheduleScanRetry(-1)
            return
        }

        val filters = listOf(
            ScanFilter.Builder()
                .setServiceUuid(ParcelUuid(SERVICE_UUID))
                .build()
        )

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        try {
            scanner?.startScan(filters, settings, scanCallback)
            isScanning = true
            Log.d(TAG, "BLE Low Latency Scanning started for ResQ Beacons.")
        } catch (e: SecurityException) {
            isScanning = false
            Log.e(TAG, "SecurityException starting BLE scan: ${e.message}")
            scheduleScanRetry(-1)
        } catch (e: Exception) {
            isScanning = false
            Log.e(TAG, "Error starting BLE scan: ${e.message}")
            scheduleScanRetry(-1)
        }
    }

    fun stopScanning() {
        scanRequested = false
        mainHandler.removeCallbacks(scanRetry)
        if (!isScanning) return
        try {
            scanner?.stopScan(scanCallback)
            isScanning = false
            Log.d(TAG, "BLE Scanning stopped.")
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping BLE scan: ${e.message}")
        }
    }

    private fun scheduleScanRetry(errorCode: Int) {
        if (!scanRequested) return

        // Android rate-limits rapid BLE scan restarts (error 6). Wait out that window;
        // use bounded backoff for other transient scanner failures.
        val delayMs = if (errorCode == 6) {
            30_000L
        } else {
            (2_000L shl retryAttempt.coerceAtMost(4)).coerceAtMost(30_000L)
        }
        retryAttempt = (retryAttempt + 1).coerceAtMost(5)
        Log.w(TAG, "Retrying BLE scan in ${delayMs}ms (error $errorCode, attempt $retryAttempt).")
        mainHandler.removeCallbacks(scanRetry)
        mainHandler.postDelayed(scanRetry, delayMs)
    }

    private fun connectAndReadProfile(device: BluetoothDevice) {
        val address = device.address
        if (profileCache.containsKey(address) || gattConnections.containsKey(address)) return

        try {
            val gatt = device.connectGatt(context, false, object : BluetoothGattCallback() {
                override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
                    if (newState == BluetoothGatt.STATE_CONNECTED) {
                        Log.d(TAG, "Connected to victim GATT server: $address. Discovering services...")
                        gatt?.discoverServices()
                    } else if (newState == BluetoothGatt.STATE_DISCONNECTED) {
                        gatt?.close()
                        gattConnections.remove(address)
                    }
                }

                override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        val service = gatt?.getService(SERVICE_UUID)
                        val profileChar = service?.getCharacteristic(PROFILE_CHAR_UUID)
                        if (profileChar != null) {
                            gatt.readCharacteristic(profileChar)
                        }
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onCharacteristicRead(
                    gatt: BluetoothGatt?,
                    characteristic: BluetoothGattCharacteristic?,
                    status: Int
                ) {
                    if (status == BluetoothGatt.GATT_SUCCESS && characteristic?.uuid == PROFILE_CHAR_UUID) {
                        @Suppress("DEPRECATION")
                        val data = characteristic.value ?: return
                        val jsonStr = String(data, Charsets.UTF_8)
                        Log.d(TAG, "Received victim profile via GATT from $address: $jsonStr")
                        profileCache[address] = jsonStr
                        mainHandler.post {
                            onBeaconFound(address, -68, jsonStr)
                        }
                    }
                }
            })
            if (gatt != null) {
                gattConnections[address] = gatt
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException connecting to GATT: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to GATT: ${e.message}")
        }
    }

    fun triggerRemoteSiren(address: String, command: Int, onComplete: (Boolean) -> Unit = {}) {
        val delivered = AtomicBoolean(false)
        var activeGatt: BluetoothGatt? = null

        fun finish(gatt: BluetoothGatt?, succeeded: Boolean) {
            if (!delivered.compareAndSet(false, true)) return
            Log.i(TAG, "Remote siren command $command to $address ${if (succeeded) "was acknowledged" else "failed"}.")
            mainHandler.post { onComplete(succeeded) }
            try { gatt?.disconnect() } catch (_: Exception) {}
            try { gatt?.close() } catch (_: Exception) {}
        }

        try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val device = bluetoothManager?.adapter?.getRemoteDevice(address)
            if (device == null) {
                finish(null, false)
                return
            }

            activeGatt = device.connectGatt(context, false, object : BluetoothGattCallback() {
                override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
                    if (status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothGatt.STATE_CONNECTED) {
                        if (gatt?.discoverServices() != true) finish(gatt, false)
                    } else if (status != BluetoothGatt.GATT_SUCCESS || newState == BluetoothGatt.STATE_DISCONNECTED) {
                        finish(gatt, false)
                    }
                }

                override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
                    val characteristic = if (status == BluetoothGatt.GATT_SUCCESS) {
                        gatt?.getService(SERVICE_UUID)?.getCharacteristic(SIREN_CHAR_UUID)
                    } else null
                    if (gatt == null || characteristic == null) {
                        finish(gatt, false)
                        return
                    }
                    @Suppress("DEPRECATION")
                    characteristic.value = byteArrayOf(command.toByte())
                    @Suppress("DEPRECATION")
                    val writeStarted = gatt.writeCharacteristic(characteristic)
                    if (!writeStarted) finish(gatt, false)
                }

                @Deprecated("Deprecated in Java")
                override fun onCharacteristicWrite(
                    gatt: BluetoothGatt?,
                    characteristic: BluetoothGattCharacteristic?,
                    status: Int
                ) {
                    if (characteristic?.uuid == SIREN_CHAR_UUID) {
                        finish(gatt, status == BluetoothGatt.GATT_SUCCESS)
                    }
                }
            }, BluetoothDevice.TRANSPORT_LE)
            if (activeGatt == null) finish(null, false)
            mainHandler.postDelayed({
                if (!delivered.get()) finish(activeGatt, false)
            }, 15_000L)
        } catch (e: Exception) {
            Log.e(TAG, "Error triggering remote siren for $address", e)
            finish(activeGatt, false)
        }
    }
}
