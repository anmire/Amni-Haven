
<p align="center">
  <img width="180" src="https://img.shields.io/badge/⬡-AMNI--HAVEN-7289da?style=for-the-badge&labelColor=1a1a2e" alt="Amni-Haven" />
</p>

<h3 align="center">A turbocharged fork of <a href="https://github.com/ancsemi/Haven">Haven</a> — self-hosted private chat, voice, screen share, and retro gaming.</h3>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.7.4-7289da" alt="Version" />
  <img src="https://img.shields.io/badge/upstream-Haven%20v1.4.5-orange" alt="Upstream" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node" />
  <img src="https://img.shields.io/badge/platform-Win%20%7C%20Linux%20%7C%20Mac-lightgrey" alt="Platform" />
</p>

<p align="center">
  <a href="https://ko-fi.com/ancsemi">☕ Support the original Haven developer on Ko-fi</a>
</p>

---

## Why This Fork?

[Haven](https://github.com/ancsemi/Haven) by **ancsemi** is an excellent self-hosted chat server — no cloud, no Big Tech accounts, no telemetry. Amni-Haven builds on that foundation with a heavier focus on **retro gaming**, **visual themes**, and **quality-of-life fixes**.

If you want the clean upstream experience, go use [Haven](https://github.com/ancsemi/Haven). If you want 32 emulated consoles, Dark Souls themes, and a bunch of extra polish — you're in the right place.

---

## What's Different Here

### 🎮 36-System Retro Emulator + 13 Built-In Games
Haven ships with a mini-game. Amni-Haven ships with an **entire arcade**.

**5 HTML5 canvas games** (Tanks, Snake Battle, Tetris Battle, Asteroids, Breakout) and **8 Flash games** via Ruffle.js (Bubble Tanks 3, Super Smash Flash 1 & 2, Learn to Fly series, Flight, Tanks Flash).

Load your own legally-owned ROMs and play right in the browser — NES, SNES, N64, PS1, PS2, PSP, GBA, Genesis, GameCube, Dreamcast, Arcade, DOS, and 24 more systems. All cores are libretro WASM builds from the EmulatorJS CDN.

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

### 📦 Distributable EXE Build (v1.7.4)
Run `build-exe.bat` to compile Haven into a standalone **AmniHaven.exe** with PixelCipher-256 baked in. Node.js bundled inside — no install required for end users.

### 🧙 First-Run Setup Wizard (v1.7.4)
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

> Full setup docs (port forwarding, SSL, Linux/macOS, configuration, etc.) are in the upstream [Haven README](https://github.com/ancsemi/Haven#readme). Everything there applies here — Amni-Haven is a drop-in replacement.

**Quick version (Windows):**

1. Install [Node.js](https://nodejs.org/) (LTS) and restart your PC
2. Download / clone this repo
3. Double-click **`Start Amni-Haven.bat`** — first-run wizard guides you through setup
4. Browser opens → register with your admin username → create channels → share your IP + channel code

**Standalone EXE (no Node.js required):**
1. Run `build-exe.bat` to compile → outputs `dist/AmniHaven.exe`
2. Copy the entire `dist/` folder to any Windows machine
3. Run `AmniHaven.exe` → setup wizard opens in browser

**Quick version (Linux / macOS):**
```bash
chmod +x start.sh && ./start.sh
```

---

## Theme Gallery

<img width="1917" height="947" alt="Theme gallery showing Haven themes" src="https://github.com/user-attachments/assets/b47be23a-853c-42f8-94a2-d6adcb206966" />

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full log. Current version: **1.7.4**.

---

## Relationship to Upstream

Amni-Haven tracks [ancsemi/Haven](https://github.com/ancsemi/Haven) as an upstream remote. Bug fixes flow both directions when applicable. The upstream project is the source of truth for core architecture — this fork focuses on additive features and extended platform support.

**If you like what Haven does, support the original developer:**

<p align="center">
  <a href="https://ko-fi.com/ancsemi"><img src="https://img.shields.io/badge/Ko--fi-Support%20ancsemi-ff5e5b?logo=ko-fi&logoColor=white&style=for-the-badge" alt="Ko-fi" /></a>
</p>

---

## License

MIT — free to use, modify, and share.

Original project: [ancsemi/Haven](https://github.com/ancsemi/Haven)

---

<p align="center">
  <b>⬡ Amni-Haven</b> — your server, your arcade, your rules.
</p>
