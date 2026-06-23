# LESSONS LEARNED — Quack & Catch

Laufendes Log: Entscheidungen, Stolpersteine, Fixes, Balance-Erkenntnisse. Neueste oben.

---

## 2026-06-23 — M6: Upgrade-Shop (Ruten + Upgrades + Stats wirken)

**Produkt-Entscheidungen (mit Nutzer abgestimmt)**
- Katalog: **4 Ruten** (Tier-0-Starter gratis+equipped + 3 kaufbar) + **4 stapelbare Upgrades**, Kirmes-Thema. Einstieg in den Shop aus **Intro + Summary** (wie Codex, nicht während der Runde).
- **`timingWindowMul` ersatzlos entfernt:** Die M4.6-Engine ist räumlich (catchRadius/dip, kein Timing-Fenster) → der Stat hatte keinen Konsumenten mehr. „Kein toter Code" (CLAUDE.md) → raus statt „reserviert".

**Architektur (additiv, minimal-invasiv)**
- **Domain-Typen lagen bereit:** `Rod`/`RodStats`/`Upgrade` existierten seit M0 in `domain.ts`, ungenutzt → nur Verdrahten. Phase `shop` lag bereits im `GamePhase`-Union (wie `codex`).
- **Daten-of-Record vs. Tunables:** Ruten/Upgrade-Stats+Preise leben als Inhalt in `data/rods.ts` (Präzedenz: `RARITY_DEFS` in `data/ducks.ts`); nur die **Engine-Mapping-Konstanten** (`magnetPullFraction`, `luckWeightFactor`) in `balance.shop`. So bleibt „keine Magic Numbers in der Logik" gewahrt, ohne den Katalog künstlich zu zerlegen.
- **Starter-Rute spiegelt die `BALANCE.hook`-Basiswerte** (`lineStrength: baseLineStrength`, Rest 1/0) → Default-Spiel vor jedem Kauf **regressionsfrei** identisch.
- **Ein Event statt zwei:** unbenutztes `rod:equipped` durch **`rod:statsChanged: { stats }`** ersetzt — einziges Stat-Apply-Signal, feuert bei Equip/Upgrade/Laden. `Game` abonniert **vor** `save.load` → `FishingRod.setStats` + `DuckSpawner.setLuck` übernehmen den geladenen Stand sofort.
- **Economy ist Single Source der Kaufregeln:** `buyRod`/`equipRod`/`buyUpgrade` validieren (Affordability/Ownership/maxStacks), `getActiveRodStats` = equipped Rute + Summe gestapelter Upgrade-Deltas. `snapshot/hydrate` um 3 Felder erweitert; **SaveData additiv, kein `schemaVersion`-Bump** (feldweise Validierung wie bei `unlockedTips`: unbekannte IDs filtern, `equippedRodId` muss owned sein, Stacks auf `maxStacks` clampen).

**Stat→Engine-Mapping (räumliche Engine)**
- `reach`→`catchRadius ×` (Highlight-Ring skaliert mit), `castSpeed`/`reelSpeed`→`lowerDur`/`reelDur` geteilt, `lineStrength`→Snap-Gate, `magnetRadius`→`HookRaycaster.nearestDuck` zieht W anteilig zur nächsten Ente (mutiert bewusst den geteilten W-Vektor = Fang-/Highlight-Punkt, einmal pro Frame aus frischem W → stabil), `luck`→`rollRarity(rng,tier,luck)` skaliert Gewichte selten-wärts (`(1+luck·f)^rang`).

**Review-Findings (3 Finder-Angles → behoben)**
- **Event-Ordering (Glück):** `DuckSpawner` würfelte den Boot-Pool mit `luck=0`, bevor `save.load` das geladene Glück setzte → geladenes Glück traf nur Respawns. Fix: `setLuck` würfelt bei **Änderung** den lebenden Pool neu (Guard `luck===this.luck` hält den `luck=0`-Boot deterministisch, kein Churn bei Nicht-Glück-Equips). `DuckGlowFx` zieht die neue Rarität pro Frame über seinen `lastRarity`-Cache nach → kein Glow-Desync.
- **Stale UI:** HUD zeigte hartkodiert „Bambusrute" (M3-Platzhalter, passte nicht mal zum Starter) → HUD bekommt `economy` + abonniert `rod:statsChanged`, Rod-Chip folgt der ausgerüsteten Rute.
- Cleanup-Nits (doppelter `findRod`-Fallback, pct-Helper-Dupe in ShopScreen) bewusst nicht gefixt — vernachlässigbar.

**Verifikation:** typecheck/lint/build grün; Smoke (0 Konsolenfehler bis auf swiftshader-Outline-Rauschen, headless-only); `__qc.economy`-Funktionstest (Kauf/Equip/Stacking, maxStacks→false, Affordability, Reload überlebt Ownership/Equip/Stacks, Korruption `equippedRodId`/Over-Max-Stacks/unbekannte IDs → sauberer Default); HUD-Rod-Name + Pool-Re-Roll verifiziert; ShopScreen-Screenshot gesichtet.

---

## 2026-06-23 — M5: Tipp-Codex-Screen (54 Karten + CodexScreen)

**Produkt-Entscheidungen**
- M4.5 (Vercel-Deploy) bewusst übersprungen — braucht Vercel-Konto/Login des Nutzers; kommt, wenn er dafür da ist. M5 ist reiner Code → Lern-Kern des Spiels.
- **Locked-Karten:** nur 🔒 + Tier-Farbe (kein Titel/Text-Spoiler) — Sammelanreiz, bestätigt vom Nutzer. Einstieg in den Codex nur aus Intro + Summary (nicht während der Runde).

**Architektur (additiv, minimal-invasiv)**
- **Phase `codex` existierte bereits** im `GamePhase`-Typ → keine neue Phase nötig, nur Verdrahten. `CodexScreen` folgt exakt dem `SummaryScreen`-Lifecycle (`constructor(parent,bus,economy,onClose)` → `qc-…-overlay` → `setVisible` toggelt `hidden` → `dispose` unsubt+entfernt).
- **Navigation reset-frei:** `Game.codexReturn = state.getPhase()` vor `setPhase('codex')`; `onCloseCodex` → `setPhase(codexReturn)`. Da Codex nur aus `start`/`summary` öffnet und dorthin zurückkehrt, läuft es **nie durch `playing`** → kein Timer/Score-Reset (der nur bei `playing` & `from≠paused` greift). Summary-Inhalt bleibt erhalten (wird nur bei `round:ended` neu gebaut).
- **Kein Save-Eingriff:** `SaveSystem.KNOWN_TIP_IDS` wird aus `TIPS` abgeleitet → die 42 neuen IDs sind automatisch bekannt, kein `schemaVersion`-Bump, keine Migration. `firstTimeCodexBonus` lag bereits in `Economy.onReward`.
- **Codex liest live:** rendert aus `TIPS` + `economy.isUnlocked(id)`, re-rendert auf `economy:changed` — aber **nur wenn sichtbar** (Boot-`hydrate`-Emit feuert, während Codex hidden ist → korrekt ignoriert).

**Stolpersteine / Erkenntnisse**
- **Codex-Overlay deckend machen:** Erst war der Gradient halbtransparent → die 3D-Szene (Rute/Becken) schien durchs Grid. Fix: nahezu deckende Basis (`rgba(7,24,40,0.97)` unter dem Radial) — Codex ist ein Vollbild-Screen, kein Modal über lebender Szene.
- **`window`-keydown (Esc) sauber balancieren:** Listener nur in `setVisible(true)` adden, in `setVisible(false)` **und** `dispose()` entfernen; Idempotenz-Guard (`visible === !hidden → return`) verhindert Doppel-Add/Remove. Esc steppt erst aus dem Detail zurück, dann schließt es den Codex.
- **Review-Fix (REUSE):** `hex(0xRRGGBB→#rrggbb)` war in `CardReveal` **und** `CodexScreen` dupliziert → nach `src/utils/color.ts` gezogen, beide importieren. Single Source of Truth (Projektregel „kein toter Code / strikt modular").
- **Doku-Drift (M4.6 nachgezogen):** `IntroScreen.setVisible`-Kommentar behauptete „Phase kehrt nie nach `start` zurück" — seit M5 falsch (codex→start). Kommentar korrigiert; Verhalten unverändert (reines Toggle, `step` bleibt am letzten Schritt mit Start- + Codex-Button).

**Multi-Agent-Review (high, 2 Finder-Angles → Verify): 1 Finding (hex-Dupe, behoben) + 1 Doku-Drift (Kommentar, behoben). Keine Korrektheits-Bugs.**

**Verifikation:** typecheck/lint/build grün; Smoke (0 Konsolenfehler bis auf swiftshader-Outline-Shader-Rauschen, headless-only); `save_test.py` `ok:true` (Tokens+Tipps überleben Reload, neue IDs in `KNOWN_TIP_IDS`, Korruption → Default); Codex-Screenshots (Grid locked/unlocked + Detail) gesichtet.

---

## 2026-06-22 — M4.6 Steps 10+11: Tipp-Modal-Politur + Intro-Sequenz (+ Multi-Agent-Review)

**Produkt-Entscheidungen (vom Nutzer)**
- **Step 10 Tipp-Modal:** volle Politur — Rarität-Theming + Reveal-Drama **und** Emoji je Tipp.
- **Step 11 Intro:** CSS-Storyboard-Overlay (3 Steps: Bude → Ticket → Angel), läuft pro Boot mit „Überspringen" — bewusst kein 3D-Cinematic, kein Save-Flag (geringes Risiko, bestehender Overlay-Pattern).

**Architektur (beide Steps rein additiv/Präsentation)**
- **`Tip.icon` als Pflichtfeld** (kein Fallback-Magic) → `tsc` erzwingt Emoji für alle 12 Karten. **Save-sicher:** `SaveSystem` persistiert nur `unlockedTips` (IDs), nie volle `Tip`-Objekte → kein Schema-Eingriff.
- **Rarität-Glow rein CSS:** `CardReveal` setzt nur `data-rarity` + `--qc-accent`; die `box-shadow`-Stufen je Rarität leben in `styles.css` (`color-mix`). Bewusst **kein `balance.ts`-Tunable** (Präsentation, keine Gameplay-Zahl).
- **Intro als reines DOM-Overlay in Phase `start`:** `IntroScreen` ersetzt `StartScreen`, **keine neue `GamePhase`, keine `GameStateMachine`-/`SaveData`-Änderung**. `UIRoot` tauscht nur den Screen (gleiche API). Tests unberührt — `smoke/catch/save_test` starten via `__qc.state.start()` direkt, umgehen das Overlay.

**Stolpersteine / Erkenntnisse**
- **reduced-motion-Spezifität-Falle:** Der epic/legendary-Glow-Puls hängt an `.qc-card[data-rarity='epic']` — höhere Spezifität als `.qc-card`. Im `@media (prefers-reduced-motion)`-Block müssen diese Selektoren **explizit** gelistet werden, sonst läuft der Puls trotz „reduce" weiter.
- **rAF-Count-up:** Timestamp-Arg des rAF-Callbacks nutzen (kein `Date.now`); Handle in `dismiss()`/`dispose()` **und** am Anfang von `show()` canceln (sonst doppelte Loops bei schnellem Re-Fang).

**Multi-Agent-Review (xhigh, 21 Agenten, 10 Finder-Angles → Verify → Sweep) — 11 Findings, alle low/medium, kein Crash. Behoben:**
- **Onboarding-Regress (medium):** „Überspringen" rief sofort `onStart()` → ein Erststarter sah den Steuerungs-Hinweis (nur in Step 3) nie. Fix: Skip springt zum **letzten Schritt** (Steuerung + „Los geht's!"), wie die alte StartScreen Hinweis+Start zwingend zusammen führte.
- **`color-mix` im Shorthand ohne Fallback:** Auf alten Browsern (iOS Safari < 16.2) verwirft ein ungültiger `color-mix`-Token die **gesamte** `background`/`box-shadow`-Deklaration der `.qc-card` — inkl. der `var(--qc-panel)`-Füllung → unlesbare Karte. Fix: **Plain-Fallback-Deklaration voranstellen** (Cascade: gültige frühere Zeile bleibt, moderne Browser überschreiben).
- **reduced-motion-Konsistenz:** `prefersReducedMotion()` wurde pro `show()` abgefragt; `reducedMotion.ts` schreibt ausdrücklich **Cachen im Konstruktor** vor (wie HUD/Reticle/CameraRig). Fix: einmal als `private readonly reduced` cachen.
- **Toter Code + Doku-Drift:** `IntroScreen.setVisible` hatte einen Step-Reset-Branch, der nie feuert (Phase kehrt nie nach `start` zurück). Doku behauptete „läuft jedes Mal" — falsch: Intro läuft **einmal pro Seitenaufruf (Boot)**. Branch entfernt, Doku korrigiert.
- **Kosmetik:** Token-Gain vor dem ersten rAF-Frame auf `+0` initialisiert (kein leerer Frame).
- **Bewusst nicht behoben (Idiom/Scope):** `STEPS[step]!` (durch Guard sicher), Count-up-Duplikat zu HUD (Refactor zu invasiv für event-getriebenes Modal), `el()`→`utils` (andere Dateien), Chip/Medaillon-`color-mix` (rein kosmetische Degradation auf Alt-Browsern).

**Verifikation**
- typecheck/lint/build grün; smoke (`canvas:2`, 0 Fehler) + catch grün (`state.start()` unberührt); Modal-Screenshots je Rarität + Intro-Step-Screenshots gesichtet; Skip→Steuerung per Assertion verifiziert (`cta="Los geht's!"`, `has_controls_text=true`, `phase="start"`).

## 2026-06-22 — M4.6 Step 9: Juice + Bloom/Glow (Splash/Pop/Flash/Shake/Count-up + Postprocessing)

**Produkt-Entscheidungen (vom Nutzer)**
- Bloom/Glow JETZT mitnehmen (nicht später); Feel „saftig & spürbar"; Screenshake skaliert nach Rarität/Perfect.

**Architektur (rein additiv, Engine/Gameplay unberührt)**
- Neues `src/fx/`: `reducedMotion` (geteilter Check, gecacht), `SplashFx` (Ring-Pool am Fang-XZ), `DuckGlowFx` (additives Halo-`InstancedMesh`, nutzt endlich `RARITY_DEFS.emissive`). Catch-Pop = Skala-Overshoot in `FishingRod.updateReel` (nur Per-Frame-Skalawert — kein Timing/Emit). Screenshake = additiver, abklingender `CameraRig`-Offset. Perfect-Flash = Reticle-Canvas-Ring (`render(view, dt)`). HUD-Count-up = `lerp` pro Frame (`UIRoot.animateHud`).
- Bloom: `src/core/postprocessing/Postprocessing.ts` (`EffectComposer→RenderPass→UnrealBloomPass→OutputPass`). **Threshold-Bloom (0.9)** → nur die hellsten Elemente (Lichterketten-Birnen/Splash/Glow) blühen, heller Comic-Tag bleibt klar. Quality-Guard: `coarse-pointer→low` (halbe Auflösung), `'off'`→direkter `renderer.render`-Fallback.
- FX triggern aus EINEM konsolidierten `hook:result`-Subscriber (in `busUnsub`); Splash liest `FishingRod.getCatchPoint()` (Live-Ref auf W). Kein neuer Event-Typ.

**Stolpersteine / Erkenntnisse**
- **Bloom drückt headless/swiftshader auf ~10 fps** (Software-Rendering der Blur-Passes). `dt` ist geclamped (0.05) → bei niedriger fps läuft die Spielzeit langsamer; der fixe 240-ms-Halt in `catch_test`/`save_test` erreichte `dip` nur **0.577 < armProgress 0.6** → release nahm den Zu-flach-Pfad → kein Fang. **Fix: Tests ZUSTANDSBASIERT** (`wait_for` `dip≥arm` + Belohnungskette) statt fixer fps-abhängiger Wartezeiten. Echte GPU (60 fps) war nie betroffen. Diagnose nur per **Messung** (fps + dip-Verlauf), nicht per Reasoning — die fps-Halbierung der Spielzeit hätte man sonst übersehen.
- **OutputPass-Leak (Review):** `EffectComposer.dispose()` gibt NUR die RenderTargets frei, **nicht die Passes**. Bloom UND OutputPass (eigene Materialien) müssen explizit disposed werden.
- **HUD-Count-up zählt rückwärts (Review):** bei „Nochmal" feuert `reset()` `round:tick{score:0}` **vor** `phase:changed` → Anim `{from: alter Score, to: 0}` → sichtbares Runterzählen auf dem frisch eingeblendeten HUD. Fix: bei Abnahme (`e.value < shown`) sofort snappen statt animieren (nur Hochzählen wird animiert).
- **Glow & Bloom-Threshold (Review):** Halo-Farbe = `emissive × emissiveIntensity × intensity` **ohne [0,1]-Clamp (HDR)** — sonst überschreiten die mittel-hellen Raritätsfarben die Bloom-Threshold (0.9) nie und es blüht gar nichts. Jetzt: rarer = heller; epic/legendary blühen deutlich, uncommon/rare = sanfter farbiger Schimmer.
- **DuckGlowFx-Color-Upload:** Halo-Farbe ist rein rarität-abhängig → `instanceColor` nur beim Respawn hochladen (Per-Slot-Rarity-Cache), nicht pro Frame; `instanceMatrix` muss pro Frame hoch (Enten bewegen sich).

**Verifikation**
- typecheck/lint/build grün; smoke (`canvas:2`, 0 Fehler) + catch + save grün; In-Game-Screenshots: Birnen glühen, seltene Enten leuchten, kein Washout. Diff adversarial reviewt (6 erhoben, **5 bestätigt, alle behoben**).

## 2026-06-22 — M4.6 Step 8: Jahrmarkt-Welt (Buden, Wimpel/Lichter, Riesenrad/Zelt) + schlanker Plankenrand

**Produkt-Entscheidungen (vom Nutzer)**
- **Voller Jahrmarkt:** Budenreihe + Wimpel-/Lichterketten + Riesenrad **und** Zirkuszelt als Fernkulisse (statt grauer Backdrop-Wand). Becken-Rand = **schlanker Holz-Plankenrand** (Toon+Outline) statt dickem Karamell-Reifen.
- **Umfang strikt Optik/Layout** — Engine/Gameplay unangetastet (Enten/Rute/Fang-Logik unverändert; nur `StallBuilder`/`BasinBuilder`/Farben + Game-Wiring).

**Architektur / Technik**
- **Stilkonsistenz billig:** Alle massiven Stall-Teile werden als EINE vertex-gefärbte, gemergte Toon-Geometrie gebaut (1 Draw-Call) + EIN geteiltes Inverted-Hull-Outline-Mesh (1 Draw-Call) — Muster aus `RodBuilder.place()`/`DuckFactory`. Streifen (Markisen) flach ohne Outline (sonst schwarze Linien zwischen Streifen), Wimpel doppelseitig ohne Outline, Glühbirnen als 1 `InstancedMesh`. Gesamter Jahrmarkt ≈ **6 Draw-Calls** (mobil-freundlich).
- **`mergeGeometries`-Fallen:** alle Teile vor dem Merge auf identische Attribute trimmen (`position/normal/uv/color`) — sonst wirft three. Custom-Wimpel-Dreieck **indexed** halten (Built-ins sind indexed; indexed+non-indexed mischt nicht). Quell-Geometrien nach dem Merge disposen (Daten sind kopiert).
- **`buildStall()` liefert jetzt `{group, dispose}`** (vorher nackte Group): nötig, weil die Toon-**Gradient-DataTexture** sonst leckt — `SceneManager.dispose()` disposed nur `geometry`+`material` beim Traversen, **keine Texturen und kein `mesh.dispose()`**. Game hält die Referenz und ruft `stall.dispose()`.

**Stolperstein / Fix (per Review gefunden, nicht per Reasoning)**
- **InstancedMesh-Leak:** Die Lichterketten-`bulbs` (InstancedMesh) wurden nicht disposed — `instanceMatrix`/`instanceColor` sind dedizierte GL-Buffer, die NUR `InstancedMesh.dispose()` freigibt (geometry/material allein reicht nicht). Fix: `bulbs` in die `disposables` aufnehmen (wie `DuckSpawner.dispose()` mit `this.mesh.dispose()`). Praktischer Impact gering (einzige Game-Instanz, kein In-App-Restart), aber Vertrag „keine Leaks" gilt.

**Framing-Lehre (per Screenshot getunt)**
- **Fernkulisse darf nicht in den Himmel-Ton matchen:** erster `ferrisColor` ≈ Himmelblau → praktisch unsichtbar. Im flachen Comic-Look trägt die **schwarze Outline + ein distinkter, satter Flachton** die Distanz, NICHT atmosphärischer Dunst (Fog greift auf der Distanz kaum). Lösung: kontrastreiche Silhouetten (Indigo-Riesenrad, sattes Zelt-Rot).
- **Vordergrund-Markise verdeckt den oberen Bildstreifen:** distante hohe Objekte (Riesenrad-/Zeltspitze) müssen ihren sichtbaren Bogen im Band **über der Budenreihe, aber unter der eigenen Markise** halten (Top ≈ y 3.0). Groß-aufragend hinter den Buden liest sich besser als seitlich daneben (dort verdecken die äußeren Buden zu viel).
- **`_ingame_shot.py` (neu, dev-only):** schießt einen Screenshot der lebenden Welt (Start-Screen via `__qc.state.start()` weg) — Optik-Iteration ohne Modal-Verdeckung. Output `ingame_screenshot.png` gitignored.

## 2026-06-22 — M4.6 Step 7: Schwierigkeit je Rarität (kleinere Fang-Zone)

- **Nutzer-Wunsch:** gelb (common) so lassen, grün (uncommon) schwerer, blau (rare) sehr schwer — „kleinere Ring oder Timing". Umgesetzt rein räumlich (passt zum Engine-Modell): `balance.hook.catchMulByRarity` multipliziert `catchRadius` UND `perfectRadius` je Rarität (gelb 1.0 → grün 0.62 → blau 0.4 → epic 0.3 → legendary 0.24).
- **Single Source:** `HookRaycaster.nearestDuck` rechnet den effektiven Radius pro Ente; `FishingRod` skaliert Perfect-Prüfung + Drop-Zone-Ring (`highlight.scale`) gleich mit → sichtbares Feedback ohne Geometrie-Rebuild.
- **Test-Robustheit:** mit kleinerer Zone für nicht-common würde der feste Cursor-Hold danebengreifen → `catch_test`/`save_test` picken bevorzugt eine **common** Ente (größte Zone). Haltezeit auf ~240 ms gekürzt (genug Dip, weniger Drift in der engeren Zone).
- **Vorher (gleiche Session):** globales Schwerer-Machen — `catchRadius` 0.6→0.42, `perfectRadius` 0.22→0.14, `baseRotationSpeed` 0.045→0.055.

## 2026-06-22 — M4.6 Step 6: Fang-Engine-Neumodell (räumlich, „ins Wasser") + Rute/Haken-Optik

**Produkt-Entscheidungen (vom Nutzer, 2. Live-Test)**
- **Feste Schräg-runter-Sicht** aufs ganze Becken (nur dezenter Parallax); Maus bewegt Fadenkreuz + Haken-Ziel + Rute stark, nicht den Blick.
- **Räumliches Fang-Modell statt Timing:** Haken einfach dort runterlassen, wo eine Ente ist → Fang (man muss „im Bereich" sein). Kein „Ente anvisieren + Window perfekt treffen" mehr. Perfect = Ente mittig (Bonus bleibt).
- **Haken muss echt ins Wasser** (vorher landete er vor dem Becken; Schnur hing neben der Rute).

**Engine-Kern**
- **Maus → Wasserpunkt W:** `HookRaycaster.resolveWaterPoint` = Strahl ∩ Wasser-Ebene (y=0), auf das Becken-Oval geclamped (`basinInset`). W ist Fadenkreuz-Ziel, Haken-3D-Ziel und Fang-Mittelpunkt zugleich. Fang = `nearestDuck(W, catchRadius)` (XZ-Abstand). Ersetzt Ray-Sphere + `reach`-ab-Anker komplett.
- **Schnur/Haken world-space:** `buildRod()` trennt `stick` (Kamera-Kind, schwenkt) von `rig` (world: Schnur+Haken+Schwimmer). `hookWorld = lerp(tipWorld, W, dip)`, `stretchLine(tipWorld, hookWorld)` → die Schnur geht sichtbar von der Spitze ins Wasser bei W (nie „neben" der Rute, nie vor dem Becken). Reel zieht die Ente zur Rutenspitze hoch.
- **Sichtbarer Schwenk:** Rute per **yaw/pitch** aus `aimNdc` (großer `swingAmount` ~0.5), nicht nur Roll — so sweept die Rute deutlich übers Becken (vorher „bewegt sich kaum"). Die präzise Zielposition kommt ohnehin aus W; der Schwenk ist das Feel.
- **Kamera-Framing per Screenshot getunt:** `position [0,2.75,3.5]`, `lookAt [0,-0.15,-2.2]`, Aim-Cone fast aus (Parallax 0.05/0.03) → ganzes Becken im Blick, alle Enten per Maus erreichbar.

**Verifikation**
- `typecheck`/`lint`/`build` grün; `smoke`/`catch`/`save` grün (Fang beim 1. Versuch). Screenshots: ganzes Becken sichtbar, Rute schwenkt stark links/rechts, Haken senkt bei Halten auf die anvisierte Ente ins Wasser.
- Tests vereinfacht: zentralste Ente projizieren → Maus drauf → halten bis `dip ≥ armProgress` (~360 ms) → loslassen. Kein Timing-Fenster mehr (robuster); Release-Timing-Falle aus Step 5 bleibt relevant (kein evaluate zwischen down/up).

## 2026-06-22 — M4.6 Step 5: Steuerungs-Redesign (lebendige Rute + Lock bei Release)

**Produkt-Entscheidungen (vom Nutzer)**
- **Lock bei Release statt Press:** Drücken senkt den Haken immer (auch ohne Ziel); gefangen wird, was beim Loslassen unter dem Fadenkreuz im Window liegt. Physischer als „nur über Ente drückbar".
- **Umfang bewusst eng:** nur Steuerung + leichtes Haken-Cleanup; volle Rute/Haken-Optik (Toon+Outline) ist der nächste Schritt. Pause-Rhythmus pro Schritt eingehalten.

**Architektur**
- **Rute-Besitz in `FishingRod`** (nicht neue Klasse): besitzt schon `highlight`-Mesh, `camera` und State (`getView()`), läuft pro Frame. `buildRod()` liefert jetzt `{group, hookGroup, line, tip}`; `stretchLine()` dehnt die Schnur (Einheits-Zylinder, `scale.y`). Senken/Heben + Schwenk gedämpft über `damp` (`balance.hook.dipDepth/dipDampLambda/swingAmount/swingDampLambda`).
- **Animation rein visuell:** `hookAnchor()` (Reel-Ziel + `reach`) bleibt der Ruhe-Anker `HOOK_ANCHOR_LOCAL` → die verifizierte Fang-Logik ist unberührt, nur die Darstellung lebt. De-risk by design.

**Stolperstein / Fix (Test-Falle, nicht Spiel-Bug)**
- **Release läuft synchron vor dem nächsten `cameraRig.update()`.** Springt der Cursor unmittelbar vor `mouse.up` auf eine neue Position, castet der Fang-Strahl noch mit der **alten** Kamera-Orientierung (aimInstant wendet das neue Aim erst im Folgeframe an) → systematischer Fehlgriff. Im echten Spiel irrelevant (Cursor folgt der Ente flüssig). **Diagnose nur per Instrumentierung:** ein temporäres `peekTarget()` zeigte, dass das Ziel zwar gefunden, der State beim Release aber schon `cooldown` war — die langsamen `evaluate`-Roundtrips (+GPU-Stalls) zwischen `down` und `up` ließen das 280-ms-Window ablaufen. Reasoning allein hätte „re-aim driftet" vermutet.
- **Fix in den Tests:** kein Re-Aim/`evaluate` zwischen `down` und `up`; ruhig ~320 ms halten (Ente driftet < `catchRadius` 0.45). Pick ist reach-aware (nur Enten in Reichweite ab Haken-Anker), sonst wählt der Test ferne, unfangbare Enten und `hasTarget` wird nie wahr.

**Verifikation**
- `typecheck`/`lint`/`build` grün. `smoke_test`/`catch_test`/`save_test` grün (Hit beim ersten Versuch). Screenshots idle vs. Hold bestätigen: Rute schwenkt, Schnur dehnt sich beim Halten (Haken senkt), Timing-Ring aktiv.

---

## 2026-06-22 — M4: Save + Deploy-Check

**Design-Entscheidungen (Plan-Agent-Empfehlung, vom Nutzer freigegeben)**
- **`SaveData` minimal + additiv:** nur `tokens` + `unlockedTips` + `muted`. Spätere Felder (Rod/Stats/Settings) kommen additiv bei gleicher `schemaVersion` — der Validator repariert fehlende Felder auf Default, also kein Version-Bump nötig. Version-Mismatch verwirft komplett (Migrations-Seam für echte Breaking Changes).
- **Keine optionalen Properties im Save-Schema:** `exactOptionalPropertyTypes` ist an → `muted` ist `boolean` mit Default `false` (nicht `muted?`). Serialisiert sauber (kein `undefined`-Drop), zwei statt drei Zustände. Fehlende Felder werden beim Laden repariert, nicht als `?` modelliert.
- **`muted` schon reserviert + `isMuted()/setMuted()` Stubs:** macht M8-Audio zum Drop-in; bis dahin wird nur persistiert.

**Architektur**
- **Hydrate-Reihenfolge (wichtigster Constraint):** `SaveSystem.load()` läuft in `Game` **nach** der UIRoot-Konstruktion. `economy.hydrate()` feuert `economy:changed`; das HUD liest Tokens **nur** aus diesem Event (kein Boot-Read) → würde load vor dem HUD laufen, bliebe der Saldo auf 0. Reihenfolge: erst `hydrate`, **dann** `economy:changed` abonnieren — sonst triggert der Boot-Emit einen redundanten Write/Feedback-Loop.
- **Economy-Slice entkoppelt:** `Economy.snapshot()` gibt nur `{tokens, unlockedTips}` zurück (kein Wissen über `schemaVersion`/`muted`). `SaveSystem` komponiert das volle `SaveData`. Economy bleibt vom Save-Schema unabhängig.
- **Korruptionssicher in Stufen:** `getItem` (Private-Mode wirft), `JSON.parse` (korrupt) und ein **feldweiser** Validator — Teilkorruption bleibt nutzbar (einzelne Felder → Default), nur Version-Mismatch/Nicht-Objekt verwerfen ganz. `setItem` in try/catch (Quota/Private-Mode schlucken, nie Gameplay crashen). `tokens` zusätzlich gegen `NaN`/`Infinity`/negativ geprüft; `unlockedTips` gefiltert auf Strings **und gegen `TIPS`-IDs geschnitten** (stale IDs droppen).
- **Flush statt Datenverlust:** Debounce (`save.debounceMs` 400) coalesct Writes; `flush()` bei `pagehide` + `visibilitychange→hidden` sichert den letzten Fang im Debounce-Fenster. Bewusst **kein `beforeunload`** (Mobile unzuverlässig, blockt bfcache). `dispose()` flusht zuerst, dann Listener/Timer/Sub entfernen — die einzige neue Leak-Fläche in M4.

**Verifikation**
- `typecheck`/`lint`/`build`/`preview` grün. Prod-Build: `__qc`/DEV-Branch via `import.meta.env.DEV` aus `dist/` getreeshakt (gegrept: nicht vorhanden).
- `scripts/save_test.py` (neu): echter Fang → `save.flush()` → `reload()` → Tokens (6→6) + `unlockedCount` (1→1) bleiben. Danach 3 Korruptionsfälle (kaputtes JSON, `schemaVersion:999`, `tokens:"abc"`) → je `0` Tokens, kein Crash, kein Konsolenfehler.
- Smoke (0 Konsolen-/Page-Errors) auf Dev **und** Prod-Preview-Build.
- **Lint-Stolperstein:** `let raw: string | null = null;` → `no-useless-assignment` (jeder Pfad reassignt/returnt vorher). Fix: Initializer weg (`let raw: string | null;`) — TS-Control-Flow trägt die Definite-Assignment via `catch { return }`.

## 2026-06-21 — M3: Belohnung + HUD + Screens

**Produkt-Entscheidung (vom Nutzer)**
- **Tipp-Karte = blockierendes Modal:** Beim Fang stoppt ein Modal die Runde (Timer + Becken eingefroren) bis „Weiter". Bewusst gegen den flüssigeren Toast — die Lern-Tipps sollen gelesen werden.

**Architektur**
- **Pause über die bestehende Phase `'paused'`:** Fang → `reward:granted` → Game schaltet `paused`. `GameStateMachine.setPhase('playing')` ruft `reset()` (Timer/Score) **nur bei `from !== 'paused'`** — Resume aus der Pause behält die Runde, Start/„Nochmal" startet frisch.
- **Einfrieren gezielt:** `Game.update` überspringt `basin/ducks.update` **nur in `'paused'`** — hinter Start/Summary bleibt das Becken lebendig (Schauwert), nur im Tipp-Modal steht alles.
- **Economy besitzt das Unlock-Set + Bonus:** RewardSystem fragt `economy.isUnlocked(id)` für `isNewTip` **vor** dem Emit, Economy fügt beim Verarbeiten hinzu und addiert `firstTimeCodexBonus` — eine Quelle, kein Doppelzählen.

**Stolpersteine / Fixes (per Verifikation gefunden, nicht per Reasoning)**
- **Per-Instanz-Raritätsfarbe:** `MeshStandardMaterial` multipliziert `vertexColor × instanceColor`. Lösung: Körper/Kopf/Schwanz **weiß** backen → `instanceColor` (Raritäts-Hex) schlägt exakt durch; Schnabel/Augen behalten Farbe (leicht mitgetönt, akzeptiert). **Per-Instanz-Emissive/Glint geht NICHT** auf einer geteilten Material-Instanz → DESIGN-Felder gepflegt, aber erst M8 (Custom-Shader).
- **Perfect-Flag-Timing:** `hook:result{hit,perfect}` feuert **vor** `duck:landed`. RewardSystem cacht `perfect` aus `hook:result`, verbraucht es beim Landen und löscht es bei Miss/Snap **und** nach Nutzung → kein Bonus-Leak in den nächsten Fang.
- **HUD-Score-Lag (Screenshot):** Score wurde nur per throttled `round:tick` ins HUD geschrieben — ein Fang pausiert aber sofort vor dem nächsten Tick, also blieb der Score im Modal auf dem alten Wert. Fix: `GameStateMachine` emittiert bei Score-Änderung (`duck:landed`) sofort einen `round:tick`.
- **Summary-Tipps weg nach Resume (Screenshot):** `SummaryScreen` leerte die gesammelten Tipps bei jedem `phase:changed → playing` — auch beim Resume aus der Pause. Fix: nur bei `from !== 'paused'` leeren (spiegelt den Reset-Vertrag der State-Machine).

**Verifikation**
- `typecheck`/`lint`/`build` grün nach jedem der 6 Schritte.
- Playwright-Smoke: 0 Konsolen-/Page-Errors, Start-Screen + farbige Enten dahinter.
- `scripts/catch_test.py` (an M3 angepasst: `__qc.state.start()` wegen Phase-Gate): Hit → `reward:granted` → Tokens > 0 → Phase `paused`, Becken bleibt voll.
- Screenshots gesichtet: Start / HUD (Score·Zeit·Tokens·Rod) / Tipp-Modal (Rarität-Farbrand, „Neu!") / Summary (Endstand + gesammelte Tipps). 5 Raritätsfarben klar unterscheidbar.

## 2026-06-21 — M2: Hak-Mechanik

**Produkt-Entscheidungen (vom Nutzer)**
- **Fang-Modell = Halten-Laden & Loslassen:** Pointerdown startet den Cast, Loslassen setzt den Haken. Release im Window = Treffer, zentrales Band = Perfect.
- **Ziel-Modell = Kamera schwenkt im Aim-Cone:** Pointer schwenkt Blick + Rute gedämpft (±aimYaw/aimPitch); Reticle bleibt zentriert → Fang-Ray = Kamera-Center-Strahl.

**Stolpersteine / Fixes**
- **Reichweite ab Haken-Anker, nicht ab Kamera:** Nächste Ente ist ~3.66 WU von der Kamera, aber nur ~2.08 vom Haken entfernt. Mit `reach` ab Kamera wäre nichts fangbar → `HookRaycaster` misst Reichweite ab dem Haken-Anker, Aim-Toleranz (senkrecht zum Strahl) separat via `catchRadius`.
- **Bug (per Interaktionstest gefunden):** Window-Timeout rief `resolveAtRelease` → **Halten ohne Loslassen ergab einen Auto-Treffer**. Beim Halten-Modell muss Nicht-Loslassen ein Fehlversuch sein → Timeout löst jetzt `resolveMiss` aus. (Genau dafür der Test — Reasoning allein hätte es übersehen.)
- **Reel-Skalierung:** `writeMatrices` teilt sich einen `dummy` (Scale = 1). Würde man darüber die schrumpfende Ente setzen, bekämen **alle** Enten die Reel-Scale. Lösung: eigener `reelDummy` + `reeling`-Set, das gehakte Slots in `writeMatrices` überspringt (Pose steuert FishingRod).
- **Haken-Anker als Single Source:** `HOOK_ANCHOR_LOCAL` aus `RodBuilder` exportiert; FishingRod nutzt dieselbe Konstante als Reel-Ziel (statt doppelter Magic-Vektor).
- **Test-Zielpunkt:** Bildmitte (y=360) blickt über die Enten; der Center-Ray trifft die Bahn erst, wenn der Pointer tiefer steht (y≈655 → Near-Apex worldZ≈-0.51). Das ist Spiel-korrekt, war ein Test-Fehler.

**Softlock-Schutz (höchste Prio, verifiziert)**
- `setPointerCapture` → `pointerup` erreicht uns auch außerhalb der Canvas. `pointercancel`/`lostpointercapture`/Fenster-`blur` → `cancel()` löst den Hold auf. Window-Timeout → Miss. Test „Halten ohne Loslassen" zeigt: State kehrt zu `idle` zurück (kein Hänger).

**Verifikation**
- `typecheck`/`lint`/`build` grün nach jedem der 6 Schritte.
- Playwright-Smoke: 0 Konsolen-/Page-Errors, Szene + Reticle rendern (2 Canvas: Three + Reticle-Overlay).
- `scripts/catch_test.py` (echte Pointer-Events): Press→Cast→Window→Release→**Hit→Reel→Respawn**, Becken bleibt voll (8 Enten, alle alive nach Settle), Perfect-Pfad feuert.
- Dev-Hook `window.__qc` (nur `import.meta.env.DEV`, in Prod getreeshakt) exponiert bus/ducks/rod für Tests + Konsole.

## 2026-06-21 — M1: First-Person-Szene

**Prozess**
- Neuer Pflicht-Rhythmus (vom Nutzer): nach JEDEM Meilenstein erst Pause + Doku-Überarbeitung + `/code-review`, dann erst weiter. In CLAUDE.md verankert.

**Stolpersteine / Fixes**
- `EventBus<E extends Record<string, unknown>>`: ein `interface GameEvents` erfüllt die Constraint nicht (fehlende Index-Signatur) → auf `type GameEvents = {…}` umgestellt.
- **Enten unsichtbar:** Bahn-Radius war = Beckenradius, dadurch liefen die Enten genau unter dem Rand-Ring. Fix: `trackInset` (0.72) → Bahn innerhalb des Wassers; `duckFloatY` für Schwimmhöhe.
- **Komposition:** Erste Kamerapose zu flach + Theke zu hoch → Becken verdeckt. Kamera höher/steiler (Blick von oben ins Becken), Theke zu flachem Bildrahmen verkleinert, Backdrop niedriger.

**Verifikation**
- Browser-Render via Playwright (headless, SwiftShader): Screenshot zeigt Szene korrekt, **0 Konsolenfehler / 0 Page-Errors**. Die GPU-„ReadPixels stall"-Warnungen sind reine Headless-Artefakte.
- Bundle: ~534 kB (136 kB gzip) — three.js; akzeptabel, später ggf. Code-Splitting.

**Code-Review (3 parallele Finder-Agenten) — behoben:**
- `DuckSpawner`: `frustumCulled = false` — InstancedMesh-Bounding-Sphere wird nur einmal berechnet und wäre mit bewegten Enten stale (Enten könnten in M2 bei Kamera-Aim wegcullen).
- `main.ts`: try/catch um den Spielstart + Fallback-Meldung (kein Blank-Screen bei fehlendem WebGL).
- `Game`: `webglcontextlost`/`restored`- + `visibilitychange`-Handler (Loop pausieren) — kein Mobile-Softlock, keine Fehler-Flut, Akku schonen.
- `EventBus.emit`: über Kopie iterieren (Handler dürfen sich beim Emit ab-/anmelden).
- Magic Numbers → `balance.ts`: Rim-Light (`render.rim*`) und Becken-Innenwand (`basin.innerWall*`, `rimColor`).
- `DuckSpawner` Tier-Fallback konsistent (`rotationSpeedMulByTier[0]` statt `1`); Rod-Materialien `fog = false`; Wasser-Wellen-Tuning (sichtbarere Kämme).

**Code-Review — bewusst zurückgestellt (kein Bug in M1):**
- `SceneManager.dispose`-Härtung (InstancedMesh.dispose / Uniform-Texturen) — erst relevant, wenn Shader-Texturen dazukommen.
- Resize nur via `resize`-Event / DPR-matchMedia — Spiel ist by design Vollbild (`#app` fixed inset:0).
- „Tote" Domain-Typen/Events/Utils (`Upgrade`, `RarityDef`, `weightedPick`, `clamp`, `damp` …) — laut freigegebenem Plan bewusste M1-Verträge/Infrastruktur; werden im jeweiligen Meilenstein verdrahtet.

## 2026-06-21 — M0: Setup & Architektur-Entscheidungen

**Entscheidungen**
- **Repo & Push-Ziel:** Eigenes öffentliches Repo `Scholzer0303/quack-and-catch`. `origin` fix, niemals ins Template pushen. Push nach jedem Schritt (Jury bewertet Push-Verlauf).
- **Titel:** „Quack & Catch" (Anzeigename); Repo-Slug `quack-and-catch`.
- **Vercel:** Live-Deploy erst nach dem MVP (M4.5); Code bleibt aber von Anfang an deploy-ready (`base: './'`).
- **Codex-Inhalt:** Eigene, faktisch geprüfte deutsche Karten (~50–60) statt Verbatim-Scrape — urheberrechtssauber und inhaltlich verifizierbar. Skaile-Themenkarte nur als Lehrplan-Gerüst.

**Architektur-Begründungen**
- **EventBus** zwischen Systemen/UI → Entkopplung, sauberer für die „saubere Umsetzung"-Wertung.
- **`world/`-Layer** trennt prozedurale Mesh-Builder von Logik (Systeme bleiben logikfrei, Meshes wiederverwendbar/disposbar).
- **`config/balance.ts`** als einzige Quelle für Tunables → keine Magic Numbers.
- **Raycast bewegter Enten:** Weltpositionen pro Tick cachen + analytisches Ray-Sphere statt Instanz-Matrix-Raycast (billiger, korrekt bei Bewegung).

**Stolpersteine / Notizen**
- `guides.skaile.de` blockt automatische Zugriffe (HTTP 403) → Inhalte werden selbst verfasst und gegen offizielle Docs geprüft.
- Windows: Git meldet `LF will be replaced by CRLF` → `.gitattributes` mit `* text=auto eol=lf` setzen, damit der Build deterministisch/Linux-kompatibel bleibt (Vercel ist case- und EOL-relevant).

**Offen**
- _(noch nichts)_
