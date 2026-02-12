# Haven v2.0 — 13-Feature Implementation Checklist

## Phase 1: Database Schema Updates
- [ ] Add `blocks` table (blocker_id, blocked_id, unique constraint)
- [ ] Add `dm_channels` table (user1_id, user2_id, channel_code)
- [ ] Add `channel_type` column to channels (text|voice|both, default 'both')
- [ ] Add `gif_url` column to reactions table for GIF reactions
- [ ] Add `bots` table (id, name, token, webhook_url, created_by)
- [ ] Add `giphy_api_key` to server_settings defaults
- [ ] Add `tunnel_enabled`, `tunnel_provider` to server_settings defaults
- [ ] Add `noise_suppression` to user_preferences allowed keys
- [ ] Add `private_calls` table (caller_id, callee_id, status, channel_code)
- [ ] Add `sound_pack` to user_preferences allowed keys

## Phase 2: Server-Side Modules
- [ ] Create `src/pixelCipher.js` — JS port of RGBPixelCipher (S-box, GF(2^8), 14 rounds, CBC)
- [ ] Create `src/tunnel.js` — localtunnel/cloudflared integration for no-port-forward hosting
- [ ] Create `src/botApi.js` — webhook/REST bot framework

## Phase 3: Server Endpoints & Socket Handlers
- [ ] Add Giphy API proxy endpoints (`/api/gif/giphy/search`, `/api/gif/giphy/trending`)
- [ ] Add bot webhook endpoint (`/api/bot/webhook/:token`)
- [ ] Add tunnel status endpoint (`/api/tunnel/status`)
- [ ] Socket: `block-user`, `unblock-user`, `get-blocks` events
- [ ] Socket: `create-dm`, `get-dms` events for direct messaging
- [ ] Socket: `create-channel` allow type parameter (text|voice|both)
- [ ] Socket: GIF reactions (extend `add-reaction` to support gif_url)
- [ ] Socket: `private-call-invite`, `private-call-accept`, `private-call-decline`
- [ ] Socket: `broadcastVoiceUsers` to emit globally, not just to channel
- [ ] Socket: Filter messages from blocked users before delivery
- [ ] Socket: Encrypt sensitive data flows via pixelCipher

## Phase 4: Client-Side Updates
- [ ] Add Giphy tab to GIF picker (provider toggle Tenor/Giphy)
- [ ] Add triangle theme to CSS + customizer UI with sliders
- [ ] Add AIM/flip phone sound packs to NotificationManager
- [ ] Add DM UI (💬 button on users, DM channel list section)
- [ ] Voice users panel: show globally regardless of channel membership
- [ ] Add "Watch Stream" button for remote screen share viewing
- [ ] GIF reaction picker (search GIF in reaction context)
- [ ] Bot management UI in admin settings
- [ ] Noise suppression toggle in settings (Web Audio noise gate)
- [ ] Private call UI (call button on users, call modal, ringtone)
- [ ] Block UI (block button on users, blocked list in settings)
- [ ] Channel creation: type selector (text-only, voice-only, both)
- [ ] Client-side pixel cipher for E2E encryption indicator

## Phase 5: CSS & Theme Updates
- [ ] Triangle theme with CSS clip-path morphism
- [ ] Styles for DM channels, block indicators
- [ ] Styles for GIF reactions (larger reaction badges)
- [ ] Styles for bot messages (bot badge)
- [ ] Styles for private call modal, ringtone animation
- [ ] Styles for noise suppression indicator
- [ ] Styles for stream viewer button
- [ ] Styles for channel type icons (text/voice/both)

## Phase 6: Testing & Documentation
- [ ] Lint with Pylance/ESLint equivalents
- [ ] Test each feature independently
- [ ] Update ARCHITECTURE.md
- [ ] Update README.md
- [ ] Update CHANGELOG.md
