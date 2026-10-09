/**
 * ResQ BLE Advertiser Manager
 * Broadcasts the Victim Mode BLE beacon carrying:
 * 1. ResQ Service UUID
 * 2. 8-byte Rotating Ephemeral ID
 * 3. 1-byte Victim Status Flag
 * Strictly no private medical data in the advertisement payload!
 */

import { VictimStatusCondition } from '../../types';
import { EphemeralIdManager } from './ephemeralId';
import { BlePacketCodec } from './packets';
import { RESQ_BLE_UUIDS } from './uuids';

export class BleAdvertiserManager {
  private static instance: BleAdvertiserManager;
  private isAdvertising: boolean = false;
  private currentCondition: VictimStatusCondition = 'CONSCIOUS';
  private rotationTimer: any = null;

  private constructor() {}

  public static getInstance(): BleAdvertiserManager {
    if (!BleAdvertiserManager.instance) {
      BleAdvertiserManager.instance = new BleAdvertiserManager();
    }
    return BleAdvertiserManager.instance;
  }

  public getIsAdvertising(): boolean {
    return this.isAdvertising;
  }

  /**
   * Starts background advertising beacon
   */
  public async startAdvertising(initialCondition: VictimStatusCondition = 'CONSCIOUS'): Promise<boolean> {
    this.currentCondition = initialCondition;
    this.isAdvertising = true;

    const ephemeralId = EphemeralIdManager.getInstance().getEphemeralId();
    const statusByte = BlePacketCodec.encodeStatusByte(this.currentCondition);
    const payload = BlePacketCodec.encodeAdvertisingPayload(ephemeralId, statusByte);

    console.log(`[ResQ Advertiser] Broadcasting Beacon: EphemeralID=${ephemeralId}, Status=${statusByte.toString(16)}`);

    // In native Android/iOS, this interfaces with BleAdvertiserModule.kt or BlePeripheralModule.swift
    // Check for periodic 15-minute key rotation
    if (!this.rotationTimer) {
      this.rotationTimer = setInterval(() => {
        if (this.isAdvertising) {
          const rotated = EphemeralIdManager.getInstance().rotateIfNecessary();
          if (rotated) {
            console.log('[ResQ Advertiser] Ephemeral ID rotated for victim privacy.');
            this.updateBeaconPayload();
          }
        }
      }, 60000); // Check every minute
    }

    return true;
  }

  /**
   * Updates condition flag in broadcast packet without breaking connection
   */
  public updateCondition(condition: VictimStatusCondition): void {
    this.currentCondition = condition;
    if (this.isAdvertising) {
      this.updateBeaconPayload();
    }
  }

  private updateBeaconPayload(): void {
    const ephemeralId = EphemeralIdManager.getInstance().getEphemeralId();
    const statusByte = BlePacketCodec.encodeStatusByte(this.currentCondition);
    const payload = BlePacketCodec.encodeAdvertisingPayload(ephemeralId, statusByte);
    console.log(`[ResQ Advertiser] Updated Beacon Payload: ID=${ephemeralId}, Status=${statusByte.toString(16)}`);
  }

  /**
   * Stops advertising beacon
   */
  public async stopAdvertising(): Promise<boolean> {
    this.isAdvertising = false;
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    console.log('[ResQ Advertiser] Stopped Advertising.');
    return true;
  }
}
