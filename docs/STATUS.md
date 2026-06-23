# STATUS — Quack & Catch

> Schnellüberblick für den Session-Start. Wird nach jedem Meilenstein aktualisiert.

**Stand:** 2026-06-23
**Aktueller Meilenstein:** **M5 — Tipp-Codex-Screen (inhaltlich fertig)** — `data/tips.ts` auf **54 Karten** ausgebaut (9 Kategorien, alle Tiers, faktisch geprüft); neuer **`ui/CodexScreen`** (Phase `codex`): Grid mit Tier-Farbe, **freigeschaltet → Icon + Titel (Klick → Detail)**, **gesperrt → nur 🔒 + Tier-Farbe** (kein Spoiler), Kategorie-Filter-Chips, Fortschritt „X / 54". Einstieg aus **Intro (letzter Step)** + **Summary** über neue Callbacks `onOpenCodex`/`onCloseCodex`; Game merkt Quelle (`codexReturn`) → reset-freie Rückkehr. `firstTimeCodexBonus` lag schon in `Economy`. **Nächster Schritt: `/code-review` über M5-Diff → Abnahme → M4.5 Vercel-Deploy.** (M4.6 davor: Steps 1–11 + Review, kritische Findings behoben.)
**Letzter Build:** grün (typecheck/lint/build ✓); Smoke (0 Konsolenfehler bis auf swiftshader-Outline-Shader-Rauschen), Save-Regression `ok:true` (neue Tip-IDs automatisch in `KNOWN_TIP_IDS`), Codex-Screenshots (Grid + Detail) gesichtet. Hinweis: Bloom drückt headless/swiftshader auf ~10 fps → Tests zustandsbasiert (echte GPU unbetroffen).
**Live-URL:** **https://quack-and-catch.vercel.app** (Vercel, Prod-Deploy ✓ — lädt sauber, 0 Konsolenfehler, `canvas:2`)
**Repo:** https://github.com/Scholzer0303/quack-and-catch

## ✅ Erledigt
- **M0:** Git/Repo/origin/Push-Test, Projekt-`CLAUDE.md`, Planungsdokumente, Vite+TS(strict)+Three-Scaffold (deploy-ready).
- **M1:** First-Person-Szene — Core (Renderer/Scene/Kamera/Loop/Game), EventBus, Balance-Config, Utils (math/rng), Welt (Stand, ovales Becken + animiertes Wasser-Shader, Angel/Haken), 8 Enten als InstancedMesh auf Oval-Bahn. Visuell verifiziert.
- **M2:** Hak-Mechanik — `InputSystem` (Pointer Events), Kamera-Aim-Schwenk im Cone, `HookRaycaster` (Ray-Sphere ab Haken), `FishingRod`-State-Machine (Halten-Laden/Loslassen, Timing-Window + Perfect), Reel-Animation + `removeAndRespawn`, `ui/Reticle` (Timing-Feedback) + Hover-Highlight, `lineStrength`-Gate. Fang-Loop, Perfect & Softlock-Schutz per Interaktionstest verifiziert.
- **M3:** Belohnung + HUD + Screens — `data/ducks.ts` (Raritäten + Loot-Tables + per-Instanz-Farben), `data/tips.ts` (12 geprüfte Karten), `RewardSystem` (Tokens + Perfect-Bonus + Tipp) + `Economy` (Saldo + Unlock-Set + Bonus), `GameStateMachine` (Phasen + Rundentimer + Score), `ui/UIRoot`+`HUD`+`StartScreen`+`CardReveal` (blockierendes Tipp-Modal, Pause) + `SummaryScreen`. Core-Loop schließt: Fang → Tokens + Tipp → Timer → Summary.
- **M4:** Save + Deploy-Check — `types/state.ts` (SaveData + `createDefaultSave`), `systems/SaveSystem` (localStorage: versioniert, debounced, korruptionssicher; Flush bei `pagehide`/Tab-Wechsel), `Economy.snapshot()/hydrate()`, Verdrahtung in `Game` (Laden nach UIRoot → HUD zeigt geladenen Saldo), README ausgebaut, dispose-Audit. Tokens + freigeschaltete Tipps überleben Reload; defekte Daten → sauberer Default.

- **M4.6 (Steps 1–10 ✅ gepusht):** Direktes Fadenkreuz, heller Comic-Tag, Toon-Cel-Shading + schwarze Outlines auf Enten, **Steuerungs-Redesign**, **Fang-Engine-Neumodell** (feste Schräg-Sicht aufs ganze Becken; Maus → Wasserpunkt W; Halten senkt Haken **ins Wasser** bei W; **räumlicher Fang** mit Ente ≤ catchRadius, Perfect = mittig; Rute schwenkt stark; Rute/Haken Toon+Outline), **Schwierigkeit je Rarität** (`catchMulByRarity`), **Jahrmarkt-Welt** (Budenreihe + Wimpel-/Lichterketten + Riesenrad/Zelt-Fernkulisse, alles Toon+Outline; schlanker Holz-Plankenrand), **Juice + Bloom/Glow** (Splash · Catch-Pop · Perfect-Flash · Mini-Screenshake (skaliert nach Rarität/Perfect) · HUD-Count-up · Bloom-Postprocessing mit Mobile-Quality-Guards · Glow seltener Enten; reduced-motion respektiert), **Tipp-Modal-Politur** (Emoji-Medaillon je Tipp · Rarität-Glow/Theming via `data-rarity`+`--qc-accent` · Token-Count-up · Rarität-/Kategorie-Chips · Summary-Emoji; reduced-motion gated), **Intro-Sequenz** (3-Schritt-CSS-Storyboard Bude → Ticket → Angel → los, mit „Überspringen"; `IntroScreen` ersetzt `StartScreen`, keine neue Phase, kein Save-Eingriff).

- **M5 (inhaltlich ✅ gepusht):** Tipp-Codex — `data/tips.ts` 12 → **54 geprüfte Karten** (9 Kategorien, alle Tiers; bestehende 12 IDs stabil); neuer `ui/CodexScreen` (Phase `codex`): Tier-gefärbtes Grid, freigeschaltet → Icon + Titel + Klick-Detail, gesperrt → nur 🔒 + Tier-Farbe, Kategorie-Filter, Fortschritt; Einstieg aus Intro/Summary via `onOpenCodex`/`onCloseCodex` (Game `codexReturn` → reset-frei zurück). SaveSystem schneidet Unlock-IDs automatisch gegen die größere `TIPS`-Liste (kein Schema-Bump).

## 🔧 In Arbeit — M4.6 Rest (höchste Priorität)
1. ~~Steuerungs-Redesign + Fang-Engine + Rute/Haken-Optik + Schwierigkeit je Rarität~~ ✅ — räumliches Modell (W = Strahl ∩ Wasser), Rute schwenkt sichtbar, Haken geht echt ins Wasser, Toon+Outline, kleinere Fang-Zone je seltener.
2. ~~Jahrmarkt-Welt~~ ✅ — Budenreihe + Wimpel-/Lichterketten + Riesenrad/Zelt-Fernkulisse; schlanker Holz-Plankenrand (Toon+Outline) statt dickem Reifen.
3. ~~Juice + Bloom/Glow~~ ✅ — Splash/Pop/Perfect-Flash/Mini-Screenshake/HUD-Count-up + Bloom (Mobile-Guards) + Glow seltener Enten.
4. ~~Tipp-Modal schicker~~ ✅ (Step 10) — Emoji-Medaillon je Tipp (`Tip.icon`), Rarität-Glow/Theming (`data-rarity`+`--qc-accent`), Token-Count-up, Rarität-/Kategorie-Chips; Summary-Liste mit Emoji.
5. ~~Intro-Sequenz~~ ✅ (Step 11) — 3-Schritt-CSS-Storyboard (Bude → Ticket → Angel → los) + „Überspringen"; `IntroScreen` ersetzt `StartScreen`, keine neue Phase, kein Save-Eingriff. **M4.6 fertig + reviewt (11 Findings, kritische behoben).**

## 🔧 In Arbeit — M5 (Tipp-Codex)
- ~~`data/tips.ts` auf ~50–60 Karten~~ ✅ (54 Karten, 9 Kategorien, alle Tiers).
- ~~`ui/CodexScreen` (Grid locked/unlocked, Tier-Farbe, Kategorie-Filter, Detail, Fortschritt)~~ ✅; Phase `codex` (war schon im Typ), Einstieg aus Intro + Summary.
- Offen: `/code-review` über M5-Diff + Abnahme.

## ⏭️ Danach
- M4.5 — Vercel-Live-Deploy (braucht Vercel-Konto/Login des Nutzers).
- M6 — Upgrade-Shop. **Neuer Kontext?** Zuerst [`docs/HANDOVER.md`](HANDOVER.md) lesen.

## 📌 Offene Punkte / Entscheidungen
- Keine offenen Blocker. Codex-Inhalt: eigene, geprüfte Karten (~50–60 in M5; 12 seit M3), siehe DESIGN.md.
- Persistenz steht (M4): SaveSystem speichert Tokens + Unlock-Set in `localStorage`. Spätere Felder (Rod/Stats/Settings) werden additiv bei gleicher `schemaVersion` ergänzt; `muted` ist reserviert, greift ab M8-Audio.

## Verifikations-Checkliste (Definition of Done je Meilenstein)
- [ ] `npm run typecheck` grün
- [ ] `npm run lint` grün
- [ ] `npm run build` + `npm run preview` fehlerfrei
- [ ] Browser: null Konsolenfehler, ~60 fps, Desktop + Mobile
- [ ] committet + zu `origin` gepusht, STATUS aktualisiert
