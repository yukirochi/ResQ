/**
 * ResQ Mode Store (Zustand)
 * Manages active application mode, SOS state, and BLE simulator toggle.
 */

import { create } from 'zustand';
import { BleAdvertiserManager } from '../core/ble/advertiser';
import { BleGattServer } from '../core/ble/gattServer';
import { BleScannerManager } from '../core/ble/scanner';
import { ResqStorage } from '../core/storage/mmkv';
import { AppMode } from '../types';

interface ModeState {
  mode: AppMode;
  isSosActive: boolean;
  isSimulating: boolean;
  setMode: (mode: AppMode) => void;
  setSosActive: (active: boolean) => void;
  setSimulating: (simulating: boolean) => void;
  init: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'NONE',
  isSosActive: false,
  isSimulating: true, // Default to true so radar & simulator work immediately

  init: () => {
    const savedMode = ResqStorage.getString('user_app_mode', false) as AppMode | null;
    if (savedMode) {
      set({ mode: savedMode });
    }
  },

  setMode: (mode: AppMode) => {
    ResqStorage.setString('user_app_mode', mode, false);
    set({ mode });

    if (mode === 'RESCUE') {
      BleScannerManager.getInstance().startScan();
    } else {
      BleScannerManager.getInstance().stopScan();
    }

    if (mode !== 'VICTIM') {
      get().setSosActive(false);
      BleAdvertiserManager.getInstance().stopAdvertising();
      BleGattServer.getInstance().stopServer();
    }
  },

  setSosActive: (active: boolean) => {
    set({ isSosActive: active });
    BleGattServer.getInstance().setSosActive(active);

    if (active) {
      BleAdvertiserManager.getInstance().startAdvertising('CONSCIOUS');
    } else {
      BleAdvertiserManager.getInstance().stopAdvertising();
    }
  },

  setSimulating: (simulating: boolean) => {
    set({ isSimulating: simulating });
    BleScannerManager.getInstance().setUseSimulator(simulating);
  },
}));
