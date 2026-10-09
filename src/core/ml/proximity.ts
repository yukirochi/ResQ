/**
 * ResQ Proximity & Distance Estimation Engine
 * Implements ITU-R indoor path-loss models and dynamic trend analysis.
 * Classifies victims into Immediate (<2m), Near (<5m), and Far (<15m) zones.
 */

import { ProximityTrend, ProximityZone } from '../../types';

export interface PathLossConfig {
  txPower1Meter: number; // RSSI measured at 1m (typically -59 dBm to -62 dBm)
  pathLossExponent: number; // n: 2.0 = free space, 2.8 = standard indoor office, 3.8 = concrete/rubble
}

export const DEFAULT_PATH_LOSS: PathLossConfig = {
  txPower1Meter: -59.0,
  pathLossExponent: 2.8,
};

export class ProximityEngine {
  /**
   * Converts filtered RSSI into estimated physical distance (meters)
   * Log-distance path loss model: RSSI = A - 10 * n * log10(d)
   * => d = 10 ^ ((A - RSSI) / (10 * n))
   */
  public static calculateDistance(
    rssi: number,
    config: PathLossConfig = DEFAULT_PATH_LOSS
  ): number {
    if (rssi >= 0 || isNaN(rssi)) return 0.5;

    const ratio = (config.txPower1Meter - rssi) / (10 * config.pathLossExponent);
    const distance = Math.pow(10, ratio);

    // Clamp to realistic BLE max range (0.2m to 40m)
    return Math.max(0.2, Math.min(40.0, Math.round(distance * 10) / 10));
  }

  /**
   * Maps distance in meters to radar zones:
   * Immediate: < 2.0 m
   * Near: 2.0 m - 5.0 m
   * Far: 5.0 m - 15.0 m
   * Unknown/Lost: > 15.0 m
   */
  public static classifyZone(distanceMeters: number): ProximityZone {
    if (distanceMeters <= 2.2) {
      return 'IMMEDIATE';
    } else if (distanceMeters <= 5.5) {
      return 'NEAR';
    } else if (distanceMeters <= 18.0) {
      return 'FAR';
    }
    return 'UNKNOWN';
  }

  /**
   * Detects "Warmer" / "Colder" trend based on regression slope
   * slope > +0.3 dB/s => Warmer (moving towards victim)
   * slope < -0.3 dB/s => Colder (moving away from victim)
   */
  public static determineTrend(slopeDbmPerSec: number): ProximityTrend {
    if (slopeDbmPerSec > 0.35) {
      return 'WARMER';
    } else if (slopeDbmPerSec < -0.35) {
      return 'COLDER';
    } else if (Math.abs(slopeDbmPerSec) <= 0.35) {
      return 'STABLE';
    }
    return 'UNKNOWN';
  }

  /**
   * Color mapping for radar UI
   */
  public static getZoneColor(zone: ProximityZone): string {
    switch (zone) {
      case 'IMMEDIATE':
        return '#10B981'; // Vivid Emerald Safe/Found
      case 'NEAR':
        return '#F59E0B'; // Vivid Amber
      case 'FAR':
        return '#EF4444'; // Emergency Crimson
      case 'UNKNOWN':
      default:
        return '#64748B'; // Slate Grey
    }
  }
}
