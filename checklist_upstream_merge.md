# Checklist: Upstream Merge v1.7.7

Porting critical fixes, security patches, and theme updates from upstream Haven v1.5.0.

## Server Security (P0)
- [x] Add HSTS, referrerPolicy to helmet config
- [x] Add Permissions-Policy + X-Content-Type-Options middleware
- [x] Upload serving: force-download Content-Disposition for non-images
- [x] Upload endpoint: magic bytes validation (JPEG/PNG/GIF/WEBP)
- [x] Add /api/upload-avatar endpoint
- [x] GIF endpoints: add auth + rate limiting
- [x] Link preview: SSRF protection (hostname blocklist + DNS resolve)
- [x] Link preview: add rate limiter
- [x] SSL redirect: hardcode localhost, rate limit, CRLF sanitize, Slowloris protection
- [x] Main server: anti-Slowloris timeouts (headersTimeout, requestTimeout, keepAliveTimeout)

## Client Bug Fixes (P0)
- [x] socketHandlers: fetch avatar from DB in auth middleware
- [x] socketHandlers: include avatar in session-info emit
- [x] app.js: emit voice-rejoin in _resyncState when in voice
- [x] voice.js: add surfaceSwitching:'exclude' to getDisplayMedia options

## Database
- [x] Add avatar column migration to database.js

## Final
- [x] Run syntax checks (node -c on all files)
- [x] Test server startup (boots clean, HTTPS + redirect working)
- [x] Update CHANGELOG.md
- [ ] Git commit + push
