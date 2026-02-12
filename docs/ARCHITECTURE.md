# Amni-Haven Architecture Map
## v1.4.0 (UI Overhaul + Light Themes)
### Server-Side
- `server.js` (~600 lines) — Express + Socket.IO + HTTPS/SSL, file uploads, GIF proxy (Giphy), Spotify OAuth routes (auth-url, callback, token, status, unlink), link preview, rate limiting, auto-cleanup, PixelCipher banner, tunnel auto-start, bot routes, CSP (script-src Spotify SDK + EmulatorJS, connect-src Spotify API/WebSocket)
- `src/auth.js` (212 lines) — bcrypt auth, JWT, rate limiter, register/login, whitelist check
- `src/database.js` (~220 lines) — better-sqlite3, schema includes `spotify_tokens` table (user_id, access_token, refresh_token, expires_at, product, display_name)
- `src/socketHandlers.js` (~1680 lines) — all socket events: channels, messages, voice WebRTC, reactions, mentions, admin moderation, settings, search, slash commands, blocks, DMs, private calls, bot handlers, listen-together, webhooks
- `src/pixelCipher.js` (~170 lines) — PixelCipher-256-CBC: AES-like cipher, 14 rounds, 256-bit key
- `src/tunnel.js` (~60 lines) — secure tunneling via localtunnel or cloudflared
- `src/botApi.js` (~90 lines) — REST API + socket handlers for bot/webhook CRUD
- `src/paths.js` — data directory resolution
### Client-Side
- `public/app.html` (~770 lines) — main SPA shell, modals, sidebar (channels+DMs), message area, theme selector (22 themes: 19 dark + 3 light + RGB + custom), GIF picker (Giphy-only), noise suppression with LED, listen-together panel with Spotify SDK player UI, screen share collapse toggle
- `public/index.html` (~160 lines) — login/register page, EULA modal, Amni-Haven branding (◆ logo, tagline), theme bar (22 themes)
- `public/js/app.js` (~3300 lines) — HavenApp class: chat, UI, GIF picker, reactions, mentions, search, admin, DMs, blocks, private calls, noise suppression LED, screen-share collapse, listen-together with Spotify SDK integration
- `public/js/spotify.js` (~110 lines) — SpotifyPlayer class: Web Playback SDK wrapper, OAuth token management, play/pause/seek/volume, state callbacks, URI converter
- `public/js/voice.js` (~640 lines) — VoiceManager: WebRTC P2P, screen share, volume, talking indicators, noise suppression
- `public/js/notifications.js` (~155 lines) — NotificationManager: 10 synthesized tones via Web Audio API
- `public/js/theme.js` (~198 lines) — theme switcher with server persistence, RGB cycling, custom palette (default fallback: amni)
- `public/js/theme-init.js` (5 lines) — FOUC prevention
- `public/js/triangle-morph.js` (~120 lines) — TriangleMorph class with barycentric coordinate triangles
- `public/js/tutorial.js` (~120 lines) — interactive 11-step tutorial
- `public/js/servers.js` (81 lines) — multi-server sidebar manager
- `public/js/games.js` — Game Together (EmulatorJS) controller/lobby management
- `public/js/auth.js` — login/register page logic, auto-login for localhost
- `public/css/themes.css` (~960 lines) — all theme variable definitions: Amni default (teal/cyan `:root`), Haven, Discord, Matrix, Tron, HALO, LoTR, Cyberpunk, Nord, Dracula, Bloodborne, Ice, Abyss, Dark Souls, Elden Ring, Minecraft, FFX, Zelda, Triangle + 3 light themes (Light, Solarized Light, Sakura) + per-theme component overrides
- `public/css/style.css` (~3720 lines) — layout, reset, components, responsive, Spotify SDK player styles, screen-collapsed states, noise LED, triangle morph panel, tutorial overlay, theme-group-label styling
### Docs
- `docs/ARCHITECTURE.md` — this file
- `docs/GUIDE.md` — setup/usage guide
- `docs/SECURITY_AUDIT.md` — security review
- `docs/GAME_FEATURE_DESIGN.md` — game feature design doc
- `docs/checklist_*.md` — completed task checklists
### Dependencies
- express, socket.io, better-sqlite3, bcryptjs, jsonwebtoken, multer, helmet, dotenv
### New in v1.4.0
- Amni default theme: teal/cyan #22d3ee accent, Inter font, 10px radius, JetBrains Mono for code
- 3 light themes: Light (clean blue), Solarized Light (warm parchment), Sakura (pink pastel)
- CSS split: monolithic style.css → themes.css (variables) + style.css (layout/components)
- Branding: ◆ logo, AMNI-HAVEN heading, "your server · your arcade · your rules" tagline
- Root directory cleaned: docs moved into docs/ folder
- Theme group labels (Dark/Light/Dynamic) in sidebar selector
