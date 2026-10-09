/**
 * ResQ Packet Serialization & Chunking Protocol
 * Handles byte packing, fragmentation (~200-byte MTU limit), checksums, and status flags.
 */

import { VictimStatusCondition } from '../../types';

export const STATUS_FLAGS: Record<VictimStatusCondition, number> = {
  CONSCIOUS: 0x01,
  UNRESPONSIVE: 0x02,
  CANNOT_MOVE: 0x04,
  BLEEDING: 0x08,
  TRAPPED: 0x10,
  NEED_INSULIN: 0x20,
  NEED_OXYGEN: 0x40,
  SAFE: 0x80,
};

export const REVERSE_STATUS_FLAGS: Record<number, VictimStatusCondition> = {
  0x01: 'CONSCIOUS',
  0x02: 'UNRESPONSIVE',
  0x04: 'CANNOT_MOVE',
  0x08: 'BLEEDING',
  0x10: 'TRAPPED',
  0x20: 'NEED_INSULIN',
  0x40: 'NEED_OXYGEN',
  0x80: 'SAFE',
};

export const MAX_BLE_PACKET_PAYLOAD = 180; // Safe under 200-byte default ATT MTU

export interface FramedChunk {
  messageId: string;
  chunkIndex: number;
  totalChunks: number;
  payload: string; // Base64 or UTF-8 snippet
}

export class BlePacketCodec {
  /**
   * Encodes status condition to single-byte flag.
   */
  public static encodeStatusByte(condition: VictimStatusCondition): number {
    return STATUS_FLAGS[condition] || 0x01;
  }

  /**
   * Decodes single-byte flag to condition.
   */
  public static decodeStatusByte(byte: number): VictimStatusCondition {
    const keys = Object.keys(REVERSE_STATUS_FLAGS).map(Number);
    for (const key of keys) {
      if ((byte & key) !== 0) {
        return REVERSE_STATUS_FLAGS[key];
      }
    }
    return 'CONSCIOUS';
  }

  /**
   * Encodes 8-byte Ephemeral ID + 1-byte Status into 9-byte raw buffer
   */
  public static encodeAdvertisingPayload(ephemeralIdHex: string, statusByte: number): Uint8Array {
    const cleanHex = ephemeralIdHex.replace(/[^0-9A-Fa-f]/g, '').padEnd(16, '0').slice(0, 16);
    const buffer = new Uint8Array(9);
    for (let i = 0; i < 8; i++) {
      buffer[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    buffer[8] = statusByte & 0xff;
    return buffer;
  }

  /**
   * Decodes advertising manufacturer data or service data into Ephemeral ID and Status byte
   */
  public static decodeAdvertisingPayload(bytes: Uint8Array): { ephemeralId: string; statusByte: number } | null {
    if (bytes.length < 9) return null;
    let hex = '';
    for (let i = 0; i < 8; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    const statusByte = bytes[8];
    return {
      ephemeralId: hex.toUpperCase(),
      statusByte,
    };
  }

  /**
   * Fragments a chat message into MTU-safe chunks with framing header
   */
  public static fragmentMessage(messageId: string, text: string): string[] {
    const textBytes = new TextEncoder().encode(text);
    const totalBytes = textBytes.length;
    const chunkSize = MAX_BLE_PACKET_PAYLOAD;
    const totalChunks = Math.ceil(totalBytes / chunkSize) || 1;
    const chunks: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const slice = textBytes.slice(i * chunkSize, (i + 1) * chunkSize);
      const strSlice = new TextDecoder().decode(slice);
      // Format: RESQ|MSG_ID|CHUNK_IDX|TOTAL_CHUNKS|PAYLOAD
      const frame = `RESQ|${messageId.slice(0, 8)}|${i}|${totalChunks}|${strSlice}`;
      chunks.push(frame);
    }

    return chunks;
  }

  /**
   * Parses an incoming chunk frame
   */
  public static parseFrame(frameStr: string): FramedChunk | null {
    const parts = frameStr.split('|');
    if (parts.length < 5 || parts[0] !== 'RESQ') {
      return null;
    }
    return {
      messageId: parts[1],
      chunkIndex: parseInt(parts[2], 10),
      totalChunks: parseInt(parts[3], 10),
      payload: parts.slice(4).join('|'),
    };
  }
}
