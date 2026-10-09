# SOS Rescue App

A React Native emergency app where a victim's phone broadcasts a Bluetooth beacon in the background, and a rescuer's phone detects it, estimates how close it is, sounds a siren on the victim's phone, and shows the victim's medical profile and live status chat.

## Goal

Help a rescuer find a victim who may be trapped, hurt or unable to speak, **with no internet at all**. Bluetooth Low Energy (BLE) is the only link between the two phones.

Design rules:

- **No Wi-Fi, mobile data or internet.** There is no backend, no accounts and no login.
- **Two modes.** Victim Mode (background beacon) and Rescue Mode (scanner and radar).
- **A neural network cleans the noisy Bluetooth signal** so the proximity estimate is usable.
- **The victim's profile** (diabetic, high blood pressure, disability, allergies) lives only on the victim's phone, encrypted.
- **A status chat** lets the victim report their condition through quick-reply chips.

## Features

| Feature | Victim Mode | Rescue Mode |
|---|---|---|
| Background BLE beacon | Advertises a rotating ephemeral ID | Scans for the app's service UUID |
| Signal cleaning | n/a | RSSI window goes through a neural network, with a Kalman filter as baseline |
| Proximity | n/a | Radar with Immediate (<2 m), Near (<5 m) and Far (<15 m) rings |
| Siren | Plays the alarm when told to | "Trigger siren" and "Silence" buttons |
| Medical profile | Editor with "share in emergency" toggles | Read-only victim card |
| Status chat | Quick-reply chips and short text | Chat with the nearest victim |
| Emergency call | One-tap Call 911 (cellular, no data needed) | One-tap Call 911 |

## System architecture

```
┌──────────────── VICTIM PHONE ────────────────┐         ┌──────────────── RESCUER PHONE ───────────────┐
│ UI: SOS Home, Profile editor, Chat           │         │ UI: Radar, Victim card, Chat, Siren button    │
│ ─────────────────────────────────────────────│         │ ──────────────────────────────────────────────│
│ Victim Mode Service (background)             │   BLE   │ Rescue Mode Service                           │
│  • BLE advertiser (service UUID + ephemeral  │◄───────►│  • BLE scanner (filter by service UUID)       │
│    ID + status flags)                        │         │  • RSSI stream → window buffer                │
│  • GATT server: STATUS, PROFILE, CHAT, SIREN │         │  • Signal cleaner (neural network, TFLite)    │
│  • Siren player (alarm audio)                │         │  • Proximity estimator + victim ranking       │
│  • Local encrypted profile                   │         │  • GATT client (read profile, chat, siren)    │
└──────────────────────────────────────────────┘         └───────────────────────────────────────────────┘
                         No backend. No accounts. No Wi-Fi. No internet.
```

### Rescue Mode data flow

```
BLE scan result → RSSI sample → window buffer (last 20–50 samples)
   → neural network (cleaned RSSI + proximity class)
   → victim tracker (rank by proximity) → radar UI
   → tap victim → GATT connect → read PROFILE / STATUS → chat / siren
```

### Bluetooth design

**Advertising (victim).** Advertising packets hold about 31 bytes, so the beacon carries only:

- A custom service UUID.
- An 8-byte ephemeral ID that rotates every 15 minutes so the victim can't be tracked.
- A 1-byte status flag.

**Never put medical data in the advertisement.** Anyone nearby could read it.

**GATT characteristics (the victim's phone is the server).**

| Characteristic | Direction | Purpose |
|---|---|---|
| `STATUS` | Notify | "Conscious / can talk / unresponsive" |
| `PROFILE` | Read | Medical summary, only the fields the victim ticked, only while SOS is active |
| `CHAT_TX` | Write (rescuer to victim) | Short chat messages, about 200 bytes max per packet |
| `CHAT_RX` | Notify (victim to rescuer) | Short chat messages and quick-reply status |
| `SIREN` | Write | Command byte: `1` = play siren, `0` = silence |

### Neural network signal cleaner

Raw RSSI jumps by ±10 dB or more because of walls, bodies and multipath, so distance estimated from it is unreliable.

- **Input:** a sliding window of the last 20–50 RSSI samples.
- **Model:** a small 1D-CNN or GRU. It outputs a cleaned RSSI and a proximity class (Immediate, Near, Far).
- **Training:** collect RSSI traces at known distances, train in PyTorch or TensorFlow, and export to TFLite.
- **On-device inference:** `react-native-fast-tflite` (or `onnxruntime-react-native` if you export ONNX).
- **Baseline first:** build a Kalman filter before the model so you can measure whether the network actually helps.

### Safeguards (replacing authentication)

Because there are no accounts, these protect the victim's data:

- `PROFILE` returns data only while SOS or Victim Mode is active, and returns nothing otherwise.
- The victim chooses which fields are shared (for example diabetic, high blood pressure, disability, allergies, emergency contact). ID numbers and home address are never shared.
- The profile is read-only for rescuers.
- Use BLE LE Secure Connections so data isn't sniffed over the air.
- The ephemeral ID rotates every 15 minutes.
- The victim can silence the siren from their own phone.

**Known trade-off:** any phone running Rescue Mode within range can read the shared fields and trigger the siren while SOS is on. If that is too open, add an optional PIN that the victim tells the rescuer.

## Tech stack

| Area | Choice |
|---|---|
| App | React Native with TypeScript |
| BLE scanning and GATT client | `react-native-ble-plx` |
| BLE advertising and GATT server | Custom native modules (Kotlin for Android, Swift for iOS), or an existing peripheral library you have tested |
| Neural network on device | `react-native-fast-tflite` |
| State | Zustand |
| Local storage | `react-native-mmkv` with encryption, key in Keychain/Keystore (`react-native-keychain`) |
| Siren audio | `react-native-sound` (bundled audio file) |
| Navigation | React Navigation |
| Model training | Python, PyTorch or TensorFlow, TFLite export |

## Folder structure

```
sos-rescue-app/
├── README.md
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
│
├── android/
│   └── app/src/main/
│       ├── AndroidManifest.xml            # BLUETOOTH_* + FOREGROUND_SERVICE permissions
│       └── java/com/sosrescue/
│           ├── ble/
│           │   ├── BleAdvertiserModule.kt # native module: start/stop advertising
│           │   └── GattServerModule.kt    # native module: GATT server (STATUS, PROFILE, CHAT, SIREN)
│           └── service/
│               └── VictimModeService.kt   # foreground service + persistent notification
│
├── ios/
│   └── SosRescue/
│       ├── Info.plist                     # Bluetooth usage text + background modes
│       ├── BlePeripheralModule.swift      # CoreBluetooth peripheral + GATT server
│       └── StateRestoration.swift         # restore advertising after the app is killed
│
├── assets/
│   ├── audio/siren.mp3                    # bundled alarm sound
│   ├── images/                            # ambulance art, avatars, logo
│   └── models/rssi_denoiser.tflite        # bundled neural network
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx          # ModePicker → VictimTabs or RescueTabs
│   │   │   ├── VictimTabs.tsx             # Home, Profile, Chat
│   │   │   └── RescueTabs.tsx             # Radar, Victims, Settings
│   │   └── providers/
│   │       ├── ThemeProvider.tsx
│   │       ├── BleProvider.tsx
│   │       └── ModeProvider.tsx           # remembers chosen mode on the device
│   │
│   ├── features/
│   │   ├── onboarding/
│   │   │   ├── ModePickerScreen.tsx       # Victim Mode / Rescue Mode
│   │   │   └── PermissionsScreen.tsx      # Bluetooth, notifications, battery exemption
│   │   ├── victim/
│   │   │   ├── screens/
│   │   │   │   ├── SosHomeScreen.tsx      # big SOS button, current status, Call 911
│   │   │   │   └── HelpOnWayScreen.tsx    # "Rescuer nearby" state
│   │   │   ├── components/
│   │   │   │   ├── SosButton.tsx
│   │   │   │   └── StatusChips.tsx        # "I can talk", "Can't move", "Need insulin"...
│   │   │   └── services/
│   │   │       └── victimModeService.ts   # start/stop beacon + GATT server
│   │   ├── rescue/
│   │   │   ├── screens/
│   │   │   │   ├── RadarScreen.tsx        # proximity rings + "getting warmer"
│   │   │   │   └── VictimDetailScreen.tsx # medical card, chat, siren
│   │   │   ├── components/
│   │   │   │   ├── ProximityRing.tsx
│   │   │   │   ├── VictimCard.tsx
│   │   │   │   └── SirenButton.tsx
│   │   │   └── services/
│   │   │       ├── rescueModeService.ts   # scan loop + tracker
│   │   │       └── victimTracker.ts       # per-device RSSI history and ranking
│   │   ├── profile/
│   │   │   ├── screens/ProfileEditorScreen.tsx
│   │   │   ├── components/ShareToggle.tsx # "share in emergency" per field
│   │   │   └── profileSchema.ts           # illness, disability, allergies, contact
│   │   └── chat/
│   │       ├── screens/ChatScreen.tsx
│   │       ├── components/
│   │       │   ├── Bubble.tsx             # sent / delivered state
│   │       │   └── QuickReplies.tsx
│   │       └── services/
│   │           ├── bleChatTransport.ts    # split into packets, queue, retry
│   │           └── messageQueue.ts
│   │
│   ├── core/
│   │   ├── ble/
│   │   │   ├── uuids.ts                   # service + characteristic UUIDs
│   │   │   ├── advertiser.ts              # wraps native advertiser module
│   │   │   ├── gattServer.ts              # wraps native GATT server module
│   │   │   ├── scanner.ts                 # react-native-ble-plx scanning
│   │   │   ├── gattClient.ts              # connect, read, write, notify
│   │   │   ├── ephemeralId.ts             # 15-minute rotating ID
│   │   │   └── packets.ts                 # encode/decode status, chat, siren
│   │   ├── ml/
│   │   │   ├── windowBuffer.ts            # sliding RSSI window
│   │   │   ├── kalmanBaseline.ts          # baseline filter
│   │   │   ├── signalCleaner.ts           # loads TFLite model, runs inference
│   │   │   └── proximity.ts               # class → ring + "warmer/colder" trend
│   │   ├── audio/
│   │   │   └── siren.ts                   # loop alarm, max volume, silence
│   │   ├── security/
│   │   │   ├── localEncryption.ts         # encrypt/decrypt profile
│   │   │   └── keychain.ts                # key in Keychain/Keystore
│   │   ├── storage/
│   │   │   └── mmkv.ts                    # encrypted local storage
│   │   └── background/
│   │       ├── permissions.ts             # runtime Bluetooth permissions
│   │       └── batteryOptimization.ts     # Android exemption request
│   │
│   ├── store/
│   │   ├── modeStore.ts
│   │   ├── victimsStore.ts                # nearby victims, ranked
│   │   ├── chatStore.ts
│   │   └── profileStore.ts
│   ├── ui/
│   │   ├── theme.ts                       # red gradient palette, spacing, radii
│   │   └── components/                    # Button, Card, GradientBackground, Icon
│   ├── hooks/
│   │   ├── useBlePermissions.ts
│   │   └── useNearbyVictims.ts
│   ├── types/
│   └── utils/
│
├── ml-training/                           # not shipped in the app
│   ├── README.md
│   ├── requirements.txt
│   ├── data/
│   │   ├── raw/                           # RSSI logs with known distances
│   │   └── processed/
│   ├── notebooks/
│   │   ├── 01_collect_and_explore.ipynb
│   │   ├── 02_kalman_baseline.ipynb
│   │   └── 03_train_denoiser.ipynb
│   ├── train.py
│   └── export_tflite.py                   # writes assets/models/rssi_denoiser.tflite
│
├── tools/
│   └── rssi_logger/                       # small app/script to log RSSI at set distances
│
└── docs/
    ├── gatt-protocol.md                   # exact byte layouts
    ├── privacy.md                         # what is shared and when
    └── field-test-checklist.md
```

**Not in this project:** `backend/`, `features/auth/`, `core/api/`, WebSocket chat, map tiles, push notifications.

## Permissions

**Android (`AndroidManifest.xml`)**

- `BLUETOOTH_SCAN`
- `BLUETOOTH_ADVERTISE`
- `BLUETOOTH_CONNECT`
- `FOREGROUND_SERVICE` (and the connected-device foreground service type)
- `POST_NOTIFICATIONS` (for the persistent Victim Mode notification)
- `ACCESS_FINE_LOCATION` (only for Android 11 and below, where BLE scanning requires it)

**iOS (`Info.plist`)**

- `NSBluetoothAlwaysUsageDescription`
- `UIBackgroundModes`: `bluetooth-peripheral` and `bluetooth-central`

No Wi-Fi, local network or internet permissions are needed.

## Build order

Follow this order. The riskiest part (BLE in the background) comes first.

1. **BLE proof of concept.** One phone advertises the service UUID, a second phone scans for it and logs RSSI. Test on real devices, since emulators have no Bluetooth.
2. **Raw RSSI to Kalman filter to proximity radar.** Get a working "getting warmer" screen without any neural network.
3. **Background hardening.** Android foreground service with a persistent notification and a battery-optimization exemption. iOS background modes and state restoration. Leave both phones locked for 30+ minutes and confirm the rescuer still finds the victim.
4. **GATT server and client.** Add `STATUS`, `PROFILE` (returned only while SOS is active) and `SIREN`. Make the siren play and silence reliably.
5. **Profile editor with local encryption.** Fields: illness, disability, allergies, emergency contact, each with a "share in emergency" toggle.
6. **BLE chat.** Quick-reply chips first, free text second. Add packet splitting (about 200 bytes), a message queue, and sent / delivered state.
7. **Collect data and train the neural network.** Log RSSI at known distances and in different spaces (open room, behind a wall, in a bag). Train, export to TFLite, and compare against the Kalman baseline. Ship the model only if it clearly wins.
8. **Field testing.** Test through walls, in crowds, with low battery, and with the victim's phone in a pocket. Record results in `docs/field-test-checklist.md`.

## Getting started

```bash
# 1. Create the project
npx @react-native-community/cli init SosRescue --template react-native-template-typescript
cd SosRescue

# 2. Install core dependencies
npm install react-native-ble-plx react-native-fast-tflite zustand \
  react-native-mmkv react-native-keychain react-native-sound \
  @react-navigation/native @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context

# 3. iOS pods
cd ios && pod install && cd ..

# 4. Run on a real device (Bluetooth does not work in simulators)
npx react-native run-android
npx react-native run-ios --device
```

Then create the folders from the structure above and start at build step 1.

## Limitations to plan for

- **Range is about 10–30 m indoors**, less through concrete or rubble. This suits "find the victim in rubble or a crowd", not wide-area dispatch.
- **BLE gives distance, not direction.** The radar shows "warmer / colder" as the rescuer moves, not a pointer on a map.
- **Background advertising needs native code.** `react-native-ble-plx` only handles the scanning side, so the advertiser and GATT server modules must be written or adopted for each platform.
- **iOS is the harder platform.** Backgrounded iOS advertising is reduced, so the rescuer's scan must filter by the exact service UUID. Test on real iPhones early.
- **Chat is live only while connected.** Messages are delivered only when both phones are in range, so unsent messages are queued.
- **Medical data is sensitive.** Keep it encrypted on the device, share only what the victim ticked, and check the privacy laws where you deploy (for example the Philippine Data Privacy Act).
- **This does not replace emergency services.** Keep the Call 911 button on the home screen. It uses the cellular network, so it works without internet.
