# STATUS — Quack & Catch

> Schnellüberblick für den Session-Start. Wird nach jedem Meilenstein aktualisiert.

**Stand:** 2026-06-21
**Aktueller Meilenstein:** M3 ✅ abgeschlossen → Review-Pause, dann M4 (nach Freigabe)
**Letzter Build:** grün (typecheck/lint/build ✓); Smoke (0 Konsolenfehler) + Fang→Belohnung→Pause via Playwright + Screenshots verifiziert
**Live-URL:** _(folgt nach MVP, M4.5 — Vercel)_
**Repo:** https://github.com/Scholzer0303/quack-and-catch

## ✅ Erledigt
- **M0:** Git/Repo/origin/Push-Test, Projekt-`CLAUDE.md`, Planungsdokumente, Vite+TS(strict)+Three-Scaffold (deploy-ready).
- **M1:** First-Person-Szene — Core (Renderer/Scene/Kamera/Loop/Game), EventBus, Balance-Config, Utils (math/rng), Welt (Stand, ovales Becken + animiertes Wasser-Shader, Angel/Haken), 8 Enten als InstancedMesh auf Oval-Bahn. Visuell verifiziert.
- **M2:** Hak-Mechanik — `InputSystem` (Pointer Events), Kamera-Aim-Schwenk im Cone, `HookRaycaster` (Ray-Sphere ab Haken), `FishingRod`-State-Machine (Halten-Laden/Loslassen, Timing-Window + Perfect), Reel-Animation + `removeAndRespawn`, `ui/Reticle` (Timing-Feedback) + Hover-Highlight, `lineStrength`-Gate. Fang-Loop, Perfect & Softlock-Schutz per Interaktionstest verifiziert.
- **M3:** Belohnung + HUD + Screens — `data/ducks.ts` (Raritäten + Loot-Tables + per-Instanz-Farben), `data/tips.ts` (12 geprüfte Karten), `RewardSystem` (Tokens + Perfect-Bonus + Tipp) + `Economy` (Saldo + Unlock-Set + Bonus), `GameStateMachine` (Phasen + Rundentimer + Score), `ui/UIRoot`+`HUD`+`StartScreen`+`CardReveal` (blockierendes Tipp-Modal, Pause) + `SummaryScreen`. Core-Loop schließt: Fang → Tokens + Tipp → Timer → Summary.

## 🔧 In Arbeit
- Nichts offen. M3 inkl. Verifikation gepusht (`7fe6ba4`). **Review-Pause — wartet auf M4-Freigabe.**

## ⏭️ Als Nächstes (nach Freigabe)
- M4 — Save + Deploy-Check: `types/state.ts` final + `systems/SaveSystem` (versioniert, debounced, korruptionssicher); Persistenz Tokens/Rod/Tipps/Stats/Settings; README ausbauen; Prod-Härtung (dispose-Audit, Error-Boundary), Build aus `dist/`.
- **Neuer Kontext?** Zuerst [`docs/HANDOVER.md`](HANDOVER.md) lesen — Routine, Architektur-Karte, Gotchas.

## 📌 Offene Punkte / Entscheidungen
- Keine offenen Blocker. Codex-Inhalt: eigene, geprüfte Karten (~50–60 in M5; 12 in M3), siehe DESIGN.md.
- M4: Economy/StateMachine sind aktuell In-Memory → SaveSystem persistiert Tokens + Unlock-Set (`localStorage`).

## Verifikations-Checkliste (Definition of Done je Meilenstein)
- [ ] `npm run typecheck` grün
- [ ] `npm run lint` grün
- [ ] `npm run build` + `npm run preview` fehlerfrei
- [ ] Browser: null Konsolenfehler, ~60 fps, Desktop + Mobile
- [ ] committet + zu `origin` gepusht, STATUS aktualisiert
