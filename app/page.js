"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { distanceToIssKm } from "./geo";

const API_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const POLL_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 4000;

// Spur (B1): Länge über den Zeitstempel begrenzt, Vorbefüllung mit max. 10 Zeitstempeln (API-Limit).
const TRAIL_DURATION_MS = 10 * 60 * 1000;
const PREFILL_POINTS = 10;
const SHOW_TRAIL_KEY = "iss-tracker:showTrail";

// Eigener Standort (B5): einmalige Abfrage, wird weder gespeichert noch gesendet.
const GEOLOCATION_OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 };

// Leaflet greift beim Import auf `window` zu und darf deshalb nur im Browser geladen werden.
const IssMap = dynamic(() => import("./IssMap"), {
  ssr: false,
  loading: () => <div className="map-placeholder">Karte wird geladen …</div>,
});

const numberFormat = (digits) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const coordFormat = numberFormat(4);
// Eigener Standort nur auf ca. 1 km genau anzeigen, damit Screenshots den Wohnort nicht verraten.
const userCoordFormat = numberFormat(2);
const altitudeFormat = numberFormat(1);
const velocityFormat = numberFormat(0);
const distanceFormat = numberFormat(0);
const timeFormat = new Intl.DateTimeFormat("de-DE", { timeStyle: "medium" });

function formatLatitude(lat, format = coordFormat) {
  return `${format.format(Math.abs(lat))}° ${lat >= 0 ? "N" : "S"}`;
}

function formatLongitude(lon, format = coordFormat) {
  return `${format.format(Math.abs(lon))}° ${lon >= 0 ? "O" : "W"}`;
}

function formatUserLocation(location) {
  return `${formatLatitude(location.latitude, userCoordFormat)}, ${formatLongitude(location.longitude, userCoordFormat)}`;
}

function toPosition(data) {
  if (!Number.isFinite(data?.latitude) || !Number.isFinite(data?.longitude)) {
    throw new Error("Unerwartete Antwort");
  }
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: data.altitude,
    velocity: data.velocity,
    visibility: data.visibility,
    timestamp: data.timestamp * 1000,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Führt Punkte zusammen: nach Zeit sortiert, ohne doppelte Zeitstempel, nur die letzten 10 Minuten.
// Maßstab ist der neueste API-Zeitstempel, nicht die Uhr des Browsers.
function mergeTrail(trail, points) {
  const byTime = new Map(trail.map((p) => [p.timestamp, p]));
  for (const p of points) byTime.set(p.timestamp, p);
  const sorted = [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp);
  const cutoff = sorted.at(-1).timestamp - TRAIL_DURATION_MS;
  return sorted.filter((p) => p.timestamp >= cutoff);
}

function readShowTrail() {
  try {
    return window.localStorage.getItem(SHOW_TRAIL_KEY) !== "false";
  } catch {
    return true;
  }
}

export default function Home() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [trail, setTrail] = useState([]);
  const [showTrail, setShowTrail] = useState(() =>
    typeof window === "undefined" ? true : readShowTrail(),
  );

  // Abfragestatus: idle | locating | ready | denied | unavailable | unsupported
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");

  useEffect(() => {
    // Geolocation gibt es nur in einem sicheren Kontext (HTTPS oder localhost).
    if (!window.isSecureContext || !("geolocation" in navigator)) setLocationStatus("unsupported");
  }, []);

  // `fresh`: Beim Aktualisieren keine zwischengespeicherte Position des Browsers verwenden.
  function requestLocation({ fresh = false } = {}) {
    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setUserLocation({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy,
        });
        setLocationStatus("ready");
      },
      (err) => {
        setLocationStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      fresh ? { ...GEOLOCATION_OPTIONS, maximumAge: 0 } : GEOLOCATION_OPTIONS,
    );
  }

  const distanceKm = position && userLocation ? distanceToIssKm(userLocation, position) : null;

  function handleShowTrailChange(value) {
    setShowTrail(value);
    try {
      window.localStorage.setItem(SHOW_TRAIL_KEY, String(value));
    } catch {
      // Ohne localStorage (z. B. gesperrt) gilt der Schalter nur bis zum Neuladen.
    }
  }

  // Vorbefüllung: einmalig vergangene Positionen laden. Fehler werden still ignoriert.
  useEffect(() => {
    let cancelled = false;
    const now = Math.floor(Date.now() / 1000);
    const step = TRAIL_DURATION_MS / 1000 / (PREFILL_POINTS - 1);
    const timestamps = Array.from({ length: PREFILL_POINTS }, (_, i) =>
      Math.round(now - TRAIL_DURATION_MS / 1000 + i * step),
    );

    fetchJson(`${API_URL}/positions?timestamps=${timestamps.join(",")}&units=kilometers`)
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const points = data.map(toPosition);
        setTrail((prev) => mergeTrail(prev, points));
      })
      .catch((err) => {
        if (!cancelled) console.warn("Spur konnte nicht vorbefüllt werden:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let timer;
    let cancelled = false;

    // setTimeout statt setInterval: Der nächste Abruf startet erst, wenn der vorige fertig ist.
    async function poll() {
      try {
        const current = toPosition(await fetchJson(API_URL));
        if (cancelled) return;
        setPosition(current);
        setTrail((prev) => mergeTrail(prev, [current]));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.warn("ISS-Position konnte nicht geladen werden:", err);
        setError(new Date());
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <main className="layout">
      <header className="header">
        <h1>ISS-Live-Tracker</h1>
        <p className="subtitle">Aktuelle Position der Internationalen Raumstation</p>
      </header>

      {error && (
        <div className="notice" role="alert">
          <strong>Die ISS-Daten sind gerade nicht erreichbar.</strong>{" "}
          {position
            ? `Angezeigt wird die letzte bekannte Position von ${timeFormat.format(position.timestamp)} Uhr.`
            : "Es liegt noch keine Position vor."}{" "}
          Neuer Versuch alle 5 Sekunden.
        </div>
      )}

      <section className="stats" aria-label="Messwerte">
        <Stat label="Breite" value={position && formatLatitude(position.latitude)} />
        <Stat label="Länge" value={position && formatLongitude(position.longitude)} />
        <Stat label="Höhe" value={position && `${altitudeFormat.format(position.altitude)} km`} />
        <Stat
          label="Geschwindigkeit"
          value={position && `${velocityFormat.format(position.velocity)} km/h`}
        />
        <DistanceStat
          status={locationStatus}
          distanceKm={distanceKm}
          userLocation={userLocation}
          onRequest={requestLocation}
        />
      </section>

      <div className="map-wrapper">
        <IssMap
          position={position}
          trail={trail}
          showTrail={showTrail}
          onShowTrailChange={handleShowTrailChange}
          userLocation={userLocation}
          userLocationLabel={userLocation && formatUserLocation(userLocation)}
        />
      </div>

      <footer className="footer">
        {position
          ? `Stand: ${timeFormat.format(position.timestamp)} Uhr · Aktualisierung alle 5 Sekunden`
          : "Position wird geladen …"}
        {" · "}Daten: <a href="https://wheretheiss.at/">wheretheiss.at</a>
      </footer>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? "–"}</span>
    </div>
  );
}

function DistanceStat({ status, distanceKm, userLocation, onRequest }) {
  let content;
  if (status === "unsupported") {
    content = <span className="stat-hint">Im Browser nicht verfügbar</span>;
  } else if (status === "locating") {
    content = (
      <button type="button" className="stat-button" disabled>
        Standort wird ermittelt …
      </button>
    );
  } else if (status === "ready") {
    content = (
      <>
        <span className="stat-value">
          {distanceKm == null ? "–" : `${distanceFormat.format(distanceKm)} km`}
        </span>
        <span className="stat-hint">
          Dein Standort: {formatUserLocation(userLocation)} ·{" "}
          <button type="button" className="link-button" onClick={() => onRequest({ fresh: true })}>
            Standort aktualisieren
          </button>
        </span>
      </>
    );
  } else {
    const message = {
      denied: "Standortzugriff abgelehnt. Du kannst ihn in den Website-Einstellungen des Browsers erlauben.",
      unavailable: "Standort nicht verfügbar.",
    }[status];
    content = (
      <>
        <button type="button" className="stat-button" onClick={() => onRequest()}>
          {status === "unavailable" ? "Erneut versuchen" : "Mein Standort"}
        </button>
        {message && <span className="stat-hint" role="status">{message}</span>}
      </>
    );
  }

  return (
    <div className="stat stat-distance">
      <span className="stat-label">Entfernung zur ISS</span>
      {content}
    </div>
  );
}
