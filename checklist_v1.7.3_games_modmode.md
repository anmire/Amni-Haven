# v1.7.3 Checklist — Game Fixes + Mod Mode

## Game Black Box Fixes
- [x] server.js: Add `https://unpkg.com` to CSP scriptSrc, connectSrc, workerSrc for Ruffle
- [x] games.js `_loadFlashGame`: Add 15s timeout, better error messages, robust Ruffle detection
- [x] games.js `_loadEmulator`: Reset container CSS (remove flex centering) before EmulatorJS init
- [x] style.css: Fix game-container CSS — remove flex centering that interferes with Ruffle/EmulatorJS rendering
- [x] style.css: Game-together-panel z-index raised, game-controls sticky bottom

## Mod Mode Feature
- [x] app.html: Wrap sidebar sections in `[data-mod-id]` draggable wrappers
- [x] app.html: Add mod-mode toggle button to sidebar bottom bar
- [x] modmode.js: Create ModMode class with HTML5 DnD, localStorage persistence
- [x] app.js: Integrate ModMode init + layout application on load
- [x] style.css: Mod-mode visual styles (drag handles, active indicators, drop zones)

## Docs & Finalization
- [x] package.json: Bump to v1.7.3
- [x] CHANGELOG.md: v1.7.3 entry
- [x] ARCHITECTURE.md: Update for modmode.js + game fixes
- [x] Lint / syntax check
