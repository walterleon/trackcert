import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { io, Socket } from 'socket.io-client';
import { MapPin, Lock, AlertCircle } from 'lucide-react';
import { apiGetShareData, type ShareData } from '../api/companyApi';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface LiveLoc {
  driverId: string;
  alias: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [pinInput, setPinInput] = useState('');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLoc>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !pinInput) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGetShareData(token, pinInput);
      setShareData(data);

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
    });
    return () => {
      socket.emit('leave-campaign', shareData.campaignId);
      socket.disconnect();
    };
  }, [shareData?.campaignId]);

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

  const positions = Object.values(liveLocations).map(
    (l) => [l.latitude, l.longitude] as [number, number]
  );

  const defaultCenter: [number, number] = positions[0] ?? [-34.6037, -58.3816];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
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

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {Object.values(liveLocations).map((loc) => (
            <Marker key={loc.driverId} position={[loc.latitude, loc.longitude]}>
              <Popup>
                <strong>{loc.alias}</strong>
                <br />
                {formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true, locale: es })}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Drivers panel */}
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-3 shadow-xl">
          <p className="text-xs text-gray-500 mb-2 font-medium">
            {Object.keys(liveLocations).length} repartidor(es) en tiempo real
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {shareData.drivers.map((d) => {
              const live = liveLocations[d.id];
              return (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      live ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                    }`}
                  />
                  <span className="text-white font-medium">{d.alias}</span>
                  {live && (
                    <span className="text-gray-500 text-xs ml-auto">
                      {formatDistanceToNow(new Date(live.timestamp), { addSuffix: true, locale: es })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
