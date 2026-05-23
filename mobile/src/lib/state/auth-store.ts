import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../types';

interface AuthState {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile: Profile) => set({ profile }),
      updateProfile: (updates: Partial<Profile>) => {
        const current = get().profile;
        if (current) set({ profile: { ...current, ...updates } });
      },
      logout: () => set({ profile: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
