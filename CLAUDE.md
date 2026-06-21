# CLAUDE.md — Projektregeln für „Quack & Catch"

Projektbezogene Anweisungen für jede Claude-Code-Session in diesem Repo. Diese Datei wird automatisch geladen und gilt zusätzlich zur globalen `~/.claude/CLAUDE.md`.

---

## 🔒 GitHub & Push-Disziplin (Pflicht, höchste Priorität)

1. **Push-Ziel ist fix.** `origin` zeigt auf **mein eigenes Repo** `https://github.com/Scholzer0303/quack-and-catch.git`. Niemals woanders hin pushen. Das Ziel **nie** ändern. Niemals ins Original-Template `sebaskauf/building-challenge-starter` pushen. Im Zweifel zuerst `git remote -v` prüfen — die URL MUSS `Scholzer0303` enthalten.

2. **Nach JEDEM abgeschlossenen Arbeitsschritt sofort committen und pushen:**
   ```bash
   git add -A
   git commit -m "<kurze, klare deutsche Message>"
   git push
   ```
   Sehr regelmäßig, eng an den Fortschritt gekoppelt. Die Jury bewertet den **Push-Verlauf**, nicht das Commit-Datum — häufige, nachvollziehbare Pushes sind wertvoll. Lieber zu oft als zu selten.

3. **Commit-Stil:** Conventional Commits auf Deutsch, kurz und sprechend, z. B. `feat: ovales Wasserbecken + animiertes Wasser`, `fix: Hook-Timing-Window korrigiert`, `chore: ESLint-Konfig`, `docs: STATUS aktualisiert`.

## 🧭 Session-Start-Routine (immer zuerst)
Zu Beginn jeder neuen Session **zuerst orientieren**, dann nahtlos weiterbauen:
```bash
git log --oneline -15
git status
```
Danach **`docs/HANDOVER.md`** lesen (Wiedereinstieg, Architektur-Karte, nächste Aufgaben, Gotchas), dann `docs/STATUS.md` + `docs/BACKLOG.md` → weiterbauen, weiterhin Push nach jedem Schritt.

## ✅ Qualitäts-Gate (vor jeder Abnahme / vor „fertig")
- `npm run typecheck` grün
- `npm run lint` grün
- `npm run build` + `npm run preview` fehlerfrei
- Im Browser geöffnet: **null Konsolenfehler**, flüssig (~60 fps), Desktop **und** Mobile (DevTools-Touch), kein Softlock
- Nichts als „fertig" melden, solange Build/Run nicht nachweislich sauber sind.

---

## Projektkontext
- **Spiel:** „Quack & Catch" — 3D-First-Person-Entenangeln als Lernspiel; Belohnungen = echte, gestufte Tipps zu Claude & Claude Code + Tokens; Token-Economy + Upgrade-Shop; Meta-Progression via `localStorage`.
- **Tech-Stack (fix):** Three.js + Vite + TypeScript **strict**. Statisch deploy-ready: `vite.config` mit `base: './'`, Output `dist/`. Alle Assets prozedural aus Primitives, keine externen/lizenzpflichtigen Inhalte.
- **Sprache:** UI-Texte, Tipp-Inhalte und Commits auf **Deutsch**.

## Architektur-Prinzipien
- **Keine Magic Numbers** — alle Tunables zentral in `src/config/balance.ts`. Logik liest nur daraus / aus `src/config/derived.ts`.
- Strikt modular: `core/` (Loop, Szene, Kamera, Renderer, State-Machine), `systems/` (Input, DuckSpawner, FishingRod, RewardSystem, Economy, SaveSystem, AudioManager), `world/` (prozedurale Meshes + Shader), `ui/` (HUD, Shop, Codex, Screens), `data/` (tips, ducks, rods), `events/` (typisierter EventBus), `types/`, `utils/`.
- Sprechende Namen, kurze Funktionen, **kein toter Code**. Systeme entkoppelt über EventBus. `dispose()`-Vertrag für sauberes Aufräumen (keine Memory-Leaks).
- Touch **und** Maus über Pointer Events vereinheitlicht. Pointer-Lock nie zwingend (kein Softlock).

## Inhaltsregeln (Tipp-Codex)
- Tipps müssen **faktisch korrekt** und wirklich nützlich sein (es ist eine Lernapp). Bei Unsicherheit allgemein formulieren oder weglassen — **nie erfinden**.
- Wissen selbst verfassen (offizielle Claude-Code-Docs als Basis), kein Verbatim-Copy fremder Inhalte.

## Befehle
```bash
npm install        # Abhängigkeiten
npm run dev        # Dev-Server
npm run build      # Produktions-Build -> dist/
npm run preview    # gebauten Build lokal prüfen
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run format     # Prettier
```

## Arbeitsweise
Iterativ in Meilensteinen (siehe `docs/BACKLOG.md`). Bei echten Produkt-/Design-Entscheidungen kurz nachfragen statt raten.

**Pflicht-Rhythmus nach JEDEM Meilenstein (M-Abschnitt):**
1. **Pause** — nicht ungefragt in den nächsten Meilenstein starten.
2. **Doku-Überarbeitung** — `docs/STATUS.md`, `docs/BACKLOG.md` (Häkchen), `docs/LESSONS_LEARNED.md` aktualisieren; README bei Bedarf.
3. **Code-Review** — `/code-review` über den Meilenstein-Diff laufen lassen, kritische Findings beheben (Qualitäts-Gate danach erneut grün).
4. Committen + pushen, dann auf Freigabe für den nächsten Meilenstein warten.
