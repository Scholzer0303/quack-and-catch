import type { Tip } from '../types/domain';

/**
 * Tipp-Codex: echte, faktisch geprüfte Tipps zu Claude & Claude Code (Lernapp).
 * Eigener Wortlaut auf Basis der offiziellen Docs. Tier = Schwierigkeit
 * (Common=Basics … Legendary=Expert). M3-Startset (~12, ≥1 pro Tier);
 * Ausbau auf ~50–60 in M5. Stabile `id` (Economy keyt darauf).
 */
export const TIPS: readonly Tip[] = [
  // ---------- Common (Basics) ----------
  {
    id: 'tip_clear_context',
    tier: 'common',
    kategorie: 'Kontext & Effizienz',
    titel: 'Kontext zurücksetzen mit /clear',
    text: 'Tippe /clear, um den Gesprächsverlauf zu leeren und Kontext freizugeben. Zwischen unabhängigen Aufgaben hält das Claude fokussiert und spart Tokens.',
  },
  {
    id: 'tip_claude_md',
    tier: 'common',
    kategorie: 'Projekt-Setup & CLAUDE.md',
    titel: 'CLAUDE.md als Projektgedächtnis',
    text: 'Eine CLAUDE.md im Projekt-Root wird zu Beginn jeder Session automatisch geladen. Lege dort Regeln, Befehle und Konventionen ab — Claude befolgt sie, ohne dass du sie erneut erklärst.',
  },
  {
    id: 'tip_help_command',
    tier: 'common',
    kategorie: 'Grundlagen & Einstieg',
    titel: 'Befehle entdecken mit /help',
    text: 'Mit /help siehst du alle verfügbaren Slash-Commands und Tastenkürzel. Ein schneller Weg, den Funktionsumfang kennenzulernen.',
  },
  // ---------- Uncommon ----------
  {
    id: 'tip_plan_mode',
    tier: 'uncommon',
    kategorie: 'Workflows & Qualität',
    titel: 'Erst planen, dann bauen',
    text: 'Im Plan-Modus recherchiert Claude und schlägt einen Plan vor, ohne Dateien zu ändern, bis du zustimmst. Mit Shift+Tab schaltest du zwischen den Modi um.',
  },
  {
    id: 'tip_compact',
    tier: 'uncommon',
    kategorie: 'Kontext & Effizienz',
    titel: 'Verlauf verdichten mit /compact',
    text: 'Wird der Kontext voll, fasst /compact den bisherigen Verlauf zusammen und behält das Wichtige — du arbeitest weiter, ohne neu zu starten.',
  },
  {
    id: 'tip_init',
    tier: 'uncommon',
    kategorie: 'Projekt-Setup & CLAUDE.md',
    titel: 'Projektstart mit /init',
    text: 'Mit /init analysiert Claude dein Projekt und erstellt eine erste CLAUDE.md mit Überblick, Struktur und Befehlen — eine gute Basis zum Verfeinern.',
  },
  // ---------- Rare ----------
  {
    id: 'tip_subagents',
    tier: 'rare',
    kategorie: 'Memory & Agentic OS',
    titel: 'Subagents für Teilaufgaben',
    text: 'Claude kann spezialisierte Subagents starten, die Teilaufgaben in eigenem Kontext erledigen — ideal für parallele Recherche oder fokussierte Suchen, ohne den Hauptkontext zu fluten.',
  },
  {
    id: 'tip_mcp',
    tier: 'rare',
    kategorie: 'MCP & Integrationen',
    titel: 'Externe Tools über MCP',
    text: 'Das Model Context Protocol (MCP) verbindet Claude über eine einheitliche Schnittstelle mit externen Servern — etwa GitHub, Datenbanken oder eigenen Werkzeugen.',
  },
  // ---------- Epic ----------
  {
    id: 'tip_hooks',
    tier: 'epic',
    kategorie: 'Memory & Agentic OS',
    titel: 'Automatisieren mit Hooks',
    text: 'Hooks führen bei Ereignissen wie PreToolUse oder PostToolUse eigene Shell-Befehle aus — z. B. Linter oder Tests nach jeder Änderung. Konfiguriert wird das in der settings.json.',
  },
  {
    id: 'tip_tdd',
    tier: 'epic',
    kategorie: 'Workflows & Qualität',
    titel: 'Test-Driven mit Claude',
    text: 'Lass zuerst einen fehlschlagenden Test schreiben, dann den Code, bis er grün ist. Das gibt Claude ein klares, prüfbares Ziel und beugt Überengineering vor.',
  },
  // ---------- Legendary (Expert) ----------
  {
    id: 'tip_thinking_budget',
    tier: 'legendary',
    kategorie: 'Prompting-Meisterschaft',
    titel: 'Mehr Denk-Budget anfordern',
    text: 'Auslöser wie „think", „think hard" oder „ultrathink" geben Claude mehr Denk-Budget für komplexe Probleme — stärkere Begriffe bedeuten mehr Spielraum zum Nachdenken.',
  },
  {
    id: 'tip_headless',
    tier: 'legendary',
    kategorie: 'Pro / Business / Skalierung',
    titel: 'Claude Code im Headless-Modus',
    text: 'Mit `claude -p "…"` läuft Claude Code nicht-interaktiv und gibt das Ergebnis direkt aus — ideal für Skripte, Pipelines und CI-Automatisierung.',
  },
];
