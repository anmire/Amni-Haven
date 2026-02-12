# Haven Architecture Map
## v1.3.3 (Bugfixes, Triangle Morph, Giphy-Only)
### Server-Side
- `server.js` (~530 lines) — Express + Socket.IO + HTTPS/SSL, file uploads, GIF proxy (Giphy only), link preview, rate limiting, auto-cleanup, PixelCipher banner, tunnel auto-start, bot routes, real IP display, auto-login, CSP (frame-src Spotify/YouTube/SoundCloud/Vimeo, script-src EmulatorJS CDN)
- `src/auth.js` (212 lines) — bcrypt auth, JWT, rate limiter, register/login, whitelist check
- `src/database.js` (~210 lines) — better-sqlite3, schema (users, channels+channel_type+parent_id, messages+is_bot+is_html, reactions+gif_url, bans, mutes, settings, preferences, high_scores, whitelist, pinned_messages, blocks, dm_channels, bots, private_calls, listen_sessions, channel_permissions)
- `src/socketHandlers.js` (~1680 lines) — all socket events: channels (typed, subchannels, permissions), messages, voice WebRTC, reactions, mentions, admin moderation, settings, search, slash commands, blocks, DMs, private calls, bot socket handlers, listen-together, webhooks
- `src/pixelCipher.js` (~170 lines) — PixelCipher-256-CBC: AES-like cipher, 14 rounds, 256-bit key
- `src/tunnel.js` (~60 lines) — secure tunneling via localtunnel or cloudflared
- `src/botApi.js` (~90 lines) — REST API + socket handlers for bot/webhook CRUD
- `src/paths.js` — data directory resolution
### Client-Side
- `public/app.html` (~642 lines) — main SPA shell, modals, sidebar (channels+DMs), message area, theme selector (13 themes + triangle morph panel), GIF picker (Giphy-only), noise suppression with LED, listen-together panel, screen share with collapse toggle
- `public/js/app.js` (~3211 lines) — HavenApp class: chat, UI, GIF picker (Giphy), reactions, mentions, search, admin, DMs, blocks, private calls, noise suppression LED toggle, screen-share collapse/expand, stop-streaming fix, listen-together
- `public/js/voice.js` (~640 lines) — VoiceManager: WebRTC P2P, screen share, volume, talking indicators, noise suppression
- `public/js/notifications.js` (~155 lines) — NotificationManager: 10 synthesized tones via Web Audio API
- `public/js/theme.js` (41 lines) — theme switcher with server persistence
- `public/js/theme-init.js` (5 lines) — FOUC prevention
- `public/js/triangle-morph.js` (~120 lines) — TriangleMorph class: SVG barycentric coordinate triangles, draggable point, CSS variable interpolation, two panels (Vibe: Serene/Fierce/Mystic, Era: Retro/Cyber/Organic), localStorage persistence
- `public/js/tutorial.js` (~120 lines) — interactive 11-step tutorial with getBoundingClientRect detection, viewport-clamped positioning, spotlight overlay
- `public/js/servers.js` (81 lines) — multi-server sidebar manager
- `public/js/games.js` — Game Together (EmulatorJS) controller/lobby management
- `public/js/auth.js` — login/register page logic, auto-login for localhost
- `public/css/style.css` (~3945 lines) — 13 themes (Triangle with morphism CSS), layout, responsive, screen-collapsed states, noise LED, triangle morph panel, tutorial overlay
### Dependencies
- express, socket.io, better-sqlite3, bcryptjs, jsonwebtoken, multer, helmet, dotenv
### New in v1.3.3
- Tutorial rewrite: robust element targeting with fallback selectors, viewport clamping
- Triangle Morphism Sliders: two ternary coordinate triangles (Vibe + Era) for real-time theme interpolation
- Giphy-only GIF provider (Tenor removed entirely)
- Screen share collapse/expand toggle (preserves streams)
- Stop streaming button fix (proper tile cleanup)
- Noise suppression LED on/off indicator
- CSP fix for Spotify iframes + EmulatorJS scripts
