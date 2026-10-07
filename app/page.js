"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const API_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const POLL_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 4000;

// Leaflet greift beim Import auf `window` zu und darf deshalb nur im Browser geladen werden.
const IssMap = dynamic(() => import("./IssMap"), {
  ssr: false,
  loading: () => <div className="map-placeholder">Karte wird geladen …</div>,
});

const numberFormat = (digits) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const coordFormat = numberFormat(4);
const altitudeFormat = numberFormat(1);
const velocityFormat = numberFormat(0);
const timeFormat = new Intl.DateTimeFormat("de-DE", { timeStyle: "medium" });

function formatLatitude(lat) {
  return `${coordFormat.format(Math.abs(lat))}° ${lat >= 0 ? "N" : "S"}`;
}

function formatLongitude(lon) {
  return `${coordFormat.format(Math.abs(lon))}° ${lon >= 0 ? "O" : "W"}`;
}

export default function Home() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;
    let cancelled = false;

    // setTimeout statt setInterval: Der nächste Abruf startet erst, wenn der vorige fertig ist.
    async function poll() {
      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
          throw new Error("Unerwartete Antwort");
        }
        if (cancelled) return;
        setPosition({
          latitude: data.latitude,
          longitude: data.longitude,
          altitude: data.altitude,
          velocity: data.velocity,
          timestamp: data.timestamp * 1000,
        });
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
      </section>

      <div className="map-wrapper">
        <IssMap position={position} />
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
