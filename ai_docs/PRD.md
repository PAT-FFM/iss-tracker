# PRD: ISS-Live-Tracker

## 1. Überblick

**Ziel:** Eine reine Frontend-Web-App, die die aktuelle Position der Internationalen Raumstation (ISS) live auf einer Karte zeigt und unter einer öffentlichen HTTPS-URL erreichbar ist.

**Kontext:** Übung (Einzelarbeit, Richtwert 45 Minuten). Die App wird mit Claude Code gebaut, lokal getestet und deployt.

**Ergebnis:** Eine öffentliche Web-Adresse, unter der die ISS live auf einer Karte zu sehen ist.

## 2. Zielgruppe

Lernende der Übung, die den Ablauf Planen → Bauen → Testen → Deployen einmal vollständig durchlaufen. Endnutzer der App sind alle, die die Live-URL öffnen.

## 3. Datenquelle

| API | Protokoll | Verwendung |
|---|---|---|
| `https://api.wheretheiss.at/v1/satellites/25544` | HTTPS | **Verwendet.** Liefert Position, Höhe, Geschwindigkeit (und `visibility`). |
| Open Notify (`/iss-now.json`, `/astros.json`) | nur HTTP | **Nicht verwenden** (siehe unten). |

- Beide APIs sind kostenlos und benötigen keinen API-Key.
- Der Browser blockiert HTTP-Anfragen von HTTPS-Seiten ("Mixed Content"). Open Notify würde nach dem Deploy daher eine leere Karte liefern.

## 4. Funktionale Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| F1 | Karte mit Leaflet, auf der ein ISS-Marker die aktuelle Position zeigt. | Muss |
| F2 | Anzeige von Breite, Länge, Höhe (km) und Geschwindigkeit (km/h).  | Muss |
| F3 | Position wird automatisch alle ca. 5 Sekunden aktualisiert; der Marker bewegt sich entsprechend. | Muss |
| F4 | Ist die API nicht erreichbar, erscheint ein verständlicher Hinweis statt einer leeren Seite. | Muss |

### Bonus (optional, falls früher fertig)

Jede Bonus-Aufgabe hat eine eigene Feature-Spec. Dort stehen Details, Entscheidungen und der Stand je Anforderung (P0/P1/P2). Hier steht nur der grobe Status: Offen, Spezifiziert oder Umgesetzt.

| ID | Anforderung | Feature-Spec | Status |
|---|---|---|---|
| B1 | Spur der letzten Positionen als Linie. | [B1](features/B1_spur-der-letzten-positionen.md) | Umgesetzt |
| B2 | Karte folgt der ISS, per Ein/Aus-Schalter. | [B2](features/B2_karte-folgt-der-iss.md) | Offen |
| B3 | Tag/Nacht-Anzeige über das Feld `visibility`. | [B3](features/B3_tag-nacht-anzeige.md) | Offen |
| B4 | Astronauten-Liste aus `astros.json` (braucht einen Proxy). | [B4](features/B4_astronauten-liste.md) | Offen |
| B5 | Eigener Standort per Geolocation und Entfernung zur ISS. | [B5](features/B5_eigener-standort-und-entfernung.md) | Umgesetzt |
| B6 | Fun with Flags: Flagge des überflogenen Landes. | [B6](features/B6_fun-with-flags.md) | Umgesetzt |

## 5. Nicht-funktionale Anforderungen und Einschränkungen

- **Technologie:** HTML, CSS, JavaScript. Kartenbibliothek: Leaflet.
- **Architektur:** Wir verwenden den **Next.js App Router** (Verzeichnis `app/`). Die Seiten sind Client-Komponenten, die die API direkt im Browser abfragen. Leaflet darf nur clientseitig geladen werden (kein Server-Side-Rendering der Karte).
- **Quellcode-Ablage:** Alle Quelldaten (Quellcode der App) liegen im Ordner `app/` im Projektstamm.
- **Kein eigenes Backend** (Ausnahme: Proxy für Bonus B4, z. B. als Route Handler im App Router unter `app/api/`). Next.js wird nur als Frontend-Framework genutzt.
- **HTTPS:** Alle Requests der App müssen über HTTPS laufen. In der Browser-Konsole darf kein Mixed-Content-Fehler auftauchen.
- **Keine API-Keys** oder Secrets im Code.
- **Robustheit:** Fehler beim Abruf führen nicht zum Absturz oder zu einer leeren Seite. Nach einem Fehler läuft das Polling weiter und die Anzeige erholt sich, sobald die API wieder antwortet.

## 6. Deployment

- Hinweis: Mit dem App Router ist Vercel die natürliche Wahl. GitHub Pages geht nur mit statischem Export (`output: 'export'`).
- **Empfohlen: Vercel** mit `npx vercel --prod` (einmaliger Login, kostenloser Account, URL sofort verfügbar).
- **Alternative: GitHub Pages.** Repository anlegen, pushen, unter Settings → Pages aktivieren. Die URL steht nach ca. 1 Minute bereit.
- Beide Varianten liefern HTTPS automatisch.

## 7. Vorgehen

Nach jedem Schritt wird das Ergebnis geprüft, bevor der nächste beginnt.

1. **Planen:** Anforderungen als Prompt formulieren (dieses PRD).
2. **Bauen:** Claude Code erzeugt die App.
3. **Testen:** Lokal im Browser prüfen.
4. **Deployen:** Öffentliche URL erzeugen.

## 8. Akzeptanzkriterien ("Fertig, wenn ...")

- [x] Die Live-URL öffnet sich im Inkognito-Fenster.
- [x] Der Marker bewegt sich innerhalb von 10 Sekunden sichtbar.
- [x] Die Browser-Konsole zeigt keinen Mixed-Content-Fehler.
- [x] Die Live-URL wurde im Chat geteilt.

## 9. Offene Punkte

Das Quelldokument legt diese Punkte nicht fest. Sie sind bei der Umsetzung zu entscheiden:

- Genaue Einheiten und Rundung der Anzeigewerte (die API liefert z. B. km und km/h). - km/h und km
- Gestaltung und Layout der Oberfläche. - Die Oberfläche soll einfach und übersichtlich sein.
- Konkreter Hinweistext und Darstellung bei API-Ausfall. - Wenn die API nicht erreichbar ist, erscheint ein verständlicher Hinweis statt einer leeren Seite.
- Wahl der Kartenkacheln (z. B. OpenStreetMap) samt Attribution. - OpenStreetMap
