import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { LoginScreen } from './components/LoginScreen'
import { useTrackingStore } from './store/useTrackingStore'
import { apiClient } from './api/client'
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper to center map on user
function LocationMarker({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  )
}

function App() {
  const { driverId, isActive, setIsActive, updateLocation, currentLocation, addToQueue } = useTrackingStore();

  // Simple Geolocator Hook Logic
  useEffect(() => {
    let watchId: number;

    if (isActive && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString(),
            batteryLevel: 0 // TODO: Get battery API
          };

          updateLocation(loc);

          // Send to API or Queue
          if (driverId) {
            // Fire and forget + Queue fallback
            apiClient.sendLocations(driverId, [loc]).catch(() => {
              addToQueue(loc);
            });
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    }
  }, [isActive, driverId, updateLocation, addToQueue]);

  if (!driverId) {
    return <LoginScreen />;
  }

  const center: [number, number] = currentLocation
    ? [currentLocation.latitude, currentLocation.longitude]
    : [-34.6037, -58.3816];

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center shadow-md z-[1000]">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          TrackCert
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${isActive
                ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              }`}
          >
            {isActive ? 'Stop' : 'Start'}
          </button>
        </div>
      </header>

      <div className="flex-1 relative z-0">
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={currentLocation ? [currentLocation.latitude, currentLocation.longitude] : null} />
        </MapContainer>

        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-gray-800/90 backdrop-blur-md p-4 rounded-xl border border-gray-700 shadow-xl z-[500]">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-sm font-medium text-gray-200">
              {isActive ? 'Tracking Active' : 'Idle'}
            </span>
          </div>
          {currentLocation && (
            <div className="text-xs text-gray-400">
              <p>Lat: {currentLocation.latitude.toFixed(5)}</p>
              <p>Lng: {currentLocation.longitude.toFixed(5)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
