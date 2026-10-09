/**
 * ResQ 1D Adaptive Kalman Filter for BLE RSSI Denoising
 * Serves as the robust, zero-latency baseline filter to compare neural models against.
 *
 * Mathematical Model:
 * State: x_k = x_{k-1} + w_k,       w_k ~ N(0, Q)  (Process noise)
 * Meas:  z_k = x_k + v_k,           v_k ~ N(0, R)  (Measurement noise)
 */

export interface KalmanConfig {
  processNoiseQ: number; // e.g., 0.08 - lower assumes stationary, higher adapts to rescuer moving
  measurementNoiseR: number; // e.g., 4.0 - variance of BLE signal jumps
  initialEstimateErrorP: number;
}

export class KalmanRssiFilter {
  private x: number; // State estimate (smoothed RSSI)
  private p: number; // Error covariance
  private q: number; // Process noise covariance
  private r: number; // Measurement noise covariance
  private isInitialized: boolean = false;

  constructor(config: Partial<KalmanConfig> = {}) {
    this.q = config.processNoiseQ ?? 0.12;
    this.r = config.measurementNoiseR ?? 3.5;
    this.p = config.initialEstimateErrorP ?? 5.0;
    this.x = -80.0;
  }

  /**
   * Resets filter state
   */
  public reset(initialMeasurement?: number): void {
    if (initialMeasurement !== undefined) {
      this.x = initialMeasurement;
      this.isInitialized = true;
    } else {
      this.x = -80.0;
      this.isInitialized = false;
    }
    this.p = 5.0;
  }

  /**
   * Updates Kalman state with a new raw RSSI measurement
   * Supports adaptive measurement noise scaling based on local variance
   */
  public update(measurement: number, localVariance: number = 0): number {
    if (!this.isInitialized) {
      this.x = measurement;
      this.isInitialized = true;
      return this.x;
    }

    // Adapt measurement noise R: high variance = increase R to trust measurement less
    const effectiveR = Math.max(1.5, this.r + localVariance * 0.2);

    // 1. Prediction Step
    // x_k|k-1 = x_{k-1} (stationary assumption between consecutive 200ms BLE advertisements)
    // P_k|k-1 = P_{k-1} + Q
    const pPredict = this.p + this.q;

    // 2. Innovation (Measurement Residual)
    const y = measurement - this.x;

    // 3. Innovation Covariance
    const s = pPredict + effectiveR;

    // 4. Optimal Kalman Gain
    const k = pPredict / s;

    // 5. Updated State Estimate
    this.x = this.x + k * y;

    // 6. Updated Covariance Estimate
    this.p = (1 - k) * pPredict;

    return this.x;
  }

  public getEstimate(): number {
    return this.x;
  }

  public getCovariance(): number {
    return this.p;
  }
}
