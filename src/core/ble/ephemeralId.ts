/**
 * ResQ Ephemeral ID Generator
 * Implements privacy-preserving 8-byte rotating identifiers.
 * Prevents third-party physical tracking and stalker-beacon attacks.
 * Rotation epoch: 15 minutes (900 seconds).
 */

export const EPHEMERAL_ROTATION_INTERVAL_MS = 15 * 60 * 1000; // 15 mins

export class EphemeralIdManager {
  private static instance: EphemeralIdManager;
  private currentEpoch: number = 0;
  private currentId: string = '';
  private baseDeviceSeed: string;

  private constructor() {
    this.baseDeviceSeed = this.generateRandomHex(16);
    this.rotateIfNecessary();
  }

  public static getInstance(): EphemeralIdManager {
    if (!EphemeralIdManager.instance) {
      EphemeralIdManager.instance = new EphemeralIdManager();
    }
    return EphemeralIdManager.instance;
  }

  /**
   * Returns current 8-byte (16 hex characters) ephemeral ID.
   */
  public getEphemeralId(): string {
    this.rotateIfNecessary();
    return this.currentId;
  }

  /**
   * Checks if current 15-minute epoch has rolled over.
   */
  public rotateIfNecessary(): boolean {
    const epoch = Math.floor(Date.now() / EPHEMERAL_ROTATION_INTERVAL_MS);
    if (epoch !== this.currentEpoch || !this.currentId) {
      this.currentEpoch = epoch;
      this.currentId = this.deriveEpochId(this.baseDeviceSeed, epoch);
      return true;
    }
    return false;
  }

  /**
   * Deterministically derive an 8-byte hex ID from seed + epoch
   */
  private deriveEpochId(seed: string, epoch: number): string {
    let hash = 0x811c9dc5; // FNV-1a 32-bit basis
    const input = `${seed}:${epoch}`;

    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    // Expand into 8 bytes (16 hex characters)
    const high = (hash >>> 0).toString(16).padStart(8, '0');
    let hash2 = hash ^ 0x55aa55aa;
    for (let i = 0; i < seed.length; i++) {
      hash2 ^= seed.charCodeAt(i);
      hash2 = Math.imul(hash2, 0x01000193);
    }
    const low = (hash2 >>> 0).toString(16).padStart(8, '0');

    return (high + low).slice(0, 16).toUpperCase();
  }

  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
