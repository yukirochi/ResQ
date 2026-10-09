/**
 * ResQ Victims Store (Zustand)
 * Manages real-time discovered victims, ranked proximity sorting, and selected victim inspection.
 */

import { create } from 'zustand';
import { DiscoveredVictim, PublicVictimProfile } from '../types';

interface VictimsState {
  victims: Record<string, DiscoveredVictim>;
  selectedVictimId: string | null;
  upsertVictim: (victim: DiscoveredVictim) => void;
  selectVictim: (id: string | null) => void;
  setVictimSiren: (id: string, active: boolean) => void;
  setVictimProfile: (id: string, profile: PublicVictimProfile) => void;
  clearVictims: () => void;
  getRankedVictims: () => DiscoveredVictim[];
  getNearestVictim: () => DiscoveredVictim | null;
}

export const useVictimsStore = create<VictimsState>((set, get) => ({
  victims: {},
  selectedVictimId: null,

  upsertVictim: (victim: DiscoveredVictim) => {
    set((state) => {
      const existing = state.victims[victim.id];
      return {
        victims: {
          ...state.victims,
          [victim.id]: {
            ...victim,
            profile: victim.profile || existing?.profile,
            isSirenActive: victim.isSirenActive || existing?.isSirenActive || false,
          },
        },
      };
    });
  },

  selectVictim: (id: string | null) => {
    set({ selectedVictimId: id });
  },

  setVictimSiren: (id: string, active: boolean) => {
    set((state) => {
      const v = state.victims[id];
      if (!v) return state;
      return {
        victims: {
          ...state.victims,
          [id]: { ...v, isSirenActive: active },
        },
      };
    });
  },

  setVictimProfile: (id: string, profile: PublicVictimProfile) => {
    set((state) => {
      const v = state.victims[id];
      if (!v) return state;
      return {
        victims: {
          ...state.victims,
          [id]: { ...v, profile },
        },
      };
    });
  },

  clearVictims: () => {
    set({ victims: {}, selectedVictimId: null });
  },

  getRankedVictims: (): DiscoveredVictim[] => {
    const list = Object.values(get().victims) as DiscoveredVictim[];
    // Sort by estimated distance (closest first)
    return list.sort((a, b) => a.estimatedDistanceMeters - b.estimatedDistanceMeters);
  },

  getNearestVictim: () => {
    const ranked = get().getRankedVictims();
    return ranked.length > 0 ? ranked[0] : null;
  },
}));
