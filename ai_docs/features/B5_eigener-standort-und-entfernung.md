# Feature-Spec B5: Eigener Standort und Entfernung zur ISS

Bonus-Anforderung B5 aus [`../PRD.md`](../PRD.md). Status: **Umgesetzt** am 07.10.2026 (P0, P1-1 und P1-2), lokal und live getestet, deployt. Code: `app/geo.js` (Rechnung), `app/page.js` (Abfrage, Kachel) und `app/IssMap.js` (Marker, Linie).

## Umsetzungsstand

| ID | Anforderung | Status | Nachweis |
|---|---|---|---|
| P0-1 | Standort per Klick | ✅ Umgesetzt | Playwright: 0 Abfragen beim Laden, Kachel nach Freigabe |
| P0-2 | Direkte Entfernung | ✅ Umgesetzt | Testdaten: darunter 420 km, gegenüber 13.162 km, live wechselnd |
| P0-3 | Standort auf der Karte | ✅ Umgesetzt | Playwright, auch an der Datumsgrenze |
| P0-4 | Fehlerfälle | ✅ Umgesetzt | Playwright: abgelehnt, nicht verfügbar, keine Geolocation, API-Ausfall |
| P0-5 | Datenschutz | ✅ Umgesetzt | Keine Anfrage mit Koordinaten, Anzeige auf 2 Nachkommastellen |
| P1-1 | Beide im Bild | ✅ Umgesetzt | Playwright, nach Freigabe und nach dem Aktualisieren |
| P1-2 | Standort aktualisieren | ✅ Umgesetzt | Playwright: Wechsel Berlin → New York (Fehler mit `maximumAge` gefunden und behoben) |
| P2-1 | Sichtbarkeit am Himmel | ⏳ Offen | Vorbereitet: reine Funktionen in `app/geo.js` |
| P2-2 | Mitlaufen per `watchPosition` | ⏳ Offen | |
| P2-3 | Schalter „Standort anzeigen“ | ⏳ Offen | |

Alle Abnahmekriterien unten sind lokal geprüft, die Kernfunktionen zusätzlich unter der Live-URL in einer frischen Browser-Sitzung (Stand 07.10.2026).

## Problem

Die App zeigt, wo die ISS ist, aber nicht, was das für den Besucher bedeutet. Zahlen wie „41,9° N, 2,9° W“ sagen wenig, solange man den eigenen Standort nicht danebensieht. Die naheliegende Frage „Wie weit ist die ISS gerade von mir weg?“ bleibt unbeantwortet.

## Ziele

1. Der Besucher kann mit **einem Klick** seinen Standort freigeben und sieht danach die **direkte Entfernung zur ISS** in km.
2. Die Entfernung wird bei jedem Polling-Schritt (ca. alle 5 Sekunden) **live neu berechnet**.
3. Eigener Standort und ISS sind auf der Karte **sichtbar verbunden**.
4. Wer den Standort nicht freigibt oder keinen hat, kann die App **unverändert** nutzen.
5. Der Standort **verlässt das Gerät nicht**: keine zusätzliche Anfrage, keine Speicherung.

## Nicht-Ziele

- **Standort verfolgen (`watchPosition`).** Am Desktop bewegt sich niemand. Eine einmalige Abfrage mit „Aktualisieren“ reicht, siehe P2.
- **Standort speichern** (`localStorage`, Cookie, Server). Datenschutz geht vor Komfort. Nach dem Neuladen muss erneut geklickt werden.
- **Manuelle Ortseingabe oder Ortssuche** (Geocoding). Bräuchte eine weitere API. Wer die Geolocation ablehnt, bekommt einfach keine Entfernung.
- **Überflugvorhersage** („Wann ist die ISS über mir?“). Braucht Bahnberechnung (TLE), weit mehr Aufwand.
- **Großkreis-Linie.** Die Verbindungslinie ist auf der Karte gerade (Mercator). Eine gebogene Linie wäre korrekter, bringt aber wenig.

## User Stories

- Als **Besucher** möchte ich auf Knopfdruck sehen, wie weit die ISS von mir entfernt ist, damit ich ein Gefühl für ihre Lage bekomme.
- Als **Besucher** möchte ich meinen Standort auf der Karte neben der ISS sehen, damit ich Richtung und Abstand einschätzen kann.
- Als **datenschutzbewusster Besucher** möchte ich nicht beim Öffnen der Seite nach meinem Standort gefragt werden, damit ich selbst entscheide, ob ich ihn teile.
- Als **Besucher, der die Freigabe ablehnt**, möchte ich verstehen, warum keine Entfernung erscheint und wie ich es ändern kann.
- Als **Kursteilnehmer, der einen Screenshot im Chat teilt**, möchte ich, dass mein genauer Wohnort nicht ablesbar ist.

## Anforderungen

### Muss (P0)

**P0-1: Standort per Klick.** Eine fünfte Kachel „Entfernung zur ISS“ in der Messwerte-Leiste zeigt anfangs einen Button **„Mein Standort“**. Erst der Klick löst `navigator.geolocation.getCurrentPosition` aus (einmalig, `enableHighAccuracy: false`, `timeout: 10000`, `maximumAge: 300000`). *Platz in der Messwerte-Leiste: Vorschlag, siehe Entscheidungen.*
- [x] Beim Laden der Seite erscheint **kein** Erlaubnisdialog.
- [x] Nach dem Klick und der Freigabe steht innerhalb weniger Sekunden eine Entfernung in der Kachel.
- [x] Während der Abfrage zeigt die Kachel „Standort wird ermittelt …“, und der Button ist deaktiviert.

**P0-2: Direkte Entfernung.** Angezeigt wird die **Luftlinie im Raum** zwischen Nutzer (Erdoberfläche) und ISS (Erdradius + `altitude`). Gerechnet wird mit einer Kugel-Erde (R = 6.371 km): `d = √(r₁² + r₂² − 2·r₁·r₂·cos γ)`, γ ist der Mittelpunktswinkel aus beiden Koordinaten (Haversine). Format wie die übrigen Werte: `de-DE`, ganze km, z. B. „2.315 km“.
- [x] Die Entfernung ändert sich mit jedem Polling-Schritt.
- [x] Liegt der Nutzer genau unter der ISS, ist die Entfernung gleich der Höhe (ca. 420 km). Prüfbar mit Testdaten.
- [x] Liegt der Nutzer auf der gegenüberliegenden Seite der Erde, ist die Entfernung ca. 13.160 km (2 · 6.371 + 420). Prüfbar mit Testdaten.
- [x] Die Abweichung der Kugelrechnung (< 0,5 %) ist akzeptiert.

**P0-3: Standort auf der Karte.** Nach der Freigabe erscheint ein eigener Marker (blauer Punkt, `L.divIcon` wie beim ISS-Marker) und eine **gestrichelte Verbindungslinie** zur ISS, die bei jedem Polling-Schritt mitwandert.
- [x] Marker und Linie erscheinen erst nach erfolgreicher Freigabe.
- [x] Die Linie nimmt den kürzeren Weg, auch über die Datumsgrenze. Beide Enden werden wie in B1 per `wrapNear` in die Weltkopie nahe der Kartenmitte gelegt.
- [x] Linie und Nutzer-Marker verdecken den ISS-Marker nicht. Die Linie hebt sich von der orangefarbenen B1-Spur ab (andere Farbe, gestrichelt).

**P0-4: Fehlerfälle.** Jeder Fehler erscheint verständlich in der Kachel. Der Rest der App läuft weiter, und es gibt kein Banner (das ist für API-Ausfälle reserviert).
- [x] **Abgelehnt** (`PERMISSION_DENIED`): „Standortzugriff abgelehnt. Du kannst ihn in den Website-Einstellungen des Browsers erlauben.“ Der Button bleibt für einen neuen Versuch sichtbar.
- [x] **Nicht ermittelbar oder Zeitüberschreitung**: „Standort nicht verfügbar“ mit Button „Erneut versuchen“.
- [x] **Keine Geolocation im Browser** (oder kein sicherer Kontext): Die Kachel zeigt „Im Browser nicht verfügbar“ ohne Button.
- [x] Bei einem ISS-API-Ausfall (F4) bleibt die zuletzt berechnete Entfernung stehen und erholt sich mit den Positionsdaten.

**P0-5: Datenschutz.**
- [x] Der Standort wird **nicht** gespeichert und an niemanden gesendet. Im Network-Tab gibt es keine neue Anfrage, die Koordinaten enthält.
- [x] Der eigene Standort wird in der Oberfläche auf **2 Nachkommastellen** (ca. 1 km) gerundet angezeigt, z. B. im Tooltip des Markers. Gerechnet wird intern mit dem genauen Wert.

### Sollte (P1)

**P1-1: Beide im Bild.** Direkt nach der Freigabe wird der Kartenausschnitt **einmalig** so gewählt, dass Nutzer und ISS sichtbar sind (`fitBounds` mit Rand, höchstens Zoom 5). Danach bewegt sich die Karte nicht mehr von selbst.
- [x] Nutzer und ISS sind nach der Freigabe beide sichtbar, ohne dass man scrollen oder zoomen muss.

**P1-2: Standort aktualisieren.** Nach erfolgreicher Freigabe zeigt die Kachel einen kleinen Link „Standort aktualisieren“, der die Abfrage wiederholt. Dabei gilt `maximumAge: 0`, sonst liefert der Browser bis zu 5 Minuten lang die zwischengespeicherte alte Position.
- [x] Nach einem Ortswechsel und Klick auf „Standort aktualisieren“ erscheinen der neue Standort und die neue Entfernung.

### Später (P2)

- **P2-1: Sichtbarkeit am Himmel.** Aus denselben Daten lässt sich der Höhenwinkel der ISS über dem Horizont berechnen, z. B. „ISS über deinem Horizont“. Die Entfernungsberechnung daher als eigene, reine Funktion anlegen, die auf Kugelkoordinaten aufbaut.
- **P2-2: Mitlaufen per `watchPosition`** für Mobilgeräte.
- **P2-3: Schalter „Standort anzeigen“** im Schalter-Kasten aus B1, falls Marker und Linie stören.

## Technische Hinweise

- **Zustand:** `userLocation` (`{ latitude, longitude, accuracy }`) und der Abfragestatus (`idle | locating | ready | denied | unavailable | unsupported`) liegen in `app/page.js`. Die Entfernung wird dort aus `position` und `userLocation` berechnet, nicht als eigener State. `IssMap` bekommt `userLocation` als Prop.
- **Zeichnen:** Nutzer-Marker und Verbindungslinie gehören in `drawRef.current()` in `IssMap.js`, damit sie bei neuen Daten **und** nach `moveend` (Weltkopie-Sprung) mitgezeichnet werden (siehe `CLAUDE.md`, Abschnitt Datumsgrenze).
- **Rechnung:** Die Hilfsfunktion `distanceToIssKm(user, iss)` sollte rein sein (ohne React und Leaflet), damit sie für P2-1 wiederverwendbar ist.
- **Sicherer Kontext:** `navigator.geolocation` gibt es nur unter HTTPS und `localhost`. Beides ist bei uns gegeben. Unter `http://<LAN-IP>:3000` (z. B. Test am Handy im WLAN) greift der Fall „Im Browser nicht verfügbar“.
- **Layout:** Mit fünf Kacheln die Messwerte-Leiste anpassen: Desktop 5 Spalten, Handy 2 Spalten, und die Entfernungs-Kachel nimmt dort die ganze Breite ein.

## Erfolgskriterien

Abnahme statt Kennzahlen, wie bei B1:

- **Sofort:** Alle P0-Kriterien sind lokal **und** unter der Live-URL im Inkognito-Fenster erfüllt. Im Inkognito-Fenster fragt der Browser beim Klick neu nach der Erlaubnis.
- **Rechnung:** Die beiden Grenzfälle aus P0-2 (direkt darunter ca. 420 km, gegenüber ca. 13.160 km) stimmen mit Testdaten auf ±1 %.
- **Testbarkeit:** Playwright kann Standort und Erlaubnis simulieren (`context.grantPermissions(['geolocation'])`, `context.setGeolocation({...})`), Ablehnung durch fehlende Freigabe. Damit lassen sich alle Fehlerfälle automatisch prüfen.
- **Keine Regression:** Die F4- und B1-Prüfungen aus `README.md` laufen weiter durch, die Konsole zeigt im Normalbetrieb keine Fehler.

## Entscheidungen

| Frage | Entscheidung |
|---|---|
| Wann wird nach dem Standort gefragt? | Erst nach Klick auf „Mein Standort“, nicht beim Laden |
| Welche Entfernung? | Direkte Entfernung im Raum (inkl. Höhe der ISS), keine Bodenentfernung |
| Darstellung auf der Karte | Eigener Marker plus gestrichelte Verbindungslinie zur ISS |
| Einmalig oder fortlaufend? | Einmalig, mit „Standort aktualisieren“ (P1-2). `watchPosition` erst in P2 *(Vorschlag)* |
| Platz für Button und Wert | Fünfte Kachel in der Messwerte-Leiste *(Vorschlag)* |
| Genauigkeit in der Anzeige | 2 Nachkommastellen (ca. 1 km), Speicherung keine *(Vorschlag)* |
| Farbe der Verbindungslinie | Blau gestrichelt wie der Nutzer-Marker, abgesetzt vom Orange der B1-Spur *(Vorschlag)* |

Die mit *(Vorschlag)* markierten Punkte wurden am 07.10.2026 bestätigt.

## Zeitplan

- Kein fester Termin. Bonus-Aufgabe innerhalb der Übung.
- Keine Abhängigkeit zu B2–B4. Nutzt `wrapNear` und das Zeichenmuster aus B1.
- Wird B2 („Karte folgt“) später umgesetzt, darf es P1-1 nicht widersprechen: Bei aktivem „Karte folgt“ entfällt das einmalige `fitBounds`.
- Umsetzung in **einem** Schritt: P0 plus P1.
