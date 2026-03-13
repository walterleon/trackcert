const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status, data.code);
  return data as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface CompanyInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  planName: string;
  credits: number;
  bonusCredits: number;
  nextRenewalDate: string | null;
}

export async function apiRegister(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handle<{ token: string; company: CompanyInfo }>(res);
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handle<{ token: string; company: CompanyInfo }>(res);
}

export async function apiGetMe(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders(token) });
  return handle<CompanyInfo>(res);
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  campaignCode: string;
  validationCode: string;
  isActive: boolean;
  shareToken: string | null;
  sharePin: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count?: { drivers: number; locations: number; photos: number };
}

export interface Driver {
  id: string;
  alias: string;
  isActive: boolean;
  lastSeenAt: string | null;
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    batteryLevel: number | null;
    timestamp: string;
  }>;
}

export interface Photo {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  fileUrl: string;
  takenAt: string;
}

export interface CampaignDetail extends Campaign {
  drivers: Driver[];
  photos: Photo[];
}

export async function apiListCampaigns(token: string): Promise<Campaign[]> {
  const res = await fetch(`${API_BASE}/campaigns`, { headers: authHeaders(token) });
  return handle<Campaign[]>(res);
}

export async function apiCreateCampaign(
  token: string,
  data: { title: string; description?: string; startDate?: string; endDate?: string }
): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handle<Campaign>(res);
}

export async function apiGetCampaign(token: string, id: string): Promise<CampaignDetail> {
  const res = await fetch(`${API_BASE}/campaigns/${id}`, { headers: authHeaders(token) });
  return handle<CampaignDetail>(res);
}

export async function apiUpdateCampaign(
  token: string,
  id: string,
  data: Partial<{ title: string; description: string; isActive: boolean; startDate: string; endDate: string }>
): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/campaigns/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handle<Campaign>(res);
}

export async function apiGenerateShareLink(
  token: string,
  campaignId: string
): Promise<{ shareUrl: string; sharePin: string; shareToken: string }> {
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/share-link`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handle<{ shareUrl: string; sharePin: string; shareToken: string }>(res);
}

// ─── Trails ──────────────────────────────────────────────────────────────────

export type TrailPoint = { lat: number; lng: number; ts: string };
export type TrailsResponse = { trails: Record<string, TrailPoint[]> };

export async function apiGetCampaignTrails(
  token: string,
  campaignId: string,
  since?: string
): Promise<TrailsResponse> {
  const params = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/trails${params}`, {
    headers: authHeaders(token),
  });
  return handle<TrailsResponse>(res);
}

export async function apiGetShareTrails(
  shareToken: string,
  pin: string,
  since?: string
): Promise<TrailsResponse> {
  const params = new URLSearchParams({ pin });
  if (since) params.set('since', since);
  const res = await fetch(`${API_BASE}/share/${shareToken}/trails?${params}`);
  return handle<TrailsResponse>(res);
}

// ─── Share (public) ───────────────────────────────────────────────────────────

export interface ShareData {
  campaignId: string;
  title: string;
  companyName: string;
  isActive: boolean;
  drivers: Array<{
    id: string;
    alias: string;
    lastSeenAt: string | null;
    lastLocation: { latitude: number; longitude: number; timestamp: string } | null;
  }>;
}

export async function apiGetShareData(token: string, pin: string): Promise<ShareData> {
  const res = await fetch(`${API_BASE}/share/${token}?pin=${encodeURIComponent(pin)}`);
  return handle<ShareData>(res);
}

// ─── Driver (used from mobile app or web fallback) ────────────────────────────

export async function apiDriverAuth(campaignCode: string, validationCode: string, alias: string) {
  const res = await fetch(`${API_BASE}/driver/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignCode, validationCode, alias }),
  });
  return handle<{ success: boolean; driverId: string; campaignId: string; campaignTitle: string }>(res);
}

// ─── Admin (super admin) ────────────────────────────────────────────────────

export interface AdminStats {
  companies: number;
  campaigns: number;
  drivers: number;
  locations: number;
  photos: number;
}

export interface AdminCompany {
  id: string;
  name: string;
  email: string;
  role: string;
  planName: string;
  credits: number;
  bonusCredits: number;
  createdAt: string;
  _count: { campaigns: number };
}

export interface AdminCampaign {
  id: string;
  title: string;
  description: string | null;
  campaignCode: string;
  isActive: boolean;
  createdAt: string;
  company: { name: string };
  _count: { drivers: number; locations: number };
}

export async function apiAdminGetStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders(token) });
  return handle<AdminStats>(res);
}

export async function apiAdminGetCompanies(token: string): Promise<AdminCompany[]> {
  const res = await fetch(`${API_BASE}/admin/companies`, { headers: authHeaders(token) });
  return handle<AdminCompany[]>(res);
}

export async function apiAdminUpdateCompany(
  token: string,
  id: string,
  data: Partial<{ planName: string; credits: number; bonusCredits: number; role: string }>
): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/companies/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handle<any>(res);
}

export async function apiAdminGetCampaigns(token: string): Promise<AdminCampaign[]> {
  const res = await fetch(`${API_BASE}/admin/campaigns`, { headers: authHeaders(token) });
  return handle<AdminCampaign[]>(res);
}

// ─── Admin Config ───────────────────────────────────────────────────────────

export interface ConfigEntry {
  key: string;
  value: string;
  label: string;
  category: string;
  type: string;
  min?: number;
  max?: number;
  maxLength?: number;
}

export async function apiAdminGetConfig(token: string): Promise<ConfigEntry[]> {
  const res = await fetch(`${API_BASE}/admin/config`, { headers: authHeaders(token) });
  return handle<ConfigEntry[]>(res);
}

export async function apiAdminUpdateConfig(
  token: string,
  updates: Array<{ key: string; value: string }>
): Promise<{ success: boolean; updated: number }> {
  const res = await fetch(`${API_BASE}/admin/config`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ updates }),
  });
  return handle<{ success: boolean; updated: number }>(res);
}

// ─── Driver (used from mobile app or web fallback) ────────────────────────────

export async function apiSendLocations(
  driverId: string,
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryLevel?: number;
    timestamp: string;
    isOfflineSync?: boolean;
  }>
) {
  const res = await fetch(`${API_BASE}/driver/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, locations }),
  });
  return handle<{ success: boolean; count: number }>(res);
}
