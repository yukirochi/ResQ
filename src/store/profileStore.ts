/**
 * ResQ Profile Store (Zustand)
 * Encrypted medical record manager with granular field-level sharing toggles.
 * Never shares full name, home address, or ID over Bluetooth.
 */

import { create } from 'zustand';
import { EphemeralIdManager } from '../core/ble/ephemeralId';
import { BleGattServer } from '../core/ble/gattServer';
import { ResqStorage } from '../core/storage/mmkv';
import { PublicVictimProfile, SharePreferences, VictimProfile } from '../types';

interface ProfileState {
  profile: VictimProfile;
  isLoaded: boolean;
  init: () => void;
  updateProfile: (partial: Partial<VictimProfile>) => void;
  toggleSharePreference: (key: keyof SharePreferences) => void;
  getSanitizedPublicProfile: () => PublicVictimProfile;
}

const DEFAULT_PROFILE: VictimProfile = {
  id: 'local_victim_master_profile',
  fullName: 'User Profile (Private)',
  bloodType: 'O+',
  allergies: ['Penicillin', 'Peanuts'],
  conditions: ['Diabetic Type 1', 'Asthma'],
  mobilityImpaired: false,
  emergencyContact: {
    name: 'Emergency Contact',
    relationship: 'Family',
    phone: '911',
  },
  criticalNotes: 'Carrying rapid-acting insulin in backpack.',
  sharePreferences: {
    shareBloodType: true,
    shareAllergies: true,
    shareConditions: true,
    shareMobility: true,
    shareEmergencyContact: true,
    shareNotes: true,
  },
  updatedAt: Date.now(),
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  isLoaded: false,

  init: () => {
    const saved = ResqStorage.getObject<VictimProfile>('encrypted_user_profile', true);
    if (saved) {
      set({ profile: saved, isLoaded: true });
    } else {
      set({ profile: DEFAULT_PROFILE, isLoaded: true });
      ResqStorage.setObject('encrypted_user_profile', DEFAULT_PROFILE, true);
    }
    // Update GATT server sanitized profile
    BleGattServer.getInstance().updateSanitizedProfile(get().getSanitizedPublicProfile());
  },

  updateProfile: (partial: Partial<VictimProfile>) => {
    set((state) => {
      const updated: VictimProfile = {
        ...state.profile,
        ...partial,
        updatedAt: Date.now(),
      };
      ResqStorage.setObject('encrypted_user_profile', updated, true);
      BleGattServer.getInstance().updateSanitizedProfile(get().getSanitizedPublicProfile());
      return { profile: updated };
    });
  },

  toggleSharePreference: (key: keyof SharePreferences) => {
    set((state) => {
      const updatedPreferences = {
        ...state.profile.sharePreferences,
        [key]: !state.profile.sharePreferences[key],
      };
      const updatedProfile: VictimProfile = {
        ...state.profile,
        sharePreferences: updatedPreferences,
        updatedAt: Date.now(),
      };
      ResqStorage.setObject('encrypted_user_profile', updatedProfile, true);
      BleGattServer.getInstance().updateSanitizedProfile(get().getSanitizedPublicProfile());
      return { profile: updatedProfile };
    });
  },

  getSanitizedPublicProfile: (): PublicVictimProfile => {
    const p = get().profile;
    const prefs = p.sharePreferences;
    const ephemeralId = EphemeralIdManager.getInstance().getEphemeralId();

    return {
      ephemeralId,
      bloodType: prefs.shareBloodType ? p.bloodType : undefined,
      allergies: prefs.shareAllergies ? p.allergies : undefined,
      conditions: prefs.shareConditions ? p.conditions : undefined,
      mobilityImpaired: prefs.shareMobility ? p.mobilityImpaired : undefined,
      emergencyContact: prefs.shareEmergencyContact ? p.emergencyContact : undefined,
      criticalNotes: prefs.shareNotes ? p.criticalNotes : undefined,
      timestamp: Date.now(),
    };
  },
}));
