import React, { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MiniMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #f0f0f0; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { border: none !important; }
    .leaflet-control-zoom a {
      background: #fff !important;
      color: #333 !important;
      border: 1px solid #ccc !important;
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      font-size: 18px !important;
      border-radius: 4px !important;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
    }
    .pulse-marker {
      width: 16px; height: 16px;
      background: #2563eb;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 rgba(37,99,235,0.4), 0 1px 4px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.5), 0 1px 4px rgba(0,0,0,0.3); }
      70% { box-shadow: 0 0 0 14px rgba(37,99,235,0), 0 1px 4px rgba(0,0,0,0.3); }
      100% { box-shadow: 0 0 0 0 rgba(37,99,235,0), 0 1px 4px rgba(0,0,0,0.3); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
    }).setView([-34.6, -58.4], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var markerIcon = L.divIcon({
      className: '',
      html: '<div class="pulse-marker"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    var marker = null;
    var accuracyCircle = null;
    var firstUpdate = true;

    function updatePosition(lat, lng, accuracy) {
      var latlng = L.latLng(lat, lng);

      if (!marker) {
        marker = L.marker(latlng, { icon: markerIcon }).addTo(map);
      } else {
        marker.setLatLng(latlng);
      }

      if (accuracy && accuracy > 0 && accuracy < 500) {
        if (!accuracyCircle) {
          accuracyCircle = L.circle(latlng, {
            radius: accuracy,
            color: '#2563eb',
            fillColor: '#2563eb',
            fillOpacity: 0.08,
            weight: 1,
            opacity: 0.3,
          }).addTo(map);
        } else {
          accuracyCircle.setLatLng(latlng);
          accuracyCircle.setRadius(accuracy);
        }
      }

      if (firstUpdate) {
        map.setView(latlng, 17);
        firstUpdate = false;
      } else {
        map.panTo(latlng, { animate: true, duration: 0.5 });
      }
    }

    document.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'location') {
          updatePosition(data.lat, data.lng, data.accuracy);
        }
      } catch(err) {}
    });

    window.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'location') {
          updatePosition(data.lat, data.lng, data.accuracy);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>
`;

export function MiniMap({ latitude, longitude, accuracy }: MiniMapProps) {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (webViewRef.current && latitude && longitude) {
      const msg = JSON.stringify({
        type: 'location',
        lat: latitude,
        lng: longitude,
        accuracy: accuracy ?? 0,
      });
      webViewRef.current.postMessage(msg);
    }
  }, [latitude, longitude, accuracy]);

  return (
    <WebView
      ref={webViewRef}
      source={{ html: LEAFLET_HTML }}
      style={styles.map}
      scrollEnabled={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      onMessage={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
});
