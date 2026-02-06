const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = {
    validateCampaign: async (campaignId: string, validationCode: string, alias: string) => {
        try {
            const res = await fetch(`${API_URL}/driver/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId, validationCode, alias }),
            });
            if (!res.ok) throw new Error('Validation failed');
            return await res.json();
        } catch (e) {
            console.warn("API Error, using mock for demo if needed", e);
            // Fallback for Demo if no server
            if (campaignId === 'demo') {
                return { success: true, driverId: 'mock-driver-1', campaignTitle: 'Demo Campaign' };
            }
            throw e;
        }
    },

    sendLocations: async (driverId: string, locations: any[]) => {
        const res = await fetch(`${API_URL}/driver/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId, locations }),
        });
        return res.json();
    }
};
