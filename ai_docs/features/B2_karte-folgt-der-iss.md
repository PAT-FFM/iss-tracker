# Feature-Spec B2: Karte folgt der ISS

Bonus-Anforderung B2 aus [`../PRD.md`](../PRD.md).

## Umsetzungsstand

Stand: 07.10.2026

Noch nicht spezifiziert, Status ⏳ Offen. Die Anforderungen mit P0/P1/P2 entstehen mit `/product-management:write-spec B2`.

## Idee

Die Karte folgt der ISS, per Ein/Aus-Schalter.

## Bekannte Hinweise

- **Schalter:** Er gehört als zweite Zeile „Karte folgt“ in den bestehenden Schalter-Kasten oben rechts in der Karte (`createTogglesControl` in `app/IssMap.js`, eingeführt mit B1). Dasselbe Muster wie „Spur anzeigen“ verwenden, also Checkbox, Klicks nicht an die Karte durchreichen und den Zustand ggf. in `localStorage` merken.
- **Zusammenspiel mit B5:** Nach der Standortfreigabe zeigt die Karte einmalig ISS und Nutzer (`fitBounds`, B5 P1-1). Bei aktivem „Karte folgt“ muss das entfallen oder Vorrang geklärt werden (siehe B5, Zeitplan).
- **Datumsgrenze:** Beim Mitführen der Karte die Weltkopie-Logik (`wrapNear`, Neuzeichnen nach `moveend`) beachten, sonst springt die Ansicht beim Überflug über 180° (siehe `CLAUDE.md`).
- **Offene Frage für die Spec:** Was passiert, wenn der Nutzer die Karte von Hand verschiebt, während „Karte folgt“ aktiv ist? Schalter automatisch aus oder sofort zurückspringen?
