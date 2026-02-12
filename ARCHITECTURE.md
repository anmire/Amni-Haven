# Haven Architecture Map
## v1.3.4 (Spotify Premium Integration)
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
- `public/app.html` (~680 lines) — main SPA shell, modals, sidebar (channels+DMs), message area, theme selector (13 themes + triangle morph panel), GIF picker (Giphy-only), noise suppression with LED, listen-together panel with Spotify SDK player UI, screen share collapse toggle
- `public/js/app.js` (~3300 lines) — HavenApp class: chat, UI, GIF picker, reactions, mentions, search, admin, DMs, blocks, private calls, noise suppression LED, screen-share collapse, listen-together with Spotify SDK integration, `_setupSpotify()` for OAuth callback handling
- `public/js/spotify.js` (~110 lines) — SpotifyPlayer class: Web Playback SDK wrapper, OAuth token management, play/pause/seek/volume, state callbacks, URI converter
- `public/js/voice.js` (~640 lines) — VoiceManager: WebRTC P2P, screen share, volume, talking indicators, noise suppression
- `public/js/notifications.js` (~155 lines) — NotificationManager: 10 synthesized tones via Web Audio API
- `public/js/theme.js` (41 lines) — theme switcher with server persistence
- `public/js/theme-init.js` (5 lines) — FOUC prevention
- `public/js/triangle-morph.js` (~120 lines) — TriangleMorph class with barycentric coordinate triangles
- `public/js/tutorial.js` (~120 lines) — interactive 11-step tutorial
- `public/js/servers.js` (81 lines) — multi-server sidebar manager
- `public/js/games.js` — Game Together (EmulatorJS) controller/lobby management
- `public/js/auth.js` — login/register page logic, auto-login for localhost
- `public/css/style.css` (~3970 lines) — 13 themes, layout, responsive, Spotify SDK player styles, screen-collapsed states, noise LED, triangle morph panel, tutorial overlay
### Dependencies
- express, socket.io, better-sqlite3, bcryptjs, jsonwebtoken, multer, helmet, dotenv
### New in v1.3.4
- Spotify Premium Integration: OAuth flow, Web Playback SDK, full playback for Premium users
- Admin settings UI for Spotify Client ID/Secret
- spotify_tokens table for per-user Spotify account linking
- CSP updated for Spotify SDK and API endpoints
- Favicon SVG added
- Screen share collapse/expand toggle (preserves streams)
- Stop streaming button fix (proper tile cleanup)
- Noise suppression LED on/off indicator
- CSP fix for Spotify iframes + EmulatorJS scripts
