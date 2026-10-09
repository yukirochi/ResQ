# ResQ Bluetooth Low Energy (BLE) Protocol Specification

## 1. Overview

ResQ uses offline BLE 4.2 / 5.0 Core Specifications for decentralized peer-to-peer discovery and communication without cellular towers, Wi-Fi, or accounts.

- **Primary Service UUID**: `7E500001-B5A3-F393-E0A9-E50E24DCCA9E`
- **Legacy 16-bit Solicitation UUID**: `0xFE50`

---

## 2. Advertising Packet Layout (Max 31 Bytes)

The Victim phone broadcasts an unconnectable or connectable undirected advertisement:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Len (0x02)    | Type (0x01)   | Flags: LE General + BR/EDR Not|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Len (0x11)    | Type (0x07)   | Complete 128-bit Service UUID |
|               ... (16 bytes: 7E500001-B5A3-F393...)           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Len (0x0B)    | Type (0x16)   | Service UUID (2 bytes: 0xFE50)|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   8-byte Rotating Ephemeral ID (Anti-Tracking Salted Token)   |
|                               +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                               | Status Byte   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Status Byte Bitmask (Offset 29):

| Bit | Hex | Condition Meaning |
|---|---|---|
| Bit 0 | `0x01` | Conscious & Able to Speak |
| Bit 1 | `0x02` | Unresponsive / Unconscious |
| Bit 2 | `0x04` | Cannot Move Legs or Body |
| Bit 3 | `0x08` | Severe Bleeding |
| Bit 4 | `0x10` | Trapped Under Debris / Rubble |
| Bit 5 | `0x20` | Needs Insulin Urgently |
| Bit 6 | `0x40` | Difficulty Breathing / Needs Oxygen |
| Bit 7 | `0x80` | Safe / Rescued |

---

## 3. GATT Characteristics Specification

The Victim acts as GATT Server (`Peripheral`); Rescuers act as GATT Client (`Central`).

| Characteristic | UUID | Properties | Permissions | Payload Format |
|---|---|---|---|---|
| `STATUS` | `7E500002-...` | `NOTIFY`, `READ` | Read Only | 1 Byte bitmask |
| `PROFILE` | `7E500003-...` | `READ` | Read (Authenticated) | Sanitized JSON UTF-8 |
| `CHAT_TX` | `7E500004-...` | `WRITE`, `WRITE_NO_RESP` | Write Only | Chunked Frame |
| `CHAT_RX` | `7E500005-...` | `NOTIFY`, `READ` | Read Only | Chunked Frame |
| `SIREN` | `7E500006-...` | `WRITE` | Write Only | 1 Byte Command |

### 3.1 PROFILE Security Rules
- If Victim SOS mode is **INACTIVE**: GATT Server returns `0x05` (Read Not Permitted / Access Denied).
- If Victim SOS mode is **ACTIVE**: Returns JSON payload containing strictly the fields user toggled ON:
```json
{
  "ephemeralId": "A1B2C3D4E5F60001",
  "bloodType": "O+",
  "allergies": ["Penicillin"],
  "conditions": ["Asthma"],
  "mobilityImpaired": true,
  "emergencyContact": { "name": "David", "phone": "+1-555-0192" },
  "timestamp": 1728470000000
}
```

### 3.2 SIREN Command Byte
- `0x01`: Play High-dB Warble Siren at 100% audio volume.
- `0x00`: Silence Siren immediately.

### 3.3 CHAT Fragmentation & Framing (Max 180 Bytes per frame)
Format: `RESQ|MSG_ID|CHUNK_INDEX|TOTAL_CHUNKS|PAYLOAD`
Example:
`RESQ|8f92a10c|0|2|We are outside room 302, can you tap`
`RESQ|8f92a10c|1|2| twice on the door?`
