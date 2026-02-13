# Checklist: v1.7.1 UI Restructure + Flash Games

## Remove Shippy Container
- [x] Remove `<button id="play-flappy-btn">` from app.html
- [x] Remove flappy event listeners from app.js
- [x] Remove `socket.emit('get-high-scores', {game:'flappy'})` from app.js
- [x] Remove flappy score references from `_renderOnlineUsers`
- [x] Remove flappy score badge from `_renderUserItem`
- [x] Remove `.btn-game-sidebar` CSS block from style.css
- [x] Remove highScores property and high-scores socket listener

## Move Voice/Listen/Games Buttons to Sidebar Bottom
- [x] Remove voice-join, listen-together, game-together from voice-toolbar in app.html
- [x] Add sidebar-voice-actions section in left sidebar (where Shippy was)
- [x] Keep mute/deafen/share/filter/leave in voice-toolbar
- [x] Update `_updateVoiceButtons` to show sidebar buttons correctly
- [x] Update `_switchChannel` to show sidebar buttons
- [x] Update `_showWelcome` to hide sidebar buttons
- [x] Add CSS for sidebar voice action buttons

## Move Online Users to Status Bar Overlay
- [x] Remove Online panel from right sidebar in app.html
- [x] Make status-online-count a clickable button in status bar
- [x] Add overlay popup div for online/offline user list
- [x] Update `_renderOnlineUsers` to populate overlay + sidebar
- [x] Add CSS for overlay popup
- [x] Add click-outside-to-close behavior

## Integrate Ruffle for Flash SWFs
- [x] Add Ruffle.js CDN script to app.html
- [x] Add Flash game entries to FLASH_GAMES array
- [x] Create `_loadFlashGame(swfPath)` method in GameManager
- [x] Update `startHTML5Game` to handle Flash type
- [x] Map SWF filenames to friendly names

## Flash Game Mappings
- [x] Bubble Tanks 3.swf -> "Bubble Tanks 3"
- [x] tanks.swf -> "Tanks (Flash)"
- [x] ssf2-2007_20210626.swf -> "Super Smash Flash 2"
- [x] SuperSmash.swf -> "Super Smash Bros Flash"
- [x] learn-to-fly-3.swf -> "Learn to Fly 3"
- [x] secure_Learn2Fly.swf -> "Learn to Fly"
- [x] flash_learn-to-fly.swf -> "Learn to Fly (Classic)"
- [x] flight-759879f9.swf -> "Flight"

## Finalize
- [x] Update CHANGELOG.md
- [x] Bump version to 1.7.1
- [x] Run linters (0 errors)
- [x] Verify integration (no orphan refs)
