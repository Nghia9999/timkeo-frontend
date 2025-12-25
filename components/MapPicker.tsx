"use client";

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function ClickSetter({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    click(e: any) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  isOpen,
  onClose,
  onSelect,
  initialLatLng,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLatLng?: { lat: number; lng: number } | null;
}) {
  const [pos, setPos] = useState<[number, number] | null>(
    initialLatLng ? [initialLatLng.lat, initialLatLng.lng] : null,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[90%] max-w-3xl rounded-lg bg-white p-4">
        <h3 className="mb-2 text-lg font-semibold">Chọn vị trí trên bản đồ</h3>
        <div className="h-80 w-full">
          <MapContainer center={pos || [10.77, 106.7]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ClickSetter
              onClick={(lat, lng) => {
                setPos([lat, lng]);
              }}
            />
            {pos && <Marker position={pos} />}
          </MapContainer>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">{pos ? `Lat: ${pos[0].toFixed(6)}, Lng: ${pos[1].toFixed(6)}` : 'Bấm lên bản đồ để chọn vị trí'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onClose()}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            >
              Huỷ
            </button>
            <button
              onClick={() => {
                if (!pos) return alert('Vui lòng chọn vị trí trên bản đồ');
                onSelect(pos[0], pos[1]);
                onClose();
              }}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white"
            >
              Chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
