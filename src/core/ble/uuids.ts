/**
 * ResQ BLE UUID Definitions
 * Dedicated 128-bit custom service & characteristic UUIDs
 */

export const RESQ_BLE_UUIDS = {
  // Primary ResQ SOS Service UUID
  SERVICE_UUID: '7e500001-b5a3-f393-e0a9-e50e24dcca9e',

  // Characteristic: STATUS (Notify)
  // Emits real-time victim state flag (conscious, trapped, bleeding, etc.)
  STATUS_CHAR_UUID: '7e500002-b5a3-f393-e0a9-e50e24dcca9e',

  // Characteristic: PROFILE (Read)
  // Encrypted/filtered JSON medical record (only active during SOS)
  PROFILE_CHAR_UUID: '7e500003-b5a3-f393-e0a9-e50e24dcca9e',

  // Characteristic: CHAT_TX (Write / WriteWithoutResponse)
  // Rescuer -> Victim inbound messages (chunked to 200 bytes max)
  CHAT_TX_CHAR_UUID: '7e500004-b5a3-f393-e0a9-e50e24dcca9e',

  // Characteristic: CHAT_RX (Notify)
  // Victim -> Rescuer outbound messages & quick replies
  CHAT_RX_CHAR_UUID: '7e500005-b5a3-f393-e0a9-e50e24dcca9e',

  // Characteristic: SIREN (Write)
  // 1-byte command: 0x01 = Trigger high-dB alarm, 0x00 = Silence
  SIREN_CHAR_UUID: '7e500006-b5a3-f393-e0a9-e50e24dcca9e',
} as const;

// 16-bit Company/Service Solicitation for legacy advertising fallback
export const RESQ_16BIT_SOLICITATION = 0xfe50;
