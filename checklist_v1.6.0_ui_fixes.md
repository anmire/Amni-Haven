# v1.6.0 Checklist — UI Fixes, Cross-Server Ping, Mobile Optimization

## Changes

- [ ] 1. **Cross-server ping** — Add `/api/ping` endpoint on server.js to accept incoming pings; add `sendPing()` to ServerManager; add UI to right-click server icon → ping user; toast notification on recipient
- [ ] 2. **Screen share bug** — Fix `_hideScreenShare()` so when `isScreenSharing=false` and stream ended (browser "Stop sharing"), the container hides properly instead of re-toggling share. Also handle `screenStream.onended` properly when tracks already stopped
- [ ] 3. **ROM/game overflow** — Add `max-height` + `overflow: auto` to game-together-panel and game-container so ROM doesn't overflow main window; ensure scrollable
- [ ] 4. **Resizable sidebars** — Add CSS `resize: horizontal` or JS drag handles on left/right sidebars; persist width in localStorage
- [ ] 5. **Voice controls to bottom toolbar** — Move voice/share/games/listen/filter buttons from channel-header to a fixed bottom bar above status-bar; keep channel management (search, pinned, members) in header
- [ ] 6. **Mobile optimization** — Fix overflow/overlap issues: constrain game panel, screen share, voice bottom bar for mobile; prevent content from overflowing viewport; ensure no z-index conflicts
- [ ] 7. **Update CHANGELOG, ARCHITECTURE, package.json, cache-bust**
- [ ] 8. **Test + commit + push**
