"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";

// Eigenes Icon statt des Leaflet-Standardmarkers: dessen Bildpfade findet der Bundler nicht.
const issIcon = L.divIcon({
  className: "iss-icon",
  html: '<span aria-hidden="true">🛰️</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function IssMap({ position }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: [0, 0],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    const latLng = [position.latitude, position.longitude];

    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
    } else {
      markerRef.current = L.marker(latLng, { icon: issIcon, title: "ISS", keyboard: false }).addTo(map);
      map.setView(latLng, 3);
    }
  }, [position]);

  return <div ref={containerRef} className="map" data-testid="map" />;
}
