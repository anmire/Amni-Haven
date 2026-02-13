# Upstream Haven Port Analysis
**Generated: 2025-01-27**
**Upstream files**: `/tmp/upstream_*.{js,css,html}` (v1.4.2→v1.5.0)
**Our files**: `public/js/*.js`, `public/css/*.css`, `public/app.html`

---

## P0 — Critical Bug Fixes

### 1. Voice Reconnect on Disconnect (v1.4.2)
**Status**: ❌ MISSING from our code
**Impact**: When connection drops and reconnects, voice call silently dies — user must manually rejoin.

**Upstream** `upstream_app.js` L157-174 — `connect` handler emits `voice-rejoin`:
```js
this.socket.on('connect', () => {
  // ...status updates...
  if (this.currentChannel) {
    this.socket.emit('enter-channel', { code: this.currentChannel });
    this.socket.emit('get-messages', { code: this.currentChannel });
    this.socket.emit('request-online-users', { code: this.currentChannel });
    this.socket.emit('request-voice-users', { code: this.currentChannel });
  }
  // Voice auto-rejoin on reconnect
  if (this.voice && this.voice.inVoice && this.voice.currentChannel) {
    this.socket.emit('voice-rejoin', { code: this.voice.currentChannel });
  }
});
```

**Ours** `app.js` L1725-1740 — `_resyncState()` does NOT include voice rejoin:
```js
_resyncState() {
  this.socket.emit('get-channels');
  this.socket.emit('get-server-settings');
  this.socket.emit('get-preferences');
  this.socket.emit('get-blocks');
  this.socket.emit('get-dms');
  if (this.currentChannel) {
    this.socket.emit('enter-channel', { code: this.currentChannel });
    // ...no voice-rejoin...
  }
}
```

**Fix**: Add to `_resyncState()`:
```js
if (this.voice && this.voice.inVoice && this.voice.currentChannel) {
  this.socket.emit('voice-rejoin', { code: this.voice.currentChannel });
  this.socket.emit('request-voice-users', { code: this.voice.currentChannel });
}
```

---

### 2. Screen Share Double Picker (v1.4.6)
**Status**: ❌ MISSING from our code
**Impact**: On Alt-Tab back to Haven while screen sharing, browser shows picker AGAIN — confusing and can crash stream.

**Upstream** `upstream_voice.js` L293-301:
```js
async shareScreen() {
  if (!this.inVoice || this.isScreenSharing) return false;
  try {
    const opts = {
      video: { cursor: 'always' },
      audio: true,
      surfaceSwitching: 'exclude'   // ← prevents double picker
    };
    if (typeof CaptureController !== 'undefined') {
      opts.controller = new CaptureController();
    }
    this.screenStream = await navigator.mediaDevices.getDisplayMedia(opts);
```

**Ours** `voice.js` L244-248:
```js
this.screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { cursor: 'always' },
  audio: true
});
```

**Fix**: Add `surfaceSwitching: 'exclude'` and `CaptureController`:
```js
const opts = {
  video: { cursor: 'always' },
  audio: true,
  surfaceSwitching: 'exclude'
};
if (typeof CaptureController !== 'undefined') {
  opts.controller = new CaptureController();
}
this.screenStream = await navigator.mediaDevices.getDisplayMedia(opts);
```

---

### 3. `session-info` Handler — Avatar Sync
**Status**: ⚠️ PARTIAL — handler exists but missing avatar sync
**Impact**: Server-sent avatar URL never applied on reconnect.

**Upstream** `upstream_app.js` L126-148 includes:
```js
this.socket.on('session-info', (data) => {
  // ...updates admin, displayName...
  if (data.avatar !== undefined) {
    this.user.avatar = data.avatar;
    localStorage.setItem('haven_avatar', data.avatar || '');
    this._updateAvatarPreview();
  }
  // ...version display...
});
```

**Ours** `app.js` L121-138 updates admin/displayName but NOT avatar from server.

---

## P1 — Important Improvements

### 4. Server-Side Avatar/PFP System (v1.4.4 + v1.5.0)
**Status**: ❌ COMPLETELY DIFFERENT architecture
**Impact**: Our avatars are LOCAL-ONLY (base64 in localStorage, visible only to self). Upstream has server-side upload visible to ALL users.

**Upstream** `upstream_app.js` L1529-1636 — `_setupAvatarUpload()`:
- Uploads to `/api/upload-avatar` (2MB limit, proper image validation)
- Emits `set-avatar` via socket to broadcast to all clients
- Handles `avatar-updated` socket event (L150-155)
- Both settings modal AND rename modal have avatar upload buttons
- Remove avatar button (`set-avatar: { url: '' }`)

**Ours** `app.js` L3598-3680 — `_setupAvatarSettings()`:
- LOCAL-ONLY: reads file as base64 data URL, stores in `localStorage`
- 256KB limit (vs upstream's 2MB server upload)
- Only visible to the user themselves — other users see default letter avatar
- No server-side storage or broadcast

**Port decision**: This requires server-side `/api/upload-avatar` endpoint too. The client-side changes are:
1. Replace `_setupAvatarSettings()` with `_setupAvatarUpload()`
2. Add `avatar-updated` socket handler
3. Update `_createMessageEl` to show `msg.avatar` 
4. Update `_renderUserItem` to show `u.avatar`

---

### 5. Message Avatars for Other Users
**Status**: ❌ MISSING — only self avatar shown
**Impact**: Messages from other users always show letter avatar, never their PFP.

**Upstream** `upstream_app.js` L2374-2378 — `_createMessageEl`:
```js
const avatarHtml = msg.avatar
  ? `<img class="message-avatar message-avatar-img" src="${...msg.avatar...}" ...onerror fallback...>`
  : `<div class="message-avatar" style="background-color:${color}">${initial}</div>`;
```

**Ours** `app.js` L2077-2090 — only shows custom avatar for SELF:
```js
const avatarContent = (isSelf && this._avatarImg)
  ? `<img src="${this._avatarImg}" ...>`
  : initial;
```

---

### 6. User List Avatars + Status Dot Shapes
**Status**: ❌ MISSING — our user list is minimal
**Impact**: User list shows plain dots instead of avatar images and shaped status indicators.

**Upstream** `upstream_app.js` L2541-2585 — `_renderUserItem`:
- Avatar image with fallback: `u.avatar ? <img> : <div>letter</div>`
- Wrapped in `<div class="user-avatar-wrapper">` with status dot overlay
- Status dot shapes via CSS: `.away` (half-circle), `.dnd` (square), `.invisible` (hollow)
- Status text shown: `<span class="user-status-text">`
- DM button for non-self users

**Ours** `app.js` L2256-2261 — `_renderUserItem`:
```js
return `<div class="user-item${onlineClass}" ...>
  <span class="user-dot${u.online === false ? ' away' : ''}"></span>
  <span class="user-item-name">${...}</span>
</div>`;
```
No avatars, no shaped status dots, no status text, no DM button.

**Upstream CSS** `upstream_style.css` L2240-2280:
```css
.user-status-dot { width:10px; height:10px; border-radius:50%; background:var(--success); position:absolute; bottom:0; right:0; border:2px solid var(--bg-secondary); }
.user-status-dot.away { background:var(--text-muted); border-radius:2px 2px 50% 50%; } /* half-circle */
.user-status-dot.dnd { background:var(--danger); border-radius:2px; } /* square */
.user-status-dot.invisible { background:transparent; border:2px solid var(--text-muted); } /* hollow */
```

---

### 7. Channel Context Menu (v1.5.0)
**Status**: ❌ MISSING entirely
**Impact**: No way to mute channels, toggle streams, or delete channels without admin panel.

**Upstream** `upstream_app.js` L670-710 + L2003-2050:
- `_initChannelContextMenu()` — delegated click handler for `...` button
- `_openChannelCtxMenu()` / `_closeChannelCtxMenu()` — position near button, admin-only items
- Mute/unmute channel (localStorage), toggle streams, toggle music, delete channel
- Each channel item renders `<button class="channel-more-btn">⋯</button>`

**Upstream HTML** `upstream_app.html` L660-673:
```html
<div id="channel-ctx-menu" class="channel-ctx-menu" style="display:none">
  <div class="ctx-item" data-action="mute">🔔 Mute Channel</div>
  <div class="ctx-item admin-only" data-action="toggle-streams">📺 Toggle Streams</div>
  <div class="ctx-item admin-only" data-action="toggle-music">🎵 Toggle Music</div>
  <div class="ctx-item ctx-danger admin-only" data-action="delete">🗑️ Delete Channel</div>
</div>
```

**Upstream CSS** `upstream_style.css` L2010-2050:
```css
.channel-more-btn { opacity: 0; font-size: 14px; ... }
.channel-item:hover .channel-more-btn { opacity: 0.5; }
.channel-ctx-menu { position: fixed; background: var(--bg-card); ... }
```

---

### 8. Slider Track CSS Fix (v1.4.6)
**Status**: ❌ MISSING
**Impact**: Range sliders (volume, noise gate, etc.) may show default browser track styling instead of themed tracks on some browsers.

**Upstream** `upstream_style.css` L1025-1038:
```css
input[type="range"]:not(.rgb-slider) {
  --track-bg: var(--bg-tertiary);
  --track-h: 4px;
  --track-r: 2px;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: var(--track-h);
  background: var(--track-bg);
  border-radius: var(--track-r);
  outline: none;
}
input[type="range"]:not(.rgb-slider)::-webkit-slider-thumb { ... }
input[type="range"]:not(.rgb-slider)::-moz-range-track { ... }
```

**Ours**: Has specific slider classes (`.volume-slider`, `.slider-sm`, `.hue-slider`) but NO generic `input[type="range"]` base styling. Individual sliders may be inconsistent.

---

### 9. Effect Speed Slider for Theme Animations
**Status**: ❌ MISSING
**Impact**: Theme creative effects (campfire, snowfall, etc.) run at fixed speed — no user control.

**Upstream** `upstream_app.html` L107-113:
```html
<div id="effect-speed-editor" style="display:none">
  <label class="settings-label">Effect Speed</label>
  <input type="range" id="effect-speed-slider" min="0" max="5" step="0.1" value="1">
  <span id="effect-speed-value">1×</span>
</div>
```

Sets `--fx-mult` CSS variable used in all theme animations via `calc()`:
- `animation-duration: calc(2s / var(--fx-mult, 1))`
- Controls speed of: campfire glow, snowfall, matrix rain, CRT flicker, FFX water, etc.

---

## P2 — Nice-to-Have / Polish

### 10. Retro Themes: Fallout & CRT
**Status**: ⚠️ PARTIAL — We have Win95 + WinXP but NOT Fallout or CRT
**Impact**: Missing two popular retro themes.

**Upstream** `upstream_style.css` L830-990:

**Fallout** (PIP-Boy green):
- `Share Tech Mono` font, phosphor green `#33ff33`
- Scanline overlay, vignette effect
- Fallout phosphor glow animation on brand text

**CRT** (amber terminal):
- `VT323` font, amber `#ffb000`
- Heavy scanlines, screen curvature via CSS transform
- `crt-flicker` animation (opacity/brightness flicker)

---

### 11. Theme Creative Effects with `--fx-mult`
**Status**: ❌ MISSING
**Impact**: Themes lack ambient effects that make them immersive.

**Upstream** `upstream_style.css` L1265-1500 — Creative effects per theme:
| Theme | Effect |
|-------|--------|
| Fallout | Phosphor glow + vignette overlay |
| CRT | Screen curvature + `crt-flicker` animation |
| FFX | Flowing water gradient overlay + wave bar |
| Ice | SVG-masked icicles + frost shimmer |
| Nord | Snowfall particles (3 pseudo-elements) |
| Dark Souls | Campfire glow (sidebar + fireline + ambient flicker) |
| Bloodborne | Blood-red vignette pulse |
| Matrix | Digital rain animation |
| Cyberpunk | Glitch effect on brand text |
| Abyss | Deep ocean pressure vignette |
| LoTR | Candlelight flicker |
| Minecraft | Pixelated border-image |

All use `var(--fx-mult, 1)` for speed control.

---

### 12. YouTube Music URL Support
**Status**: ❌ MISSING
**Impact**: `music.youtube.com/watch?v=...` URLs don't embed as playable music.

**Upstream** `upstream_app.js` L3808-3812 — `_getMusicEmbed` handles `music.youtube.com`:
```js
const ytMusicMatch = url.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
if (ytMusicMatch) return `https://www.youtube.com/embed/${ytMusicMatch[1]}?autoplay=1&enablejsapi=1&origin=...`;
```

Our code appears to use a separate Spotify integration module (`spotify.js`) rather than the upstream's inline `_getMusicEmbed` approach. Need to verify if YouTube Music is handled in our `spotify.js` or music system.

---

### 13. Screen Share Audio Separation & Controls
**Status**: ❌ MISSING (or simplified)
**Impact**: Screen share audio/video may not be properly separated, and per-stream volume controls may be absent.

**Upstream** `upstream_voice.js` L400-440 — sophisticated `ontrack` handler:
- Deferred audio pattern: separates screen share audio from mic audio
- Screen audio plays through dedicated gain node for independent volume
- `_handleScreenAudio` / `_handleScreenNoAudio` badge display

**Upstream** `upstream_app.js` L2810-2910 — stream tile audio controls:
- Per-stream mute button + volume slider (0-200%)
- Volume persisted to `haven_stream_volumes` localStorage
- Audio badge ("🔊 Audio" / "🔇 No Audio") on each tile

---

### 14. Idle Auto-Away Detection
**Status**: Need to verify in our code
**Impact**: Users show as "online" even when AFK.

**Upstream** `upstream_app.js` L4698-4720 — `_setupIdleDetection()`:
- Listens to `mousemove`, `keydown`, `click`, `scroll`
- After 5 minutes idle → auto-sets status to `away`
- On activity resume → restores to `online`
- Tracks `_wasAutoAway` flag to not override manual away

---

## Port Priority Summary

| # | Item | Priority | Effort | Requires Server |
|---|------|----------|--------|-----------------|
| 1 | Voice reconnect | P0 | Low | No* |
| 2 | Screen share double picker | P0 | Low | No |
| 3 | Session-info avatar sync | P0 | Low | Yes |
| 4 | Server-side avatar system | P1 | High | Yes |
| 5 | Message avatars for others | P1 | Med | Yes (needs #4) |
| 6 | User list avatars + status dots | P1 | Med | Yes (needs #4) |
| 7 | Channel context menu | P1 | Med | No |
| 8 | Slider track CSS fix | P1 | Low | No |
| 9 | Effect speed slider | P1 | Low | No |
| 10 | Fallout & CRT themes | P2 | Med | No |
| 11 | Theme creative effects | P2 | High | No |
| 12 | YouTube Music embed | P2 | Low | No |
| 13 | Screen share audio controls | P2 | Med | No |
| 14 | Idle auto-away | P2 | Low | No |

*Voice-rejoin requires the server to handle the `voice-rejoin` event — verify server.js has this.

---

## Recommended Port Order

**Phase 1 — Quick P0 wins** (< 1 hour):
1. ✅ Voice reconnect (`_resyncState` + `voice-rejoin`)
2. ✅ Screen share `surfaceSwitching` fix
3. ✅ Slider track CSS base styling

**Phase 2 — UI/UX improvements** (2-4 hours):
4. Channel context menu (HTML + CSS + JS)
5. Effect speed slider
6. YouTube Music embed support
7. Idle auto-away detection

**Phase 3 — Avatar system** (requires server work):
8. Server-side avatar upload API
9. Avatar sync on session-info
10. Message avatars for all users
11. User list avatars + status dot shapes

**Phase 4 — Visual polish** (4-8 hours):
12. Fallout + CRT retro themes
13. Theme creative effects with `--fx-mult`
14. Screen share audio separation + controls
