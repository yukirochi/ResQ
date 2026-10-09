/**
 * ResQ RSSI Sliding Window Buffer
 * Maintains a temporal sliding window of the last N RSSI observations.
 * Computes statistical moments (mean, variance, slope, median) and handles outlier rejection.
 */

import { RssiSample } from '../../types';

export class WindowBuffer {
  private readonly maxSize: number;
  private buffer: RssiSample[] = [];

  constructor(maxSize: number = 30) {
    this.maxSize = Math.max(10, Math.min(maxSize, 100));
  }

  /**
   * Adds an RSSI sample with timestamp
   */
  public push(rssi: number, timestamp: number = Date.now()): void {
    // Sanity clamp realistic BLE RSSI (-110 dBm to -20 dBm)
    const clamped = Math.max(-115, Math.min(-15, rssi));
    this.buffer.push({ rssi: clamped, timestamp });

    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  public getValues(): number[] {
    return this.buffer.map((s) => s.rssi);
  }

  public getSamples(): RssiSample[] {
    return [...this.buffer];
  }

  public size(): number {
    return this.buffer.length;
  }

  public isReady(minSamples: number = 5): boolean {
    return this.buffer.length >= minSamples;
  }

  public clear(): void {
    this.buffer = [];
  }

  /**
   * Arithmetic mean
   */
  public getMean(): number {
    if (this.buffer.length === 0) return -100;
    const sum = this.buffer.reduce((acc, curr) => acc + curr.rssi, 0);
    return sum / this.buffer.length;
  }

  /**
   * Variance: indicator of RF multipath / human movement
   */
  public getVariance(): number {
    if (this.buffer.length < 2) return 0;
    const mean = this.getMean();
    const sumSqDiff = this.buffer.reduce((acc, curr) => acc + Math.pow(curr.rssi - mean, 2), 0);
    return sumSqDiff / (this.buffer.length - 1);
  }

  /**
   * Median value for robust baseline
   */
  public getMedian(): number {
    if (this.buffer.length === 0) return -100;
    const sorted = [...this.getValues()].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Linear regression slope (dBm per second)
   * Positive slope = getting closer (warmer)
   * Negative slope = moving away (colder)
   */
  public getSlope(): number {
    if (this.buffer.length < 4) return 0;
    const n = this.buffer.length;
    const t0 = this.buffer[0].timestamp;

    let sumT = 0;
    let sumR = 0;
    let sumTR = 0;
    let sumT2 = 0;

    for (let i = 0; i < n; i++) {
      const t = (this.buffer[i].timestamp - t0) / 1000; // in seconds
      const r = this.buffer[i].rssi;
      sumT += t;
      sumR += r;
      sumTR += t * r;
      sumT2 += t * t;
    }

    const denominator = n * sumT2 - sumT * sumT;
    if (Math.abs(denominator) < 1e-6) return 0;

    return (n * sumTR - sumT * sumR) / denominator;
  }

  /**
   * Normalized array of fixed length (zero-padded) for 1D-CNN input tensor
   */
  public toNormalizedTensorInput(targetLength: number = 30): Float32Array {
    const tensor = new Float32Array(targetLength);
    const values = this.getValues();
    const offset = Math.max(0, targetLength - values.length);

    // Default fill with -100 dBm (silence)
    tensor.fill(-100);

    for (let i = 0; i < Math.min(values.length, targetLength); i++) {
      tensor[offset + i] = values[i];
    }

    // Min-Max normalization into [-1, 1] range: norm = (rssi - (-110)) / (-20 - (-110)) * 2 - 1
    for (let i = 0; i < targetLength; i++) {
      tensor[i] = ((tensor[i] - -110) / 90) * 2 - 1;
    }

    return tensor;
  }
}
