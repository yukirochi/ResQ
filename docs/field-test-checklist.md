# ResQ Field Testing & Disaster Drill Checklist

Use this protocol during simulated search and rescue field trials to validate RF propagation, battery longevity, and background advertising resilience.

---

## 1. Test Matrix

| ID | Test Scenario | Physical Setup | Pass Criteria | Status |
|---|---|---|---|---|
| **T-01** | Line of Sight (LOS) | Rescuer and Victim in open field (15m) | Discovered within 3s; RSSI variance < 4 dB | [ ] |
| **T-02** | Concrete Wall Obstacle | Victim behind 15cm reinforced concrete wall | Discovered within 6s; Kalman filter stabilizes distance within ±2m | [ ] |
| **T-03** | Rubble & Debris | Victim phone buried under backpacks, drywall, and wood | Siren audible; Beacon signal received up to 8m away | [ ] |
| **T-04** | Pocket / Body Attenuation | Victim phone kept in front jeans pocket or backpack | Distance estimate reflects body shadow; trend indicates approaching | [ ] |
| **T-05** | High-Density RF (Crowd) | Environment with 20+ active Bluetooth devices & Wi-Fi routers | Service UUID filter ignores non-ResQ devices; ResQ victims ranked top | [ ] |
| **T-06** | 30-Minute Screen Lock | Both devices locked and screen off for 30+ minutes | Android foreground service / iOS CoreBluetooth keeps broadcasting | [ ] |
| **T-07** | Remote Siren Trigger | Rescuer presses "Trigger Siren" from 8m away | Victim phone sounds high-dB warble alarm within 1.5s | [ ] |
| **T-08** | Offline P2P Chat | Rescuer transmits 3 quick-reply status chips | Messages show "DELIVERED" receipt on rescuer screen | [ ] |
| **T-09** | Medical Profile Gating | Attempt read when SOS is OFF vs when SOS is ON | SOS OFF: returns Access Denied; SOS ON: returns blood type & allergies | [ ] |
| **T-10** | Ephemeral Rotation | Observe beacon over 20-minute window | Ephemeral ID rotates at minute 15 without disconnecting ongoing session | [ ] |

---

## 2. Recommended Test Equipment
- 2x Physical Android phones (Android 12+ recommended)
- 1x Physical iPhone (iOS 15+)
- Tape measure / laser distance meter
- Decibel meter (to verify siren output > 85 dBA at 1 meter)
