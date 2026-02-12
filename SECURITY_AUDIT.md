# Haven Security & Bug Audit — v1.3.2-sc
## Date: 2026-02-11
---
## 🐛 Bugs Found
### 1. Listen Together — No URL Protocol Validation (MEDIUM)
**File:** `src/socketHandlers.js` line 1622
**Issue:** `listen-start` accepts any URL without validating protocol. A malicious user could submit `javascript:` or `data:` URLs that get embedded in iframes.
**Fix:** Add URL validation to only allow `https://` URLs from known embed providers.
### 2. Listen Together — Fallback URL Returns Raw Input (LOW)
**File:** `public/js/app.js` `_buildEmbedUrl()`
**Issue:** If URL doesn't match YouTube/Spotify/SoundCloud/Vimeo patterns, the raw URL is returned and used in iframe src. Combined with bug #1, this could enable XSS.
**Fix:** Return empty string or placeholder for unrecognized URLs.
### 3. Missing Rate Limit on Listen Events (LOW)
**File:** `src/socketHandlers.js`
**Issue:** `listen-start`, `listen-sync`, `listen-stop` have no rate limiting. Could be spammed to annoy channel members.
**Fix:** Add debounce or rate limiting.
---
## 🔐 Vulnerabilities Found
### 1. XSS via Listen Together URL Injection (HIGH)
**Vector:** User submits `javascript:alert('xss')` as listen URL → server stores it → broadcasts to all channel members → client embeds it in iframe.
**Impact:** Script execution in other users' browsers.
**Fix:** Whitelist URL protocols (https only) + validate against known embed domains.
### 2. Iframe Embed Missing Sandbox (MEDIUM)
**File:** `public/js/app.js` line 2186
**Issue:** Listen Together iframe lacks `sandbox` attribute. If a malicious URL gets through, it has full access.
**Fix:** Add `sandbox="allow-scripts allow-same-origin"` to iframe.
---
## ✅ Security Positives
- All SQL uses parameterized prepared statements (no SQLi)
- XSS protection via `_escapeHtml()` on most user content
- Socket.IO CORS disabled (same-origin only)
- Admin operations properly gated with `isAdmin` checks
- JWT tokens validated on every socket connection
- Rate limiting on auth endpoints, uploads, bot webhooks
- Sensitive files (.env, certs/, pixelCipher.js) properly gitignored
- No secrets in git history (pixelCipher purged via filter-branch)
---
## 📋 Fixes Applied
- [x] URL Protocol Validation on `listen-start` — whitelists YouTube, Spotify, SoundCloud, Vimeo
- [x] Whitelist embed domains in `_buildEmbedUrl()` — returns empty string for unrecognized URLs
- [x] Add `sandbox` to listen embed iframe — `allow-scripts allow-same-origin allow-presentation`
- [ ] Debounce listen events (optional, low priority)
---
## 📦 Upstream Features (v1.3.6) — Future Merge Candidates
- **NS sensitivity slider** — replaces toggle with 0-100 slider (v1.3.5+)
- **RGB cycling theme** — hue-shifting rainbow theme (v1.3.5+)
- **Stream size slider** — adjustable stream viewer height (v1.3.6)
- **Theme popup menu** — themes in floating popup vs sidebar section (v1.3.6)
- **DM voice persistence** — voice buttons stay visible when viewing DMs (v1.3.6)
These require refactoring and may conflict with our custom features (subchannels, listen-together, stream controls).
