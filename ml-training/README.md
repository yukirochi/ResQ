# ResQ Edge AI: RSSI Signal Denoiser Training Pipeline

This pipeline trains on-device models to filter noisy Bluetooth Low Energy (BLE) Received Signal Strength Indicator (RSSI) data into reliable proximity distances and radar classifications.

## Motivation & Architecture

Raw BLE RSSI in indoor and disaster environments suffers from severe multipath fading (Rayleigh/Rician), shadowing from concrete and debris, and human body attenuation (-10 dB to -15 dB). A raw RSSI jump of 10 dB can cause distance estimates to jump from 2 meters to 10 meters erratically.

ResQ solves this with a **2-stage hybrid edge AI pipeline**:
1. **Adaptive 1D Kalman Filter**: Smooths temporal noise with zero latency and adapts measurement noise $R$ to sliding window variance.
2. **1D-CNN Temporal Convolution Layer**: Applies learned temporal weights across a 30-sample window ($~10$ seconds of BLE advertisements) to extract the true underlying RF trajectory and detect "Warmer/Colder" trend direction.

## Pipeline Workflow

1. **Synthetic RF Generation** (`generate_synthetic_data.py`):
   ```bash
   python generate_synthetic_data.py
   ```
   Generates 33,000+ realistic sliding window samples simulating walking trajectories, wall obstacles, and multipath noise.

2. **Training & Benchmark Evaluation** (`train.py`):
   ```bash
   python train.py
   ```
   Evaluates Root Mean Squared Error (RMSE) and Mean Absolute Error (MAE) comparing Raw Unfiltered RSSI vs. Adaptive Kalman Filter vs. 1D-CNN Ensemble.

3. **TFLite Export** (`export_tflite.py`):
   ```bash
   python export_tflite.py
   ```
   Writes the optimized model into `assets/models/rssi_denoiser.tflite` for edge deployment via `react-native-fast-tflite`.
