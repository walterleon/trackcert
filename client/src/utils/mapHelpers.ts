import L from 'leaflet';

// --- Reverse geocoding (Nominatim, free, no API key) ---
const geocodeCache: Record<string, string> = {};

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (geocodeCache[key]) return geocodeCache[key];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    const addr = data.address;
    const parts = [addr?.road, addr?.house_number, addr?.suburb || addr?.neighbourhood, addr?.city || addr?.town || addr?.village].filter(Boolean);
    const result = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || 'Dirección no disponible';
    geocodeCache[key] = result;
    return result;
  } catch {
    return 'Sin conexión';
  }
}

// --- Street View URL ---
export function streetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

// --- Trail direction arrows ---
function bearing(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const arrowIconCache: Record<string, L.DivIcon> = {};

function arrowIcon(angle: number, color: string): L.DivIcon {
  const rounded = Math.round(angle / 10) * 10;
  const key = `${rounded}-${color}`;
  if (!arrowIconCache[key]) {
    arrowIconCache[key] = L.divIcon({
      html: `<div style="transform:rotate(${rounded}deg);width:14px;height:14px;display:flex;align-items:center;justify-content:center">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L12 11H2L7 1Z" fill="${color}" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>
        </svg>
      </div>`,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  return arrowIconCache[key];
}

// --- Stop detection ---
export interface TimedPoint {
  lat: number;
  lng: number;
  ts: string;
}

export interface DetectedStop {
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  pointCount: number;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Detect stops from timed trail points.
 * A stop is a cluster of consecutive points within `radiusM` meters
 * lasting at least `minDurationMs` milliseconds.
 */
export function detectStops(
  points: TimedPoint[],
  radiusM: number = 30,
  minDurationMs: number = 2 * 60 * 1000
): DetectedStop[] {
  if (points.length < 3) return [];

  const stops: DetectedStop[] = [];
  let anchorIdx = 0;

  while (anchorIdx < points.length) {
    const anchor = points[anchorIdx];
    let sumLat = anchor.lat;
    let sumLng = anchor.lng;
    let count = 1;
    let endIdx = anchorIdx;

    for (let j = anchorIdx + 1; j < points.length; j++) {
      const centroid = { lat: sumLat / count, lng: sumLng / count };
      if (haversineMeters(centroid, points[j]) <= radiusM) {
        sumLat += points[j].lat;
        sumLng += points[j].lng;
        count++;
        endIdx = j;
      } else {
        break;
      }
    }

    const startT = new Date(points[anchorIdx].ts).getTime();
    const endT = new Date(points[endIdx].ts).getTime();
    const duration = endT - startT;

    if (count >= 3 && duration >= minDurationMs) {
      stops.push({
        lat: sumLat / count,
        lng: sumLng / count,
        startTime: points[anchorIdx].ts,
        endTime: points[endIdx].ts,
        durationMs: duration,
        pointCount: count,
      });
      anchorIdx = endIdx + 1;
    } else {
      anchorIdx++;
    }
  }

  return stops;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const stopIconCache: Record<string, L.DivIcon> = {};
export function stopIcon(color: string): L.DivIcon {
  if (!stopIconCache[color]) {
    stopIconCache[color] = L.divIcon({
      html: `<div style="width:22px;height:22px;border-radius:50%;background:${color}22;border:2px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>`,
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }
  return stopIconCache[color];
}

/** Get arrow positions+icons at the midpoint of every Nth segment */
export function getTrailArrows(
  trail: [number, number][],
  color: string,
  everyNSegments: number = 5
): { position: [number, number]; icon: L.DivIcon }[] {
  if (trail.length < 3) return [];
  const arrows: { position: [number, number]; icon: L.DivIcon }[] = [];
  for (let i = everyNSegments - 1; i < trail.length - 1; i += everyNSegments) {
    const a = trail[i];
    const b = trail[i + 1];
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const angle = bearing(a, b);
    arrows.push({ position: mid, icon: arrowIcon(angle, color) });
  }
  return arrows;
}
