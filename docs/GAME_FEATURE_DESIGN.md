# Legacy Game Together — Design Document
## Overview
A "Game Together" channel type that allows Haven users to play classic/retro games together, including:
- **Flash Games** (via Ruffle, the open-source Flash emulator)
- **Retro Console Games** (via EmulatorJS, open-source browser emulator) — **⚠️ Experimental: not fully functional yet**
- **HTML5 Ports/Remakes** of classic games
---
## Architecture
### 1. Game Channel Type
Add `channel_type = 'game'` alongside text/voice/both.
Game channels display a game embed area instead of message feed.
### 2. Game Lobby System
- Host picks a game from library → starts session
- Other users in channel see "Join Game" prompt
- Voice chat works alongside gameplay
- Spectator mode for non-players
### 3. Technology Stack
| Type | Technology | Games Supported |
|------|------------|-----------------|
| Flash | [Ruffle](https://ruffle.rs/) | Bubble Tanks, Armor Games classics, Newgrounds library |
| Retro | [EmulatorJS](https://emulatorjs.org/) | NES, SNES, GBA, N64, PS1, Genesis |
| HTML5 | Native iframe embeds | io games, web remakes |
### 4. Game Library Structure
```
/games/
  library.json          # Game catalog metadata
  flash/                # .swf files
  roms/                 # ROM files (user-supplied, gitignored)
  html5/                # HTML5 game folders
  emulators/
    ruffle.js           # Ruffle Flash emulator
    emulatorjs/         # EmulatorJS cores
```
### 5. library.json Schema
```json
{
  "games": [
    {
      "id": "bubble-tanks-3",
      "title": "Bubble Tanks 3",
      "type": "flash",
      "file": "flash/bubble-tanks-3.swf",
      "multiplayer": false,
      "description": "Armor Games classic tank shooter"
    },
    {
      "id": "tanks-armor-games",
      "title": "Tanks (Armor Games)",
      "type": "flash",
      "file": "flash/tanks.swf",
      "multiplayer": true,
      "maxPlayers": 4
    },
    {
      "id": "mario-bros-3",
      "title": "Super Mario Bros 3",
      "type": "nes",
      "file": "roms/smb3.nes",
      "multiplayer": false
    }
  ]
}
```
### 6. Socket Events
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `game-start` | client→server | `{gameId, channelCode}` | Host starts game |
| `game-join` | client→server | `{channelCode}` | User joins game |
| `game-state` | server→client | `{gameId, hostId, players[], state}` | Sync game state |
| `game-input` | client→server | `{type, data}` | Input for multiplayer sync |
| `game-end` | client→server | `{channelCode}` | End game session |
### 7. Multiplayer Approaches
**Option A: Host-Based (Simple)**
- Host runs game, streams WebRTC video to others
- Others watch + voice chat
- Good for: single-player games, co-op viewing
**Option B: Input Sync (Advanced)**
- All clients run same emulator
- Inputs synced via WebSocket (lockstep or rollback)
- Good for: turn-based, simple arcade games
- Uses: netplay built into EmulatorJS
**Option C: Shared State (Complex)**
- Server runs game headlessly
- Streams frame buffer to clients
- Good for: any game, but requires server GPU
### 8. UI Components
```html
<!-- Game Channel View -->
<div id="game-area" class="game-area">
  <div class="game-header">
    <span id="game-title">No game selected</span>
    <button id="game-library-btn">📚 Library</button>
    <button id="game-fullscreen-btn">⛶</button>
  </div>
  <div id="game-container" class="game-container">
    <!-- Ruffle/EmulatorJS/iframe injected here -->
  </div>
  <div id="game-players" class="game-players">
    <!-- Player avatars/names -->
  </div>
</div>
<!-- Game Library Modal -->
<div id="game-library-modal" class="modal">
  <div class="game-grid">
    <!-- Game cards populated from library.json -->
  </div>
</div>
```
### 9. Ruffle Integration
```javascript
// Load Ruffle
window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = { autoplay: "on", unmuteOverlay: "hidden" };
const ruffle = window.RufflePlayer.newest();
const player = ruffle.createPlayer();
player.style.width = "100%";
player.style.height = "100%";
document.getElementById('game-container').appendChild(player);
player.load("/games/flash/bubble-tanks-3.swf");
```
### 10. EmulatorJS Integration
```javascript
// EmulatorJS config
EJS_player = "#game-container";
EJS_core = "nes"; // nes, snes, gba, n64, psx, etc.
EJS_gameUrl = "/games/roms/smb3.nes";
EJS_pathtodata = "/games/emulators/emulatorjs/";
EJS_startOnLoaded = true;
// Load script
const script = document.createElement('script');
script.src = '/games/emulators/emulatorjs/loader.js';
document.body.appendChild(script);
```
---
## Legal Considerations
⚠️ **Flash Games**: Many Flash games are abandonware. Only include games with explicit permission or from open libraries (Flashpoint, Newgrounds open-source).
⚠️ **ROMs**: Do NOT distribute copyrighted ROMs. Provide empty `/games/roms/` folder and let users supply their own.
⚠️ **Castle Crashers**: This is a commercial game — cannot be redistributed. Only free/open-source games in the library.
---
## Implementation Phases
### Phase 1: Flash Games (Ruffle)
- [ ] Add Ruffle to `/games/emulators/`
- [ ] Create library.json with curated free Flash games
- [ ] Add game channel UI (library modal, embed container)
- [ ] Basic game-start/game-end socket events
### Phase 2: Retro Emulation (EmulatorJS)
- [ ] Add EmulatorJS cores (NES, SNES, GBA)
- [ ] ROM upload for admin (stored locally, never git)
- [ ] EmulatorJS integration with controller support
### Phase 3: Multiplayer Sync
- [ ] Input sync for 2-player games
- [ ] Host streaming via WebRTC for spectators
- [ ] Leaderboard integration
### Phase 4: HTML5 Games
- [ ] Curated HTML5 game library (io games, web remakes)
- [ ] iframe sandbox integration
---
## Example Games to Include
### Flash (Ruffle-compatible, free/open)
- Bubble Tanks 1, 2, 3 (Armor Games)
- Tanks (Armor Games)
- Pico series (Newgrounds)
- SHIFT series
- Learn to Fly series
- Interactive Buddy
- Bloons Tower Defense 1-4 (check licensing)
### Retro (user-supplied ROMs)
- NES: Mario, Zelda, Mega Man
- SNES: Zelda LttP, Super Metroid
- GBA: Pokemon, Advance Wars
- Genesis: Sonic series
### HTML5 (free web games)
- Slither.io, Agar.io (external iframe)
- 2048, Cookie Clicker
- WebQuake, WebDoom
---
## Files to Create/Modify
| File | Changes |
|------|---------|
| `public/games/` | New folder for game assets |
| `public/games/library.json` | Game catalog |
| `public/games/emulators/ruffle/` | Ruffle WASM files |
| `public/games/emulators/emulatorjs/` | EmulatorJS cores |
| `src/database.js` | Add `game_sessions` table |
| `src/socketHandlers.js` | Add game socket events |
| `public/app.html` | Add game UI components |
| `public/js/app.js` | Add game management logic |
| `public/js/games.js` | New file: game loader, Ruffle/EJS integration |
| `public/css/style.css` | Game UI styles |
| `.gitignore` | Ignore `/games/roms/` |
