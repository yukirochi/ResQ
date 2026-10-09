# ResQ - SOS Emergency Rescue App

A React Native emergency application where a victim's phone broadcasts a Bluetooth beacon in the background, and a rescuer's phone detects it, estimates how close it is, sounds a siren on the victim's phone, and shows the victim's medical profile and live status chat.

**Crucially, this system operates with zero internet access.** Bluetooth Low Energy (BLE) is the only link between the two phones, and all Artificial Intelligence runs entirely offline.

## System Architecture

ResQ operates completely offline, designed for collapsed structures, remote areas, and disaster zones where cellular networks have failed.

### Core Technologies
*   **Framework:** React Native 0.76 (TypeScript)
*   **State Management:** Zustand
*   **Storage:** Encrypted `react-native-mmkv`
*   **Bluetooth Engine:** Custom BLE GATT Server / Scanner (react-native-ble-plx)
*   **Motion Sensors:** Automatic SOS detection via Accelerometer (`react-native-sensors`)
*   **AI Engine:** Offline NLP Intent Parser & TFLite RSSI Denoiser

## Features

### 1. Bluetooth Proximity Radar (Rescuer Mode)
A highly responsive Radar UI detects victims within 10-30 meters.
*   The raw BLE signal (RSSI) is notoriously noisy, bouncing off rubble and walls. 
*   **AI Signal Denoising:** ResQ processes the raw RSSI through an **Adaptive 1D Kalman Filter** and an **on-device TFLite CNN Denoiser**, converting erratic signals into a steady distance estimate.
*   Radar UI visually indicates if you are getting "Warmer" or "Colder" relative to the trapped victim.

### 2. Automatic SOS Detection (Crash & Shake)
If a user is trapped or injured and cannot reach their phone, ResQ detects the emergency automatically.
*   **Accelerometer Tracking:** Monitors continuous violent shaking or sudden impacts.
*   **False-Alarm Prevention:** Initiates a 10-second visual and haptic countdown. If the user is safe, they can tap "Cancel".
*   **Background Execution:** Continues monitoring while the phone is locked.
*   **Automated Action:** If the countdown is not cancelled, ResQ automatically enables Victim Mode, broadcasting the user's emergency BLE beacon.

### 3. Offline AI Assistant & Intent Engine
The built-in chat interface features an offline Natural Language Processing (NLP) engine designed as a fallback to heavy on-device LLMs (like Qwen).
*   **Intent Recognition:** Understands natural phrasing (e.g., "Is my Bluetooth working?", "Enable Auto SOS", "I am trapped").
*   **App Integration:** The AI directly queries the app state to report real-time Radar and BLE status, or triggers the SOS sequence if it detects life-threatening keywords.
*   **Survival Protocols:** Contains a deterministic database of medical and disaster protocols (CPR, bleeding, structural collapse).

### 4. Encrypted Medical Profiles
A victim can fill out a profile (blood type, allergies, conditions) stored securely on their device. When a rescuer approaches and connects via BLE, they can view these critical details to administer correct aid.

## Installation & Setup

1.  **Clone & Install Dependencies**
    ```bash
    git clone https://github.com/yukirochi/ResQ
    cd ResQ
    npm install
    ```

2.  **Android Setup**
    Ensure you have an Android phone connected via USB with Developer Mode and USB Debugging enabled.
    ```bash
    # Start the Metro bundler
    npx react-native start

    # Build and deploy to device
    npx react-native run-android
    ```

## Permissions & Privacy

ResQ requires strict Android permissions to function properly in emergencies:
*   `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT`: Essential for P2P communication and background beaconing.
*   `ACCESS_FINE_LOCATION`: Required by Android 11 and lower for BLE scanning.
*   `FOREGROUND_SERVICE`: Keeps the SOS beacon and Auto SOS accelerometer active when the screen is locked.
*   `POST_NOTIFICATIONS`: Displays the persistent SOS status in the Android notification drawer.

**Privacy:**
ResQ collects **zero** data. There is no cloud, no backend server, and no telemetry. The only data transmitted is a short-range Bluetooth packet containing an anonymous Ephemeral ID and user-selected medical flags, broadcast exclusively when the user is actively in SOS mode.

## Limitations
*   **Range:** BLE is physically limited by walls, concrete, and human bodies. Effective range is typically 10-30 meters.
*   **Direction:** The radar provides distance and trend ("getting warmer"), not a 3D compass direction.
*   **Background Limits:** While Foreground Services are used, certain strict manufacturer battery-savers (e.g., Xiaomi, Samsung) may eventually suspend the background beacon if the app is force-closed. Users should exempt ResQ from battery optimization.
