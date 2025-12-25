"use client";

import React from 'react';

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number; // px
  height?: number; // px
};

export default function MapThumbnail({ lat, lng, zoom = 15, width = 280, height = 160 }: Props) {
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Prefer Google Static Maps if API key present (better visuals)
  if (googleKey) {
    // Google Static Maps limits size to 640x640 for free requests; use scale=2 to increase density
    const w = Math.min(640, Math.max(50, Math.round(width)));
    const h = Math.min(640, Math.max(50, Math.round(height)));
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=2&markers=color:red|${lat},${lng}&key=${googleKey}`;
    return <MapImage src={url} width={w} height={h} alt="map thumbnail" />;
  }

  // Fallback: OpenStreetMap static map service (no API key)
  // staticmap.openstreetmap.de supports size and marker param
  const w = Math.max(100, Math.min(1280, Math.round(width)));
  const h = Math.max(80, Math.min(1280, Math.round(height)));
  const osmUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&markers=${lat},${lng},red-pushpin`;

  return <MapImage src={osmUrl} width={w} height={h} alt="map thumbnail" />;
}

function MapImage({ src, width, height, alt }: { src: string; width: number; height: number; alt: string }) {
  const [s, setS] = React.useState(src);
  const placeholder = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='12'>Map unavailable</text></svg>`,
  )}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={s}
      alt={alt}
      className="rounded-xl object-cover"
      style={{ width: `${width}px`, maxHeight: `${height}px` }}
      loading="lazy"
      onError={() => {
        if (s !== placeholder) setS(placeholder);
      }}
    />
  );
}
