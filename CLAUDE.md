# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Worum es geht

ISS-Live-Tracker als Übung im Bildungsurlaub **Agentic Coding** (Oktober 2026): eine reine Frontend-App, die die ISS live auf einer Leaflet-Karte zeigt und öffentlich per HTTPS deployt wird. Maßgeblich ist `ai_docs/PRD.md` (Basis F1–F4, Bonus-Übersicht B1–B6). Die Details jeder Bonus-Aufgabe stehen in `ai_docs/features/`, die Original-Aufgabe in `ai_docs/Uebung_ISS-Tracker.pdf`. Vor Änderungen PRD und die betroffene Spec lesen.

Stack: Next.js 16 (App Router, Turbopack), React 19, Leaflet ohne `react-leaflet`, `flag-icons`, reines JavaScript (kein TypeScript).

Next.js 16 hat Breaking Changes gegenüber älteren Versionen. Vor dem Einsatz von Next-APIs die Doku in `node_modules/next/dist/docs/` lesen. `AGENTS.md` wird von `next dev` erzeugt und gehört ins Repo.

## Befehle

```bash
npm install
npm run dev          # Dev-Server auf http://localhost:3000
npm run build        # Produktions-Build, scheitert u. a., wenn Leaflet serverseitig geladen wird
npm start            # Produktions-Build lokal ausliefern
npx vercel --prod    # Deploy (Projekt ist über .vercel/ verknüpft), Live: https://iss-tracker-kappa-nine.vercel.app
```

Es gibt keinen Linter und keine automatisierten Tests. Die manuelle Testanleitung für alle Features steht in `README.md` unter „Lokal testen“.

## Architektur

- **`app/page.js`** (Client-Komponente) hält den **gesamten Zustand**: `position`, `trail` (B1), `country` und `nextCountry` (B6), `userLocation` (B5), `showTrail`. Alle Abrufe laufen dort, die Messwerte, die Länderzeile und die Entfernungs-Kachel werden dort gerendert.
- **`app/IssMap.js`** bekommt diesen Zustand als Props und kapselt Leaflet imperativ. Die Karte, die Spur-Polylines und der Schalter-Kasten werden **einmal** erzeugt. Danach zeichnet eine einzige Funktion `drawRef.current()` Marker, Spur, Nutzer-Marker und Verbindungslinie neu, und zwar bei neuen Daten **und** nach jedem `moveend`. Neue Kartenebenen gehören in diese Funktion.
- **Leaflet nur clientseitig:** Leaflet greift beim Import auf `window` zu. `IssMap` wird deshalb in `page.js` per `next/dynamic` mit `ssr: false` geladen. Leaflet nirgends sonst importieren. Die CSS von Leaflet und `flag-icons` werden in `app/layout.js` importiert.
- **Hilfsmodule:** `app/geo.js` (reine Geometrie, z. B. `distanceToIssKm`) und `app/Flag.js` (Flaggen-Komponente, `hasFlag`, `countryName` über `Intl.DisplayNames`). `page.js` darf nur Next.js-Seitenexporte haben, gemeinsame Funktionen gehören in eigene Module.
- **Datenquelle:** nur `https://api.wheretheiss.at/v1/` (HTTPS, kein Key):
  - `/satellites/25544`: Polling-Position mit `visibility`
  - `/satellites/25544/positions?timestamps=…`: vergangene Positionen (B1-Vorbefüllung) und zukünftige (B6-Countdown), höchstens 10 Zeitstempel
  - `/coordinates/{lat},{lon}`: `country_code` (B6), `??` über dem Meer
- **Polling:** `setTimeout`-Kette (nicht `setInterval`) alle ca. 5 Sekunden, 4 Sekunden Timeout pro Anfrage. Die Länderabfrage läuft in derselben Kette **nach** der Position, nacheinander. Fehler zeigen einen Hinweis (`.notice`), stoppen aber nie das Polling. Ein Fehler bei der Länderabfrage löst keinen Banner aus, sondern „(Stand: …)“.
- **Schalter-Kasten:** `createTogglesControl` in `IssMap.js` ist der gemeinsame Leaflet-Control für Ein/Aus-Schalter („Spur anzeigen“, später „Karte folgt“ aus B2).

## Stolpersteine

- **Kein HTTP, nirgends.** Open Notify (`/iss-now.json`, `/astros.json`) läuft nur über HTTP und wird auf der HTTPS-Seite als Mixed Content blockiert. Das gilt auch für Kachel-URLs und Icons. B4 braucht deshalb einen Proxy unter `app/api/` (Details: B4-Spec). Mit GitHub Pages (statischer Export) geht das nicht, deshalb wird mit Vercel deployt.
- **Datumsgrenze:** Leaflet zeichnet Längen über ±180° in der Nachbarkopie der Welt. Marker, Spur und Linien werden per `wrapNear` in die Kopie gelegt, die der Kartenmitte am nächsten liegt. Wer das bei neuen Ebenen vergisst, bekommt beim Überflug über 180° Sprünge ans andere Kartenende.
- **Leaflet-Standardmarker** finden mit Bundlern ihre Bildpfade nicht (unsichtbarer Marker). Marker deshalb immer als `L.divIcon` bauen.
- **React StrictMode** mountet Effekte im Dev-Modus doppelt. Leaflet-Effekte brauchen ein Cleanup mit `map.remove()`. Abruf-Effekte laufen im Dev doppelt an, das ist beim Zählen von Anfragen zu beachten.
- **Anfragelimit:** 350 Anfragen pro 5 Minuten **pro IP**, also für alle Tabs und Kursteilnehmer im selben Netz zusammen. Ein Tab braucht ca. 120–175. Bei Überschreitung kommt 429, die App zeigt dann den F4-Hinweis.
- **Flaggen-Liste:** Die Code-Liste in `app/Flag.js` ist aus `node_modules/flag-icons/flags/4x3` erzeugt. Nach einem Update von `flag-icons` neu erzeugen.
- **Datenschutz (B5):** Der eigene Standort wird nie gespeichert oder gesendet und nur auf 2 Nachkommastellen gerundet angezeigt. Beim Aktualisieren `maximumAge: 0` verwenden, sonst liefert der Browser die zwischengespeicherte alte Position.

## Testen im Browser (Playwright)

- **Testdaten statt echter API:** `page.route` für `**/satellites/25544/positions**`, `/satellites\/25544(\?|$)/` und `**/v1/coordinates/**`. Damit lassen sich Datumsgrenze, Land und Meer, Countdown und Fehler gezielt erzeugen und das Anfragelimit schonen. Den API-Ausfall mit `page.route('**/api.wheretheiss.at/**', r => r.abort())` simulieren.
- **Eigene Browser-Kontexte** immer in `try/finally` schließen. Verwaiste Kontexte pollen weiter, verbrauchen das Limit und werfen alte Route-Handler-Fehler in spätere Läufe. Keinen Tab mit echten Daten nebenher laufen lassen.
- Den Hinweis über `.notice` ansprechen, nicht über `[role=alert]`, denn den hat auch der Route-Announcer von Next.js. In Skripten keine Variable `URL` nennen, sonst ist der `URL`-Konstruktor verdeckt.
- **Geolocation (B5):** `context.grantPermissions(['geolocation'], { origin })` und `setGeolocation(...)`. Mit `grantPermissions([])` wird die Abfrage abgelehnt. Ganz ohne Freigabe wartet der Testbrowser endlos auf den Dialog.

## Anforderungen dokumentieren

- **`ai_docs/PRD.md`** enthält die Basis-Anforderungen vollständig. Für Bonus-Aufgaben gibt es nur eine Übersicht: ID, einzeilige Beschreibung, Link zur Spec und grober Status (Offen / Spezifiziert / Umgesetzt).
- **`ai_docs/features/Bx_<kurzname>.md`** enthält alle Details einer Bonus-Aufgabe. Neue Specs nach `ai_docs/features/_VORLAGE.md` anlegen, vor der Umsetzung (z. B. mit `/product-management:write-spec`).
- **Der Stand steht nur im Abschnitt „Umsetzungsstand“** am Anfang der Spec, mit einer Tabelle aller P0/P1/P2-Punkte und dem Nachweis. Keine Statuszeile im Kopf, keine Checkboxen bei den Abnahmekriterien, kein Status in Überschriften.
- Nach Umsetzung oder Deploy beides nachziehen: den Umsetzungsstand der Spec **und** den groben Status in der PRD. Neue Testschritte in `README.md` unter „Lokal testen“ ergänzen.

## Git und Deploy

`iss-tracker/` ist ein eigenes Git-Repo, hier wird **committet** (Remote `origin`, Branch `main`). Die Regel „Nichts committen“ aus der übergeordneten `CLAUDE.md` gilt für dieses Repo nicht. Committen und deployen nur auf Anweisung.

**Fertig** ist eine Änderung, wenn die Live-URL sich im Inkognito-Fenster öffnet, der Marker sich innerhalb von 10 Sekunden sichtbar bewegt und die Konsole keinen Mixed-Content-Fehler zeigt.
