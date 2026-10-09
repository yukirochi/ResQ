package com.sosrescue.ble

import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Small, MTU-safe packet framing shared by the BLE chat client and GATT server. */
internal object BleChatProtocol {
    private const val MAGIC_1: Byte = 0x52
    private const val MAGIC_2: Byte = 0x51
    private const val HEADER_SIZE = 12
    private const val DATA_SIZE = 8 // 20 byte ATT payload at the default MTU of 23.
    private const val MAX_MESSAGE_BYTES = DATA_SIZE * 255

    data class Frame(val messageId: Int, val senderDeviceId: String, val index: Int, val count: Int, val payload: ByteArray)

    fun fragment(messageId: Int, senderDeviceId: String, message: String): List<ByteArray> {
        require(senderDeviceId.matches(Regex("[0-9a-fA-F]{8}"))) { "Invalid sender identity." }
        val bytes = message.toByteArray(Charsets.UTF_8)
        require(bytes.isNotEmpty() && bytes.size <= MAX_MESSAGE_BYTES) { "Message is too long." }
        val count = (bytes.size + DATA_SIZE - 1) / DATA_SIZE
        return (0 until count).map { index ->
            val start = index * DATA_SIZE
            val end = minOf(start + DATA_SIZE, bytes.size)
            ByteBuffer.allocate(HEADER_SIZE + end - start)
                .order(ByteOrder.BIG_ENDIAN)
                .put(MAGIC_1)
                .put(MAGIC_2)
                .putInt(messageId)
                .putInt(senderDeviceId.toLong(16).toInt())
                .put(index.toByte())
                .put(count.toByte())
                .put(bytes, start, end - start)
                .array()
        }
    }

    fun parse(packet: ByteArray?): Frame? {
        if (packet == null || packet.size <= HEADER_SIZE || packet[0] != MAGIC_1 || packet[1] != MAGIC_2) return null
        val input = ByteBuffer.wrap(packet).order(ByteOrder.BIG_ENDIAN)
        input.position(2)
        val messageId = input.int
        val senderDeviceId = "%08x".format(input.int)
        val index = input.get().toInt() and 0xff
        val count = input.get().toInt() and 0xff
        if (count == 0 || index >= count) return null
        return Frame(messageId, senderDeviceId, index, count, packet.copyOfRange(HEADER_SIZE, packet.size))
    }

    class Reassembler {
        private data class Partial(val parts: Array<ByteArray?>, var received: Int = 0)
        private val partials = mutableMapOf<String, Partial>()

        @Synchronized
        fun accept(peerAddress: String, frame: Frame): String? {
            val key = "$peerAddress:${frame.senderDeviceId}:${frame.messageId}"
            val partial = partials.getOrPut(key) { Partial(arrayOfNulls(frame.count)) }
            if (partial.parts.size != frame.count) {
                partials.remove(key)
                return null
            }
            if (partial.parts[frame.index] == null) {
                partial.parts[frame.index] = frame.payload
                partial.received++
            }
            if (partial.received != partial.parts.size) return null

            partials.remove(key)
            val size = partial.parts.sumOf { it?.size ?: 0 }
            val bytes = ByteArray(size)
            var offset = 0
            partial.parts.forEach { part ->
                val data = part ?: return null
                data.copyInto(bytes, offset)
                offset += data.size
            }
            return String(bytes, Charsets.UTF_8)
        }
    }
}
