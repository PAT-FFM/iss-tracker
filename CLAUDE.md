# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Worum es geht

ISS-Live-Tracker als Übung im Bildungsurlaub **Agentic Coding** (Oktober 2026): eine reine Frontend-App, die die ISS live auf einer Leaflet-Karte zeigt und öffentlich per HTTPS deployt wird. Maßgeblich ist `ai_docs/PRD.md` (Anforderungen F1–F4, Bonus B1–B4, Akzeptanzkriterien), die Original-Aufgabe liegt in `ai_docs/Uebung_ISS-Tracker.pdf`. Vor Änderungen die PRD lesen.

Stack: Next.js 16 (App Router, Turbopack), React 19, Leaflet ohne `react-leaflet`, reines JavaScript (kein TypeScript). Die Pflichtanforderungen F1–F4 sowie die Bonus-Aufgaben B1, B5 und B6 sind umgesetzt. Der aktuelle Stand steht in der PRD bzw. in den Feature-Specs (siehe „Anforderungen dokumentieren“).

## Befehle

```bash
npm install
npm run dev       # Dev-Server auf http://localhost:3000
npm run build     # Produktions-Build, scheitert u. a., wenn Leaflet serverseitig geladen wird
npm start         # Produktions-Build lokal ausliefern
```

Es gibt keinen Linter und keine automatisierten Tests. Die manuelle Testanleitung (F1–F4, API-Ausfall per DevTools simulieren) steht in `README.md` unter „Lokal testen“. Für automatisierte Browserprüfungen per Playwright den API-Ausfall mit `page.route('**/api.wheretheiss.at/**', r => r.abort())` simulieren. Den Hinweis über `.notice` ansprechen, nicht über `[role=alert]`, denn den hat auch der Route-Announcer von Next.js. Geolocation (B5) in einem eigenen Context simulieren: `grantPermissions(['geolocation'], { origin })` und `setGeolocation(...)`. Mit `grantPermissions([])` wird die Abfrage abgelehnt. Ganz ohne Freigabe wartet der Testbrowser endlos auf den Dialog.

## Anforderungen dokumentieren

- **`ai_docs/PRD.md`** enthält die Basis-Anforderungen vollständig. Für Bonus-Aufgaben gibt es nur eine Übersicht: ID, einzeilige Beschreibung, Link zur Spec und grober Status (Offen / Spezifiziert / Umgesetzt).
- **`ai_docs/features/Bx_<kurzname>.md`** enthält alle Details einer Bonus-Aufgabe. Neue Specs nach `ai_docs/features/_VORLAGE.md` anlegen, vor der Umsetzung (z. B. mit `/product-management:write-spec`).
- **Der Stand steht nur im Abschnitt „Umsetzungsstand“** am Anfang der Spec, mit einer Tabelle aller P0/P1/P2-Punkte und dem Nachweis. Keine Statuszeile im Kopf, keine Checkboxen bei den Abnahmekriterien, kein Status in Überschriften.
- Nach Umsetzung oder Deploy beides nachziehen: den Umsetzungsstand der Spec **und** den groben Status in der PRD.

## Git

`iss-tracker/` ist ein eigenes Git-Repo, hier wird **committet**. Die Regel „Nichts committen“ aus der übergeordneten `CLAUDE.md` gilt für dieses Repo nicht.

## Architektur (laut PRD)

- **Next.js App Router**, Quellcode in `app/` im Projektstamm (`package.json` und `next.config.mjs` liegen im Stamm). Next.js dient nur als Frontend-Framework, es gibt kein eigenes Backend.
- **Aufteilung:** `app/page.js` ist eine Client-Komponente. Sie enthält Polling, Fehlerzustand, Formatierung (de-DE) und die Messwert-Kacheln. `app/IssMap.js` kapselt Leaflet imperativ (`useRef` und `useEffect`). Die Karte wird einmal erzeugt, danach wird nur noch der Marker per `setLatLng` verschoben. Die Leaflet-CSS wird in `app/layout.js` importiert.
- **Leaflet nur clientseitig:** Leaflet greift beim Import auf `window` zu. `IssMap` wird deshalb in `page.js` per `next/dynamic` mit `ssr: false` geladen. Leaflet nirgends sonst direkt importieren.
- **Datenquelle:** ausschließlich `https://api.wheretheiss.at/v1/satellites/25544`, direkt aus dem Browser abgefragt, kein API-Key. Liefert u. a. `latitude`, `longitude`, `altitude` (km), `velocity` (km/h), `visibility`.
- **Polling** alle ca. 5 Sekunden als `setTimeout`-Kette (nicht `setInterval`), damit sich Abrufe nicht überlappen, mit 4 Sekunden Timeout pro Anfrage. Ein fehlgeschlagener Abruf zeigt einen verständlichen Hinweis, darf die Seite aber weder leeren noch das Polling stoppen. Sobald die API wieder antwortet, erholt sich die Anzeige.
- **Kartenkacheln:** OpenStreetMap über HTTPS, mit Attribution.
- **Einzige Backend-Ausnahme:** Bonus B4 (Astronauten-Liste) braucht einen Proxy als Route Handler unter `app/api/`, weil `astros.json` nur über HTTP erreichbar ist.

## Stolpersteine

- **Kein HTTP, nirgends.** Open Notify (`/iss-now.json`, `/astros.json`) läuft nur über HTTP und wird auf der deployten HTTPS-Seite als Mixed Content blockiert. Die Karte bliebe dann leer. Das gilt auch für Kachel-URLs und Marker-Icons.
- **Leaflet-Standardmarker:** Die Icon-Pfade von Leaflet funktionieren mit Bundlern nicht (unsichtbarer Marker). Deshalb nutzt `IssMap.js` ein `L.divIcon` mit Emoji. Neue Marker genauso bauen.
- **Datumsgrenze:** Leaflet zeichnet Längen über ±180° in der Nachbarkopie der Welt. `IssMap.js` legt Marker und Spur per `wrapNear` in die Kopie, die der Kartenmitte am nächsten liegt, und zeichnet nach jedem `moveend` neu. Neue Kartenebenen (z. B. für B2/B3) müssen das genauso machen, sonst springen sie beim Überflug über 180° ans andere Kartenende.
- **`page.js` darf nur die Next.js-Seitenexporte haben** (`default`, `metadata` usw.). Hilfsfunktionen, die mehrere Dateien brauchen, gehören in eigene Module wie `app/geo.js` (reine Geometrie, z. B. `distanceToIssKm`).
- **Eigener Standort (B5):** wird nie gespeichert oder gesendet und nur auf 2 Nachkommastellen gerundet angezeigt. Nutzer-Marker und Verbindungslinie werden in `drawRef` mitgezeichnet.
- **Flaggen (B6):** `app/Flag.js` enthält die Liste der Codes, für die `flag-icons` eine Flagge hat (aus `node_modules/flag-icons/flags/4x3` erzeugt), und `countryName` über `Intl.DisplayNames`. Nach einem Update von `flag-icons` die Liste neu erzeugen. Die Länderabfrage läuft in `poll()` nach der Position, nacheinander statt parallel.
- **Anfragelimit:** 350 Anfragen pro 5 Minuten **pro IP**. Ein Tab braucht ca. 120–175 davon. Bei vielen Playwright-Läufen mit echten Daten antwortet die API mit 429. In Tests deshalb `page.route` mit Testdaten verwenden, Browser-Kontexte immer schließen (auch nach Fehlern) und keinen Tab mit echten Daten nebenher laufen lassen.
- **Schalter-Control:** `createTogglesControl` in `IssMap.js` ist der gemeinsame Kasten für Ein/Aus-Schalter in der Karte. B2 („Karte folgt“) gehört dort hinein.
- **React StrictMode** mountet Effekte im Dev-Modus doppelt. Der Karten-Effekt muss deshalb im Cleanup `map.remove()` aufrufen, sonst meldet Leaflet „Map container is already initialized“.
- **Deployment:** Empfohlen ist Vercel (`npx vercel --prod`). GitHub Pages geht nur mit statischem Export (`output: 'export'`). Dann funktionieren keine Route Handler, B4 fällt also weg.

## Fertig, wenn …

Die Live-URL öffnet sich im Inkognito-Fenster, der Marker bewegt sich innerhalb von 10 Sekunden sichtbar und die Browser-Konsole zeigt keinen Mixed-Content-Fehler. Lokal und nach dem Deploy im Browser prüfen, z. B. per Playwright.
