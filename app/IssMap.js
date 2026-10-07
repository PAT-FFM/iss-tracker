"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { hasFlag } from "./Flag";

// Eigenes Icon statt des Leaflet-Standardmarkers: dessen Bildpfade findet der Bundler nicht.
// Über einem Land trägt die ISS dessen Flagge wie ein Schiff die Gastlandflagge (B6 P1-2).
const issIcons = new Map();
function issIcon(countryCode) {
  const flagCode = countryCode && hasFlag(countryCode) ? countryCode.toLowerCase() : null;
  if (!issIcons.has(flagCode)) {
    const flag = flagCode ? `<span class="fi fi-${flagCode} iss-flag"></span>` : "";
    issIcons.set(
      flagCode,
      L.divIcon({
        className: "iss-icon",
        html: `<span aria-hidden="true">🛰️</span>${flag}`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    );
  }
  return issIcons.get(flagCode);
}

const userIcon = L.divIcon({
  className: "user-icon",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const USER_LINK_COLOR = "#2563eb";

const TRAIL_COLOR = "#c15d38";
const TRAIL_WEIGHT = 3;
// Verblassen (P1-1): Die Spur wird in Altersstufen geteilt, die neueste ist voll deckend.
const TRAIL_FADE_STEPS = 5;
const TRAIL_MIN_OPACITY = 0.2;

// Datumsgrenze: Leaflet zeichnet Längen über ±180° in der benachbarten Weltkopie. Die Länge wird
// deshalb in die Kopie verschoben, die `reference` am nächsten liegt. So springen Marker und Spur
// beim Überflug über 180° O/W nicht ans andere Ende der Karte.
function wrapNear(longitude, reference) {
  return longitude + 360 * Math.round((reference - longitude) / 360);
}

// Teilt die Spur nach Alter in Stufen auf (neueste zuerst). Die Längen werden vom neuesten Punkt
// aus fortlaufend gemacht, damit die Linie an der Datumsgrenze nicht quer über die Karte läuft.
// Ergebnis: pro Stufe eine Liste von Linienzügen, passend für `polyline.setLatLngs`.
function buildTrailSegments(trail, newestLongitude) {
  const steps = Array.from({ length: TRAIL_FADE_STEPS }, () => []);
  if (trail.length < 2) return steps;

  const points = new Array(trail.length);
  let reference = newestLongitude;
  for (let i = trail.length - 1; i >= 0; i--) {
    reference = wrapNear(trail[i].longitude, reference);
    points[i] = { latLng: [trail[i].latitude, reference], timestamp: trail[i].timestamp };
  }

  const newest = trail.at(-1).timestamp;
  const span = Math.max(newest - trail[0].timestamp, 1);

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const age = (newest - (a.timestamp + b.timestamp) / 2) / span;
    const step = Math.min(Math.floor(age * TRAIL_FADE_STEPS), TRAIL_FADE_STEPS - 1);
    const paths = steps[step];
    const last = paths.at(-1);
    // Gleiche Stufe wie der vorige Abschnitt: Linienzug verlängern, sonst neuen beginnen.
    if (last && last.at(-1) === a.latLng) {
      last.push(b.latLng);
    } else {
      paths.push([a.latLng, b.latLng]);
    }
  }

  return steps;
}

// Kasten oben rechts in der Karte für Ein/Aus-Schalter. B2 ("Karte folgt") kommt hier später dazu.
function createTogglesControl(onShowTrailChange) {
  const control = L.control({ position: "topright" });
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "leaflet-bar map-toggles");
    container.innerHTML =
      '<label class="map-toggle"><input type="checkbox" name="showTrail"> Spur anzeigen</label>';
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    const checkbox = container.querySelector('input[name="showTrail"]');
    checkbox.addEventListener("change", () => onShowTrailChange.current(checkbox.checked));
    control.trailCheckbox = checkbox;
    return container;
  };
  return control;
}

export default function IssMap({
  position,
  trail,
  showTrail,
  onShowTrailChange,
  userLocation,
  userLocationLabel,
  countryCode,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const trailLayerRef = useRef(null);
  const trailLinesRef = useRef([]);
  const togglesRef = useRef(null);
  const onShowTrailChangeRef = useRef(onShowTrailChange);
  onShowTrailChangeRef.current = onShowTrailChange;
  const userMarkerRef = useRef(null);
  const userLinkRef = useRef(null);
  const fittedLocationRef = useRef(null);
  const dataRef = useRef({ position, trail, userLocation, userLocationLabel, countryCode });
  dataRef.current = { position, trail, userLocation, userLocationLabel, countryCode };

  // Zeichnet Marker und Spur in der Weltkopie, die der Kartenmitte am nächsten liegt.
  const drawRef = useRef(() => {});
  drawRef.current = () => {
    const map = mapRef.current;
    const { position, trail, userLocation, userLocationLabel, countryCode } = dataRef.current;
    if (!map || !position) return;

    const isFirst = !markerRef.current;
    const reference = isFirst ? position.longitude : map.getCenter().lng;
    const latLng = [position.latitude, wrapNear(position.longitude, reference)];

    if (isFirst) {
      markerRef.current = L.marker(latLng, {
        icon: issIcon(countryCode),
        title: "ISS",
        keyboard: false,
        zIndexOffset: 1000, // immer über dem Nutzer-Marker
      }).addTo(map);
      map.setView(latLng, 3);
    } else {
      markerRef.current.setLatLng(latLng);
      const icon = issIcon(countryCode);
      if (markerRef.current.options.icon !== icon) markerRef.current.setIcon(icon);
    }

    const segments = buildTrailSegments(trail, latLng[1]);
    trailLinesRef.current.forEach((line, step) => line.setLatLngs(segments[step]));

    // Eigener Standort (B5): in die Weltkopie nahe der ISS legen, damit die Linie den kurzen Weg nimmt.
    if (userLocation) {
      const userLatLng = [userLocation.latitude, wrapNear(userLocation.longitude, latLng[1])];
      const title = `Dein Standort (gerundet): ${userLocationLabel}`;
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLatLng);
        userMarkerRef.current.getElement()?.setAttribute("title", title);
      } else {
        userMarkerRef.current = L.marker(userLatLng, { icon: userIcon, title, keyboard: false }).addTo(map);
      }
      if (userLinkRef.current) {
        userLinkRef.current.setLatLngs([userLatLng, latLng]);
      } else {
        userLinkRef.current = L.polyline([userLatLng, latLng], {
          color: USER_LINK_COLOR,
          weight: 2,
          dashArray: "6 6",
          interactive: false,
        }).addTo(map);
      }
      // Einmal pro neuem Standort beide ins Bild holen, danach bewegt sich die Karte nicht mehr selbst.
      if (fittedLocationRef.current !== userLocation) {
        fittedLocationRef.current = userLocation;
        map.fitBounds(L.latLngBounds([userLatLng, latLng]), { padding: [60, 60], maxZoom: 5 });
      }
    }
  };

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

    // Die Linien werden einmal angelegt und danach nur per setLatLngs aktualisiert.
    const trailLines = Array.from({ length: TRAIL_FADE_STEPS }, (_, step) =>
      L.polyline([], {
        color: TRAIL_COLOR,
        weight: TRAIL_WEIGHT,
        opacity: 1 - (step * (1 - TRAIL_MIN_OPACITY)) / (TRAIL_FADE_STEPS - 1),
        interactive: false,
      }),
    );
    trailLayerRef.current = L.layerGroup(trailLines);
    trailLinesRef.current = trailLines;

    togglesRef.current = createTogglesControl(onShowTrailChangeRef).addTo(map);
    mapRef.current = map;
    // Nach dem Verschieben (auch nach dem Sprung durch worldCopyJump) in die passende Kopie umzeichnen.
    map.on("moveend", () => drawRef.current());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      userMarkerRef.current = null;
      userLinkRef.current = null;
      fittedLocationRef.current = null;
      trailLayerRef.current = null;
      trailLinesRef.current = [];
      togglesRef.current = null;
    };
  }, []);

  useEffect(() => {
    drawRef.current();
  }, [position, trail, userLocation, countryCode]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = trailLayerRef.current;
    if (!map || !layer) return;
    togglesRef.current.trailCheckbox.checked = showTrail;
    if (showTrail) {
      layer.addTo(map);
    } else {
      layer.remove();
    }
  }, [showTrail]);

  return <div ref={containerRef} className="map" data-testid="map" />;
}
