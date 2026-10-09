package com.sosrescue.ble

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import java.util.*

class BleAdvertiserModule(private val context: Context) {

    private var advertiser: BluetoothLeAdvertiser? = null
    private var callback: AdvertiseCallback? = null
    private var isAdvertising = false

    companion object {
        const val TAG = "ResQ_BleAdvertiser"
        val SERVICE_UUID: UUID = UUID.fromString("7e500001-b5a3-f393-e0a9-e50e24dcca9e")
    }

    fun startAdvertising(
        ephemeralIdHex: String,
        statusByte: Int,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter

        if (adapter == null || !adapter.isEnabled) {
            onError("Bluetooth is disabled on device.")
            return
        }

        advertiser = adapter.bluetoothLeAdvertiser
        if (advertiser == null) {
            onError("Device does not support BLE Peripheral advertising mode.")
            return
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .setTimeout(0)
            .build()

        // Pack 8-byte Ephemeral ID + 1-byte Status Flag
        val payload = ByteArray(9)
        val cleanHex = ephemeralIdHex.replace("[^0-9A-Fa-f]".toRegex(), "").padEnd(16, '0').substring(0, 16)
        for (i in 0 until 8) {
            payload[i] = cleanHex.substring(i * 2, i * 2 + 2).toInt(16).toByte()
        }
        payload[8] = (statusByte and 0xFF).toByte()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(true)
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .addServiceData(ParcelUuid(SERVICE_UUID), payload)
            .build()

        callback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                super.onStartSuccess(settingsInEffect)
                isAdvertising = true
                Log.d(TAG, "BLE Emergency Beacon Advertising started successfully.")
                onSuccess()
            }

            override fun onStartFailure(errorCode: Int) {
                super.onStartFailure(errorCode)
                isAdvertising = false
                Log.e(TAG, "Advertising failed with error code: $errorCode")
                onError("Advertising failed with code $errorCode")
            }
        }

        advertiser?.startAdvertising(settings, data, callback)
    }

    fun stopAdvertising() {
        if (advertiser != null && callback != null) {
            advertiser?.stopAdvertising(callback)
            isAdvertising = false
            callback = null
            Log.d(TAG, "BLE Advertising stopped.")
        }
    }
}
