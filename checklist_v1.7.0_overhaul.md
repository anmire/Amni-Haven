# v1.7.0 Overhaul Checklist

## N64 Emulator Fix
- [x] Rewrite emulator loader with proper N64 core init (mupen64plus_next needs WebGL2 canvas + thread support)
- [x] Add N64-specific config: EJS_threads, EJS_multithreaded, fallback to parallel_n64
- [x] Add proper error messaging for unsupported browsers
- [x] Add COOP/COEP headers for /games route in server.js

## Flash/HTML5 Games
- [x] Create HTML5 game wrapper system in games.js
- [x] Add flash-style games: Tanks (local MP), Bubble Tanks, Snake, Tetris Battle, Asteroids, Breakout
- [x] Add game library entries for HTML5 games
- [x] Create game selector UI in the game panel (tabbed: Games / ROMs)

## UI: Overlay Create/Join Channel
- [x] Replace inline create-channel form with button that opens overlay modal
- [x] Replace inline join-channel input with button that opens overlay modal
- [x] Add modal HTML for both
- [x] Wire up JS for overlay open/close/submit
- [x] Update admin-controls references to create-channel-overlay-btn

## UI: Sidebar Presence & Collapsible Sections
- [x] Move user presence (online users) into left sidebar
- [x] Make theme section collapsible with toggle arrow
- [x] Make channel section collapsible with toggle arrow
- [x] Make DM section collapsible with toggle arrow
- [x] Make presence section collapsible with toggle arrow
- [x] Persist collapsed state in localStorage

## Messages Bubble Icon
- [x] Add messages bubble icon in header
- [x] Show unread count badge on bubble icon
- [x] Click opens DM list and expands sidebar if collapsed

## Themed Background Images
- [x] Add CSS ::after pseudo-element infrastructure for theme images
- [x] Create SVG artwork motifs for media themes:
  - [x] Matrix: green 0s and 1s rain
  - [x] Tron: light cycle perspective grid
  - [x] Halo: ring + spartan silhouette
  - [x] LoTR: One Ring inscription circle
  - [x] Cyberpunk: neon city skyline
  - [x] Dark Souls: bonfire
  - [x] Elden Ring: Erdtree
  - [x] Zelda: Triforce + Master Sword
  - [x] Bloodborne: hunter + moon
  - [x] Minecraft: block world
  - [x] FFX: pyreflies + water waves (Zanarkand)

## Docs & Changelog
- [x] Update CHANGELOG.md
- [x] Bump version to 1.7.0 in package.json
- [x] Bump CSS version to ?v=1.7.0
