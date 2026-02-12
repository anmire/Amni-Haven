# Changelog

All notable changes to Haven are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Haven uses [Semantic Versioning](https://semver.org/).

---

## [1.3.5] — 2026-02-12

### Added
- **Display Names** — users can set a display name separate from login username
  - Profile section in Settings with display name input
  - Display names shown in chat messages, user list, typing indicator
  - Socket handlers emit `displayName` alongside `username`
  - REST endpoint `POST /api/user/display-name` for programmatic updates

### Changed
- **Triangle Morph Theme** — redesigned as single intuitive vibe triangle
  - Three corners: Chill (cool blues), Heat (warm reds), Dream (purple mystique)
  - Single draggable point blends HSL values across all theme variables
  - Larger triangle with glowing handle that reflects current blend
  - Removed separate Era triangle; all morphing in one control

---

## [1.3.4] — 2026-02-12

### Added
- **Spotify Premium Integration**
  - OAuth flow: users link their Spotify account via Settings
  - Premium users get full playback in Listen Together via Web Playback SDK
  - Admin panel: configure Spotify Client ID and Secret
  - Visual player with album art, track name, seek bar, volume control
  - Auto-refreshes access tokens; stores in `spotify_tokens` table
  - Falls back to embed player for non-Premium or non-linked users
- **Favicon** — SVG hexagon favicon for all pages

### Changed
- **CSP Headers** — added `sdk.scdn.co` (Spotify SDK), Spotify API and WebSocket endpoints

---

## [1.3.3] — 2025-06-26

### Added
- **Interactive Tutorial System**
  - 11-step guided onboarding tour with robust element detection
  - Spotlight highlighting with animated transitions
  - Viewport-clamped tooltip positioning
  - "Don't show again" checkbox stored in localStorage
  - Fallback comma-separated selectors + getBoundingClientRect dimension checks
- **Discord-Compatible Webhook API**
  - Accepts Discord embed format (`embeds` array with fields, color, footer)
  - Rich HTML rendering for bot messages in channels
  - `is_html` flag for messages table
  - Custom username support in webhook payloads
- **Azno Bot Integration**
  - `HavenNotifier` class for Python (`core/haven_notifier.py`)
  - Bridge config template: `config/azno-bridge.json`
  - Same API as DiscordNotifier: `send_trade()`, `send_signal()`, `send_portfolio()`
- **Triangular Morphism Theme Sliders**
  - Two interactive ternary/barycentric coordinate triangles for Triangle theme
  - Vibe triangle: Serene / Fierce / Mystic — controls accent, background, text hues
  - Era triangle: Retro / Cyber / Organic — controls radius, glow, saturation
  - Draggable SVG point constrained inside triangle, real-time CSS variable interpolation
  - State persisted to localStorage, reset button to restore defaults
  - Panel auto-shows/hides when Triangle theme toggled
- **Noise Suppression LED Indicator** — inline on/off LED dot with glow on noise filter button

### Changed
- **GIF Provider: Giphy Only** — removed deprecated Tenor API entirely (client + server routes); Giphy is sole provider
- **Screen Share UX** — close button changed to collapse/expand toggle (▾/▸); streams preserved on hide
- **Stop Streaming** — button now properly cleans up screen tile via explicit `_handleScreenStream(userId, null)`
- **CSP Headers** — added `frame-src` (Spotify, YouTube, SoundCloud, Vimeo), `script-src` (EmulatorJS CDN), `worker-src` (blob:), `connect-src` (EmulatorJS CDN)

---

## [1.3.2-audit] — 2026-02-11

### Security
- **Listen Together XSS fix** — URL whitelist (YouTube, Spotify, SoundCloud, Vimeo only), sandbox iframe, empty fallback for unrecognized URLs
- **Full security audit** — documented in SECURITY_AUDIT.md
- **Git history clean** — verified no secrets, keys, or proprietary code in tracked history

### Added
- **Channel Permissions System**
  - Private channels (🔒) visible only to authorized users + admins
  - Admin UI to add/remove users from channels (👥 Manage Members)
  - Users can leave public channels (🚪 Leave button)
  - `channel_permissions` table for explicit access control
  - Subscription model: users see only channels they've joined
  - Seed script for trading channels: `scripts/seed-trading-channels.js`
- **Game Together** — Retro console emulator with multiplayer support
  - EmulatorJS integration for NES, SNES, N64, GB, GBC, GBA, NDS, GameCube, Genesis, Saturn, Dreamcast, PS1, PS2, PSP, Xbox
  - Host loads ROM, others join as players or spectators
  - Controller assignment UI (P1-P4) with real-time slot management
  - Input sync over WebSocket for netplay
  - Fullscreen mode, save state support
  - 🎮 Games button in channel header
  - BYOROM (Bring Your Own ROM) — no ROMs included
- **Game Together design doc** — roadmap for Flash/retro emulation features (Ruffle + EmulatorJS)
- **ROM gitignore** — `/games/roms/` excluded to prevent accidental copyright issues

---

## [1.3.2-sc] — 2025-06-26

### Added — Stream Controls, Subchannels, Listen Together

#### Stream Viewer Controls
- **Fullscreen/maximize** button on each screen-share tile via Fullscreen API
- **Volume slider** per tile — unmute screen audio and adjust level independently
- **Resolution selector** per tile — switch playback quality (Auto/1080p/720p/480p/360p) via `applyConstraints()`
- Toolbar appears on hover, persists in fullscreen mode

#### Subchannels (Nested Channel Hierarchy)
- **parent_id** column added to channels table with CASCADE delete
- Create-channel UI has parent selector dropdown (Top-level or under existing channel)
- Channel list renders as collapsible tree with indent, toggle arrows, and `└` prefix for children
- Socket handlers updated: `create-channel` accepts `parentId`, `get-channels` returns `parent_id`

#### Listen Together (Media Sync)
- **listen_sessions** table for persistent session tracking per channel
- Host starts a session by pasting any media URL (YouTube, Spotify, SoundCloud, Vimeo)
- Auto-embeds via oEmbed iframes (Spotify embed, YouTube embed, SoundCloud player, Vimeo player)
- Play/pause/stop host controls broadcast sync state to all channel participants
- Panel accessible via 🎵 Listen button in channel header
- Socket events: `listen-start`, `listen-sync`, `listen-stop`, `listen-get`, `listen-session`, `listen-sync-update`, `listen-ended`

---

## [1.3.2] — 2025-06-25

### Added — 13 New Features

#### Pixel-GPU Pipeline Encryption
- **PixelCipher-256-CBC** — AES-like cipher ported from Amni-miner's RGB pixel pipeline. 14 rounds, 256-bit key, key-dependent S-box via Fisher-Yates shuffle, GF(2^8) arithmetic, CBC mode, PKCS7 padding. Server displays cipher status in startup banner.

#### Giphy GIF Support
- **Dual GIF provider** — search and send GIFs via Tenor or Giphy with tabbed provider switching in the GIF picker. Admin can configure Giphy API key in settings.

#### Secure Tunneling
- **No-port-forward hosting** via localtunnel or cloudflared. Toggle tunnel on/off in admin settings, pick provider, view active URL. Auto-starts on server boot if enabled.

#### Triangle Theme
- **New theme: Triangle** — pink/magenta palette with clip-path polygon morphism on avatars, sidebars, and message bubbles. Total themes now: 13.

#### AIM/Retro Sounds + DMs
- **5 new sounds**: aim_receive, aim_send, flip_sms, flip_ring, dm_notify (Web Audio synthesized). Direct Messages with sidebar DM section, per-user DM initiation.

#### Voice Users Global Visibility
- Voice user list now broadcasts globally via `io.emit` so all connected users see who's in voice, regardless of channel.

#### GIF Reactions
- Reactions now support `gif_url` — enables GIF-based reaction badges on messages.

#### Bot/Webhook Support
- REST API at `/api/bots` — CRUD for bots with auto-generated tokens. `botApi.js` module with Express router + socket handlers. Bots table in database.

#### Noise Suppression
- Toggle-able Web Audio noise gate using FFT analysis. Auto-applies on voice join if enabled. Button in voice controls toggles active state.

#### Private Voice/Video Calls
- Initiate private audio/video calls to any user. Call modal with accept/reject/end buttons. Socket events: initiate-call, accept-call, reject-call, end-call, call-signal. Private call records stored in database.

#### Block Users
- Block/unblock any user. Blocked users list in settings. Quick-action block button on user items. Socket events + database table for persistent blocks.

#### On-Demand Channel Types
- Channels can be typed as text, voice, or both. Channel type selector in create-channel modal. Type icons displayed in channel list.

### Changed
- CSP headers updated to allow Giphy domains (giphy.com, gstatic.com)
- `_sendGifMessage` payload fixed to use `code` key matching server expectations
- `HavenApp` instance exposed globally as `window.app` for onclick handlers

---

## [1.1.0] — 2026-02-11

### 🔒 Data Isolation

All user data now lives **outside** the Haven code directory, making it physically impossible to accidentally commit or share personal data.

### Changed
- **Database, .env, certs, and uploads** are now stored in:
  - **Windows:** `%APPDATA%\Haven\`
  - **Linux / macOS:** `~/.haven/`
- **SSL certificates are auto-detected** — if certs exist in the data directory, HTTPS enables automatically without needing to edit `.env`.
- **Start Haven.bat** and **start.sh** generate certs and bootstrap `.env` in the external data directory.
- **Automatic one-time migration** — existing data in the old project-directory locations is moved to the new data directory on first launch.

### Added
- New `src/paths.js` module — single source of truth for all data directory paths.
- `HAVEN_DATA_DIR` environment variable — override where data is stored.

### Updated
- README.md, GUIDE.md, and .env.example updated to reflect new data locations.

---

## [1.0.0] — 2026-02-10

### 🎉 First Public Release

Haven is now ready for public use. This release includes all features from the alpha series plus security hardening and polish for distribution.

### Added — Slash Command Autocomplete
- **Type `/`** and a Discord-style tooltip dropdown appears with all available commands.
- **Keyboard navigation** — Arrow keys to browse, Tab to select, Escape to dismiss.
- **Descriptions & argument hints** for every command.

### Added — New Slash Commands
- `/roll [NdN]` — Roll dice (e.g. `/roll 2d20`). Defaults to 1d6.
- `/flip` — Flip a coin (heads or tails).
- `/hug <@user>` — Send a hug.
- `/wave` — Wave at the chat.
- `/nick <name>` — Change your username.
- `/clear` — Clear your chat view (local only).

### Added — Message Search
- **Ctrl+F** or 🔍 button opens a search bar in the channel header.
- Results panel with highlighted matches.
- Click a result to scroll to that message with a flash animation.

### Added — 6 New Themes
- **Cyberpunk** — Neon pink and electric yellow
- **Nord** — Arctic blue and frost
- **Dracula** — Deep purple and blood red
- **Bloodborne** — Gothic crimson and ash
- **Ice** — Pale blue and white
- **Abyss** — Deep ocean darkness

### Fixed — Security
- **Privilege escalation via rename** — Users can no longer gain admin by renaming to the admin username.
- **Upload extension bypass** — Server now forces file extensions based on validated MIME type.
- **Banned user upload bypass** — Banned users can no longer upload images via the REST API.
- **Upload rate limiting** — 10 uploads per minute per IP.
- **Spoiler CSP violation** — Spoiler click handler moved from inline to delegated (CSP-safe).
- **postMessage origin check** — Game score listener validates origin before accepting.
- **Event listener leak** — Game score listener registered once, not per button click.

### Changed
- Version bumped to 1.0.0 for public release.
- README rewritten as user-facing documentation.
- All personal data scrubbed from codebase.
- Added MIT LICENSE file.
- 12 themes total (6 new added to the original 6).

---

## [0.6.0-alpha] — 2026-02-10

### Added — Emoji Picker
- **Emoji button** in the message input bar — click to open a 40-emoji palette.
- **Insert at cursor** — emojis are inserted at the current cursor position, not appended.
- **Curated set** — 40 of the most useful emojis across smileys, gestures, objects, and symbols.

### Added — Message Reactions
- **Hover toolbar** — hover any message to see React 😀 and Reply ↩️ buttons.
- **Quick-pick palette** — click React to get a fast 8-emoji picker (👍👎😂❤️🔥💯😮😢).
- **Toggle reactions** — click an existing reaction badge to add/remove your own reaction.
- **"Own" highlight** — reactions you've placed are visually highlighted with accent color.
- **Persistent** — reactions stored in database (`reactions` table) and survive restarts.
- **Real-time sync** — all users in the channel see reactions update instantly.

### Added — @Mentions with Autocomplete
- **Type `@`** in the message input to trigger an autocomplete dropdown.
- **Live filtering** — as you type, the dropdown narrows to matching usernames.
- **Keyboard nav** — Arrow keys to navigate, Enter/Tab to select, Escape to dismiss.
- **Click to select** — click any suggestion to insert `@username` into your message.
- **Visual highlight** — `@mentions` render with accent-colored pill styling in chat.
- **Self-highlight** — mentions of your own username are extra-bold for visibility.
- **Channel-aware** — only members of the current channel appear in suggestions.

### Added — Reply to Messages
- **Reply button** — hover any message and click ↩️ to reply.
- **Reply bar** — preview bar appears above the input showing who/what you're replying to.
- **Cancel reply** — click ✕ on the reply bar to clear.
- **Reply context** — replied messages show a colored banner above them linking back to the original.
- **Threaded feel** — replies group visually with the parent message's author color.
- **Persistent** — `reply_to` column in messages table; reply context survives reloads.

### Changed — Database
- Added `reply_to` column to `messages` table (auto-migrated on existing databases).
- New `reactions` table with unique constraint per (message, user, emoji).
- Safe migration: existing databases are upgraded without data loss.

### Changed — Backend
- `get-messages` now returns reactions and reply context for each message.
- `send-message` accepts optional `replyTo` field.
- New socket events: `add-reaction`, `remove-reaction`, `get-channel-members`.
- `reactions-updated` broadcast to all channel members on any reaction change.
- `channel-members` event returns member list for @mention autocomplete.
- Emoji validation: only actual emoji characters accepted (regex unicode property check).

---

## [0.5.0-alpha] — 2026-02-10

### Added — Multi-Server Sidebar
- **Server bar** (far left) — Discord-style vertical strip showing all your Haven servers.
- **Live status lights** — Green (online), grey (offline), yellow (checking) status dots on each server icon.
- **Add/remove servers** — Modal dialog to add friends' Haven servers by name + URL.
- **Health check API** — `GET /api/health` returns server name, status, and version. CORS-enabled for cross-server pings.
- **One-click connect** — Click any server icon to open it in a new tab.
- **`ServerManager` class** (`servers.js`) — Client-side server list stored in `localStorage` with 30-second polling.

### Added — Image Sharing
- **Image upload** — Upload button in message input area. Max 5 MB (jpg, png, gif, webp).
- **Clipboard paste** — Paste images directly from clipboard into chat.
- **Drag & drop** — Drag image files onto the chat area to upload.
- **Inline rendering** — Uploaded images and image URLs render as clickable inline images in chat.
- **Server-side handling** — Multer middleware with random filenames, MIME type validation, size limits.
- **Upload authentication** — JWT token required for uploads.

### Added — Voice Volume Control
- **Per-user volume sliders** — Range inputs (0–200%) below each voice user in the panel.
- **Persistent settings** — Volume preferences saved in `localStorage` per user ID.
- **Auto-applied** — Saved volumes automatically applied when peers connect.
- **"you" tag** — Your own entry in voice shows a label instead of a slider.

### Added — Notification Tones
- **Web Audio API engine** — Zero-dependency synthesized notification sounds.
- **5 built-in tones** — Ping, Chime, Blip, Bell, Drop.
- **Configurable** — Choose which sound plays for messages (right sidebar panel).
- **Enable/disable toggle** — Master on/off switch for all notifications.
- **Volume slider** — Independent notification volume control.
- **Event triggers** — Sounds on new message (from others) and user join.

### Added — Cross-Platform Support
- **`start.sh`** — Linux/macOS launcher with: Node.js detection, auto dependency install, auto SSL cert generation, process management, clean shutdown on Ctrl+C, browser auto-open.
- **`.env.example`** — Template configuration file with full documentation.
- **`SERVER_NAME`** — New `.env` variable for naming your Haven instance.

### Fixed — Security
- **JWT timing bug** — `JWT_SECRET` auto-generation now runs *before* `auth.js` is loaded, fixing a race condition where the first boot used a different secret than subsequent boots.
- **JWT fallback removed** — `auth.js` no longer has a hardcoded fallback secret. If `JWT_SECRET` is missing, the server exits with a clear error.
- **Channel membership enforcement** — `enter-channel` and `voice-join` now verify the user is actually a member before granting access.
- **Atomic channel deletion** — `delete-channel` now wrapped in a SQLite transaction for data integrity.

### Changed
- **`server.js`** — Restructured require order (JWT auto-gen before auth load), added multer, health endpoint, upload endpoint, SERVER_NAME in banner.
- **`package.json`** — Version bumped to 0.5.0, added multer dependency.
- **`public/app.html`** — Added server bar, image upload button, file input, notification settings panel, add-server modal.
- **`public/js/app.js`** — Full rewrite with ServerManager, NotificationManager, image upload/paste/drag-drop, volume sliders, server bar rendering.
- **`public/js/voice.js`** — Added `setVolume()`, `_getSavedVolume()` methods, auto-apply saved volume on stream play.
- **`public/css/style.css`** — Added 7 new CSS sections: server bar, modal, chat images, upload button, volume sliders, notification settings, drag-over state.
- **`.gitignore`** — Added `public/uploads/*`, `haven.db-shm`, `haven.db-wal`.
- **`Start Haven.bat`** — Made generic (no hardcoded IP), increased startup timeout.
- **`README.md`** — Full rewrite with updated features, cross-platform install, expanded roadmap.

---

## [0.4.0-alpha] — 2026-02-10

### Added — Security Hardening
- **Helmet security headers** — CSP, X-Content-Type-Options, X-Frame-Options, HSTS, no X-Powered-By.
- **API rate limiting** — 20 requests per 15 minutes per IP on auth endpoints.
- **Socket connection rate limiting** — Max 15 connections per minute per IP.
- **Socket event flood protection** — Per-connection: max 60 events/10s, max 10 messages/10s.
- **Input validation on all socket events** — Type checks, string length bounds, regex for channel codes, integer checks.
- **Body size limits** — Express JSON parsing capped at 16KB.
- **Static file hardening** — `dotfiles: 'deny'`.
- **CORS lockdown** — Socket.IO CORS set to `origin: false`.
- **Auto-generated JWT secret** — 48-byte random secret on first run.
- **Safe URL regex (client)** — Tightened URL matching, `nofollow`, URL constructor validation.
- **User Guide** — `GUIDE.md` created.

---

## [0.3.0-alpha] — 2026-02-10

### Added
- **HTTPS / SSL support** — Self-signed certificate, auto-detection from `.env`.
- **HTTP → HTTPS redirect** — Secondary listener on port 3001.

---

## [0.2.0-alpha] — 2026-02-10

### Added
- **6 UI themes** — Haven, Discord, Matrix, Tron, HALO, Lord of the Rings.
- **Status bar** — LEDs, ping, channel name, online count, clock.
- **`Start Haven.bat`** — Windows one-click launcher.
- **Unread badges** — Channel list badges.
- **Message grouping** — Compact mode for consecutive messages.

### Fixed
- **App crash** — `initThemeSwitcher()` extracted to shared `theme.js`.

---

## [0.1.0-alpha] — 2026-02-10

### Added
- Core server (Express + Socket.IO).
- User authentication (bcrypt + JWT).
- Secret channels with invite codes.
- Real-time text chat with history.
- Voice chat (WebRTC).
- Admin controls.
- SQLite database.
- `.env` configuration.
