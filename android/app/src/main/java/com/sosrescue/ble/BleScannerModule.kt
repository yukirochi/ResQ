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
    private val mainHandler = Handler(Looper.getMainLooper())
    private val profileCache = mutableMapOf<String, String>()
    private val gattConnections = mutableMapOf<String, BluetoothGatt>()

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            super.onScanResult(callbackType, result)
            if (result == null) return

            val device = result.device ?: return
            val address = device.address ?: return
            val rssi = result.rssi
            val scanRecord = result.scanRecord

            // Check if device matches ResQ service UUID in serviceUuids or serviceData
            val matchesUuid = scanRecord?.serviceUuids?.any { it.uuid == SERVICE_UUID } == true ||
                    scanRecord?.serviceData?.keys?.any { it.uuid == SERVICE_UUID } == true

            if (!matchesUuid) return

            Log.d(TAG, "Discovered ResQ Beacon: $address, RSSI: $rssi dBm")

            // If we have profile cached for this device, deliver it right away
            val cachedProfile = profileCache[address]
            if (cachedProfile != null) {
                mainHandler.post {
                    onBeaconFound(address, rssi, cachedProfile)
                }
            } else {
                mainHandler.post {
                    onBeaconFound(address, rssi, null)
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
        }
    }

    fun startScanning() {
        if (isScanning) return
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = bluetoothManager?.adapter

        if (adapter == null || !adapter.isEnabled) {
            Log.w(TAG, "Bluetooth not enabled. Cannot start BLE scanning.")
            return
        }

        scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            Log.e(TAG, "BluetoothLeScanner not available.")
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
            Log.e(TAG, "SecurityException starting BLE scan: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting BLE scan: ${e.message}")
        }
    }

    fun stopScanning() {
        if (!isScanning) return
        try {
            scanner?.stopScan(scanCallback)
            isScanning = false
            Log.d(TAG, "BLE Scanning stopped.")
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping BLE scan: ${e.message}")
        }
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

    fun triggerRemoteSiren(address: String, command: Int) {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val device = bluetoothManager?.adapter?.getRemoteDevice(address) ?: return

        try {
            device.connectGatt(context, false, object : BluetoothGattCallback() {
                override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
                    if (newState == BluetoothGatt.STATE_CONNECTED) {
                        gatt?.discoverServices()
                    }
                }

                override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        val service = gatt?.getService(SERVICE_UUID)
                        val sirenChar = service?.getCharacteristic(SIREN_CHAR_UUID)
                        if (sirenChar != null) {
                            @Suppress("DEPRECATION")
                            sirenChar.value = byteArrayOf(command.toByte())
                            gatt.writeCharacteristic(sirenChar)
                            Log.d(TAG, "Triggered remote siren ($command) for $address")
                        }
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onCharacteristicWrite(
                    gatt: BluetoothGatt?,
                    characteristic: BluetoothGattCharacteristic?,
                    status: Int
                ) {
                    gatt?.disconnect()
                    gatt?.close()
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error triggering remote siren: ${e.message}")
        }
    }
}
