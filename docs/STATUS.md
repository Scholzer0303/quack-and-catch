# STATUS — Quack & Catch

> Schnellüberblick für den Session-Start. Wird nach jedem Meilenstein aktualisiert.

**Stand:** 2026-06-23
**Aktueller Meilenstein:** **M6 (Upgrade-Shop) ✅ — fertig, reviewt & gepusht.** Katalog `data/rods.ts` (4 Ruten + 4 stapelbare Upgrades, Starter spiegelt `BALANCE.hook`); `Economy` Kauf/Equip/Upgrade-Stacking + `getActiveRodStats`; `ui/ShopScreen` (Phase `shop`, Kaufen/Ausrüsten/Affordability, Einstieg Intro+Summary reset-frei via `shopReturn`); Rod-Stats wirken in `FishingRod`/`HookRaycaster`/`DuckSpawner` (reach/cast/reel/line/magnet/luck; `timingWindowMul` entfernt). SaveData additiv (kein Schema-Bump). Review-Fixes: Glück wirkt sofort auf den sichtbaren Pool + HUD-Rod-Chip dynamisch. **Davor: M5 (Tipp-Codex) ✅ + M4.5 (Vercel-Live-Deploy live) ✅. Nächster Schritt: M7 — Progression koppeln (Rod-Tier → Becken-Speed + Loot-Table-Auswahl).**
**Letzter Build:** grün (typecheck/lint/build ✓); Smoke (0 Konsolenfehler bis auf swiftshader-Outline-Shader-Rauschen); Shop-Funktions-/Persistenz-/Korruptionstest via `__qc.economy` `ok` (Kauf/Equip/Stacking, maxStacks/Affordability blocken, Reload überlebt, Korruption → Default); ShopScreen-Screenshot gesichtet. Hinweis: Bloom drückt headless/swiftshader auf ~10 fps → Tests zustandsbasiert (echte GPU unbetroffen).
**Live-URL:** **https://quack-and-catch.vercel.app** (Vercel, Prod-Deploy ✓ — lädt sauber, 0 Konsolenfehler, `canvas:2`; **Git-Auto-Deploy von `main` aktiv**)
**Repo:** https://github.com/Scholzer0303/quack-and-catch

## ✅ Erledigt
- **M0:** Git/Repo/origin/Push-Test, Projekt-`CLAUDE.md`, Planungsdokumente, Vite+TS(strict)+Three-Scaffold (deploy-ready).
- **M1:** First-Person-Szene — Core (Renderer/Scene/Kamera/Loop/Game), EventBus, Balance-Config, Utils (math/rng), Welt (Stand, ovales Becken + animiertes Wasser-Shader, Angel/Haken), 8 Enten als InstancedMesh auf Oval-Bahn. Visuell verifiziert.
- **M2:** Hak-Mechanik — `InputSystem` (Pointer Events), Kamera-Aim-Schwenk im Cone, `HookRaycaster` (Ray-Sphere ab Haken), `FishingRod`-State-Machine (Halten-Laden/Loslassen, Timing-Window + Perfect), Reel-Animation + `removeAndRespawn`, `ui/Reticle` (Timing-Feedback) + Hover-Highlight, `lineStrength`-Gate. Fang-Loop, Perfect & Softlock-Schutz per Interaktionstest verifiziert.
- **M3:** Belohnung + HUD + Screens — `data/ducks.ts` (Raritäten + Loot-Tables + per-Instanz-Farben), `data/tips.ts` (12 geprüfte Karten), `RewardSystem` (Tokens + Perfect-Bonus + Tipp) + `Economy` (Saldo + Unlock-Set + Bonus), `GameStateMachine` (Phasen + Rundentimer + Score), `ui/UIRoot`+`HUD`+`StartScreen`+`CardReveal` (blockierendes Tipp-Modal, Pause) + `SummaryScreen`. Core-Loop schließt: Fang → Tokens + Tipp → Timer → Summary.
- **M4:** Save + Deploy-Check — `types/state.ts` (SaveData + `createDefaultSave`), `systems/SaveSystem` (localStorage: versioniert, debounced, korruptionssicher; Flush bei `pagehide`/Tab-Wechsel), `Economy.snapshot()/hydrate()`, Verdrahtung in `Game` (Laden nach UIRoot → HUD zeigt geladenen Saldo), README ausgebaut, dispose-Audit. Tokens + freigeschaltete Tipps überleben Reload; defekte Daten → sauberer Default.

- **M4.6 (Steps 1–10 ✅ gepusht):** Direktes Fadenkreuz, heller Comic-Tag, Toon-Cel-Shading + schwarze Outlines auf Enten, **Steuerungs-Redesign**, **Fang-Engine-Neumodell** (feste Schräg-Sicht aufs ganze Becken; Maus → Wasserpunkt W; Halten senkt Haken **ins Wasser** bei W; **räumlicher Fang** mit Ente ≤ catchRadius, Perfect = mittig; Rute schwenkt stark; Rute/Haken Toon+Outline), **Schwierigkeit je Rarität** (`catchMulByRarity`), **Jahrmarkt-Welt** (Budenreihe + Wimpel-/Lichterketten + Riesenrad/Zelt-Fernkulisse, alles Toon+Outline; schlanker Holz-Plankenrand), **Juice + Bloom/Glow** (Splash · Catch-Pop · Perfect-Flash · Mini-Screenshake (skaliert nach Rarität/Perfect) · HUD-Count-up · Bloom-Postprocessing mit Mobile-Quality-Guards · Glow seltener Enten; reduced-motion respektiert), **Tipp-Modal-Politur** (Emoji-Medaillon je Tipp · Rarität-Glow/Theming via `data-rarity`+`--qc-accent` · Token-Count-up · Rarität-/Kategorie-Chips · Summary-Emoji; reduced-motion gated), **Intro-Sequenz** (3-Schritt-CSS-Storyboard Bude → Ticket → Angel → los, mit „Überspringen"; `IntroScreen` ersetzt `StartScreen`, keine neue Phase, kein Save-Eingriff).

- **M5 (inhaltlich ✅ gepusht):** Tipp-Codex — `data/tips.ts` 12 → **54 geprüfte Karten** (9 Kategorien, alle Tiers; bestehende 12 IDs stabil); neuer `ui/CodexScreen` (Phase `codex`): Tier-gefärbtes Grid, freigeschaltet → Icon + Titel + Klick-Detail, gesperrt → nur 🔒 + Tier-Farbe, Kategorie-Filter, Fortschritt; Einstieg aus Intro/Summary via `onOpenCodex`/`onCloseCodex` (Game `codexReturn` → reset-frei zurück). SaveSystem schneidet Unlock-IDs automatisch gegen die größere `TIPS`-Liste (kein Schema-Bump).

- **M6 (✅ gepusht, reviewt):** Upgrade-Shop — `data/rods.ts` (4 Ruten + 4 stapelbare Upgrades; Starter spiegelt `BALANCE.hook`-Basiswerte → regressionsfrei); `Economy` Kauf/Equip/Upgrade-Stacking (`buyRod`/`equipRod`/`buyUpgrade`/`getActiveRodStats`); neuer `ui/ShopScreen` (Phase `shop`): Ruten Kaufen/Ausrüsten/Ausgerüstet + Affordability-Dimming, Upgrades Stufe x/max, Stat-Chips; Einstieg Intro+Summary reset-frei via `shopReturn`. Rod-Stats wirken (`reach`/`castSpeed`/`reelSpeed`/`lineStrength`/`magnetRadius`/`luck`; `timingWindowMul` entfernt). SaveData additiv (`ownedRodIds`/`equippedRodId`/`upgradeStacks`, kein Schema-Bump). Review-Fixes: Glück re-rollt den sichtbaren Pool sofort + HUD-Rod-Chip folgt der Rute.

## ✅ M4.6 abgeschlossen (Steps 1–11)
Direktes Fadenkreuz · heller Comic-Tag · Toon+Outline-Enten · Steuerungs-Redesign · räumliche Fang-Engine · Schwierigkeit je Rarität · Jahrmarkt-Welt · Juice+Bloom/Glow · Tipp-Modal-Politur · Intro-Sequenz. Reviewt (11 Findings, kritische behoben).

## ⏭️ Nächster Meilenstein — M7 (Progression koppeln)
- Rod-Tier → Becken-Speed (Entenzahl + Rotation, `duckCountByTier`/`rotationSpeedMulByTier` liegen bereit) · Rod-Tier → Loot-Table-**Auswahl** (`LOOT_TABLES[tier]`) + `luck`-Shift kombiniert · Magnet/Legendary-Gating-Feinschliff. (M6 hat nur die 6 Stats verdrahtet; Tier-Kopplung bewusst nach M7 verschoben.)
- **Neuer Kontext?** Zuerst [`docs/HANDOVER.md`](HANDOVER.md) lesen.

## 📌 Offene Punkte / Entscheidungen
- Keine offenen Blocker. Codex-Inhalt: eigene, geprüfte Karten (~50–60 in M5; 12 seit M3), siehe DESIGN.md.
- Persistenz steht (M4): SaveSystem speichert Tokens + Unlock-Set in `localStorage`. Spätere Felder (Rod/Stats/Settings) werden additiv bei gleicher `schemaVersion` ergänzt; `muted` ist reserviert, greift ab M8-Audio.

## Verifikations-Checkliste (Definition of Done je Meilenstein)
- [ ] `npm run typecheck` grün
- [ ] `npm run lint` grün
- [ ] `npm run build` + `npm run preview` fehlerfrei
- [ ] Browser: null Konsolenfehler, ~60 fps, Desktop + Mobile
- [ ] committet + zu `origin` gepusht, STATUS aktualisiert
