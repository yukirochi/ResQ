/**
 * ResQ BLE Scanner Manager
 * Handles hardware scanning via react-native-ble-plx with seamless fallback to BleSimulatorEngine.
 * Applies ResQ Service UUID filtering to maximize battery life and ignore unneeded peripherals.
 */

import { DiscoveredVictim } from '../../types';
import { SignalCleanerManager } from '../ml/signalCleaner';
import { BlePacketCodec } from './packets';
import { BleSimulatorEngine } from './simulation/bleSimulator';
import { RESQ_BLE_UUIDS } from './uuids';

export type ScannerListener = (victim: DiscoveredVictim) => void;

export class BleScannerManager {
  private static instance: BleScannerManager;
  private isScanning: boolean = false;
  private useSimulator: boolean = true; // Defaults to simulator for immediate testing
  private listeners: Set<ScannerListener> = new Set();
  private bleManager: any = null; // Lazy-loaded react-native-ble-plx instance

  private constructor() {}

  public static getInstance(): BleScannerManager {
    if (!BleScannerManager.instance) {
      BleScannerManager.instance = new BleScannerManager();
    }
    return BleScannerManager.instance;
  }

  public setUseSimulator(enabled: boolean): void {
    const wasScanning = this.isScanning;
    if (wasScanning) {
      this.stopScan();
    }
    this.useSimulator = enabled;
    if (wasScanning) {
      this.startScan();
    }
  }

  public getIsUsingSimulator(): boolean {
    return this.useSimulator;
  }

  public getIsScanning(): boolean {
    return this.isScanning;
  }

  public addListener(listener: ScannerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public startScan(): void {
    if (this.isScanning) return;
    this.isScanning = true;

    if (this.useSimulator) {
      BleSimulatorEngine.getInstance().startScanning(this.handleDiscoveredVictim);
    } else {
      this.startHardwareScan();
    }
  }

  public stopScan(): void {
    if (!this.isScanning) return;
    this.isScanning = false;

    if (this.useSimulator) {
      BleSimulatorEngine.getInstance().stopScanning(this.handleDiscoveredVictim);
    } else {
      this.stopHardwareScan();
    }
  }

  private handleDiscoveredVictim = (victim: DiscoveredVictim): void => {
    this.listeners.forEach((fn) => fn(victim));
  };

  private async startHardwareScan(): Promise<void> {
    try {
      // Lazy load to prevent crash if native module isn't compiled yet in environment
      if (!this.bleManager) {
        const { BleManager } = require('react-native-ble-plx');
        this.bleManager = new BleManager();
      }

      this.bleManager.startDeviceScan(
        [RESQ_BLE_UUIDS.SERVICE_UUID],
        { allowDuplicates: true },
        (error: any, device: any) => {
          if (error) {
            console.warn('[ResQ BLE Scanner] Error:', error);
            return;
          }
          if (!device) return;

          // Decode manufacturer data or service data
          let ephemeralId = device.id;
          let statusByte = 0x01;

          if (device.manufacturerData) {
            const rawBytes = Uint8Array.from(atob(device.manufacturerData), (c) => c.charCodeAt(0));
            const decoded = BlePacketCodec.decodeAdvertisingPayload(rawBytes);
            if (decoded) {
              ephemeralId = decoded.ephemeralId;
              statusByte = decoded.statusByte;
            }
          }

          const rawRssi = device.rssi || -85;
          const pipeline = SignalCleanerManager.getInstance().getOrCreatePipeline(ephemeralId);
          const filtered = pipeline.processSample(rawRssi);

          const discovered: DiscoveredVictim = {
            id: ephemeralId,
            rawRssi,
            filteredRssi: filtered.filteredRssi,
            estimatedDistanceMeters: filtered.estimatedDistanceMeters,
            zone: filtered.zone,
            trend: filtered.trend,
            lastSeen: Date.now(),
            statusByte,
            condition: BlePacketCodec.decodeStatusByte(statusByte),
            isSirenActive: false,
            isConnected: false,
            rssiHistory: pipeline.getBuffer().getSamples(),
          };

          this.handleDiscoveredVictim(discovered);
        }
      );
    } catch (e) {
      console.warn('[ResQ BLE Scanner] Native hardware scanner failed, falling back to simulator', e);
      this.useSimulator = true;
      BleSimulatorEngine.getInstance().startScanning(this.handleDiscoveredVictim);
    }
  }

  private stopHardwareScan(): void {
    if (this.bleManager) {
      try {
        this.bleManager.stopDeviceScan();
      } catch (e) {
        console.warn('[ResQ BLE Scanner] Error stopping device scan:', e);
      }
    }
  }
}
