import axios from 'axios';

// Change this to your server URL
const BASE_URL = 'http://10.0.2.2:3001/api'; // Android emulator → localhost

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryLevel?: number;
  timestamp: string;
  isOfflineSync?: boolean;
}

export async function driverAuth(campaignCode: string, validationCode: string, alias: string) {
  const { data } = await api.post('/driver/auth', { campaignCode, validationCode, alias });
  return data as { success: boolean; driverId: string; campaignId: string; campaignTitle: string };
}

export async function sendLocations(driverId: string, locations: LocationPoint[]) {
  const { data } = await api.post('/driver/locations', { driverId, locations });
  return data as { success: boolean; count: number };
}

export async function uploadPhoto(
  driverId: string,
  latitude: number,
  longitude: number,
  accuracy: number | null,
  photoUri: string
) {
  const formData = new FormData();
  formData.append('driverId', driverId);
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));
  if (accuracy != null) formData.append('accuracy', String(accuracy));
  formData.append('photo', {
    uri: photoUri,
    type: 'image/jpeg',
    name: `photo_${Date.now()}.jpg`,
  } as any);

  const { data } = await api.post('/driver/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
