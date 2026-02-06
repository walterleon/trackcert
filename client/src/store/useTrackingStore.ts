import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationPoint {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
    batteryLevel?: number;
}

interface TrackingStore {
    isActive: boolean;
    driverId: string | null;
    campaignId: string | null;
    currentLocation: LocationPoint | null;
    pendingLocations: LocationPoint[]; // Offline queue
    setIsActive: (active: boolean) => void;
    setSession: (driverId: string, campaignId: string) => void;
    updateLocation: (loc: LocationPoint) => void;
    addToQueue: (loc: LocationPoint) => void;
    clearQueue: () => void;
}

export const useTrackingStore = create<TrackingStore>()(
    persist(
        (set) => ({
            isActive: false,
            driverId: null,
            campaignId: null,
            currentLocation: null,
            pendingLocations: [],

            setIsActive: (active) => set({ isActive: active }),

            setSession: (driverId, campaignId) => set({ driverId, campaignId }),

            updateLocation: (loc) => set(() => ({
                currentLocation: loc,
                // Optional: keep a history of points for visual "breadcrumbs" on client
            })),

            addToQueue: (loc) => set((state) => ({
                pendingLocations: [...state.pendingLocations, loc]
            })),

            clearQueue: () => set({ pendingLocations: [] })
        }),
        {
            name: 'trackcert-storage',
        }
    )
);
