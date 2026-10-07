# Feature-Spec B1: Spur der letzten Positionen

Bonus-Anforderung B1 aus [`../PRD.md`](../PRD.md). Status: **Umgesetzt** am 07.10.2026 (P0, P1-1 und P1-2). Code: `app/page.js` (Zustand, Vorbefüllung) und `app/IssMap.js` (Darstellung, Schalter).

## Umsetzungsstand

| ID | Anforderung | Status | Nachweis |
|---|---|---|---|
| P0-1 | Live-Spur | ✅ Umgesetzt | Playwright lokal und live, Dark Mode per Screenshot |
| P0-2 | Begrenzung auf 10 Minuten | ✅ Umgesetzt | Playwright mit Testdaten (Zeitsprünge), Sortierung und Dubletten per Code-Review |
| P0-3 | Vorbefüllung beim Start | ✅ Umgesetzt | Playwright, auch mit blockierter Vorbefüllung |
| P0-4 | Datumsgrenze | ✅ Umgesetzt | Playwright mit Testdaten über 180°, Verschieben um eine Weltbreite |
| P0-5 | Ein/Aus-Schalter | ✅ Umgesetzt | Playwright, auch per Tastatur |
| P0-6 | Robustheit | ✅ Umgesetzt | Playwright mit simuliertem API-Ausfall |
| P1-1 | Verblassende Spur | ✅ Umgesetzt | 5 Deckkraftstufen 1,0–0,2 |
| P1-2 | Schalterzustand merken | ✅ Umgesetzt | Playwright, auch mit gesperrtem localStorage |
| P2-1 | Einstellbare Spurlänge | ⏳ Offen | Vorbereitet: eine Konstante `TRAIL_DURATION_MS` |
| P2-2 | Einfärbung nach `visibility` | ⏳ Offen | Vorbereitet: ganze Positionsobjekte inkl. `visibility` in der Spur |

Alle Abnahmekriterien unten sind geprüft (Stand 07.10.2026).

## Problem

Der Marker zeigt nur, *wo* die ISS gerade ist, nicht *wohin* sie fliegt. Bei 5 Sekunden Polling bewegt er sich in Zoomstufe 3 nur wenige Pixel pro Schritt. Flugrichtung und Bahnform (Sinuskurve auf der Karte) sind deshalb kaum zu erkennen. Wer die Seite neu öffnet, sieht außerdem nur einen einzelnen Punkt.

## Ziele

1. Die Flugrichtung ist **sofort nach dem Laden** erkennbar, ohne erst zu warten.
2. Die Spur zeigt die Strecke der **letzten 10 Minuten** (ca. 4.600 km) und wächst live mit dem Marker mit.
3. Nutzer können die Spur **ein- und ausblenden**.
4. Die Pflichtfunktionen F1–F4 bleiben unverändert stabil, auch bei API-Ausfall.

## Nicht-Ziele

- **Vorhersage der künftigen Bahn.** Braucht TLE-Daten und Bahnberechnung, deutlich mehr Aufwand als B1.
- **Spur speichern über Reloads hinweg** (z. B. `localStorage`). Unnötig, weil die Vorbefüllung die Spur beim Laden ohnehin wiederherstellt.
- **Einstellbare Spurlänge.** Eine feste Länge reicht für die Übung, siehe P2.
- **Einfärbung nach Tag/Nacht.** Gehört zu B3.
- **Karte folgt der ISS.** Das ist B2.

## User Stories

- Als **Besucher der Live-URL** möchte ich sehen, aus welcher Richtung die ISS kommt, damit ich ihre Flugbahn verstehe.
- Als **Besucher** möchte ich die Spur gleich beim Öffnen der Seite sehen, damit ich nicht minutenlang warten muss.
- Als **Besucher** möchte ich die Spur ausblenden können, damit ich die Karte darunter ungestört sehe.
- Als **Besucher** möchte ich, dass beim Überfliegen der Datumsgrenze keine Linie quer über die Karte gezogen wird, damit die Darstellung glaubwürdig bleibt.
- Als **Besucher** möchte ich, dass die Seite auch bei API-Problemen weiter funktioniert, auch wenn die Spur dann unvollständig ist.

## Anforderungen

### Muss (P0)

**P0-1: Live-Spur.** Jede erfolgreich abgerufene Position wird an die Spur angehängt. Die Spur ist eine Linie auf der Karte, die am aktuellen Marker endet. Aussehen: **orange `#c15d38`** (Akzentfarbe aus Hinweisbanner und Favicon), **3 px**, durchgezogen.
- [x] Nach jedem Polling-Schritt endet die Linie an der neuen Markerposition.
- [x] Die Linie liegt unter dem Marker und verdeckt ihn nicht.
- [x] Die Linie ist auf Land und Meer gut erkennbar, auch im Dark Mode (die Kartenkacheln bleiben dort hell).

**P0-2: Begrenzung auf 10 Minuten.** Punkte, deren API-`timestamp` älter als 10 Minuten ist, fallen heraus. Maßgeblich ist der Zeitstempel, nicht die Anzahl der Punkte. So bleibt die Spurlänge auch nach Lücken im Polling korrekt.
- [x] Nach 15 Minuten Laufzeit reicht die Spur nur 10 Minuten zurück.
- [x] Die Anzahl der gehaltenen Punkte bleibt begrenzt (bei 5-s-Polling ca. 120 plus Vorbefüllung), der Speicher wächst nicht unbegrenzt.

**P0-3: Vorbefüllung beim Start.** Beim Laden wird **einmalig** `GET https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=<t1,…,tn>&units=kilometers` mit Zeitstempeln der letzten 10 Minuten abgefragt, z. B. 10 Stück im Abstand von ca. 60 s. Die Antwort bildet den Anfang der Spur.
- [x] Spätestens wenn der Marker zum ersten Mal erscheint, ist eine Linie über ca. 10 Minuten sichtbar.
- [x] Schlägt die Vorbefüllung fehl, startet die Spur leer und wächst normal weiter. Es gibt **keinen** eigenen Fehlerhinweis und keinen erneuten Versuch.
- [x] Die Vorbefüllung verzögert weder die erste Positionsanzeige noch das Polling (beides läuft parallel).
- [x] Die Punkte aus Vorbefüllung und Polling sind nach `timestamp` sortiert, doppelte Zeitstempel kommen nur einmal vor.

**P0-4: Datumsgrenze.** Die Längen der Spur werden vom neuesten Punkt aus fortlaufend gemacht (±360°). Marker und Spur werden in der Weltkopie gezeichnet, die der Kartenmitte am nächsten liegt. Leaflet zeichnet Längen über ±180° in der Nachbarkopie. So bleibt die Spur am Marker, statt am anderen Kartenende zu erscheinen.
- [x] Beim Überflug über 180° O/W erscheint keine waagerechte Linie quer über die Weltkarte.
- [x] Marker und Spur bleiben beim Überflug zusammenhängend im Bild, der Marker springt nicht ans andere Kartenende.
- [x] Nach dem Verschieben der Karte um eine ganze Weltbreite sind Marker und Spur wieder gemeinsam zu sehen.

**P0-5: Ein/Aus-Schalter.** Eine Checkbox „Spur anzeigen“ blendet die Spur ein und aus. Standard ist **an**. Sie sitzt in einem **Leaflet-Control oben rechts in der Karte**. Das Control ist als Kasten für mehrere Schalter angelegt, B2 kommt später als zweite Zeile „Karte folgt“ dazu.
- [x] Ist der Schalter aus, ist keine Linie zu sehen. Die Punkte werden trotzdem weiter gesammelt.
- [x] Klicks auf das Control verschieben oder zoomen die Karte nicht (`L.DomEvent.disableClickPropagation`).
- [x] Beim Wiedereinschalten ist sofort die vollständige Spur der letzten 10 Minuten da.
- [x] Der Schalter ist per Tastatur bedienbar und hat ein sichtbares Label.

**P0-6: Robustheit.** Bei API-Ausfall bleibt die bisherige Spur stehen. Fehlgeschlagene Abrufe fügen keine Punkte hinzu. Nach der Erholung läuft die Spur weiter. Die Lücke wird mit einer geraden Linie überbrückt, was akzeptiert ist.
- [x] Die Prüfungen zu F4 aus `README.md` → „Lokal testen“ laufen weiterhin durch.
- [x] Die Konsole zeigt keine neuen Fehler, auch keine Mixed-Content-Fehler. Die neue Anfrage läuft über HTTPS.

### Sollte (P1), wird im ersten Schritt mit umgesetzt

**P1-1: Verblassende Spur.** Ältere Abschnitte werden transparenter, damit die Flugrichtung noch deutlicher wird. Umsetzung z. B. als einige Teilstücke mit gestaffelter Deckkraft (`opacity`), nicht als eigene Polyline pro Punktepaar.
- [x] Der neueste Abschnitt am Marker ist voll deckend, der älteste deutlich blasser (z. B. Deckkraft 0,2), dazwischen nimmt sie gleichmäßig ab.
- [x] Das Verblassen funktioniert auch über die Datumsgrenze hinweg (P0-4).

**P1-2: Schalterzustand merken.** Der Zustand des Schalters wird in `localStorage` gespeichert. Lesen und Schreiben in `try/catch`, damit es im privaten Modus nicht bricht.
- [x] Nach dem Ausschalten und Neuladen bleibt die Spur ausgeblendet.
- [x] Ist `localStorage` nicht verfügbar, gilt der Standard „an“, ohne Fehler in der Konsole.

### Später (P2)

- **P2-1: Einstellbare Spurlänge** (z. B. 10 Min. / 1 Umlauf ≈ 92 Min.). Die Länge daher als **eine** Konstante anlegen, nicht verstreut im Code.
- **P2-2: Einfärbung nach `visibility`** (Tag/Nacht, zusammen mit B3). Dafür pro Punkt nicht nur Breite und Länge speichern, sondern das ganze Positionsobjekt inkl. `visibility` und `timestamp`.

## Technische Hinweise

- **Zustand:** Die Punkteliste gehört in `app/page.js` neben `position`. `IssMap` bekommt sie als Prop, genauso wie den Schalterzustand. `IssMap` legt die Polyline **einmal** an und aktualisiert sie per `setLatLngs`, statt sie bei jedem Schritt neu zu erzeugen. So ist das Muster schon beim Marker umgesetzt.
- **Neue Anfrage:** Die gleiche Absicherung wie beim Polling verwenden (`AbortSignal.timeout`, `response.ok` prüfen, Zahlen validieren).
- **API-Limit:** Laut Doku erlaubt `/positions` maximal 10 Zeitstempel pro Anfrage. Im Test am 07.10.2026 kamen auch 30 Zeitstempel durch, darauf sollte man sich aber nicht verlassen. Die Rate-Grenze liegt laut Doku bei ca. 1 Anfrage pro Sekunde. Die eine zusätzliche Anfrage beim Start ist unkritisch.
- **Leaflet nur clientseitig:** Polyline-Code gehört in `IssMap.js`, nicht in `page.js` (siehe `CLAUDE.md`).

## Erfolgskriterien

Für eine Übungs-App ohne Nutzungsstatistik wird über die Abnahme gemessen, nicht über Kennzahlen:

- **Sofort:** Alle Kriterien unter P0 sind lokal **und** unter der Live-URL im Inkognito-Fenster erfüllt.
- **Nach 15 Minuten Laufzeit:** Die Spur ist nicht länger als 10 Minuten, die Seite reagiert flüssig und in der Konsole stehen keine Fehler.
- **Datumsgrenze:** Mindestens ein beobachteter Überflug über 180° ohne Querlinie. Ein Umlauf dauert ca. 92 Minuten, und nicht jeder Umlauf kreuzt die Grenze im sichtbaren Ausschnitt. Alternativ lässt sich das mit Testdaten simulieren, z. B. per Playwright `page.route` mit Längen 179° → −179°.

## Entscheidungen

| Frage | Entscheidung |
|---|---|
| Spurlänge | Letzte 10 Minuten, begrenzt über den Zeitstempel |
| Spur beim Laden | Einmal aus `/positions` vorbefüllen |
| Ein/Aus-Schalter | Ja, Standard „an“, Zustand wird gemerkt (P1-2) |
| Platz des Schalters | Leaflet-Control oben rechts in der Karte, später gemeinsam mit B2 |
| Aussehen der Linie | Orange `#c15d38`, 3 px, durchgezogen, verblassend (P1-1) |

Offene Fragen gibt es keine mehr.

## Zeitplan

- Kein fester Termin. Bonus-Aufgabe innerhalb der Übung (Richtwert für die gesamte Übung: 45 Minuten).
- Keine Abhängigkeiten zu anderen Bonus-Aufgaben. B2 nutzt später das Schalter-Control aus P0-5 mit.
- Umsetzung in **einem** Schritt: alle P0-Punkte plus P1-1 und P1-2.
