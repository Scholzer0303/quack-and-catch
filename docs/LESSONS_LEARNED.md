# LESSONS LEARNED — Quack & Catch

Laufendes Log: Entscheidungen, Stolpersteine, Fixes, Balance-Erkenntnisse. Neueste oben.

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
