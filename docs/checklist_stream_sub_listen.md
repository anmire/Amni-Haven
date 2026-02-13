# Checklist: Stream Controls, Subchannels, Listen Together

## Stream Controls (maximize, volume, resolution)
- [x] Add fullscreen/maximize button to each screen-share tile (app.js `_handleScreenStream`)
- [x] Add volume slider to each tile for screen audio
- [x] Add resolution quality selector (dropdown) to each tile
- [x] Add CSS for new tile controls (overlay toolbar)
- [x] Wire fullscreen API (`requestFullscreen`) on tile click

## Subchannels
- [x] Add `parent_id` column to channels table (database.js migration)
- [x] Update `create-channel` socket handler to accept `parentId` (socketHandlers.js)
- [x] Update `get-channels` to return `parent_id` (socketHandlers.js)
- [x] Update `_renderChannels()` to render nested tree with collapse (app.js)
- [x] Add parent channel selector in create-channel UI (app.html)
- [x] Add subchannel indentation + toggle CSS (style.css)

## Listen Together (Spotify / media cast)
- [x] Add `listen_sessions` table to database.js
- [x] Add socket events: `listen-start`, `listen-sync`, `listen-stop`, `listen-join` (socketHandlers.js)
- [x] Add Listen Together UI panel/button in sidebar or header (app.html)
- [x] Add client-side listen-together logic with embedded player (app.js)
- [x] Add CSS for listen-together panel and controls (style.css)
- [x] Sync playback state (play/pause/seek/track URL) across participants

## Post-implementation
- [x] Run linter / error check
- [x] Test server starts clean
- [x] Update CHANGELOG.md
- [x] Update architecture docs
