package com.sosrescue.ble

import android.bluetooth.*
import android.content.Context
import android.util.Log
import java.util.*

class GattServerModule(private val context: Context) {

    private var gattServer: BluetoothGattServer? = null
    private var isSosActive = false
    private var cachedProfileJson: String = ""

    var onSirenCommandReceived: ((Int) -> Unit)? = null
    var onInboundChatMessageReceived: ((String) -> Unit)? = null

    companion object {
        const val TAG = "ResQ_GattServer"
        val SERVICE_UUID: UUID = UUID.fromString("7e500001-b5a3-f393-e0a9-e50e24dcca9e")
        val STATUS_CHAR_UUID: UUID = UUID.fromString("7e500002-b5a3-f393-e0a9-e50e24dcca9e")
        val PROFILE_CHAR_UUID: UUID = UUID.fromString("7e500003-b5a3-f393-e0a9-e50e24dcca9e")
        val CHAT_TX_CHAR_UUID: UUID = UUID.fromString("7e500004-b5a3-f393-e0a9-e50e24dcca9e")
        val CHAT_RX_CHAR_UUID: UUID = UUID.fromString("7e500005-b5a3-f393-e0a9-e50e24dcca9e")
        val SIREN_CHAR_UUID: UUID = UUID.fromString("7e500006-b5a3-f393-e0a9-e50e24dcca9e")
    }

    fun startGattServer(isSos: Boolean, profileJson: String): Boolean {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        this.isSosActive = isSos
        this.cachedProfileJson = profileJson

        val callback = object : BluetoothGattServerCallback() {
            override fun onCharacteristicReadRequest(
                device: BluetoothDevice?,
                requestId: Int,
                offset: Int,
                characteristic: BluetoothGattCharacteristic?
            ) {
                if (characteristic?.uuid == PROFILE_CHAR_UUID) {
                    if (!isSosActive) {
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, 0, null)
                        return
                    }
                    val data = cachedProfileJson.toByteArray(Charsets.UTF_8)
                    val slice = if (offset < data.size) data.copyOfRange(offset, data.size) else ByteArray(0)
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, slice)
                } else {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, characteristic?.value)
                }
            }

            override fun onCharacteristicWriteRequest(
                device: BluetoothDevice?,
                requestId: Int,
                characteristic: BluetoothGattCharacteristic?,
                preparedWrite: Boolean,
                responseNeeded: Boolean,
                offset: Int,
                value: ByteArray?
            ) {
                if (characteristic?.uuid == SIREN_CHAR_UUID && value != null && value.isNotEmpty()) {
                    val command = value[0].toInt()
                    onSirenCommandReceived?.invoke(command)
                } else if (characteristic?.uuid == CHAT_TX_CHAR_UUID && value != null) {
                    val message = String(value, Charsets.UTF_8)
                    onInboundChatMessageReceived?.invoke(message)
                }

                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                }
            }
        }

        gattServer = bluetoothManager.openGattServer(context, callback)
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)

        val statusChar = BluetoothGattCharacteristic(
            STATUS_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ
        )

        val profileChar = BluetoothGattCharacteristic(
            PROFILE_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )

        val chatTxChar = BluetoothGattCharacteristic(
            CHAT_TX_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        )

        val chatRxChar = BluetoothGattCharacteristic(
            CHAT_RX_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_NOTIFY or BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )

        val sirenChar = BluetoothGattCharacteristic(
            SIREN_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        )

        service.addCharacteristic(statusChar)
        service.addCharacteristic(profileChar)
        service.addCharacteristic(chatTxChar)
        service.addCharacteristic(chatRxChar)
        service.addCharacteristic(sirenChar)

        gattServer?.addService(service)
        Log.d(TAG, "ResQ GATT Server initialized with emergency characteristics.")
        return true
    }

    fun updateSosState(isSos: Boolean, profileJson: String) {
        this.isSosActive = isSos
        this.cachedProfileJson = profileJson
    }

    fun stopGattServer() {
        gattServer?.close()
        gattServer = null
    }
}
