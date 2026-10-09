# ResQ

ResQ is an Android emergency and rescue companion designed to help people signal for help and help nearby rescuers find them when internet access is unavailable. Phones communicate directly over Bluetooth Low Energy (BLE); the app does not require an account or a cloud service for its core rescue features.

## Download

[Download the latest Android APK](ResQ.apk)

Download `ResQ.apk` to an Android phone and open it to install. Android may ask you to allow installation from the source you used to download the file. ResQ currently targets Android and requires Android 8.0 (API 26) or later.

## What ResQ does

- **SOS beacon:** A person can activate SOS so their phone advertises a BLE emergency signal for nearby ResQ scanners.
- **Nearby radar:** Tap **Scan nearby** to search for ResQ SOS beacons. The radar shows multiple detected people in a scrollable list; select someone to view estimated proximity and available medical information. Use the built-in multi-person simulation to explore the interface without another phone.
- **Two-way person-to-person messages:** ResQ phones discover nearby chat peers while Chat is open. Select a person from the scrollable people list to open a private conversation. Messages travel directly over BLE, and the recipient can reply from their own conversation.
- **Remote siren:** A rescuer can request that the selected phone sound its siren, helping locate it nearby.
- **Medical profile:** Users can record medical information to help rescuers understand important needs during a response.
- **Survival Guide:** Browse emergency and first-aid guidance included with the app.
- **Offline resQ assistant:** Ask questions through the floating chat head or Survival screen. Its guidance and response logic run on the phone.

## How the local assistant works

The current Android app does not include a downloadable or embedded large language model. Instead, the offline assistant uses JavaScript bundled in the app to recognize common emergency topics and questions, track limited context during the current session, and return relevant guidance written into the app. The Survival Guide content is also bundled locally. These features work without sending a question to a cloud AI service.

The Bluetooth radar separately smooths noisy signal-strength readings with a Kalman filter before estimating proximity. Bluetooth signal strength is affected by walls, bodies, device placement, and radio interference, so distance estimates are approximate. The current Android app does not run the neural-network or TensorFlow Lite denoiser described in some older project notes.

## Connectivity and safety

- BLE discovery, messaging, and remote siren control require Bluetooth to be enabled and the phones to be within Bluetooth range. Actual range and reliability vary with hardware and surroundings.
- To message between two phones, open Chat on both phones and select the other phone from **People nearby**. To locate an SOS user, activate SOS on their phone and tap **Scan nearby** on the rescuer's Radar screen. The scan control starts and stops detection; the rescuer does not need to activate SOS.
- The SOS beacon and scanner must have the Bluetooth permissions requested by Android. Background operation can also depend on Android battery and app settings.
- The assistant and Survival Guide provide general information and are not a substitute for emergency services or professional medical care. Call local emergency services when possible.
- The built-in multi-person simulation is for interface testing only. Simulated people do not represent nearby phones, and simulated messages are not transmitted.

## Messaging test

The BLE messaging flow was exercised between two Android emulators: each phone discovered the other, sent a message, and received a reply. For a repeatable manual check, install the same current build on both devices, enable Bluetooth, open Chat on both, select the other phone, then send a short message in each direction. A **Delivered** status means the other phone acknowledged the BLE write; confirm the incoming message appears in its conversation.

## Build the Android app

From the project root on a machine with Android SDK and Java 17 installed:

```powershell
cd android
.\gradlew.bat :app:assembleRelease
```

Gradle writes the release APK to `android/app/build/outputs/apk/release/app-release.apk`. Copy that file to the project root as `ResQ.apk` to update the download link above.

## Project layout

- `android/` — Native Android app, BLE services, and bundled interface.
- `preview/` — Browser preview of the bundled interface.
- `src/` — React Native prototype code.
- `docs/` — Field testing and project notes.
- `ml-training/` — Experimental signal-processing model training scripts; these are not used by the current Android app.
