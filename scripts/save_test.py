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
    """Treibt den Fang-Loop bis zum ersten Treffer (analog catch_test.py)."""
    page.evaluate("() => window.__qc.state.start()")
    cx, cy = 640, 655
    for _ in range(40):
        page.mouse.move(cx, cy)
        try:
            page.wait_for_function(
                "() => window.__qc.rod.getView().hasTarget === true", timeout=4000
            )
        except Exception:
            continue
        page.mouse.down()
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
        "() => window.__qc && window.__qc.save && window.__qc.economy && window.__qc.rod",
        timeout=10000,
    )

    caught = catch_one(page)
    before = page.evaluate(
        """() => ({
          tokens: window.__qc.economy.getTokens(),
          unlocked: window.__qc.economy.unlockedCount(),
        })"""
    )
    # Save explizit flushen (statt auf den Debounce zu warten), dann neu laden.
    page.evaluate("() => window.__qc.save.flush()")

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
        tok = page.evaluate("() => window.__qc.economy.getTokens()")
        corrupt_results.append(tok)
        if tok != 0:
            corruption_ok = False

    browser.close()

ok = persisted and corruption_ok and not errors
print(
    json.dumps(
        {
            "ok": ok,
            "caught": caught,
            "tokens_before_reload": before["tokens"],
            "tokens_after_reload": after["tokens"],
            "unlocked_before": before["unlocked"],
            "unlocked_after": after["unlocked"],
            "corrupt_tokens_each_case": corrupt_results,  # erwartet: [0, 0, 0]
            "errors": errors,
        },
        indent=2,
    )
)
sys.exit(0 if ok else 1)
