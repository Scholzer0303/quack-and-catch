# STATUS — Quack & Catch

> Schnellüberblick für den Session-Start. Wird nach jedem Meilenstein aktualisiert.

**Stand:** 2026-06-21
**Aktueller Meilenstein:** M0 ✅ abgeschlossen → als Nächstes M1
**Letzter Build:** grün (typecheck/lint/build/preview ✓; dist/ mit relativen Pfaden)
**Live-URL:** _(folgt nach MVP, M4.5 — Vercel)_
**Repo:** https://github.com/Scholzer0303/quack-and-catch

## ✅ Erledigt
- Git initialisiert (`main`), erstes Commit, Repo `Scholzer0303/quack-and-catch` (öffentlich) angelegt, `origin` gesetzt + Verbindungstest-Push erfolgreich.
- Projekt-`CLAUDE.md` mit Push-Regeln + Session-Routine.
- Planungsdokumente angelegt (STATUS, BACKLOG, DESIGN, LESSONS_LEARNED).

## 🔧 In Arbeit
- M1 — First-Person-Szene (Start): Renderer/Scene/CameraRig, GameLoop.

## ⏭️ Als Nächstes
- M1 fertigstellen: Stand, ovales Wasserbecken + animiertes Wasser, 8 rotierende Enten (InstancedMesh), Angel/Haken im Vordergrund.

## 📌 Offene Punkte / Entscheidungen
- Keine offenen Blocker. Codex-Inhalt: eigene, geprüfte Karten (~50–60), siehe DESIGN.md.

## Verifikations-Checkliste (Definition of Done je Meilenstein)
- [ ] `npm run typecheck` grün
- [ ] `npm run lint` grün
- [ ] `npm run build` + `npm run preview` fehlerfrei
- [ ] Browser: null Konsolenfehler, ~60 fps, Desktop + Mobile
- [ ] committet + zu `origin` gepusht, STATUS aktualisiert
