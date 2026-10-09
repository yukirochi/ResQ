/**
 * ResQ GATT Server Implementation
 * Hosted on the Victim's device during Victim/SOS Mode.
 * Exposes:
 *  - STATUS (Notify): Real-time status conditions
 *  - PROFILE (Read): Sanitized medical summary (gated strictly to active SOS)
 *  - CHAT_TX (Write): Rescuer-to-victim chat input
 *  - CHAT_RX (Notify): Victim-to-rescuer chat output
 *  - SIREN (Write): 0x01 = alarm, 0x00 = silence
 */

import { PublicVictimProfile, VictimStatusCondition } from '../../types';
import { SirenManager } from '../audio/siren';
import { EphemeralIdManager } from './ephemeralId';
import { BlePacketCodec } from './packets';
import { RESQ_BLE_UUIDS } from './uuids';

export type InboundChatCallback = (message: string) => void;

export class BleGattServer {
  private static instance: BleGattServer;
  private isServerRunning: boolean = false;
  private isSosActive: boolean = false;
  private currentStatus: VictimStatusCondition = 'CONSCIOUS';
  private sanitizedProfile: PublicVictimProfile | null = null;
  private chatCallbacks: Set<InboundChatCallback> = new Set();

  private constructor() {}

  public static getInstance(): BleGattServer {
    if (!BleGattServer.instance) {
      BleGattServer.instance = new BleGattServer();
    }
    return BleGattServer.instance;
  }

  public startServer(isSos: boolean, profile: PublicVictimProfile | null): void {
    this.isServerRunning = true;
    this.isSosActive = isSos;
    this.sanitizedProfile = profile;
    console.log('[ResQ GATT Server] Started on service UUID:', RESQ_BLE_UUIDS.SERVICE_UUID);
  }

  public stopServer(): void {
    this.isServerRunning = false;
    this.sanitizedProfile = null;
    console.log('[ResQ GATT Server] Stopped.');
  }

  public setSosActive(active: boolean): void {
    this.isSosActive = active;
  }

  public updateSanitizedProfile(profile: PublicVictimProfile | null): void {
    this.sanitizedProfile = profile;
  }

  public updateStatus(condition: VictimStatusCondition): void {
    this.currentStatus = condition;
    const statusByte = BlePacketCodec.encodeStatusByte(condition);
    // In native layer, triggers characteristic notify on STATUS_CHAR_UUID
    console.log(`[ResQ GATT Server] Emitting STATUS Notification: 0x${statusByte.toString(16)}`);
  }

  /**
   * Handles Read Request for PROFILE characteristic
   * Critical Security Safeguard: Returns null if SOS is NOT active!
   */
  public handleProfileReadRequest(): string {
    if (!this.isSosActive || !this.sanitizedProfile) {
      console.warn('[ResQ GATT Server] Profile read blocked: SOS mode is not active.');
      return JSON.stringify({ error: 'ACCESS_DENIED_SOS_INACTIVE' });
    }
    return JSON.stringify(this.sanitizedProfile);
  }

  /**
   * Handles Write Request for SIREN characteristic
   */
  public handleSirenWriteRequest(commandByte: number): void {
    console.log(`[ResQ GATT Server] Siren command received: 0x0${commandByte}`);
    if (commandByte === 0x01) {
      SirenManager.getInstance().triggerSiren();
    } else {
      SirenManager.getInstance().silenceSiren();
    }
  }

  /**
   * Handles Write Request for CHAT_TX characteristic
   */
  public handleChatTxWriteRequest(payload: string): void {
    const frame = BlePacketCodec.parseFrame(payload);
    const content = frame ? frame.payload : payload;
    this.chatCallbacks.forEach((cb) => cb(content));
  }

  public onInboundChatMessage(callback: InboundChatCallback): () => void {
    this.chatCallbacks.add(callback);
    return () => this.chatCallbacks.delete(callback);
  }
}
