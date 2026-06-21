"""Browser-Smoke-Test fuer Quack & Catch (Verifikations-Gate).

Startet KEINEN Server selbst — der Dev-/Preview-Server muss laufen
(Standard: http://localhost:5173). Prueft: Canvas vorhanden, 0 Konsolen-
fehler, 0 Page-Errors. Macht einen Screenshot zur Sichtkontrolle.

Nutzung (Server separat starten, dann):
    python scripts/smoke_test.py [URL]

Empfohlen ueber den webapp-testing-Helper (startet Server automatisch):
    python <skill>/scripts/with_server.py --server "npm run dev" --port 5173 \
        --timeout 60 -- python scripts/smoke_test.py

Voraussetzung: `pip install playwright` + `python -m playwright install chromium`.
"""

import json
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
SHOT = "smoke_screenshot.png"

console_errors = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))

    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(2500)
    canvas_count = page.locator("canvas").count()
    page.screenshot(path=SHOT)
    browser.close()

ok = canvas_count > 0 and not console_errors and not page_errors
print(json.dumps({
    "ok": ok,
    "canvas_count": canvas_count,
    "console_errors": console_errors,
    "page_errors": page_errors,
    "screenshot": SHOT,
}, indent=2))
sys.exit(0 if ok else 1)
