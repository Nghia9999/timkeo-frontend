export function parseLatLngFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url || typeof url !== 'string') return null;
  try {
    // common patterns: ?q=lat,lng or query=lat,lng or .../maps?q=lat,lng
    const qMatch = url.match(/[?&](?:q|query)=([-0-9.]+),([-0-9.]+)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }

    // sometimes URL contains @lat,lng,zoom e.g. /@10.77,106.7,15z
    const atMatch = url.match(/@([-0-9.]+),([-0-9.]+),/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }

    return null;
  } catch {
    // ignore parse errors
    return null;
  }
}

export function getLatLngFromLocation(loc: unknown): { lat: number; lng: number } | null {
  if (!loc) return null;

  // If it's a string, try parse as Google Maps URL
  if (typeof loc === 'string') {
    const fromUrl = parseLatLngFromGoogleMapsUrl(loc);
    if (fromUrl) return fromUrl;
    return null;
  }

  if (typeof loc === 'object' && loc !== null) {
    const o = loc as Record<string, unknown>;

    // GeoJSON Point { type: 'Point', coordinates: [lng, lat] }
    if (o.type === 'Point' && Array.isArray(o.coordinates) && (o.coordinates as unknown[]).length >= 2) {
      const coords = o.coordinates as unknown[];
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }

    // Numeric fields
    if (typeof o.latitude === 'number' && typeof o.longitude === 'number') {
      return { lat: o.latitude as number, lng: o.longitude as number };
    }
    if (typeof o.lat === 'number' && typeof o.lng === 'number') {
      return { lat: o.lat as number, lng: o.lng as number };
    }
    if (typeof o.lat === 'number' && typeof o.long === 'number') {
      return { lat: o.lat as number, lng: o.long as number };
    }

    // If object contains a googleMapsUrl property
    if (typeof o.googleMapsUrl === 'string') {
      const fromUrl = parseLatLngFromGoogleMapsUrl(o.googleMapsUrl as string);
      if (fromUrl) return fromUrl;
    }
  }

  return null;
}
