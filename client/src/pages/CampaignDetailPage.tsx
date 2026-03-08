import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Copy, Eye, Camera, Users, Power, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import {
  apiGetCampaign,
  apiGetCampaignTrails,
  apiGenerateShareLink,
  apiUpdateCampaign,
  type CampaignDetail,
  type Driver,
} from '../api/companyApi';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Fix default leaflet icons
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

const TRAIL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface LiveLocation {
  driverId: string;
  alias: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryLevel?: number;
  timestamp: string;
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
  const socketRef = useRef<Socket | null>(null);

  // Load campaign
  useEffect(() => {
    if (!token || !id) return;
    apiGetCampaign(token, id)
      .then((data) => {
        setCampaign(data);
        // Initialize live locations from last known positions
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
        // Fetch trails
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
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
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
        const updated = [...existing, [data.latitude, data.longitude] as [number, number]];
        return { ...prev, [data.driverId]: updated.length > 1000 ? updated.slice(-1000) : updated };
      });
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
        setLiveLocations((prev) => {
          const updated = { ...prev };
          data.drivers.forEach((d) => {
            if (d.locations[0] && !updated[d.id]) {
              updated[d.id] = {
                driverId: d.id,
                alias: d.alias,
                latitude: d.locations[0].latitude,
                longitude: d.locations[0].longitude,
                timestamp: d.locations[0].timestamp,
              };
            }
          });
          return updated;
        });
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [token, id]);

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

  const livePositions = Object.values(liveLocations).map(
    (l) => [l.latitude, l.longitude] as [number, number]
  );

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
            {copied ? '�Copiado!' : 'Link repartidores'}
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
          value={campaign.photos.length}
          onClick={() => setActiveTab('photos')}
          active={activeTab === 'photos'}
        />
        <StatCard
          icon={<div className="w-4 h-4 rounded-full border-2 border-current" />}
          label="En vivo"
          value={Object.values(liveLocations).length}
          onClick={() => setActiveTab('map')}
          active={activeTab === 'map'}
          highlight
        />
      </div>

      {/* Tab content */}
      {activeTab === 'map' && (
        <div className="rounded-xl overflow-hidden border border-gray-800" style={{ height: '480px' }}>
          <MapContainer
            center={livePositions[0] ?? [-34.6037, -58.3816]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {livePositions.length > 0 && <FitBounds positions={livePositions} />}
            {Object.entries(trails).map(([driverId, positions], idx) =>
              positions.length >= 2 ? (
                <Polyline
                  key={`trail-${driverId}`}
                  positions={positions}
                  pathOptions={{ color: TRAIL_COLORS[idx % TRAIL_COLORS.length], weight: 3, opacity: 0.7 }}
                />
              ) : null
            )}
            {Object.values(liveLocations).map((loc) => (
              <Marker key={loc.driverId} position={[loc.latitude, loc.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <strong>{loc.alias}</strong>
                    <br />
                    <span className="text-gray-500">
                      {formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true, locale: es })}
                    </span>
                    {loc.batteryLevel != null && (
                      <><br /><span>Batería: {Math.round(loc.batteryLevel * 100)}%</span></>
                    )}
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
            campaign.drivers.map((driver) => (
              <DriverRow key={driver.id} driver={driver} liveLocation={liveLocations[driver.id]} />
            ))
          )}
        </div>
      )}

      {activeTab === 'photos' && (
        <div>
          {campaign.photos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Sin fotos todavía</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {campaign.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700"
                >
                  <img
                    src={`${API_URL}${photo.fileUrl}`}
                    alt="Foto de entrega"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
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

function DriverRow({ driver, liveLocation }: { driver: Driver; liveLocation?: LiveLocation }) {
  const isLive = !!liveLocation;
  const lastSeen = liveLocation?.timestamp ?? driver.lastSeenAt;

  return (
    <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
        <div>
          <p className="text-white font-medium">{driver.alias}</p>
          {lastSeen && (
            <p className="text-xs text-gray-500">
              {isLive ? 'En vivo · ' : 'Última vez '}
              {formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: es })}
            </p>
          )}
        </div>
      </div>
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
    </div>
  );
}
