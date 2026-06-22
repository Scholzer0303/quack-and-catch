"""Persistenz-Test (M4): Fang -> Save -> Reload -> Stand bleibt; plus Korruptions-Test.

Braucht einen laufenden DEV-Server (window.__qc exponiert economy/save/state/rod/ducks).
Treibt einen echten Fang (Tokens > 0 + Tipp unlocked), flusht den Save, laedt die
Seite neu und prueft: Tokens + unlockedCount ueberleben den Reload. Danach wird ein
korrupter localStorage-Eintrag gesetzt und der saubere Default-Fallback geprueft
(kein Crash, kein Konsolenfehler, Tokens 0).

Nutzung (DEV-Server muss laufen):
    python scripts/save_test.py [URL]
"""

import json
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"


def catch_one(page):
    """Treibt den Fang-Loop bis zum ersten Treffer (analog catch_test.py).
    M4.6: Direktes Fadenkreuz — lebende Ente auf den Screen projizieren und die
    Maus dorthin bewegen (Fang-Strahl geht durch die Zeigerposition)."""
    page.evaluate("() => window.__qc.state.start()")

    def pick():
        return page.evaluate(
            """() => {
              const cam = window.__qc.camera;
              const V3 = cam.position.constructor;
              const w = window.innerWidth, h = window.innerHeight;
              let best = null, bestScore = Infinity;
              for (const d of window.__qc.ducks.ducks) {
                if (!d.alive) continue;
                const ndc = new V3(d.worldX, d.worldY, d.worldZ).project(cam);
                if (ndc.z >= 1 || Math.abs(ndc.x) > 0.95 || Math.abs(ndc.y) > 0.95) continue;
                const score = Math.abs(ndc.x) + Math.abs(ndc.y);
                if (score < bestScore) { bestScore = score; best = ndc; }
              }
              if (!best) return null;
              return { x: (best.x * 0.5 + 0.5) * w, y: (0.5 - best.y * 0.5) * h };
            }"""
        )

    for _ in range(40):
        px = pick()
        if not px:
            page.wait_for_timeout(120)
            continue
        page.mouse.move(px["x"], px["y"])
        try:
            page.wait_for_function(
                "() => window.__qc.rod.getView().hasTarget === true", timeout=2000
            )
        except Exception:
            continue
        page.mouse.down()
        # Raeumlicher Fang: halten bis der Haken im Wasser ist (dip>=arm), dann loslassen.
        page.wait_for_timeout(360)
        page.mouse.up()
        page.wait_for_timeout(1000)
        if page.evaluate("() => window.__qc.economy.getTokens()") > 0:
            return True
    return False


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
        "() => window.__qc && window.__qc.save && window.__qc.economy && window.__qc.rod"
        " && window.__qc.camera",
        timeout=10000,
    )

    caught = catch_one(page)
    before = page.evaluate(
        """() => ({
          tokens: window.__qc.economy.getTokens(),
          unlocked: window.__qc.economy.unlockedCount(),
        })"""
    )
    # Den ECHTEN Produktions-Persistenzpfad auslösen: das pagehide-Event feuert
    # (statt der internen save.flush()-API), genau wie beim Tab-Schließen.
    page.evaluate("() => window.dispatchEvent(new Event('pagehide'))")

    page.reload(wait_until="networkidle")
    page.wait_for_function(
        "() => window.__qc && window.__qc.economy", timeout=10000
    )
    after = page.evaluate(
        """() => ({
          tokens: window.__qc.economy.getTokens(),
          unlocked: window.__qc.economy.unlockedCount(),
        })"""
    )

    persisted = (
        caught
        and before["tokens"] > 0
        and after["tokens"] == before["tokens"]
        and after["unlocked"] == before["unlocked"]
    )

    # — Korruptions-Test: kaputtes JSON + falsche Version + falscher Typ —
    corrupt_cases = [
        "{not valid json",
        '{"schemaVersion":999,"tokens":42,"unlockedTips":[],"muted":false}',
        '{"schemaVersion":1,"tokens":"abc","unlockedTips":"x","muted":1}',
    ]
    corruption_ok = True
    corrupt_results = []
    for blob in corrupt_cases:
        page.evaluate(
            "(b) => localStorage.setItem('quack-and-catch:v1', b)", blob
        )
        page.reload(wait_until="networkidle")
        page.wait_for_function(
            "() => window.__qc && window.__qc.economy", timeout=10000
        )
        st = page.evaluate(
            """() => ({
              tokens: window.__qc.economy.getTokens(),
              unlocked: window.__qc.economy.unlockedCount(),
            })"""
        )
        corrupt_results.append(st)
        # Sauberer Default: weder Tokens noch Tipps aus korruptem Storage.
        if st["tokens"] != 0 or st["unlocked"] != 0:
            corruption_ok = False

    # — Teilkorruptions-Test: gueltige Version + gueltige Tokens, aber kaputte
    #   unlockedTips (String statt Array). Feldweise Reparatur MUSS die Tokens
    #   behalten und nur die Tipps auf [] zuruecksetzen.
    page.evaluate(
        """() => localStorage.setItem('quack-and-catch:v1',
          JSON.stringify({ schemaVersion: 1, tokens: 9, unlockedTips: 'x', muted: false }))"""
    )
    page.reload(wait_until="networkidle")
    page.wait_for_function("() => window.__qc && window.__qc.economy", timeout=10000)
    partial = page.evaluate(
        """() => ({
          tokens: window.__qc.economy.getTokens(),
          unlocked: window.__qc.economy.unlockedCount(),
        })"""
    )
    partial_ok = partial["tokens"] == 9 and partial["unlocked"] == 0

    browser.close()

ok = persisted and corruption_ok and partial_ok and not errors
print(
    json.dumps(
        {
            "ok": ok,
            "caught": caught,
            "tokens_before_reload": before["tokens"],
            "tokens_after_reload": after["tokens"],
            "unlocked_before": before["unlocked"],
            "unlocked_after": after["unlocked"],
            "corrupt_each_case": corrupt_results,  # erwartet: [{tokens:0,unlocked:0} ×3]
            "partial_repair": partial,  # erwartet: {tokens:9, unlocked:0}
            "errors": errors,
        },
        indent=2,
    )
)
sys.exit(0 if ok else 1)
