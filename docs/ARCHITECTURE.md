# Amni-Haven Architecture Map
## v1.6.0 (Cross-Server Ping + UI Fixes + Mobile Optimization)
### Server-Side
- `server.js` (~640 lines) — Express + Socket.IO + HTTPS/SSL, file uploads, GIF proxy (Giphy), Spotify OAuth routes (auth-url, callback, token, status, unlink), link preview, rate limiting, auto-cleanup, PixelCipher banner, tunnel auto-start, bot routes, CSP, `/api/health` (returns online user list), `/api/ping` POST endpoint (cross-server ping delivery)
- `src/auth.js` (212 lines) — bcrypt auth, JWT, rate limiter, register/login, whitelist check
- `src/database.js` (~220 lines) — better-sqlite3, schema includes `spotify_tokens` table (user_id, access_token, refresh_token, expires_at, product, display_name)
- `src/socketHandlers.js` (~1680 lines) — all socket events: channels, messages, voice WebRTC, reactions, mentions, admin moderation, settings, search, slash commands, blocks, DMs, private calls, bot handlers, listen-together, webhooks
- `src/pixelCipher.js` (~170 lines) — PixelCipher-256-CBC: AES-like cipher, 14 rounds, 256-bit key
- `src/tunnel.js` (~60 lines) — secure tunneling via localtunnel or cloudflared
- `src/botApi.js` (~90 lines) — REST API + socket handlers for bot/webhook CRUD
- `src/paths.js` — data directory resolution
### Client-Side
- `public/app.html` (~760 lines) — main SPA shell, modals, sidebar (channels+DMs), message area, theme selector (25 themes), GIF picker, noise suppression LED, listen-together panel, screen share collapse, bottom voice toolbar (`#voice-toolbar`), header-actions (search+toggles only); branding: ◆ AMNI sidebar brand, "Welcome to Amni-Haven" welcome screen
- `public/index.html` (~165 lines) — login/register page, EULA modal, Amni-Haven branding (◆ logo, tagline), theme bar (25 themes)
- `public/js/app.js` (~3700 lines) — HavenApp class: chat, UI, GIF picker, reactions, mentions, search, admin, DMs, blocks, private calls, noise suppression LED, screen-share collapse + fix, listen-together with Spotify SDK, resizable sidebars (`_setupSidebarResize`), voice toolbar visibility (`_updateToolbarVisibility`), cross-server ping UI (`_showServerPingMenu`, `cross-server-ping` listener)
- `public/js/spotify.js` (~110 lines) — SpotifyPlayer class: Web Playback SDK wrapper, OAuth token management, play/pause/seek/volume, state callbacks, URI converter
- `public/js/voice.js` (~640 lines) — VoiceManager: WebRTC P2P, screen share (fixed stop-sharing callback + correct userId tile cleanup), volume, talking indicators, noise suppression
- `public/js/notifications.js` (~155 lines) — NotificationManager: 10 synthesized tones via Web Audio API
- `public/js/theme.js` (~198 lines) — theme switcher with server persistence, RGB cycling, custom palette (default fallback: amni)
- `public/js/theme-init.js` (5 lines) — FOUC prevention
- `public/js/triangle-morph.js` (~120 lines) — TriangleMorph class with barycentric coordinate triangles
- `public/js/tutorial.js` (~120 lines) — interactive 11-step tutorial
- `public/js/servers.js` (~100 lines) — multi-server sidebar manager, statusCache with online users, `sendPing()` cross-server ping POST
- `public/js/games.js` — Game Together (EmulatorJS) controller/lobby management
- `public/js/auth.js` — login/register page logic, auto-login for localhost
- `public/css/themes.css` (~1317 lines) — all theme variable definitions: Amni default (teal/cyan `:root` + glassmorphism vars: `--glass-bg/blur/border/shadow`, `--glow-sm/md/lg`, `--input-glow`, `--depth-1/2/3`), Haven, Discord, Matrix, Tron, HALO, LoTR, Cyberpunk, Nord, Dracula, Bloodborne, Ice, Abyss, Dark Souls, Elden Ring, Minecraft, FFX, Zelda, Triangle + 3 retro themes (Win95, WinXP, Win7) + 3 light themes (Light, Solarized Light, Sakura) + per-theme component overrides
- `public/css/style.css` (~3785 lines) — layout, reset, components, responsive, glassmorphism, micro-interactions, floating message input, accent glow, pill controls, Spotify SDK player, screen-collapsed, noise LED, triangle morph, tutorial overlay, theme-group-label, resizable sidebar handles, voice toolbar (glassmorphic bottom bar), game/listen panel overflow constraints, mobile breakpoint optimizations (768px/480px/360px)
### Docs
- `docs/ARCHITECTURE.md` — this file
- `docs/GUIDE.md` — setup/usage guide
- `docs/SECURITY_AUDIT.md` — security review
- `docs/GAME_FEATURE_DESIGN.md` — game feature design doc
- `docs/checklist_*.md` — completed task checklists
### Dependencies
- express, socket.io, better-sqlite3, bcryptjs, jsonwebtoken, multer, helmet, dotenv
### New in v1.6.0
- Cross-server ping: right-click server icon → see online users → send ping; `/api/ping` POST + enhanced `/api/health` with user list; `cross-server-ping` socket event; 8-second toast notification with mention sound
- Screen share bug fix: `stopScreenShare()` passes correct userId for tile cleanup, `onScreenShareStopped` callback resets button state, `_hideScreenShare()` no longer re-starts sharing
- ROM/game overflow fix: `max-height` + `overflow-y: auto` on game-together-panel (60vh), game-container (50vh), listen-together-panel (50vh)
- Resizable sidebars: CSS drag handles (5px, col-resize), JS mouse/touch drag, min/max bounds (left 160-400px, right 140-360px), localStorage persistence (`haven_left_width`, `haven_right_width`), `.resizing` class disables transitions
- Bottom voice toolbar: 8 voice buttons moved from header to `#voice-toolbar` between app-body and status-bar; auto-show/hide via `_updateToolbarVisibility()`; glassmorphism bg + border-top
- Mobile optimization: panel constraints at 768px/480px/360px breakpoints; voice toolbar compact mode; sidebar resize handles hidden on mobile; `.main` overflow hidden
### New in v1.5.1
- 3 retro Windows themes: Win95 (3D inset/outset borders, teal desktop, MS Sans Serif, 0px radius), WinXP (Luna blue sidebar, beige panels, Tahoma, XP-style gradients), Win7 (Aero glass, backdrop-filter blur(20px), frosted panels, Segoe UI)
- Retro theme group label + buttons in app.html and index.html
- Light theme overhaul: gradient brand text (blue→purple), purple secondary accent, 12px radius, glassmorphism vars, gradient backgrounds, floating shadows
- Win95/XP disable glassmorphism (`--glass-blur: 0px`, no glow); Win7 uses full glassmorphism for Aero glass
### New in v1.5.0
- Glassmorphism system: translucent backdrop-filter blur panels on sidebar, header, right sidebar, server bar, status bar, message input, modals, toasts, context menu (10 components)
- CSS variable system: `--glass-bg`, `--glass-blur`, `--glass-border`, `--glass-shadow`, `--glow-sm/md/lg`, `--input-glow`, `--depth-1/2/3` in Amni `:root` theme
- Layout compacted ~20-30%: sidebar 230px, right sidebar 200px, server bar 50px, header 44px, status bar 24px, avatars 32px
- Floating message input: elevated glassmorphic card with margin inset, accent glow on focus-within
- Micro-interactions: spring cubic-bezier transitions, scale() hovers, welcomeFloat/badgePulse/modalSlideIn animations
- Pill-shaped controls: voice buttons (20px radius), send/upload/emoji (50% radius), toasts (20px radius)
- Accent glow effects on all interactive elements (buttons, inputs, active channels, server icons)
- Brand updated: ◆ AMNI sidebar, "Welcome to Amni-Haven" welcome screen, Amni modal text
- Responsive breakpoints adjusted for new compact sizes
### New in v1.4.0
- Amni default theme: teal/cyan #22d3ee accent, Inter font, 10px radius, JetBrains Mono for code
- 3 light themes: Light (clean blue), Solarized Light (warm parchment), Sakura (pink pastel)
- CSS split: monolithic style.css → themes.css (variables) + style.css (layout/components)
- Branding: ◆ logo, AMNI-HAVEN heading, "your server · your arcade · your rules" tagline
- Root directory cleaned: docs moved into docs/ folder
- Theme group labels (Dark/Light/Dynamic) in sidebar selector
