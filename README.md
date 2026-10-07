# iss-tracker

Das ist unser Repo für die ISS-Tracker App: Die Internationale Raumstation live auf einer Leaflet-Karte, gebaut mit dem Next.js App Router. Anforderungen siehe [`ai_docs/PRD.md`](ai_docs/PRD.md).

## Lokal testen

### Voraussetzungen

- Node.js 20.9 oder neuer (`node -v`)
- Internetzugang (die App ruft `api.wheretheiss.at` und die OpenStreetMap-Kacheln direkt im Browser ab)

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Entwicklungsserver starten

```bash
npm run dev
```

Dann <http://localhost:3000> im Browser öffnen. Ist Port 3000 belegt, nennt Next.js in der Ausgabe einen anderen Port. Das runde „N“ unten links ist die Next.js-Entwickleranzeige und erscheint nur im Dev-Modus.

### 3. Anforderungen prüfen

| Prüfung | So geht's | Erwartet |
|---|---|---|
| **F1** Karte und Marker | Seite öffnen | OpenStreetMap-Karte, ISS-Symbol 🛰️ an der aktuellen Position, Attribution unten rechts |
| **F2** Messwerte | Kacheln über der Karte ansehen | Breite und Länge mit Himmelsrichtung, Höhe in km, Geschwindigkeit in km/h (ca. 420 km, ca. 27.600 km/h) |
| **F3** Aktualisierung | 10 Sekunden warten | Werte und „Stand“-Uhrzeit ändern sich etwa alle 5 Sekunden, der Marker wandert sichtbar (bei Bedarf hineinzoomen) |
| **F4** API-Ausfall | DevTools öffnen (F12) → **Network** → Zeile `25544` rechts anklicken → **Block request URL**. Alternativ Drosselung auf **Offline** stellen | Nach spätestens 5 Sekunden erscheint ein orangefarbener Hinweis, Karte und letzte Werte bleiben stehen |
| **F4** Erholung | Sperre wieder aufheben (**Network request blocking** → Haken entfernen bzw. Drosselung zurück auf **No throttling**) | Nach spätestens 5 Sekunden verschwindet der Hinweis und die Werte laufen weiter, ohne neu zu laden |
| **F4** Kaltstart ohne API | Sperre aktivieren, Seite neu laden | Hinweis „Es liegt noch keine Position vor“, Karte (bei Offline ohne Kacheln) und leere Werte „–“ statt einer leeren Seite |
| HTTPS / Mixed Content | DevTools → **Console** | Kein Mixed-Content-Fehler. Im Tab **Network** laufen alle Anfragen über `https://` (außer `localhost` selbst) |

Während eines simulierten Ausfalls sind Fehlermeldungen in der Konsole normal (fehlgeschlagene Anfrage und die Warnung „ISS-Position konnte nicht geladen werden“).

### 4. Produktions-Build lokal prüfen (optional, empfohlen vor dem Deploy)

```bash
npm run build
npm start
```

Dann wieder <http://localhost:3000> öffnen und die Prüfungen aus Schritt 3 kurz wiederholen. Der Build schlägt fehl, wenn Leaflet versehentlich serverseitig geladen wird. Deshalb ist er ein guter Vortest für das Deployment.

## Deployment

Empfohlen: Vercel mit `npx vercel --prod` (siehe PRD Abschnitt 6). Danach die Prüfungen aus Schritt 3 mit der Live-URL im Inkognito-Fenster wiederholen.
