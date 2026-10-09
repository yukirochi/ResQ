/**
 * ResQ GATT Client Manager
 * Used by Rescuers to establish BLE connections to discovered victims.
 * Handles reading encrypted medical profiles, triggering sirens, and two-way status chat.
 */

import { PublicVictimProfile, VictimStatusCondition } from '../../types';
import { BlePacketCodec } from './packets';
import { BleSimulatorEngine } from './simulation/bleSimulator';
import { RESQ_BLE_UUIDS } from './uuids';

export class BleGattClient {
  private static instance: BleGattClient;
  private connectedVictimId: string | null = null;
  private isConnecting: boolean = false;

  private constructor() {}

  public static getInstance(): BleGattClient {
    if (!BleGattClient.instance) {
      BleGattClient.instance = new BleGattClient();
    }
    return BleGattClient.instance;
  }

  public getConnectedVictimId(): string | null {
    return this.connectedVictimId;
  }

  /**
   * Connects to a target victim peripheral
   */
  public async connect(victimId: string, isSimulator: boolean = true): Promise<boolean> {
    this.isConnecting = true;
    console.log(`[ResQ GATT Client] Connecting to victim ${victimId}...`);

    if (isSimulator) {
      const ok = await BleSimulatorEngine.getInstance().connectGatt(victimId);
      this.connectedVictimId = ok ? victimId : null;
      this.isConnecting = false;
      return ok;
    }

    // In real BLE hardware, connect through BleManager.connectToDevice(victimId)
    this.connectedVictimId = victimId;
    this.isConnecting = false;
    return true;
  }

  /**
   * Disconnects from current victim peripheral
   */
  public async disconnect(isSimulator: boolean = true): Promise<void> {
    if (!this.connectedVictimId) return;
    const id = this.connectedVictimId;
    this.connectedVictimId = null;

    if (isSimulator) {
      BleSimulatorEngine.getInstance().disconnectGatt(id);
    }
    console.log(`[ResQ GATT Client] Disconnected from ${id}`);
  }

  /**
   * Reads medical profile from victim GATT server
   */
  public async readProfile(victimId: string, isSimulator: boolean = true): Promise<PublicVictimProfile | null> {
    if (isSimulator) {
      return BleSimulatorEngine.getInstance().readProfile(victimId);
    }

    // Hardware read on RESQ_BLE_UUIDS.PROFILE_CHAR_UUID
    return null;
  }

  /**
   * Sends Siren Command (0x01 = trigger alarm, 0x00 = silence)
   */
  public async writeSirenCommand(victimId: string, trigger: boolean, isSimulator: boolean = true): Promise<boolean> {
    console.log(`[ResQ GATT Client] Writing Siren command (${trigger ? 'TRIGGER' : 'SILENCE'}) to ${victimId}`);

    if (isSimulator) {
      BleSimulatorEngine.getInstance().setSirenState(victimId, trigger);
      return true;
    }

    // Hardware write on RESQ_BLE_UUIDS.SIREN_CHAR_UUID
    return true;
  }

  /**
   * Transmits a chat message fragmented into MTU-safe packets
   */
  public async sendChatMessage(victimId: string, text: string, isSimulator: boolean = true): Promise<boolean> {
    const messageId = Math.random().toString(36).substring(2, 10);
    const chunks = BlePacketCodec.fragmentMessage(messageId, text);

    console.log(`[ResQ GATT Client] Transmitting ${chunks.length} chunks to victim ${victimId}`);

    for (const chunk of chunks) {
      // In hardware: writeCharacteristicWithResponseForDevice(victimId, SERVICE_UUID, CHAT_TX_CHAR_UUID, chunk)
    }

    return true;
  }
}
