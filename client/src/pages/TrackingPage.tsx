import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { io, Socket } from 'socket.io-client';
import { MapPin, Lock, AlertCircle, Maximize2, Minimize2, EyeOff } from 'lucide-react';
import { apiGetShareData, apiGetShareTrails, type ShareData } from '../api/companyApi';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

const TRAIL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const LIVE_THRESHOLD_MS = 3 * 60 * 1000;

interface LiveLoc {
  driverId: string;
  alias: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

function isDriverLive(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() < LIVE_THRESHOLD_MS;
}

function MapResizer({ fullscreen }: { fullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [fullscreen, map]);
  return null;
}

export function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [pinInput, setPinInput] = useState('');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLoc>>({});
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [hiddenDrivers, setHiddenDrivers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const pinRef = useRef('');

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !pinInput) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGetShareData(token, pinInput);
      setShareData(data);
      pinRef.current = pinInput;

      const initial: Record<string, LiveLoc> = {};
      data.drivers.forEach((d) => {
        if (d.lastLocation) {
          initial[d.id] = {
            driverId: d.id,
            alias: d.alias,
            latitude: d.lastLocation.latitude,
            longitude: d.lastLocation.longitude,
            timestamp: d.lastLocation.timestamp,
          };
        }
      });
      setLiveLocations(initial);

      apiGetShareTrails(token, pinInput).then(({ trails: t }) => {
        const parsed: Record<string, [number, number][]> = {};
        for (const [dId, points] of Object.entries(t)) {
          parsed[dId] = points.map((p) => [p.lat, p.lng]);
        }
        setTrails(parsed);
      }).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'PIN incorrecto o link inválido');
    } finally {
      setLoading(false);
    }
  };

  // Connect to socket after auth
  useEffect(() => {
    if (!shareData?.campaignId) return;
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join-campaign', shareData.campaignId);
    });
    socket.on('driver-moved', (data: LiveLoc) => {
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
    return () => {
      socket.emit('leave-campaign', shareData.campaignId);
      socket.disconnect();
    };
  }, [shareData?.campaignId]);

  // Auto-refresh share data every 30s
  useEffect(() => {
    if (!shareData || !token) return;
    const interval = setInterval(() => {
      apiGetShareData(token, pinRef.current).then((data) => {
        setShareData(data);
        setLiveLocations((prev) => {
          const updated = { ...prev };
          data.drivers.forEach((d) => {
            if (d.lastLocation) {
              const loc = d.lastLocation;
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
    }, 30000);
    return () => clearInterval(interval);
  }, [shareData?.campaignId, token]);

  const toggleDriverVisibility = (driverId: string) => {
    setHiddenDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  };

  if (!shareData) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <MapPin className="w-7 h-7 text-blue-400" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                RastreoYa
              </span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gray-800 rounded-full">
                <Lock className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-white text-center mb-1">
              Seguimiento en vivo
            </h1>
            <p className="text-gray-400 text-sm text-center mb-5">
              Ingresá el PIN que te compartieron para ver el mapa
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="PIN de 4 dígitos"
                className="w-full bg-gray-950 border border-gray-700 text-white text-center text-2xl font-mono tracking-widest rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-700"
              />

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || pinInput.length !== 4}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all"
              >
                {loading ? 'Verificando...' : 'Ver seguimiento'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const visibleLocations = Object.values(liveLocations).filter((l) => !hiddenDrivers.has(l.driverId));
  const positions = visibleLocations.map((l) => [l.latitude, l.longitude] as [number, number]);
  const defaultCenter: [number, number] = positions[0] ?? [-34.6037, -58.3816];
  const liveCount = Object.values(liveLocations).filter((l) => isDriverLive(l.timestamp)).length;

  return (
    <div className={`min-h-screen bg-gray-950 flex flex-col ${mapFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      {!mapFullscreen && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{shareData.companyName}</p>
              <p className="text-sm font-semibold text-white">{shareData.title}</p>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              shareData.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-500'
            }`}
          >
            {shareData.isActive ? '🟢 En curso' : '⚫ Finalizada'}
          </span>
        </header>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <button
          onClick={() => setMapFullscreen((f) => !f)}
          className="absolute top-3 right-3 z-[1000] bg-gray-900/90 hover:bg-gray-800 text-white p-2 rounded-lg border border-gray-700 shadow-lg transition-colors"
        >
          {mapFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapResizer fullscreen={mapFullscreen} />
          {shareData.drivers.map((d, idx) => {
            const driverTrail = trails[d.id];
            if (!driverTrail || driverTrail.length < 2 || hiddenDrivers.has(d.id)) return null;
            return (
              <Polyline
                key={`trail-${d.id}`}
                positions={driverTrail}
                pathOptions={{ color: TRAIL_COLORS[idx % TRAIL_COLORS.length], weight: 4, opacity: 0.85 }}
              />
            );
          })}
          {visibleLocations.map((loc) => {
            const live = isDriverLive(loc.timestamp);
            return (
              <Marker key={loc.driverId} position={[loc.latitude, loc.longitude]}>
                <Popup>
                  <strong>{loc.alias}</strong>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${live ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {live ? 'En vivo' : 'Offline'}
                  </span>
                  <br />
                  {formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true, locale: es })}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Drivers panel */}
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-3 shadow-xl">
          <p className="text-xs text-gray-500 mb-2 font-medium">
            {liveCount} en vivo · {Object.keys(liveLocations).length} total
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {shareData.drivers.map((d, idx) => {
              const live = liveLocations[d.id];
              const isLive = live && isDriverLive(live.timestamp);
              const hidden = hiddenDrivers.has(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDriverVisibility(d.id)}
                  className={`flex items-center gap-2 text-sm w-full text-left px-1 py-0.5 rounded transition-colors ${
                    hidden ? 'opacity-40' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: hidden ? '#4b5563' : TRAIL_COLORS[idx % TRAIL_COLORS.length] }}
                  />
                  <span className={`font-medium ${hidden ? 'text-gray-500 line-through' : 'text-white'}`}>
                    {d.alias}
                  </span>
                  {isLive && !hidden && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  )}
                  {live && !hidden && (
                    <span className="text-gray-500 text-xs ml-auto">
                      {formatDistanceToNow(new Date(live.timestamp), { addSuffix: true, locale: es })}
                    </span>
                  )}
                  {hidden && <EyeOff className="w-3 h-3 text-gray-600 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
