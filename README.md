
<p align="center">
  <img width="180" src="https://img.shields.io/badge/⬡-HAVEN-7289da?style=for-the-badge&labelColor=1a1a2e" alt="Haven" />
</p>

<h3 align="center">Self-hosted private chat, voice, screen share, and retro gaming — your server, your rules.</h3>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-7289da" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT--NC-green" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node" />
  <img src="https://img.shields.io/badge/platform-Win%20%7C%20Linux%20%7C%20Mac-lightgrey" alt="Platform" />
</p>

<p align="center">
  <a href="https://ko-fi.com/ancsemi">☕ Support Haven on Ko-fi</a>
</p>

---

## Features

### 🎮 36-System Retro Emulator + 13 Built-In Games
Haven ships with an **entire arcade**.

**5 HTML5 canvas games** (Tanks, Snake Battle, Tetris Battle, Asteroids, Breakout) and **8 Flash games** via Ruffle.js (Bubble Tanks 3, Super Smash Flash 1 & 2, Learn to Fly series, Flight, Tanks Flash).

Load your own legally-owned ROMs and play right in the browser — NES, SNES, N64, PS1, PS2, PSP, GBA, Genesis, GameCube, Dreamcast, Arcade, DOS, and 24 more systems. All cores are libretro WASM builds from the EmulatorJS CDN.

> **⚠️ EmulatorJS integration is experimental** — some systems may not load correctly. HTML5 and Flash games are fully functional.

<details>
<summary>Full console list (36 systems)</summary>

| System | Core | System | Core |
|--------|------|--------|------|
| NES | fceumm | Game Boy | gambatte |
| SNES | snes9x | GBC | gambatte |
| N64 | mupen64plus_next | GBA | mgba |
| PS1 | pcsx_rearmed | NDS | melonds |
| PS2 | pcsx2 | PSP | ppsspp |
| GameCube | dolphin | Dreamcast | flycast |
| Xbox | xemu | Genesis / MD | genesis_plus_gx |
| Master System | smsplus | Game Gear | genesis_plus_gx |
| Sega CD | genesis_plus_gx | 32X | picodrive |
| Saturn | yabause | Arcade (FBNeo) | fbneo |
| DOS | dosbox_pure | DOOM | prboom |
| Atari 2600 | stella2014 | Atari 5200 | a5200 |
| Atari 7800 | prosystem | Atari Lynx | handy |
| Atari Jaguar | virtualjaguar | TurboGrafx-16 | mednafen_pce |
| PC-FX | mednafen_pcfx | WonderSwan | mednafen_wswan |
| Neo Geo Pocket | mednafen_ngp | ColecoVision | gearcoleco |
| Virtual Boy | beetle_vb | C64 | vice_x64sc |
| Amiga | puae | 3DO | opera |

</details>

### 🎨 27+ Visual Themes
All upstream themes plus fork-exclusive additions:
- **Dark Souls** 🔥 — ember glow, bonfire warmth
- **Elden Ring** 💍 — golden grace, Erdtree light
- **Minecraft** ⛏️ — dirt-block brown, creeper green
- **Final Fantasy X** ⚔️ — Zanarkand pyrefly blues
- **Zelda** 🗡️ — Hyrule field green, Triforce gold
- **Triangle Morph** 🔺 — barycentric Chill/Heat/Dream blend with glassmorphism
- **RGB Cycling** 🌈 — animated hue rotation
- **Custom Palette** 🎨 — user-defined colors

### 🧙 First-Run Setup Wizard
New users get a guided 4-step wizard: Server Identity → Network & Access (LAN/port-forward/tunnel, SSL) → Features → Review & Launch. Generates `.env` automatically with auto-SSL cert generation option.

### 🔧 Quality-of-Life Additions
- **Mod Mode** — drag-and-drop sidebar section reordering with layout persistence
- **Spotify Premium integration** — OAuth + Web Playback SDK for Listen Together
- **Display names** — separate from login username
- **Donate button** — Ko-fi link in sidebar bottom bar
- **Sidebar expand/collapse** — toggle buttons for sidebars
- **Two-panel layout** — no right sidebar, everything in the left panel
- **N64 fallback** — auto-detects WebGL2/SharedArrayBuffer, falls back to parallel_n64 core

### 🐛 Bug Fixes
- Flash game black boxes (CSP fix for Ruffle CDN)
- EmulatorJS container rendering (CSS reset before game init)
- N64 emulation fallback (WebGL2/SharedArrayBuffer detection → parallel_n64)
- SSL bat file protocol detection ([upstream #2](https://github.com/ancsemi/Haven/issues/2))
- Admin status & display name preserved on reconnect
- Stream close tile fix, ROM loading 0×0 canvas fix
- GIF picker z-index, tunnel/status 403, CORS health check
- Mobile tap-to-reveal message toolbar

---

## Getting Started

**Quick version (Windows):**

1. Install [Node.js](https://nodejs.org/) (LTS) and restart your PC
2. Download / clone this repo
3. Double-click **`Start Haven.bat`** — first-run wizard guides you through setup
4. Browser opens → register with your admin username → create channels → share your IP + channel code

**Quick version (Linux / macOS):**
```bash
chmod +x start.sh && ./start.sh
```

---

## Theme Gallery

<img width="1917" height="947" alt="Theme gallery showing Haven themes" src="https://github.com/user-attachments/assets/b47be23a-853c-42f8-94a2-d6adcb206966" />

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full log. Current version: **2.0.0**.

---

## License

MIT-NC — free to use, modify, and share.

---

<p align="center">
  <a href="https://ko-fi.com/ancsemi"><img src="https://img.shields.io/badge/Ko--fi-Support%20Haven-ff5e5b?logo=ko-fi&logoColor=white&style=for-the-badge" alt="Ko-fi" /></a>
</p>

<p align="center">
  <b>⬡ Haven</b> — your server, your arcade, your rules.
</p>
