# Feature-Spec B4: Astronauten-Liste

Bonus-Anforderung B4 aus [`../PRD.md`](../PRD.md).

## Umsetzungsstand

Stand: 07.10.2026

Noch nicht spezifiziert, Status ⏳ Offen. Die Anforderungen mit P0/P1/P2 entstehen mit `/product-management:write-spec B4`.

## Idee

Astronauten-Liste aus `astros.json` (Open Notify).

## Bekannte Hinweise

- **Schwerste Bonus-Aufgabe:** `astros.json` gibt es nur über **HTTP**. Der Browser blockiert die Anfrage auf der HTTPS-Seite (Mixed Content, siehe PRD Abschnitt 3). Deshalb braucht es einen **Proxy**.
- **Proxy:** als Route Handler im App Router unter `app/api/` (läuft auf Vercel als Function, Tipp aus der Übung). Das ist die bewusste, einzige Ausnahme vom Prinzip „kein eigenes Backend“ (PRD Abschnitt 5).
- **Deployment:** Mit GitHub Pages (statischer Export, `output: 'export'`) funktionieren keine Route Handler. B4 setzt also Vercel voraus, was wir ohnehin nutzen.
- **Anfragelimit:** Der Proxy fragt Open Notify ab, nicht wheretheiss.at, und belastet das Limit aus B6 damit nicht. Die Liste ändert sich selten, deshalb im Proxy cachen (z. B. `revalidate`).
- **Offene Frage für die Spec:** Alle Personen im All oder nur die an Bord der ISS (`astros.json` enthält auch andere Raumfahrzeuge, Feld `craft`)? Wo wird die Liste angezeigt?
