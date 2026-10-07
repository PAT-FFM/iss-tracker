# Feature-Spec B6: Fun with Flags

Bonus-Anforderung B6 aus [`../PRD.md`](../PRD.md). Status: **Umgesetzt** am 07.10.2026 (P0, P1-1 und P1-2), lokal und live getestet, deployt. Code: `app/Flag.js` (Flaggen, Ländernamen), `app/page.js` (Länderabfrage, Countdown, Länderzeile) und `app/IssMap.js` (Flagge am Marker). Entstanden aus einem Brainstorming am 07.10.2026.

## Umsetzungsstand

| ID | Anforderung | Status | Nachweis |
|---|---|---|---|
| P0-1 | Gastlandflagge des überflogenen Landes | ✅ Umgesetzt | Playwright mit Testdaten (Australien, Wechsel Land ↔ Meer) |
| P0-2 | Internationale Gewässer: Heimatflaggen der ISS | ✅ Umgesetzt | Playwright mit Testdaten und echten Daten (Südpazifik), 0 px Layoutsprung bei 320–1920 px |
| P0-3 | Flaggen als Bilder, nicht als Emoji | ✅ Umgesetzt | SVG aus `flag-icons`, nur angezeigte Flaggen geladen, keine fremden Server |
| P0-4 | Robustheit und Anfragelimit | ✅ Umgesetzt | Playwright: Länderabfrage blockiert → „(Stand: …)“, kein Banner, Polling läuft. Echte 429-Antworten abgefangen |
| P1-1 | Countdown bis zum nächsten Gastland | ✅ Umgesetzt | Playwright mit Testdaten: „Brasilien in ca. 5 Min.“ nach 4 Abfragen, „Kein Land in den nächsten 15 Min.“ |
| P1-2 | Flagge am ISS-Marker | ✅ Umgesetzt | Playwright: Flagge über Land, keine über dem Meer |
| P2-1 | Flaggen-Logbuch | ⏳ Offen | Vorbereitet: Länderwechsel werden in `countryLogRef` erfasst |
| P2-2 | Länderwechsel als kurze Animation | ⏳ Offen | |
| P2-3 | Zurückhaltung bei 429 (Backoff) | ⏳ Offen | Neu, siehe „Erkenntnisse aus dem Test“ |

Alle P0- und P1-Abnahmekriterien unten sind lokal geprüft, der Meer-Zustand zusätzlich unter der Live-URL (Stand 07.10.2026). **Noch offen:** ein beobachteter *echter* Länderwechsel. Bei allen Tests mit echten Daten lag die ISS über dem Meer, Land wurde nur mit Testdaten geprüft.

## Idee

Ein Schiff setzt in fremden Hoheitsgewässern die **Gastlandflagge** als Höflichkeitsflagge, in internationalen Gewässern führt es nur seine **eigene Flagge**. Die ISS soll das genauso machen: Über einem Land zeigt die App dessen Flagge, über dem offenen Meer die „Heimatflaggen“ der ISS-Partner.

## Problem

Die Koordinaten „-25,7551° S, 144,2198° O“ sagen den meisten Besuchern nichts, auch nicht mit Karte. Ein Ländername mit Flagge ist sofort verständlich und macht die App persönlicher und unterhaltsamer.

**Die eigentliche Gestaltungsaufgabe:** Rund 70 % der Erdoberfläche sind Wasser. Die ISS ist also meistens über keinem Land. Eine reine „Flagge des Landes“ wäre die meiste Zeit leer. Der Zustand über dem Meer ist deshalb kein Sonderfall, sondern der **Normalfall** und muss genauso gut aussehen.

## Ziele

1. Über Land sieht der Besucher sofort **Flagge und deutschen Namen** des überflogenen Landes.
2. Über dem Meer gibt es **keine leere Stelle**, sondern einen eigenen, sinnvollen Zustand.
3. Die Anzeige wechselt **live** mit dem Polling, spätestens 5 Sekunden nach einem Grenzübertritt.
4. Flaggen sehen auf **allen Systemen** gleich aus, auch unter Windows.
5. F1–F4, B1 und B5 bleiben unverändert stabil, und das Anfragelimit der API wird eingehalten.

## Nicht-Ziele

- **Ozean- oder Meeresnamen** („Über dem Pazifik“). Bräuchte eigene Polygon-Daten, die API liefert dafür nur `??`.
- **Regionen, Bundesländer, Städte.** Das Land reicht. Feinere Angaben bräuchten eine Geocoding-API mit strengeren Nutzungsregeln.
- **Exakte Seegrenzen.** Die API ermittelt das Land über Zeitzonen-Gebiete, die ein Stück aufs Meer reichen. Das passt zur Schiffs-Metapher (Hoheitsgewässer), ist aber nicht völkerrechtlich exakt.
- **Politische Bewertung umstrittener Gebiete.** Angezeigt wird, was die API als `country_code` liefert.

## User Stories

- Als **Besucher** möchte ich auf einen Blick sehen, über welchem Land die ISS gerade fliegt, damit die Position greifbar wird.
- Als **Besucher** möchte ich über dem Meer trotzdem etwas Sinnvolles sehen, damit die Anzeige nicht kaputt wirkt.
- Als **Besucher** möchte ich wissen, wann das nächste Land kommt, damit sich Zuschauen lohnt (P1).
- Als **Windows-Nutzer** möchte ich echte Flaggen sehen, keine Buchstabenpaare wie „DE“.
- Als **Besucher bei API-Problemen** möchte ich, dass der Rest der App weiterläuft, auch wenn die Flagge fehlt.

## Anforderungen

### Muss (P0)

**P0-1: Gastlandflagge.** Nach jeder erfolgreich abgerufenen Position fragt die App `GET https://api.wheretheiss.at/v1/coordinates/{lat},{lon}` ab und liest `country_code` (ISO 3166-1 alpha-2). Angezeigt werden die Flagge und der deutsche Ländername, ermittelt per `new Intl.DisplayNames('de', { type: 'region' })`, ohne eigene Namensliste. **Platz:** eine eigene Zeile „Gerade über: [Flagge] Australien“ direkt unter der Überschrift, über der Messwerte-Leiste.
- [x] Über Land erscheinen Flagge und Name, z. B. „🇦🇺 Australien“ (als Bild).
- [x] Nach einem Grenzübertritt wechselt die Anzeige spätestens mit dem nächsten Polling-Schritt.
- [x] Unbekannte, aber gültige Codes ohne Flaggenbild zeigen nur den Namen bzw. den Code, ohne kaputtes Bild. *(per Code-Review: `hasFlag` gegen die Liste der 257 vorhandenen Flaggen)*

**P0-2: Internationale Gewässer.** Bei `country_code` `??` (oder leer) zeigt die App „Internationale Gewässer“ und die **Heimatflaggen** der ISS-Partner: die Flaggen von USA, Russland, Japan und Kanada sowie Europa als Text **„ESA“** ohne Flagge. Die EU-Flagge wäre falsch, weil die ESA keine EU-Einrichtung ist. Das entspricht der Nationalflagge, die ein Schiff immer führt.
- [x] Mit Testdaten mitten im Atlantik (0°, −30°) erscheint „Internationale Gewässer“ mit den Partnerflaggen.
- [x] Der Wechsel Land ↔ Meer erzeugt keine Layout-Sprünge in der Messwerte-Leiste.

**P0-3: Flaggen als Bilder.** Flaggen-Emojis werden unter Windows als Buchstaben dargestellt. Deshalb kommen die Flaggen als SVG aus dem npm-Paket **`flag-icons`** und werden mit der App ausgeliefert, nicht von einem fremden Server geladen. Jede Flagge hat einen Alternativtext mit dem Ländernamen.
- [x] Die Flaggen sind unter Windows/Chrome, macOS und Android gleich zu sehen. *(SVG statt Emoji, also unabhängig von den Systemschriften. Getestet in Chromium)*
- [x] Im Network-Tab gibt es keine Anfragen an fremde Flaggen-Server. Nur die gerade angezeigte Flagge wird geladen, nicht alle.
- [x] Bildschirmleser lesen den Ländernamen vor, nicht den Dateinamen.

**P0-4: Robustheit und Anfragelimit.** Laut Response-Header erlaubt die API **350 Anfragen pro 5 Minuten**. Die Länderabfrage läuft **nach** der Positionsabfrage (nacheinander, nicht parallel) und nur, wenn die Position erfolgreich war. Koordinaten werden auf 2 Nachkommastellen gerundet übergeben.
- [x] Budget im Normalbetrieb: Position 60 + Land 60 = **ca. 120 Anfragen pro 5 Minuten** (B1-Vorbefüllung einmalig).
- [x] Schlägt die Länderabfrage fehl, bleibt die letzte Anzeige mit dem Zusatz „(Stand: hh:mm:ss)“ stehen. Es gibt keinen Banner, und das Positions-Polling läuft unverändert weiter.
- [x] Bei einem kompletten API-Ausfall gelten die bestehenden F4-Regeln, die Flagge bleibt auf dem letzten Stand.

### Sollte (P1)

**P1-1: Countdown bis zum nächsten Gastland.** Über dem Meer zeigt die App zusätzlich „Nächstes Gastland: [Flagge] Brasilien in ca. 4 Min.“. Dafür werden höchstens **einmal pro Minute** Positionen der nächsten 15 Minuten abgefragt (ein Aufruf von `/positions` mit 10 Zeitstempeln in der Zukunft, getestet am 07.10.2026). Für diese Positionen wird dann **nacheinander** `/coordinates` abgefragt, bis das erste Land gefunden ist.
- [x] Die Countdown-Abfragen nutzen höchstens 60 zusätzliche Anfragen pro 5 Minuten, sodass das Gesamtbudget unter 200 von 350 bleibt.
- [x] Liegt in den nächsten 15 Minuten kein Land, steht dort „Kein Land in den nächsten 15 Min.“.
- [x] Die Genauigkeit liegt bei ca. ±1 Minute (Raster der Stützpunkte), angezeigt als „ca.“.

**P1-2: Flagge am ISS-Marker.** Die aktuelle Gastlandflagge erscheint klein neben dem 🛰️-Marker auf der Karte, wie eine Flagge am Mast. Über dem Meer erscheint dort keine Flagge.

### Später (P2)

- **P2-1: Flaggen-Logbuch.** Liste der in dieser Sitzung überflogenen Länder mit Uhrzeit, wie Stempel im Reisepass. Optional mit einem Zähler „Länder heute: 7“. Dafür die Länderwechsel schon in P0 als Ereignisse erfassen (`{ countryCode, enteredAt }`), auch wenn sie noch nicht angezeigt werden.
- **P2-2: Animation beim Länderwechsel**, z. B. Flagge kurz einblenden oder „hissen“. Mit `prefers-reduced-motion` abschaltbar.
- **P2-3: Zurückhaltung bei 429.** Antwortet die API mit 429, sollten Länderabfrage und Countdown für eine Weile pausieren, bevor das Positions-Polling selbst ins Limit läuft.

## Technische Hinweise

- **Datenquelle:** Es kommt kein neuer Anbieter dazu. `/coordinates` gehört zu derselben API wie das Polling und läuft über HTTPS. Beispielantworten (getestet am 07.10.2026):
  - `50.11,8.68` → `{"country_code":"DE","timezone_id":"Europe/Berlin",…}`
  - `0,-30` → `{"country_code":"??","timezone_id":"Etc/GMT+2",…}`
- **Zustand:** `country` (`{ code, checkedAt }`) liegt in `app/page.js` neben `position`. Die Länderabfrage gehört in die bestehende `poll()`-Kette direkt nach `setPosition`, damit sie sich nicht mit dem nächsten Polling überlappt.
- **Flaggen:** z. B. `import "flag-icons/css/flag-icons.min.css"` in `app/layout.js` und `<span className="fi fi-de" role="img" aria-label="Deutschland" />`. Das CSS verweist auf alle SVGs, der Browser lädt aber nur die Flaggen, die gerade verwendet werden. Vor der Umsetzung die Paketgröße im Build prüfen (Paket entpackt ca. 4 MB).
- **Alternative ohne zusätzliche Anfragen:** Ländergrenzen lokal per Point-in-Polygon (z. B. `world-atlas` 110m, ca. 100 KB). Das spart Anfragen und macht den Countdown billig, kennt aber keine Hoheitsgewässer und keine sehr kleinen Länder. Siehe offene Fragen.

## Erkenntnisse aus dem Test

- **Gemeinsames Anfragelimit pro IP.** Das Limit von 350 Anfragen pro 5 Minuten gilt pro IP-Adresse. Bei den vielen Testläufen von einem Rechner antwortete die API mit **429 Too Many Requests**. Die App blieb stabil (F4-Hinweis bzw. Flagge mit „(Stand: …)“). **Für den Kurs relevant:** Sitzen alle Teilnehmer hinter derselben IP (Schulungs-WLAN), teilen sie sich das Limit. Mit B6 verbraucht jeder offene Tab ca. 120–175 statt 60 Anfragen pro 5 Minuten, ab etwa 2–3 offenen Tabs wird es also knapp. Abhilfe wären P2-3 oder die lokale Länderermittlung (siehe Entscheidungen).
- **Gemessener Verbrauch:** in 55 Sekunden über dem Meer mit Countdown 12 Positionen, 21 Länderabfragen und 3 `/positions`-Aufrufe (einschließlich der B1-Vorbefüllung). Das entspricht ca. 175 pro 5 Minuten und liegt im geplanten Budget.
- **Layout:** Eine feste Mindesthöhe allein reichte nicht, weil lange Namen wie „Zentralafrikanische Republik“ umbrachen. Deshalb steht der Countdown immer in einer eigenen Zeile, bricht nie um und kürzt mit „…“.

## Erfolgskriterien

- **Sofort:** Alle P0-Kriterien sind lokal und unter der Live-URL im Inkognito-Fenster erfüllt, und es gibt keine Konsolenfehler.
- **Testbarkeit:** Per Playwright `page.route` lassen sich `/coordinates`-Antworten simulieren: Land, `??`, Fehler und Wechsel Land → Meer → Land.
- **Anfragelimit:** Ein Lauf über 5 Minuten verbraucht laut `X-Rate-Limit-Remaining` höchstens ca. 130 Anfragen (P0) bzw. 200 Anfragen (mit P1).
- **Echtbetrieb:** Mindestens ein beobachteter echter Länderwechsel. Die ISS überquert typischerweise mehrmals pro Umlauf (ca. 92 Min.) Land.

## Entscheidungen

Abgestimmt am 07.10.2026 per Auswahl-Wizard.

| Frage | Entscheidung | Verworfen |
|---|---|---|
| Wo sitzt die Länderanzeige? | Eigene Zeile „Gerade über: …“ unter der Überschrift | 6. Kachel (Leiste zu eng), nur am Marker (über dem Meer kaum sichtbar) |
| Europa/ESA bei den Heimatflaggen | Text „ESA“ ohne Flagge | EU-Flagge (inhaltlich falsch), Flaggen aller ESA-Staaten (zu lang), Europa weglassen |
| Länderermittlung | Per API `/coordinates` | Lokal per Point-in-Polygon (keine Hoheitsgewässer, Kleinstaaten fehlen). Bleibt Ausweg, falls das Anfragelimit knapp wird |
| Priorität nach P0 | Countdown als P1, Logbuch bleibt P2 | Logbuch zuerst, beides als P1 |

Offene Fragen gibt es keine mehr.

## Zeitplan

- Kein fester Termin. Bonus-Aufgabe.
- Keine Abhängigkeit zu B2–B4. Nutzt Polling-Kette, Zeichenmuster (`drawRef`) und `wrapNear` aus B1/B5.
- Vorschlag: **Phase 1** P0 plus P1-2 (Flagge am Marker, wenig Aufwand), **Phase 2** P1-1 (Countdown, braucht das meiste Anfrage-Budget und Testaufwand).
