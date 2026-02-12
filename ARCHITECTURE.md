# Haven Architecture Map
## v1.3.2-sc (Stream Controls, Subchannels, Listen Together)
### Server-Side
- `server.js` (~557 lines) — Express + Socket.IO + HTTPS/SSL, file uploads, GIF proxy (Tenor + Giphy), link preview, rate limiting, auto-cleanup, PixelCipher banner, tunnel auto-start, bot routes, real IP display, auto-login
- `src/auth.js` (212 lines) — bcrypt auth, JWT, rate limiter, register/login, whitelist check
- `src/database.js` (~210 lines) — better-sqlite3, schema (users, channels+channel_type+parent_id, messages+is_bot, reactions+gif_url, bans, mutes, settings, preferences, high_scores, whitelist, pinned_messages, blocks, dm_channels, bots, private_calls, listen_sessions)
- `src/socketHandlers.js` (~1680 lines) — all socket events: channels (typed, subchannels via parent_id), messages, voice WebRTC signaling, reactions (gif_url), mentions, admin moderation, settings (tunnel/giphy/noise), search, slash commands, blocks, DMs, private calls, bot socket handlers, listen-together (start/sync/stop/get)
- `src/pixelCipher.js` (~170 lines) — PixelCipher-256-CBC: AES-like cipher, 14 rounds, 256-bit key, key-dependent S-box, GF(2^8) multiply, CBC mode, PKCS7 padding
- `src/tunnel.js` (~60 lines) — secure tunneling via localtunnel or cloudflared
- `src/botApi.js` (~90 lines) — REST API + socket handlers for bot/webhook CRUD, rate-limited
- `src/paths.js` — data directory resolution
### Client-Side
- `public/app.html` (~570 lines) — main SPA shell, modals (call, blocks, admin), sidebar (channels+DMs+parent selector for subchannels), message area, theme selector (13 themes), GIF provider tabs, noise suppression, channel type selector, listen-together panel with embed container
- `public/js/app.js` (~3070 lines) — HavenApp class: chat, UI, GIF picker (dual provider), reactions, mentions, search, admin panel, DMs, blocks, private calls, noise suppression toggle, mobile, screen-share tile controls (fullscreen/volume/resolution), subchannel tree rendering with collapse, listen-together (session management, embed URL builder for YouTube/Spotify/SoundCloud/Vimeo, host controls)
- `public/js/voice.js` (~640 lines) — VoiceManager: WebRTC P2P, screen share, volume, talking indicators, noise suppression (Web Audio FFT noise gate)
- `public/js/notifications.js` (~155 lines) — NotificationManager: 10 synthesized tones (classic + AIM/retro/DM sounds) via Web Audio API
- `public/js/theme.js` (41 lines) — theme switcher with server persistence
- `public/js/theme-init.js` (5 lines) — FOUC prevention
- `public/js/servers.js` (81 lines) — multi-server sidebar manager
- `public/js/auth.js` — login/register page logic, auto-login for localhost
- `public/css/style.css` (~3810 lines) — 13 themes (incl. Triangle), layout, responsive, DM/call/block/noise/GIF-tab styles, screen-tile toolbar (fullscreen/vol/res), subchannel indent+toggle, listen-together panel+embed
### Dependencies
- express, socket.io, better-sqlite3, bcryptjs, jsonwebtoken, multer, helmet, dotenv
### New in v1.3.2-sc
- Stream Controls: fullscreen btn, volume slider, resolution dropdown per screen-share tile, hover toolbar
- Subchannels: parent_id FK on channels, collapsible tree rendering, parent selector in create UI
- Listen Together: listen_sessions table, host/sync/stop socket events, oEmbed iframes (YouTube/Spotify/SoundCloud/Vimeo), channel-scoped listening sessions
