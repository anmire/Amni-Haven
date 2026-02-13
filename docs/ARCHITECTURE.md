# Amni-Haven Architecture Map
## v1.7.4 (Distributable EXE + Setup Wizard + Donate)
### Server-Side
- `server.js` (~660 lines) — Express + Socket.IO + HTTPS/SSL, file uploads, GIF proxy (Giphy), Spotify OAuth routes (auth-url, callback, token, status, unlink), link preview, rate limiting, auto-cleanup, PixelCipher banner, tunnel auto-start, bot routes, CSP (includes unpkg.com for Ruffle, cdn.emulatorjs.org for EmulatorJS, sdk.scdn.co for Spotify), `/api/health` (returns online user list), `/api/ping` POST endpoint (cross-server ping delivery), COOP/COEP headers for /games route, setupWizard integration (routes + middleware redirect until first-run complete)
- `src/auth.js` (212 lines) — bcrypt auth, JWT, rate limiter, register/login, whitelist check
- `src/database.js` (~220 lines) — better-sqlite3, schema includes `spotify_tokens` table (user_id, access_token, refresh_token, expires_at, product, display_name)
- `src/socketHandlers.js` (~1680 lines) — all socket events: channels, messages, voice WebRTC, reactions, mentions, admin moderation, settings, search, slash commands, blocks, DMs, private calls, bot handlers, listen-together, webhooks, globalOnline Map + emitGlobalOnlineCount
- `src/pixelCipher.js` (~170 lines) — PixelCipher-256-CBC: AES-like cipher, 14 rounds, 256-bit key
- `src/tunnel.js` (~60 lines) — secure tunneling via localtunnel or cloudflared
- `src/botApi.js` (~90 lines) — REST API + socket handlers for bot/webhook CRUD
- `src/paths.js` — data directory resolution (%APPDATA%\Haven or ~/.haven)
- `src/setupWizard.js` (~150 lines) — web-based first-run wizard: 4 steps (Server Identity, Network & Access, Features, Review & Launch); generates .env, auto-generates SSL certs via openssl, .setup-complete flag gating; exports setupWizardRoutes(app), wizardMiddleware, isFirstRun(), markComplete(), getLocalIPs()
### Build & Distribution
- `build-exe.bat` — compiles Haven into standalone AmniHaven.exe via @yao-pkg/pkg (node18-win-x64, GZip); bundles public/src/config, copies better-sqlite3 native binding; fallback to portable launcher .bat
### Client-Side
- `public/app.html` (~803 lines) — main SPA shell, modals, left sidebar (channels+DMs+presence+voice users (collapsible)+voice/listen/games buttons+bottom bar (messages/mod-mode/donate/online/settings gear)), sidebar-mod-container with data-mod-id attributes for drag-drop reordering, NO right sidebar, voice toolbar (mute/deafen/share/filter/leave), status bar with clickable online overlay popup, Ruffle.js CDN for Flash games, settings modal includes theme selector + layout/mod-mode section; branding: ◆ AMNI sidebar brand
- `public/index.html` (~165 lines) — login/register page, EULA modal, Amni-Haven branding (◆ logo, tagline), theme bar (25 themes)
- `public/js/app.js` (~3720 lines) — HavenApp class: chat, UI, GIF picker, reactions, mentions, search, admin, DMs, blocks, private calls, noise suppression LED, screen-share collapse + fix, listen-together with Spotify SDK, resizable left sidebar only, voice toolbar visibility, cross-server ping UI, online overlay popup, sidebar voice/listen/games buttons, collapsible sections, messages bubble in sidebar bottom bar, sidebar-bottom-online-count sync from global-online-count, ModMode integration (init + settings toggle)
- `public/js/spotify.js` (~110 lines) — SpotifyPlayer class: Web Playback SDK wrapper, OAuth token management
- `public/js/voice.js` (~640 lines) — VoiceManager: WebRTC P2P, screen share, volume, talking indicators, noise suppression
- `public/js/notifications.js` (~155 lines) — NotificationManager: 10 synthesized tones via Web Audio API
- `public/js/theme.js` (~198 lines) — theme switcher with server persistence, RGB cycling, custom palette (default fallback: amni)
- `public/js/theme-init.js` (5 lines) — FOUC prevention
- `public/js/triangle-morph.js` (~120 lines) — TriangleMorph class with barycentric coordinate triangles
- `public/js/tutorial.js` (~120 lines) — interactive tutorial (voice section + bottom bar steps, no right sidebar)
- `public/js/servers.js` (~100 lines) — multi-server sidebar manager, statusCache with online users
- `public/js/games.js` (~573 lines) — GameManager: HTML5_GAMES (5 canvas games), FLASH_GAMES (8 SWF games via Ruffle), EmulatorJS ROM loader; _loadFlashGame with 15s Ruffle timeout, container CSS reset before game init, cleanup restores defaults
- `public/js/modmode.js` (~115 lines) — ModMode class: HTML5 DnD sidebar section reordering, localStorage layout persistence, visual drag indicators, toast notifications, apply/reset layout
- `public/js/auth.js` — login/register page logic, auto-login for localhost
- `public/css/themes.css` (~1340 lines) — all theme variable definitions (27+ themes, no right-sidebar theme overrides)
- `public/css/style.css` (~3920 lines) — layout (two-panel: sidebar+main, no right sidebar), reset, components, responsive, glassmorphism, sidebar-bottom-bar + sidebar-bottom-btn + donate-btn (pink heart, hover glow) + sidebar-bottom-online, sidebar-mod-container + mod-mode styles (drag indicators, drop zones, toast), theme-selector-settings in modal, voice-sidebar-section, game-container position:relative (no flex centering), game-controls sticky bottom, mobile breakpoints (left sidebar only)
### Games
- `public/games/roms/` — 8 Flash SWF files (Bubble Tanks 3, tanks, SSF2, SuperSmash, Learn to Fly variants, Flight)
- `public/games/bios/` — BIOS files for emulator cores (GBA, N64, SNES/GBC, PS1, PS2, GC)
- `public/games/library.json` — 36 console definitions for EmulatorJS
- `public/games/saves/` — emulator save states
### Scripts
- `scripts/screenshots.js` — Puppeteer-core screenshot generator (login, chat, wizard, theme variants)
### Docs
- `docs/ARCHITECTURE.md` — this file
- `docs/GUIDE.md` — setup/usage guide
- `docs/SECURITY_AUDIT.md` — security review
- `docs/GAME_FEATURE_DESIGN.md` — game feature design doc
- `docs/screenshots/` — auto-generated UI screenshots
- `docs/checklist_*.md` — completed task checklists
### Dependencies
- express, socket.io, better-sqlite3, bcryptjs, jsonwebtoken, multer, helmet, dotenv
- CDN: Ruffle.js (Flash emulation), EmulatorJS (retro ROM emulation), Spotify Web Playback SDK
- Build: @yao-pkg/pkg (EXE compilation), puppeteer-core (screenshots)
- CSS split: monolithic style.css → themes.css (variables) + style.css (layout/components)
- Branding: ◆ logo, AMNI-HAVEN heading, "your server · your arcade · your rules" tagline
