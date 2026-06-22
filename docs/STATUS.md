# STATUS — Quack & Catch

> Schnellüberblick für den Session-Start. Wird nach jedem Meilenstein aktualisiert.

**Stand:** 2026-06-22
**Aktueller Meilenstein:** **M4.6 — Game-Feel & Bright-Comic-Overhaul (IN ARBEIT)** — Steps 1–5 gepusht (Step 5 = Steuerungs-Redesign); Rest offen (siehe HANDOVER „AKTUELL: M4.6").
**Letzter Build:** grün (typecheck/lint/build ✓); Smoke/Catch/Save via Playwright verifiziert (Direkt-Aim).
**Live-URL:** _(folgt nach MVP, M4.5 — Vercel)_
**Repo:** https://github.com/Scholzer0303/quack-and-catch

## ✅ Erledigt
- **M0:** Git/Repo/origin/Push-Test, Projekt-`CLAUDE.md`, Planungsdokumente, Vite+TS(strict)+Three-Scaffold (deploy-ready).
- **M1:** First-Person-Szene — Core (Renderer/Scene/Kamera/Loop/Game), EventBus, Balance-Config, Utils (math/rng), Welt (Stand, ovales Becken + animiertes Wasser-Shader, Angel/Haken), 8 Enten als InstancedMesh auf Oval-Bahn. Visuell verifiziert.
- **M2:** Hak-Mechanik — `InputSystem` (Pointer Events), Kamera-Aim-Schwenk im Cone, `HookRaycaster` (Ray-Sphere ab Haken), `FishingRod`-State-Machine (Halten-Laden/Loslassen, Timing-Window + Perfect), Reel-Animation + `removeAndRespawn`, `ui/Reticle` (Timing-Feedback) + Hover-Highlight, `lineStrength`-Gate. Fang-Loop, Perfect & Softlock-Schutz per Interaktionstest verifiziert.
- **M3:** Belohnung + HUD + Screens — `data/ducks.ts` (Raritäten + Loot-Tables + per-Instanz-Farben), `data/tips.ts` (12 geprüfte Karten), `RewardSystem` (Tokens + Perfect-Bonus + Tipp) + `Economy` (Saldo + Unlock-Set + Bonus), `GameStateMachine` (Phasen + Rundentimer + Score), `ui/UIRoot`+`HUD`+`StartScreen`+`CardReveal` (blockierendes Tipp-Modal, Pause) + `SummaryScreen`. Core-Loop schließt: Fang → Tokens + Tipp → Timer → Summary.
- **M4:** Save + Deploy-Check — `types/state.ts` (SaveData + `createDefaultSave`), `systems/SaveSystem` (localStorage: versioniert, debounced, korruptionssicher; Flush bei `pagehide`/Tab-Wechsel), `Economy.snapshot()/hydrate()`, Verdrahtung in `Game` (Laden nach UIRoot → HUD zeigt geladenen Saldo), README ausgebaut, dispose-Audit. Tokens + freigeschaltete Tipps überleben Reload; defekte Daten → sauberer Default.

- **M4.6 (Steps 1–5 ✅ gepusht):** Direktes Fadenkreuz + Instant-Aim, heller Comic-Tag, Toon-Cel-Shading + schwarze Outlines auf Enten, **Steuerungs-Redesign** (Rute schwenkt sichtbar, Halten senkt den Haken / Loslassen hebt, **Lock bei Release** über einer Ente).

## 🔧 In Arbeit — M4.6 Rest (höchste Priorität)
1. ~~Steuerungs-Redesign~~ ✅ — Rute lebt (FishingRod besitzt + animiert sie), Lock bei Release, Fang im grün/gold-Ring. Animation rein visuell (getrieben von `getView()`+Aim), Fang-Logik unverändert.
2. **Rute/Haken-Optik** (nächster Schritt): stilkonsistent Toon+Outline, `fog=false` behalten.
3. **Jahrmarkt-Welt:** graue Hintergrundwand weg → Buden/Wimpel/Kulisse; Becken-**Rand statt dickem Reifen**.
4. **Juice** (Splash/Pop/Perfect-Flash/Mini-Screenshake/HUD-Count-up) + optional Bloom/Glow.
5. **Tipp-Modals schicker** (evtl. Icon/Visualisierung je Tipp).
6. **Optional:** Intro-Sequenz (Ticket → Verkäuferin → Angel → Start).

## ⏭️ Danach
- M5 — Tipp-Codex-Screen (~50–60 Karten + `ui/CodexScreen`).
- **Neuer Kontext?** Zuerst [`docs/HANDOVER.md`](HANDOVER.md) lesen → Abschnitt „AKTUELL: M4.6" (Feedback + Reihenfolge + Technik).

## 📌 Offene Punkte / Entscheidungen
- Keine offenen Blocker. Codex-Inhalt: eigene, geprüfte Karten (~50–60 in M5; 12 seit M3), siehe DESIGN.md.
- Persistenz steht (M4): SaveSystem speichert Tokens + Unlock-Set in `localStorage`. Spätere Felder (Rod/Stats/Settings) werden additiv bei gleicher `schemaVersion` ergänzt; `muted` ist reserviert, greift ab M8-Audio.

## Verifikations-Checkliste (Definition of Done je Meilenstein)
- [ ] `npm run typecheck` grün
- [ ] `npm run lint` grün
- [ ] `npm run build` + `npm run preview` fehlerfrei
- [ ] Browser: null Konsolenfehler, ~60 fps, Desktop + Mobile
- [ ] committet + zu `origin` gepusht, STATUS aktualisiert
