"""Interaktions-Test: Fang-Loop (Halten -> Loslassen -> Hit -> Reel -> Respawn).

Braucht einen laufenden DEV-Server (window.__qc exponiert bus/rod/ducks).
Treibt echte Pointer-Events und prueft: mind. 1 Treffer, Becken bleibt voll
(8 Enten), keine Konsolen-/Page-Errors. Zielt das Loslassen ins Window-Zentrum
(~Perfect) -> meist perfect=true.

Nutzung (DEV-Server muss laufen):
    python scripts/catch_test.py [URL]
"""

import json
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(URL, wait_until="networkidle")
    page.wait_for_function(
        "() => window.__qc && window.__qc.rod && window.__qc.bus && window.__qc.state"
        " && window.__qc.camera",
        timeout=10000,
    )
    page.evaluate(
        """() => {
          window.__ev = { results: [], landed: [], rewards: [], economy: [] };
          window.__qc.bus.on('hook:result', r => window.__ev.results.push(r));
          window.__qc.bus.on('duck:landed', d => window.__ev.landed.push(d));
          window.__qc.bus.on('reward:granted', r => window.__ev.rewards.push(r));
          window.__qc.bus.on('economy:changed', e => window.__ev.economy.push(e));
        }"""
    )
    # M3: Spiel startet im Start-Screen — Runde aktivieren (Phase-Gate fürs Fischen).
    page.evaluate("() => window.__qc.state.start()")

    # M4.6: Direktes Fadenkreuz — Fang-Strahl geht durch die Zeigerposition.
    # Eine lebende Ente live auf den Screen projizieren (via __qc.camera) und die
    # Maus exakt dorthin bewegen (statt fixer Koords).
    # Zentralste, fangbare Ente (in Reichweite ab Haken-Anker) auf Pixel projizieren.
    def duck_pixel():
        return page.evaluate(
            """() => {
              const cam = window.__qc.camera;
              const V3 = cam.position.constructor;  // THREE.Vector3 ohne globalen Import
              const w = window.innerWidth, h = window.innerHeight;
              // Reichweite ab Haken-Anker (wie HookRaycaster) — nur fangbare Enten waehlen.
              const anchor = cam.localToWorld(new V3(0.04, -0.3, -1.73));
              const reach2 = 3.2 * 3.2;
              let best = null, bestScore = Infinity;
              for (const d of window.__qc.ducks.ducks) {
                if (!d.alive) continue;
                const dx = d.worldX - anchor.x, dy = d.worldY - anchor.y, dz = d.worldZ - anchor.z;
                if (dx * dx + dy * dy + dz * dz > reach2) continue;
                const ndc = new V3(d.worldX, d.worldY, d.worldZ).project(cam);
                if (ndc.z >= 1 || Math.abs(ndc.x) > 0.95 || Math.abs(ndc.y) > 0.95) continue;
                const score = Math.abs(ndc.x) + Math.abs(ndc.y);  // zentralste bevorzugen
                if (score < bestScore) { bestScore = score; best = ndc; }
              }
              if (!best) return null;
              return { x: (best.x * 0.5 + 0.5) * w, y: (0.5 - best.y * 0.5) * h };
            }"""
        )

    hits = 0
    for _ in range(40):
        px = duck_pixel()
        if not px:
            page.wait_for_timeout(120)
            continue
        page.mouse.move(px["x"], px["y"])
        # Warten, bis eine Ente unter dem Fadenkreuz fangbar ist (gruenes Fadenkreuz).
        try:
            page.wait_for_function(
                "() => window.__qc.rod.getView().hasTarget === true", timeout=2000
            )
        except Exception:
            continue
        page.mouse.down()
        # Cast (220 ms) + ~100 ms ins Window -> Loslassen im Fenster (Hit). Zwischen
        # down und up KEINE evaluate-Roundtrips: das Window (280 ms) wuerde sonst
        # ablaufen. Die Ente driftet in ~320 ms nur ~0.26 u (< catchRadius 0.45),
        # bleibt also unter dem ruhenden Fadenkreuz fangbar (Lock-bei-Release).
        page.wait_for_timeout(320)
        page.mouse.up()
        # Reel (600 ms) + Cooldown (250 ms) abklingen lassen.
        page.wait_for_timeout(1000)
        hits = sum(1 for r in page.evaluate("() => window.__ev.results") if r["hit"])
        if hits >= 1:
            break

    state = page.evaluate(
        """() => ({
          duckCount: window.__qc.ducks.ducks.length,
          aliveCount: window.__qc.ducks.ducks.filter(d => d.alive).length,
          tokens: window.__qc.economy.getTokens(),
          phase: window.__qc.state.getPhase(),
        })"""
    )
    ev = page.evaluate("() => window.__ev")
    browser.close()

results = ev["results"]
hits = sum(1 for r in results if r["hit"])
perfects = sum(1 for r in results if r["hit"] and r.get("perfect"))
rewards = ev["rewards"]
# M3: ein Treffer -> Belohnung (Tokens) + Pause (Tipp-Modal).
ok = (
    hits >= 1
    and state["duckCount"] == 8
    and len(rewards) >= 1
    and state["tokens"] > 0
    and state["phase"] == "paused"
    and not errors
)
print(
    json.dumps(
        {
            "ok": ok,
            "hits": hits,
            "perfects": perfects,
            "total_attempts_resolved": len(results),
            "landed": len(ev["landed"]),
            "rewards": len(rewards),
            "tokens": state["tokens"],
            "phase_after_catch": state["phase"],
            "duckCount": state["duckCount"],
            "aliveCount_after_settle": state["aliveCount"],
            "errors": errors,
        },
        indent=2,
    )
)
sys.exit(0 if ok else 1)
