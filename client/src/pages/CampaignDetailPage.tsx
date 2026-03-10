import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Copy, Eye, Camera, Users, Power, X, Maximize2, Minimize2, EyeOff } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { io, Socket } from 'socket.io-client';
import { reverseGeocode, streetViewUrl, getTrailArrows } from '../utils/mapHelpers';
import { useAuthStore } from '../store/useAuthStore';
import {
  apiGetCampaign,
  apiGetCampaignTrails,
  apiGenerateShareLink,
  apiUpdateCampaign,
  type CampaignDetail,
  type Driver,
  type Photo,
} from '../api/companyApi';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const driverIconCache: Record<string, L.DivIcon> = {};
function driverIcon(color: string, live: boolean) {
  const key = `${color}-${live}`;
  if (!driverIconCache[key]) {
    const pulse = live
      ? `<span style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};opacity:.5;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite"></span>`
      : '';
    driverIconCache[key] = L.divIcon({
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center">
        ${pulse}
        <span style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45);display:block${live ? '' : ';opacity:.55'}"></span>
      </div>`,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }
  return driverIconCache[key];
}

const CameraIcon = L.divIcon({
  html: '<div style="background:#3b82f6;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

const TRAIL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const LIVE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

// Inject ping keyframe for live driver pulse animation
if (typeof document !== 'undefined' && !document.getElementById('driver-ping-css')) {
  const style = document.createElement('style');
  style.id = 'driver-ping-css';
  style.textContent = '@keyframes ping{0%{transform:scale(1);opacity:.5}75%,100%{transform:scale(2.2);opacity:0}}';
  document.head.appendChild(style);
}

interface LiveLocation {
  driverId: string;
  alias: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryLevel?: number;
  timestamp: string;
}

function isDriverLive(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() < LIVE_THRESHOLD_MS;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40], maxZoom: 16 });
    }
  }, [positions.length]);
  return null;
}

function MapResizer({ fullscreen }: { fullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [fullscreen, map]);
  return null;
}

function DriverPopupContent({ alias, lat, lng, timestamp, live, batteryLevel }: {
  alias: string; lat: number; lng: number; timestamp: string; live: boolean; batteryLevel?: number;
}) {
  const [address, setAddress] = useState('Cargando...');
  useEffect(() => { reverseGeocode(lat, lng).then(setAddress); }, [lat, lng]);
  return (
    <div style={{ fontSize: '13px', lineHeight: '1.5', minWidth: 180 }}>
      <strong>{alias}</strong>
      <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: live ? '#d1fae5' : '#f3f4f6', color: live ? '#047857' : '#6b7280' }}>
        {live ? 'En vivo' : 'Offline'}
      </span>
      <br />
      <span style={{ color: '#6b7280', fontSize: 12 }}>
        {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: es })}
      </span>
      {batteryLevel != null && (
        <span style={{ marginLeft: 8, fontSize: 12 }}>🔋 {Math.round(batteryLevel * 100)}%</span>
      )}
      <br />
      <span style={{ color: '#374151', fontSize: 12 }}>📍 {address}</span>
      <br />
      <a href={streetViewUrl(lat, lng)} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>
        🛣️ Ver en Street View
      </a>
    </div>
  );
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLocation>>({});
  const [shareInfo, setShareInfo] = useState<{ url: string; pin: string } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'photos' | 'drivers'>('map');
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [hiddenDrivers, setHiddenDrivers] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<(Photo & { driverAlias?: string })[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<(Photo & { driverAlias?: string }) | null>(null);
  const [_tick, setTick] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Tick every 30s to re-render "live" vs "offline" status
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Load campaign
  useEffect(() => {
    if (!token || !id) return;
    apiGetCampaign(token, id)
      .then((data) => {
        setCampaign(data);
        const driverMap = new Map(data.drivers.map((d) => [d.id, d.alias]));
        setPhotos(data.photos.map((p) => ({ ...p, driverAlias: driverMap.get(p.driverId) || 'Desconocido' })));
        const initial: Record<string, LiveLocation> = {};
        data.drivers.forEach((d) => {
          if (d.locations[0]) {
            initial[d.id] = {
              driverId: d.id,
              alias: d.alias,
              latitude: d.locations[0].latitude,
              longitude: d.locations[0].longitude,
              timestamp: d.locations[0].timestamp,
            };
          }
        });
        setLiveLocations(initial);
        apiGetCampaignTrails(token, id).then(({ trails: t }) => {
          const parsed: Record<string, [number, number][]> = {};
          for (const [dId, points] of Object.entries(t)) {
            parsed[dId] = points.map((p) => [p.lat, p.lng]);
          }
          setTrails(parsed);
        }).catch(() => {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  // Socket.io real-time connection
  useEffect(() => {
    if (!id) return;
    const socket = io(API_URL, { transports: ['polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join-campaign', id);
    });
    socket.on('driver-moved', (data: LiveLocation) => {
      setLiveLocations((prev) => ({ ...prev, [data.driverId]: data }));
      setTrails((prev) => {
        const existing = prev[data.driverId] || [];
        const last = existing[existing.length - 1];
        if (last && last[0] === data.latitude && last[1] === data.longitude) return prev;
        const newPoint: [number, number] = [data.latitude, data.longitude];
        const updated = [...existing, newPoint];
        return { ...prev, [data.driverId]: updated.length > 1000 ? updated.slice(-1000) : updated };
      });
    });
    socket.on('photo-uploaded', (data: { driverId: string; alias: string; photo: Photo }) => {
      setPhotos((prev) => [{ ...data.photo, driverAlias: data.alias }, ...prev]);
    });
    return () => {
      socket.emit('leave-campaign', id);
      socket.disconnect();
    };
  }, [id]);

  // Auto-refresh campaign data every 30s
  useEffect(() => {
    if (!token || !id) return;
    const interval = setInterval(() => {
      apiGetCampaign(token, id).then((data) => {
        setCampaign(data);
        const driverMap = new Map(data.drivers.map((d) => [d.id, d.alias]));
        setPhotos(data.photos.map((p) => ({ ...p, driverAlias: driverMap.get(p.driverId) || 'Desconocido' })));
        setLiveLocations((prev) => {
          const updated = { ...prev };
          data.drivers.forEach((d) => {
            if (d.locations[0]) {
              const loc = d.locations[0];
              if (!updated[d.id] || new Date(loc.timestamp) > new Date(updated[d.id].timestamp)) {
                updated[d.id] = {
                  driverId: d.id,
                  alias: d.alias,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  timestamp: loc.timestamp,
                };
              }
            }
          });
          return updated;
        });
      }).catch(() => {});
      apiGetCampaignTrails(token, id).then(({ trails: t }) => {
        const parsed: Record<string, [number, number][]> = {};
        for (const [dId, points] of Object.entries(t)) {
          parsed[dId] = points.map((p) => [p.lat, p.lng]);
        }
        setTrails(parsed);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [token, id]);

  const toggleDriverVisibility = useCallback((driverId: string) => {
    setHiddenDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  }, []);

  const handleGenerateShareLink = async () => {
    if (!token || !id) return;
    setShareLoading(true);
    try {
      const { shareUrl, sharePin } = await apiGenerateShareLink(token, id);
      setShareInfo({ url: shareUrl, pin: sharePin });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async () => {
    if (!token || !campaign || !id) return;
    try {
      await apiUpdateCampaign(token, id, { isActive: !campaign.isActive });
      setCampaign((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-96 bg-gray-800 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !campaign) {
    return (
      <DashboardLayout>
        <div className="text-red-400 text-center py-20">{error || 'Campaña no encontrada'}</div>
      </DashboardLayout>
    );
  }

  const visibleLocations = Object.values(liveLocations).filter((l) => !hiddenDrivers.has(l.driverId));
  const livePositions = visibleLocations.map((l) => [l.latitude, l.longitude] as [number, number]);
  const liveCount = Object.values(liveLocations).filter((l) => isDriverLive(l.timestamp)).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-1 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{campaign.title}</h1>
            {campaign.description && (
              <p className="text-gray-400 text-sm mt-0.5">{campaign.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                  campaign.isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    campaign.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                  }`}
                />
                {campaign.isActive ? 'Activa' : 'Inactiva'}
              </span>
              <span className="text-xs text-gray-500">
                Código: <span className="font-mono text-gray-300">{campaign.campaignCode}</span>
              </span>
              <span className="text-xs text-gray-500">
                PIN de ingreso: <span className="font-mono text-gray-300">{campaign.validationCode}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              campaign.isActive
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <Power className="w-4 h-4" />
            {campaign.isActive ? 'Pausar' : 'Activar'}
          </button>
          <button
            onClick={() => {
              const url = `https://rastreoya.com/join?code=${campaign.campaignCode}&pin=${campaign.validationCode}`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? '¡Copiado!' : 'Link repartidores'}
          </button>
          <button
            onClick={handleGenerateShareLink}
            disabled={shareLoading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {shareLoading ? '...' : 'Link seguimiento'}
          </button>
        </div>
      </div>

      {/* Share link modal */}
      {shareInfo && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-blue-400 font-medium text-sm mb-2">Link de seguimiento generado</p>
              <div className="flex items-center gap-2 mb-2">
                <code className="text-xs bg-gray-950 px-3 py-1.5 rounded text-gray-300 flex-1 truncate">
                  {shareInfo.url}
                </code>
                <button
                  onClick={() => handleCopy(`${shareInfo.url}\nPIN: ${shareInfo.pin}`)}
                  className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1.5 rounded transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-sm text-gray-400">
                PIN: <span className="font-mono font-bold text-white text-lg tracking-widest">{shareInfo.pin}</span>
              </p>
            </div>
            <button
              onClick={() => setShareInfo(null)}
              className="text-gray-500 hover:text-white ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Existing share link */}
      {campaign.shareToken && campaign.sharePin && !shareInfo && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Link activo — PIN: </span>
              <span className="font-mono font-bold text-white">{campaign.sharePin}</span>
            </div>
            <button
              onClick={() => {
                const baseUrl = window.location.origin;
                handleCopy(`${baseUrl}/track/${campaign.shareToken}\nPIN: ${campaign.sharePin}`);
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Repartidores"
          value={campaign.drivers.length}
          onClick={() => setActiveTab('drivers')}
          active={activeTab === 'drivers'}
        />
        <StatCard
          icon={<Camera className="w-4 h-4" />}
          label="Fotos"
          value={photos.length}
          onClick={() => setActiveTab('photos')}
          active={activeTab === 'photos'}
        />
        <StatCard
          icon={<div className="w-4 h-4 rounded-full border-2 border-current" />}
          label="En vivo"
          value={liveCount}
          onClick={() => setActiveTab('map')}
          active={activeTab === 'map'}
          highlight
        />
      </div>

      {/* Tab content */}
      {activeTab === 'map' && (
        <div
          className={`rounded-xl overflow-hidden border border-gray-800 relative ${
            mapFullscreen ? 'rounded-none border-0' : ''
          }`}
          style={mapFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: '#030712' } : { height: '480px' }}
        >
          <button
            onClick={() => setMapFullscreen((f) => !f)}
            className="absolute top-3 right-3 z-[1000] bg-gray-900/90 hover:bg-gray-800 text-white p-2 rounded-lg border border-gray-700 shadow-lg transition-colors"
          >
            {mapFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Drivers visibility panel */}
          <div className="absolute top-24 left-3 z-[1000] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-2 shadow-xl max-h-60 overflow-y-auto">
            <p className="text-[10px] text-gray-500 font-medium mb-1 px-1">REPARTIDORES</p>
            {campaign.drivers.map((d, idx) => {
              const live = liveLocations[d.id];
              const isLive = live && isDriverLive(live.timestamp);
              const hidden = hiddenDrivers.has(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDriverVisibility(d.id)}
                  className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-lg text-xs transition-colors ${
                    hidden ? 'opacity-40 hover:opacity-60' : 'hover:bg-gray-800'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: hidden ? '#4b5563' : TRAIL_COLORS[idx % TRAIL_COLORS.length] }}
                  />
                  <span className={`font-medium ${hidden ? 'text-gray-500 line-through' : 'text-white'}`}>
                    {d.alias}
                  </span>
                  <span className="ml-auto">
                    {isLive && !hidden && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    )}
                    {hidden && <EyeOff className="w-3 h-3 text-gray-600" />}
                  </span>
                </button>
              );
            })}
          </div>

          <MapContainer
            center={livePositions[0] ?? [-34.6037, -58.3816]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapResizer fullscreen={mapFullscreen} />
            {livePositions.length > 0 && <FitBounds positions={livePositions} />}
            {campaign.drivers.map((d, idx) => {
              const driverTrail = trails[d.id];
              if (!driverTrail || driverTrail.length < 2 || hiddenDrivers.has(d.id)) return null;
              const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
              return [
                <Polyline
                  key={`trail-${d.id}-${driverTrail.length}`}
                  positions={driverTrail}
                  pathOptions={{ color, weight: 4, opacity: 0.85 }}
                />,
                ...getTrailArrows(driverTrail, color).map((arrow, ai) => (
                  <Marker key={`arrow-${d.id}-${ai}`} position={arrow.position} icon={arrow.icon} interactive={false} />
                )),
              ];
            })}
            {visibleLocations.map((loc) => {
              const live = isDriverLive(loc.timestamp);
              const dIdx = campaign.drivers.findIndex((d) => d.id === loc.driverId);
              const color = TRAIL_COLORS[(dIdx === -1 ? 0 : dIdx) % TRAIL_COLORS.length];
              return (
                <Marker key={loc.driverId} position={[loc.latitude, loc.longitude]} icon={driverIcon(color, live)}>
                  <Popup>
                    <DriverPopupContent alias={loc.alias} lat={loc.latitude} lng={loc.longitude} timestamp={loc.timestamp} live={live} batteryLevel={loc.batteryLevel} />
                  </Popup>
                </Marker>
              );
            })}
            {/* Photo markers */}
            {photos.filter((p) => !hiddenDrivers.has(p.driverId)).map((photo) => (
              <Marker
                key={`photo-${photo.id}`}
                position={[photo.latitude, photo.longitude]}
                icon={CameraIcon}
                eventHandlers={{ click: () => setSelectedPhoto(photo) }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{photo.driverAlias}</strong>
                    <br />
                    <span className="text-gray-500">{format(new Date(photo.takenAt), "d MMM yyyy HH:mm", { locale: es })}</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="space-y-2">
          {campaign.drivers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Ningún repartidor se unió aún</p>
              <p className="text-xs mt-1">
                Compartí el código <span className="font-mono">{campaign.campaignCode}</span> con tus repartidores
              </p>
            </div>
          ) : (
            campaign.drivers.map((driver, idx) => (
              <DriverRow
                key={driver.id}
                driver={driver}
                liveLocation={liveLocations[driver.id]}
                color={TRAIL_COLORS[idx % TRAIL_COLORS.length]}
                hidden={hiddenDrivers.has(driver.id)}
                onToggleVisibility={() => toggleDriverVisibility(driver.id)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'photos' && (
        <div>
          {photos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Sin fotos todavía</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700 hover:border-blue-500 transition-colors relative group"
                >
                  <img
                    src={`${API_URL}${photo.fileUrl}`}
                    alt="Foto de entrega"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium truncate">{photo.driverAlias}</p>
                    <p className="text-gray-300 text-[10px]">{format(new Date(photo.takenAt), "d MMM HH:mm", { locale: es })}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={`${API_URL}${selectedPhoto.fileUrl}`}
                alt="Foto de entrega"
                className="w-full max-h-[60vh] object-contain bg-black"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{selectedPhoto.driverAlias}</p>
                  <p className="text-gray-400 text-sm">
                    {format(new Date(selectedPhoto.takenAt), "EEEE d 'de' MMMM yyyy, HH:mm:ss", { locale: es })}
                  </p>
                </div>
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full font-medium">
                  Prueba de entrega
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="font-mono">
                  📍 {selectedPhoto.latitude.toFixed(5)}, {selectedPhoto.longitude.toFixed(5)}
                </span>
                <span>ID: {selectedPhoto.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  onClick,
  active,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick: () => void;
  active: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
        active
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
      }`}
    >
      <div className={highlight ? 'text-emerald-400' : 'text-gray-400'}>{icon}</div>
      <div>
        <div className={`text-lg font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </button>
  );
}

function DriverRow({
  driver,
  liveLocation,
  color,
  hidden,
  onToggleVisibility,
}: {
  driver: Driver;
  liveLocation?: LiveLocation;
  color: string;
  hidden: boolean;
  onToggleVisibility: () => void;
}) {
  const lastSeen = liveLocation?.timestamp ?? driver.lastSeenAt;
  const isLive = liveLocation ? isDriverLive(liveLocation.timestamp) : false;

  return (
    <div className={`flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 ${hidden ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div>
          <p className="text-white font-medium">{driver.alias}</p>
          {lastSeen && (
            <p className="text-xs text-gray-500">
              {isLive ? (
                <span className="text-emerald-400">En vivo</span>
              ) : (
                <span>Offline</span>
              )}
              {' · '}
              {formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: es })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {liveLocation && (
          <div className="text-right">
            <p className="text-xs font-mono text-gray-400">
              {liveLocation.latitude.toFixed(4)}, {liveLocation.longitude.toFixed(4)}
            </p>
            {liveLocation.batteryLevel != null && (
              <p className="text-xs text-gray-600">
                🔋 {Math.round(liveLocation.batteryLevel * 100)}%
              </p>
            )}
          </div>
        )}
        <button
          onClick={onToggleVisibility}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title={hidden ? 'Mostrar en mapa' : 'Ocultar del mapa'}
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
