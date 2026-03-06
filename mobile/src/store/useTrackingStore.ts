import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationPoint } from '../api/client';

interface Session {
  driverId: string;
  campaignId: string;
  campaignTitle: string;
}

interface TrackingState {
  session: Session | null;
  isTracking: boolean;
  currentLocation: LocationPoint | null;
  offlineQueue: LocationPoint[];
  pendingJoin: { campaignCode: string; validationCode: string } | null;
  setSession: (session: Session | null) => void;
  setTracking: (active: boolean) => void;
  setCurrentLocation: (loc: LocationPoint) => void;
  addToQueue: (loc: LocationPoint) => void;
  clearQueue: () => void;
  logout: () => void;
  setPendingJoin: (params: { campaignCode: string; validationCode: string } | null) => void;
}

export const useTrackingStore = create<TrackingState>()(
  persist(
    (set) => ({
      session: null,
      isTracking: false,
      currentLocation: null,
      offlineQueue: [],
      pendingJoin: null,
      setSession: (session) => set({ session }),
      setTracking: (isTracking) => set({ isTracking }),
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      addToQueue: (loc) =>
        set((state) => ({ offlineQueue: [...state.offlineQueue, loc] })),
      clearQueue: () => set({ offlineQueue: [] }),
      logout: () => set({ session: null, isTracking: false, currentLocation: null, offlineQueue: [] }),
      setPendingJoin: (pendingJoin) => set({ pendingJoin }),
    }),
    {
      name: 'rastreoya-tracking',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session, offlineQueue: state.offlineQueue }),
    }
  )
);
