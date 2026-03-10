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

/** Get arrow positions+icons spread along a trail */
export function getTrailArrows(
  trail: [number, number][],
  color: string,
  everyNPoints: number = 15
): { position: [number, number]; icon: L.DivIcon }[] {
  if (trail.length < 3) return [];
  const arrows: { position: [number, number]; icon: L.DivIcon }[] = [];
  for (let i = everyNPoints; i < trail.length - 1; i += everyNPoints) {
    const angle = bearing(trail[i - 1], trail[i + 1] || trail[i]);
    arrows.push({ position: trail[i], icon: arrowIcon(angle, color) });
  }
  return arrows;
}
