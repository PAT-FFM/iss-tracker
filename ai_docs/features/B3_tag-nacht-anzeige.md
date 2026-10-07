# Feature-Spec B3: Tag/Nacht-Anzeige

Bonus-Anforderung B3 aus [`../PRD.md`](../PRD.md).

## Umsetzungsstand

Stand: 07.10.2026

Noch nicht spezifiziert, Status ⏳ Offen. Die Anforderungen mit P0/P1/P2 entstehen mit `/product-management:write-spec B3`.

## Idee

Tag/Nacht-Anzeige über das Feld `visibility`.

## Bekannte Hinweise

- **Daten:** Die API liefert bei jeder Position `visibility` mit den Werten `daylight` (ISS im Sonnenlicht) oder `eclipsed` (ISS im Erdschatten). Es braucht keine weitere Anfrage. `toPosition` in `app/page.js` übernimmt das Feld bereits.
- **Vorbereitet in B1:** Die Spur speichert ganze Positionsobjekte einschließlich `visibility`. B1 P2-2 („Einfärbung nach `visibility`“) ist damit eine naheliegende Teilanforderung von B3.
- **Achtung Begriff:** `visibility` beschreibt, ob die *ISS* von der Sonne beschienen wird, nicht ob am Boden darunter Tag oder Nacht ist. Für die Spec klären, was „Tag/Nacht-Anzeige“ für den Nutzer bedeuten soll.
- **Offene Frage für die Spec:** Nur als Wert bzw. Symbol (z. B. ☀️/🌑 in der Messwerte-Leiste) oder zusätzlich auf der Karte (Spur einfärben, Tag-Nacht-Grenze einzeichnen)?
