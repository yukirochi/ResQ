/**
 * ResQ Encrypted Storage Service
 * Wraps react-native-mmkv with fallback memory store to prevent app boot crashes.
 */

import { LocalEncryptionService } from '../security/localEncryption';

class StorageAdapter {
  private memCache: Map<string, string> = new Map();
  private mmkvInstance: any = null;

  constructor() {
    try {
      const { MMKV } = require('react-native-mmkv');
      this.mmkvInstance = new MMKV({
        id: 'resq-secure-storage',
        encryptionKey: 'resq-vault-hardware-seed',
      });
    } catch (e) {
      // Running in environment without compiled native MMKV
      this.mmkvInstance = null;
    }
  }

  public setString(key: string, value: string, encrypt: boolean = true): void {
    const finalVal = encrypt ? LocalEncryptionService.encrypt(value) : value;
    if (this.mmkvInstance) {
      this.mmkvInstance.set(key, finalVal);
    } else {
      this.memCache.set(key, finalVal);
    }
  }

  public getString(key: string, decrypt: boolean = true): string | null {
    let raw: string | null = null;
    if (this.mmkvInstance) {
      raw = this.mmkvInstance.getString(key) ?? null;
    } else {
      raw = this.memCache.get(key) ?? null;
    }

    if (!raw) return null;
    return decrypt ? LocalEncryptionService.decrypt(raw) : raw;
  }

  public setObject<T>(key: string, value: T, encrypt: boolean = true): void {
    this.setString(key, JSON.stringify(value), encrypt);
  }

  public getObject<T>(key: string, decrypt: boolean = true): T | null {
    const str = this.getString(key, decrypt);
    if (!str) return null;
    try {
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  }

  public delete(key: string): void {
    if (this.mmkvInstance) {
      this.mmkvInstance.delete(key);
    } else {
      this.memCache.delete(key);
    }
  }
}

export const ResqStorage = new StorageAdapter();
