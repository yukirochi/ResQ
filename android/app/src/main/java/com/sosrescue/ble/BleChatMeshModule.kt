package com.sosrescue.ble

import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import java.util.ArrayDeque
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/** Direct phone-to-phone BLE chat. Both ResQ phones advertise and scan while Chat is open. */
class BleChatMeshModule(private val context: Context) {
    companion object {
        const val TAG = "ResQ_BleChat"
        const val ACTION_INCOMING = "com.sosrescue.BLE_CHAT_INCOMING"
        const val ACTION_DELIVERY = "com.sosrescue.BLE_CHAT_DELIVERY"
        const val EXTRA_PEER = "peer"
        const val EXTRA_TEXT = "text"
        const val EXTRA_MESSAGE_ID = "message_id"
        const val EXTRA_STATUS = "status"

        private val SERVICE_UUID = UUID.fromString("7e500001-b5a3-f393-e0a9-e50e24dcca9e")
        private val CHAT_TX_UUID = UUID.fromString("7e500004-b5a3-f393-e0a9-e50e24dcca9e")
        private const val WRITE_TIMEOUT_MS = 12_000L
        private const val PEER_WAIT_MS = 10_000L
        private const val RETRY_MAX_MS = 30_000L
    }

    private data class Outbound(val messageId: Int, val packets: List<ByteArray>, var nextPacket: Int = 0)
    private class Peer(val address: String) {
        var gatt: BluetoothGatt? = null
        var characteristic: BluetoothGattCharacteristic? = null
        var connecting = false
        var writing = false
        var writeTimeout: Runnable? = null
        val queue = ArrayDeque<Outbound>()
    }
    private data class Delivery(val expected: Int, var completed: Int = 0, var failed: Int = 0)
    private data class WaitingMessage(val address: String, val text: String, val timeout: Runnable)

    private val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val handler = Handler(Looper.getMainLooper())
    private val peers = ConcurrentHashMap<String, Peer>()
    private val deliveries = ConcurrentHashMap<Int, Delivery>()
    private val waitingMessages = ConcurrentHashMap<Int, WaitingMessage>()
    private val reassembler = BleChatProtocol.Reassembler()
    private var scanner: BluetoothLeScanner? = null
    private var gattServer: BluetoothGattServer? = null
    private var advertiser: android.bluetooth.le.BluetoothLeAdvertiser? = null
    private var advertiseCallback: AdvertiseCallback? = null
    private var ownsServerAndAdvertiser = false
    @Volatile private var running = false
    @Volatile private var scanActive = false
    private var scanRetryAttempt = 0
    private var advertiseRetryAttempt = 0

    private val scanRetry = Runnable {
        if (running && !scanActive) startDiscovery()
    }
    private val advertiseRetry = Runnable {
        if (running && ownsServerAndAdvertiser) beginAdvertising()
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            scanRetryAttempt = 0
            val device = result?.device ?: return
            val address = try { device.address } catch (e: SecurityException) { return }
            if (address.isNullOrBlank()) return
            connectTo(device)
        }

        override fun onScanFailed(errorCode: Int) {
            scanActive = false
            Log.e(TAG, "Chat discovery scan failed: $errorCode")
            scheduleScanRetry(errorCode)
        }
    }

    private val serverCallback = object : BluetoothGattServerCallback() {
        override fun onServiceAdded(status: Int, service: BluetoothGattService?) {
            if (status == BluetoothGatt.GATT_SUCCESS && service?.uuid == SERVICE_UUID && running && ownsServerAndAdvertiser) {
                beginAdvertising()
            } else if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "BLE chat GATT service registration failed: $status")
            }
        }

        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice?, requestId: Int, characteristic: BluetoothGattCharacteristic?,
            preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray?
        ) {
            val address = try { device?.address } catch (e: SecurityException) { null }
            if (characteristic?.uuid == CHAT_TX_UUID && address != null) {
                val frame = BleChatProtocol.parse(value)
                val message = frame?.let { reassembler.accept(address, it) }
                if (message != null) {
                    Log.d(TAG, "Received BLE chat message from $address")
                    context.sendBroadcast(Intent(ACTION_INCOMING).setPackage(context.packageName)
                        .putExtra(EXTRA_PEER, address)
                        .putExtra(EXTRA_MESSAGE_ID, frame.messageId.toString())
                        .putExtra(EXTRA_TEXT, message))
                }
            }
            if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
            }
        }
    }

    fun start() {
        if (running) return
        val adapter = manager.adapter
        if (adapter == null || !adapter.isEnabled) {
            Log.w(TAG, "Bluetooth is disabled; chat discovery cannot start.")
            return
        }
        running = true

        // The SOS service already exposes the same GATT service and advertisement.
        ownsServerAndAdvertiser = !com.sosrescue.service.VictimModeService.isRunning
        if (ownsServerAndAdvertiser) startGattServerAndAdvertising()

        scanner = adapter.bluetoothLeScanner
        startDiscovery()
    }

    private fun startDiscovery() {
        if (!running || scanActive) return
        try {
            val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()
            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setReportDelay(0)
                .build()
            val activeScanner = scanner ?: manager.adapter?.bluetoothLeScanner
            scanner = activeScanner
            if (activeScanner == null) {
                scheduleScanRetry(-1)
                return
            }
            activeScanner.startScan(listOf(filter), settings, scanCallback)
            scanActive = true
            Log.d(TAG, "BLE peer chat discovery started.")
        } catch (e: Exception) {
            scanActive = false
            Log.e(TAG, "Unable to start BLE chat discovery.", e)
            scheduleScanRetry(-1)
        }
    }

    private fun scheduleScanRetry(errorCode: Int) {
        if (!running) return
        scanRetryAttempt = (scanRetryAttempt + 1).coerceAtMost(5)
        val delay = if (errorCode == 6) RETRY_MAX_MS else (2_000L shl (scanRetryAttempt - 1)).coerceAtMost(RETRY_MAX_MS)
        handler.removeCallbacks(scanRetry)
        handler.postDelayed(scanRetry, delay)
        Log.w(TAG, "Retrying chat discovery in ${delay}ms (error $errorCode).")
    }

    private fun startGattServerAndAdvertising() {
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        service.addCharacteristic(BluetoothGattCharacteristic(
            CHAT_TX_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        ))

        try {
            gattServer = manager.openGattServer(context, serverCallback)
            val openedServer = gattServer
            if (openedServer == null || !openedServer.addService(service)) {
                Log.e(TAG, "Unable to add the BLE chat GATT service.")
                return
            }
            // Wait for onServiceAdded; advertising before then can create a discovery race.
        } catch (e: Exception) {
            Log.e(TAG, "Unable to open the BLE chat GATT server.", e)
        }
    }

    private fun beginAdvertising() {
        val adapter = manager.adapter ?: return
        advertiser = adapter.bluetoothLeAdvertiser ?: run {
            Log.e(TAG, "This device does not support BLE advertising.")
            return
        }
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .setTimeout(0)
            .build()
        advertiseCallback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                advertiseRetryAttempt = 0
                Log.d(TAG, "BLE peer chat advertising started.")
            }
            override fun onStartFailure(errorCode: Int) {
                Log.e(TAG, "BLE peer chat advertising failed: $errorCode")
                advertiseCallback = null
                scheduleAdvertiseRetry(errorCode)
            }
        }
        try {
            advertiser?.startAdvertising(settings, data, advertiseCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Unable to start BLE chat advertising.", e)
            advertiseCallback = null
            scheduleAdvertiseRetry(-1)
        }
    }

    private fun scheduleAdvertiseRetry(errorCode: Int) {
        if (!running || !ownsServerAndAdvertiser) return
        advertiseRetryAttempt = (advertiseRetryAttempt + 1).coerceAtMost(5)
        val delay = if (errorCode == 5) RETRY_MAX_MS else (2_000L shl (advertiseRetryAttempt - 1)).coerceAtMost(RETRY_MAX_MS)
        handler.removeCallbacks(advertiseRetry)
        handler.postDelayed(advertiseRetry, delay)
        Log.w(TAG, "Retrying chat advertising in ${delay}ms (error $errorCode).")
    }

    private fun connectTo(device: BluetoothDevice) {
        val address = device.address ?: return
        val peer = peers.computeIfAbsent(address) { Peer(address) }
        synchronized(peer) {
            if (peer.connecting || peer.characteristic != null) return
            peer.connecting = true
        }

        try {
            val gatt = device.connectGatt(context, false, object : BluetoothGattCallback() {
                override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
                    if (gatt == null) return
                    if (status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothProfile.STATE_CONNECTED) {
                        Log.d(TAG, "Connected to BLE chat peer $address")
                        try { gatt.discoverServices() } catch (e: Exception) {
                            Log.e(TAG, "Service discovery failed for $address", e)
                            disconnectPeer(address, gatt)
                        }
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED || status != BluetoothGatt.GATT_SUCCESS) {
                        disconnectPeer(address, gatt)
                    }
                }

                override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
                    if (gatt == null) return
                    val characteristic = if (status == BluetoothGatt.GATT_SUCCESS) {
                        gatt.getService(SERVICE_UUID)?.getCharacteristic(CHAT_TX_UUID)
                    } else null
                    if (characteristic == null) {
                        Log.w(TAG, "Peer $address does not expose the ResQ chat service.")
                        disconnectPeer(address, gatt)
                        return
                    }
                    peer.gatt = gatt
                    peer.characteristic = characteristic
                    peer.connecting = false
                    handler.post {
                        flushWaitingMessages(address)
                        sendNextPacket(peer)
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onCharacteristicWrite(
                    gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?, status: Int
                ) {
                    if (characteristic?.uuid != CHAT_TX_UUID) return
                    handler.post {
                        peer.writeTimeout?.let(handler::removeCallbacks)
                        peer.writeTimeout = null
                        peer.writing = false
                        if (status != BluetoothGatt.GATT_SUCCESS) {
                            Log.e(TAG, "Chat packet write failed for $address: $status")
                            completeCurrent(peer, success = false)
                        } else {
                            val outbound = peer.queue.peekFirst()
                            if (outbound != null) {
                                outbound.nextPacket++
                                sendNextPacket(peer)
                            }
                        }
                    }
                }
            }, BluetoothDevice.TRANSPORT_LE)
            peer.gatt = gatt
            if (gatt == null) disconnectPeer(address, null)
        } catch (e: Exception) {
            Log.e(TAG, "Unable to connect to BLE chat peer $address.", e)
            disconnectPeer(address, null)
        }
    }

    fun sendMessage(messageId: Int, address: String, text: String) {
        val peer = peers[address]
        if (peer?.characteristic == null || peer.gatt == null) {
            val timeout = Runnable {
                val waiting = waitingMessages.remove(messageId)
                if (waiting != null) emitDelivery(messageId, "failed", "That person is not nearby or connected yet.", address)
            }
            waitingMessages[messageId] = WaitingMessage(address, text, timeout)
            handler.postDelayed(timeout, PEER_WAIT_MS)
            if (peer == null) {
                try { manager.adapter?.getRemoteDevice(address)?.let { connectTo(it) } } catch (_: Exception) {}
            }
            return
        }
        enqueueMessage(messageId, text, listOf(peer))
    }

    private fun flushWaitingMessages(address: String) {
        val peer = peers[address]?.takeIf { it.characteristic != null && it.gatt != null } ?: return
        waitingMessages.entries.toList().forEach { (messageId, waiting) ->
            if (waiting.address != address) return@forEach
            if (waitingMessages.remove(messageId, waiting)) {
                handler.removeCallbacks(waiting.timeout)
                enqueueMessage(messageId, waiting.text, listOf(peer))
            }
        }
    }

    private fun enqueueMessage(messageId: Int, text: String, readyPeers: List<Peer>) {
        val packets = try { BleChatProtocol.fragment(messageId, text) } catch (e: IllegalArgumentException) {
            emitDelivery(messageId, "failed", e.message ?: "Message could not be sent.")
            return
        }
        deliveries[messageId] = Delivery(readyPeers.size)
        readyPeers.forEach { peer ->
            synchronized(peer) { peer.queue.addLast(Outbound(messageId, packets)) }
            handler.post { sendNextPacket(peer) }
        }
    }

    private fun sendNextPacket(peer: Peer) {
        synchronized(peer) {
            if (peer.writing) return
            val outbound = peer.queue.peekFirst() ?: return
            if (outbound.nextPacket >= outbound.packets.size) {
                completeCurrent(peer, success = true)
                return
            }
            val gatt = peer.gatt ?: return
            val characteristic = peer.characteristic ?: return
            characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
            @Suppress("DEPRECATION")
            characteristic.value = outbound.packets[outbound.nextPacket]
            peer.writing = true
            val started = try {
                @Suppress("DEPRECATION")
                gatt.writeCharacteristic(characteristic)
            } catch (e: Exception) {
                Log.e(TAG, "BLE write could not start for ${peer.address}.", e)
                false
            }
            if (!started) {
                peer.writing = false
                completeCurrent(peer, success = false)
            } else {
                val timeout = Runnable {
                    synchronized(peer) {
                        if (peer.writing && peer.queue.peekFirst() === outbound) {
                            peer.writing = false
                            peer.writeTimeout = null
                            completeCurrent(peer, success = false)
                        }
                    }
                }
                peer.writeTimeout = timeout
                handler.postDelayed(timeout, WRITE_TIMEOUT_MS)
            }
        }
    }

    private fun completeCurrent(peer: Peer, success: Boolean) {
        val outbound = peer.queue.pollFirst() ?: return
        peer.writeTimeout?.let(handler::removeCallbacks)
        peer.writeTimeout = null
        peer.writing = false
        val delivery = deliveries[outbound.messageId]
        if (delivery != null) {
            if (success) delivery.completed++ else delivery.failed++
            if (delivery.completed + delivery.failed >= delivery.expected) {
                deliveries.remove(outbound.messageId)
                when {
                    delivery.failed == 0 -> emitDelivery(outbound.messageId, "delivered", "Message delivered.", peer.address)
                    delivery.completed > 0 -> emitDelivery(outbound.messageId, "partial", "Message partly delivered.", peer.address)
                    else -> emitDelivery(outbound.messageId, "failed", "Delivery failed. Move closer and retry.", peer.address)
                }
            }
        }
        if (!success && peer.gatt != null) disconnectPeer(peer.address, peer.gatt)
        else sendNextPacket(peer)
    }

    private fun emitDelivery(messageId: Int, status: String, detail: String, address: String? = null) {
        context.sendBroadcast(Intent(ACTION_DELIVERY).setPackage(context.packageName)
            .putExtra(EXTRA_MESSAGE_ID, messageId.toString())
            .putExtra(EXTRA_PEER, address)
            .putExtra(EXTRA_STATUS, status)
            .putExtra(EXTRA_TEXT, detail))
    }

    private fun disconnectPeer(address: String, gatt: BluetoothGatt?) {
        val peer = peers[address]
        if (peer != null) {
            peer.connecting = false
            peer.characteristic = null
            peer.gatt = null
            peer.writing = false
            while (peer.queue.isNotEmpty()) completeCurrent(peer, success = false)
        }
        try { if (gatt != null) gatt.disconnect() } catch (_: Exception) {}
        try { gatt?.close() } catch (_: Exception) {}
        peers.remove(address)
    }

    fun stop() {
        if (!running) return
        running = false
        handler.removeCallbacks(scanRetry)
        handler.removeCallbacks(advertiseRetry)
        scanActive = false
        try { scanner?.stopScan(scanCallback) } catch (_: Exception) {}
        scanner = null
        if (ownsServerAndAdvertiser) {
            try {
                val callback = advertiseCallback
                if (callback != null) advertiser?.stopAdvertising(callback)
            } catch (_: Exception) {}
            advertiseCallback = null
            advertiser = null
            try { gattServer?.close() } catch (_: Exception) {}
            gattServer = null
        }
        peers.values.toList().forEach { disconnectPeer(it.address, it.gatt) }
        waitingMessages.values.forEach { waiting ->
            handler.removeCallbacks(waiting.timeout)
        }
        waitingMessages.clear()
        deliveries.clear()
        Log.d(TAG, "BLE peer chat stopped.")
    }
}
