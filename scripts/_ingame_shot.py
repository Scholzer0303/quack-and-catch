"""Einmal-Screenshot der lebenden Welt IN-GAME (Start-Screen weg).

Startet die Runde via __qc.state.start(), wartet kurz und schießt einen
Screenshot der Szene (ohne Start-Modal). Nur zur Sichtprüfung der Optik;
wird nicht eingecheckt. Braucht laufenden DEV-Server.

Nutzung: python scripts/_ingame_shot.py [URL]
"""

import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto(URL, wait_until="networkidle")
    page.wait_for_function("() => window.__qc && window.__qc.state", timeout=10000)
    page.evaluate("() => window.__qc.state.start()")
    page.wait_for_timeout(600)
    page.screenshot(path="ingame_screenshot.png")
    browser.close()
print("ingame_screenshot.png")
