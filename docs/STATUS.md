# STATUS — Quack & Catch

> Schnellüberblick für den Session-Start. Wird nach jedem Meilenstein aktualisiert.

**Stand:** 2026-06-22
**Aktueller Meilenstein:** **M4.6 — Game-Feel & Bright-Comic-Overhaul (IN ARBEIT)** — Steps 1–8 gepusht (Step 6 = Fang-Engine-Neumodell „ins Wasser, räumlich"; Step 7 = Schwierigkeit je Rarität; **Step 8 = Jahrmarkt-Welt: Buden + Wimpel/Lichter + Riesenrad/Zelt-Fernkulisse + schlanker Plankenrand**). **Nächster Schritt: Juice** (Splash/Catch-Pop/Perfect-Flash/Mini-Screenshake/HUD-Count-up) + optional Bloom/Glow. (Details: HANDOVER „AKTUELL: M4.6".)
**Letzter Build:** grün (typecheck/lint/build ✓); Smoke/Catch/Save via Playwright verifiziert (0 Konsolenfehler); In-Game-Screenshots der Jahrmarkt-Optik gesichtet; Diff adversarial reviewt (1 echtes Finding behoben: InstancedMesh-Dispose).
**Live-URL:** _(folgt nach MVP, M4.5 — Vercel)_
**Repo:** https://github.com/Scholzer0303/quack-and-catch

## ✅ Erledigt
- **M0:** Git/Repo/origin/Push-Test, Projekt-`CLAUDE.md`, Planungsdokumente, Vite+TS(strict)+Three-Scaffold (deploy-ready).
- **M1:** First-Person-Szene — Core (Renderer/Scene/Kamera/Loop/Game), EventBus, Balance-Config, Utils (math/rng), Welt (Stand, ovales Becken + animiertes Wasser-Shader, Angel/Haken), 8 Enten als InstancedMesh auf Oval-Bahn. Visuell verifiziert.
- **M2:** Hak-Mechanik — `InputSystem` (Pointer Events), Kamera-Aim-Schwenk im Cone, `HookRaycaster` (Ray-Sphere ab Haken), `FishingRod`-State-Machine (Halten-Laden/Loslassen, Timing-Window + Perfect), Reel-Animation + `removeAndRespawn`, `ui/Reticle` (Timing-Feedback) + Hover-Highlight, `lineStrength`-Gate. Fang-Loop, Perfect & Softlock-Schutz per Interaktionstest verifiziert.
- **M3:** Belohnung + HUD + Screens — `data/ducks.ts` (Raritäten + Loot-Tables + per-Instanz-Farben), `data/tips.ts` (12 geprüfte Karten), `RewardSystem` (Tokens + Perfect-Bonus + Tipp) + `Economy` (Saldo + Unlock-Set + Bonus), `GameStateMachine` (Phasen + Rundentimer + Score), `ui/UIRoot`+`HUD`+`StartScreen`+`CardReveal` (blockierendes Tipp-Modal, Pause) + `SummaryScreen`. Core-Loop schließt: Fang → Tokens + Tipp → Timer → Summary.
- **M4:** Save + Deploy-Check — `types/state.ts` (SaveData + `createDefaultSave`), `systems/SaveSystem` (localStorage: versioniert, debounced, korruptionssicher; Flush bei `pagehide`/Tab-Wechsel), `Economy.snapshot()/hydrate()`, Verdrahtung in `Game` (Laden nach UIRoot → HUD zeigt geladenen Saldo), README ausgebaut, dispose-Audit. Tokens + freigeschaltete Tipps überleben Reload; defekte Daten → sauberer Default.

- **M4.6 (Steps 1–8 ✅ gepusht):** Direktes Fadenkreuz, heller Comic-Tag, Toon-Cel-Shading + schwarze Outlines auf Enten, **Steuerungs-Redesign**, **Fang-Engine-Neumodell** (feste Schräg-Sicht aufs ganze Becken; Maus → Wasserpunkt W; Halten senkt Haken **ins Wasser** bei W; **räumlicher Fang** mit Ente ≤ catchRadius, Perfect = mittig; Rute schwenkt stark; Rute/Haken Toon+Outline), **Schwierigkeit je Rarität** (`catchMulByRarity`), **Jahrmarkt-Welt** (Budenreihe + Wimpel-/Lichterketten + Riesenrad/Zelt-Fernkulisse, alles Toon+Outline; schlanker Holz-Plankenrand statt dickem Reifen).

## 🔧 In Arbeit — M4.6 Rest (höchste Priorität)
1. ~~Steuerungs-Redesign + Fang-Engine + Rute/Haken-Optik + Schwierigkeit je Rarität~~ ✅ — räumliches Modell (W = Strahl ∩ Wasser), Rute schwenkt sichtbar, Haken geht echt ins Wasser, Toon+Outline, kleinere Fang-Zone je seltener.
2. ~~Jahrmarkt-Welt~~ ✅ — Budenreihe + Wimpel-/Lichterketten + Riesenrad/Zelt-Fernkulisse; schlanker Holz-Plankenrand (Toon+Outline) statt dickem Reifen.
3. **Juice (NÄCHSTER SCHRITT)** (Splash/Pop/Perfect-Flash/Mini-Screenshake/HUD-Count-up) + optional Bloom/Glow.
4. **Tipp-Modals schicker** (evtl. Icon/Visualisierung je Tipp).
5. **Optional:** Intro-Sequenz (Ticket → Verkäuferin → Angel → Start).

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
