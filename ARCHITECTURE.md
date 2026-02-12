# Haven Architecture Map
## v1.3.2 (Feature Complete)
### Server-Side
- `server.js` (~537 lines) — Express + Socket.IO + HTTPS/SSL, file uploads, GIF proxy (Tenor + Giphy), link preview, rate limiting, auto-cleanup, PixelCipher banner, tunnel auto-start, bot routes
- `src/auth.js` (212 lines) — bcrypt auth, JWT, rate limiter, register/login, whitelist check
- `src/database.js` (~190 lines) — better-sqlite3, schema (users, channels+channel_type, messages+is_bot, reactions+gif_url, bans, mutes, settings, preferences, high_scores, whitelist, pinned_messages, blocks, dm_channels, bots, private_calls)
- `src/socketHandlers.js` (~1650 lines) — all socket events: channels (typed), messages, voice WebRTC signaling, reactions (gif_url), mentions, admin moderation, settings (tunnel/giphy/noise), search, slash commands, blocks, DMs, private calls, bot socket handlers
- `src/pixelCipher.js` (~170 lines) — PixelCipher-256-CBC: AES-like cipher, 14 rounds, 256-bit key, key-dependent S-box, GF(2^8) multiply, CBC mode, PKCS7 padding
- `src/tunnel.js` (~60 lines) — secure tunneling via localtunnel or cloudflared
- `src/botApi.js` (~80 lines) — REST API + socket handlers for bot/webhook CRUD
- `src/paths.js` — data directory resolution
### Client-Side
- `public/app.html` (~530 lines) — main SPA shell, modals (call, blocks, admin), sidebar (channels+DMs), message area, theme selector (13 themes), GIF provider tabs, noise suppression, channel type selector
- `public/js/app.js` (~2850 lines) — HavenApp class: chat, UI, GIF picker (dual provider), reactions, mentions, search, admin panel, DMs, blocks, private calls, noise suppression toggle, mobile
- `public/js/voice.js` (~640 lines) — VoiceManager: WebRTC P2P, screen share, volume, talking indicators, noise suppression (Web Audio FFT noise gate)
- `public/js/notifications.js` (~155 lines) — NotificationManager: 10 synthesized tones (classic + AIM/retro/DM sounds) via Web Audio API
- `public/js/theme.js` (41 lines) — theme switcher with server persistence
- `public/js/theme-init.js` (5 lines) — FOUC prevention
- `public/js/servers.js` (81 lines) — multi-server sidebar manager
- `public/js/auth.js` — login/register page logic
- `public/css/style.css` (~3650 lines) — 13 themes (incl. Triangle), layout, responsive, DM/call/block/noise/GIF-tab styles
### Dependencies
- express, socket.io, better-sqlite3, bcryptjs, jsonwebtoken, multer, helmet, dotenv
### New Modules (v1.3.2)
- PixelCipher: Ported from Amni-miner's rgb_pixel_cipher.py — JS implementation of AES-like GPU texture cipher
- Tunnel: localtunnel/cloudflared wrapper for NAT traversal
- BotApi: Express router + socket.io handlers for bot management
