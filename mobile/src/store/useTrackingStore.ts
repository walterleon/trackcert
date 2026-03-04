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
  setSession: (session: Session | null) => void;
  setTracking: (active: boolean) => void;
  setCurrentLocation: (loc: LocationPoint) => void;
  addToQueue: (loc: LocationPoint) => void;
  clearQueue: () => void;
  logout: () => void;
}

export const useTrackingStore = create<TrackingState>()(
  persist(
    (set) => ({
      session: null,
      isTracking: false,
      currentLocation: null,
      offlineQueue: [],
      setSession: (session) => set({ session }),
      setTracking: (isTracking) => set({ isTracking }),
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      addToQueue: (loc) =>
        set((state) => ({ offlineQueue: [...state.offlineQueue, loc] })),
      clearQueue: () => set({ offlineQueue: [] }),
      logout: () => set({ session: null, isTracking: false, currentLocation: null, offlineQueue: [] }),
    }),
    {
      name: 'rastreoya-tracking',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
