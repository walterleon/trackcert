import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://rastreoya.com/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

const DEVICE_ID_KEY = 'rastreoya-device-id';

function generateId(): string {
  const s = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s()}${s()}-${s()}-${s()}-${s()}-${s()}${s()}${s()}`;
}

async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryLevel?: number;
  timestamp: string;
  isOfflineSync?: boolean;
}

export async function driverAuth(campaignCode: string, validationCode: string, alias: string) {
  const deviceId = await getDeviceId();
  const { data } = await api.post('/driver/auth', { campaignCode, validationCode, alias, deviceId });
  return data as { success: boolean; driverId: string; campaignId: string; campaignTitle: string };
}

export class CampaignInactiveError extends Error {
  constructor() {
    super('Campaign is not active');
    this.name = 'CampaignInactiveError';
  }
}

export async function sendLocations(driverId: string, locations: LocationPoint[]) {
  try {
    const { data } = await api.post('/driver/locations', { driverId, locations });
    return data as { success: boolean; count: number };
  } catch (err: any) {
    if (err?.response?.status === 403 && err?.response?.data?.code === 'CAMPAIGN_INACTIVE') {
      throw new CampaignInactiveError();
    }
    throw err;
  }
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

  // Use fetch instead of axios — axios has intermittent multipart failures on RN
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/driver/photo`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
