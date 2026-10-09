# ResQ Privacy & Security Architecture

## 1. Zero-Cloud Philosophy

ResQ is engineered with a strict **Zero-Knowledge, Zero-Cloud** architecture:
- No user accounts, logins, emails, or phone verification required.
- No analytics SDKs, crash reporters, or third-party telemetry.
- No external server connections; the app operates entirely in air-gapped conditions.

---

## 2. Anti-Tracking Rotating Ephemeral Identifiers

### The Threat:
Static Bluetooth MAC addresses or static beacon IDs can be logged by malicious observers to track a person's physical movements across time and space.

### ResQ Safeguard:
1. ResQ derives an **8-byte Ephemeral ID** salted with the current 15-minute epoch timestamp.
2. Every 15 minutes, the beacon regenerates a new uncorrelated identifier.
3. Observers cannot link beacons emitted across different 15-minute intervals.

---

## 3. Medical Profile Encryption & Access Gating

1. **At-Rest Hardware Encryption**:
   - The user's medical record is stored locally using `react-native-mmkv` encrypted storage.
   - The encryption key is secured inside the device's hardware-backed Secure Enclave (iOS Keychain) or Android KeyStore.

2. **Strict SOS Gating**:
   - When SOS is **OFF**, the GATT server rejects all read requests to the `PROFILE` characteristic (`GATT_READ_NOT_PERMITTED`).
   - The profile is only exposed over the air when the victim deliberately activates SOS.

3. **Field-Level Granular Consent**:
   - The victim decides which specific medical attributes are readable (e.g., blood type, allergies, conditions).
   - Sensitive identifying data such as national ID numbers, home address, or legal full names are **never** transmitted over BLE.

---

## 4. Legal Compliance

- **Philippine Data Privacy Act (DPA of 2012)**: Meets criteria for emergency life-preservation data processing without prior centralized registry requirements.
- **GDPR Article 9(2)(c)**: Processing is necessary in order to protect the vital interests of the data subject or of another natural person where the data subject is physically or legally incapable of giving consent.
