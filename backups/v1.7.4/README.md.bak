
<p align="center">
  <img width="180" src="https://img.shields.io/badge/⬡-AMNI--HAVEN-7289da?style=for-the-badge&labelColor=1a1a2e" alt="Amni-Haven" />
</p>

<h3 align="center">A turbocharged fork of <a href="https://github.com/ancsemi/Haven">Haven</a> — self-hosted private chat, voice, screen share, and retro gaming.</h3>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.3.9-7289da" alt="Version" />
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

### 🎮 32-System Retro Emulator
Haven ships with a mini-game. Amni-Haven ships with an **entire arcade**.

Load your own legally-owned ROMs and play right in the browser — NES, SNES, N64, PS1, PSP, GBA, Genesis, Arcade, DOS, and 23 more systems. All cores are correct libretro WASM builds served from the EmulatorJS CDN.

<details>
<summary>Full console list (32 playable + 4 coming soon)</summary>

| System | Core | System | Core |
|--------|------|--------|------|
| NES | fceumm | Game Boy | gambatte |
| SNES | snes9x | GBC | gambatte |
| N64 | mupen64plus_next | GBA | mgba |
| PS1 | mednafen_psx_hw | NDS | melonds |
| PSP | ppsspp | Genesis / MD | genesis_plus_gx |
| Arcade | mame2003_plus | Neo Geo | fbalpha2012_neogeo |
| DOS | dosbox_pure | Atari 2600 | stella2014 |
| Atari 7800 | prosystem | Atari Lynx | handy |
| Atari Jaguar | virtualjaguar | TurboGrafx-16 | mednafen_pce |
| WonderSwan | mednafen_wswan | WonderSwan Color | mednafen_wswan |
| Virtual Boy | mednafen_vb | Neo Geo Pocket | mednafen_ngp |
| 32X | picodrive | ColecoVision | gearcoleco |
| Intellivision | freeintv | Vectrex | vecx |
| MSX | fmsx | MSX2 | fmsx |
| Sega Saturn | yabause | 3DO | opera |
| PC-FX | mednafen_pcfx | PC Engine CD | mednafen_pce |
| *GameCube* | *coming soon* | *PS2* | *coming soon* |
| *Dreamcast* | *coming soon* | *Xbox* | *coming soon* |

</details>

### 🎨 18 Visual Themes (6 Fork-Exclusive)
All 12 upstream Haven themes plus:
- **Dark Souls** 🔥 — ember glow, bonfire warmth
- **Elden Ring** 💍 — golden grace, Erdtree light
- **Minecraft** ⛏️ — dirt-block brown, creeper green
- **Final Fantasy X** ⚔️ — Zanarkand pyrefly blues
- **Zelda** 🗡️ — Hyrule field green, Triforce gold
- **Triangle Morph** 🔺 — barycentric Chill/Heat/Dream blend with glassmorphism

### 🔧 Quality-of-Life Additions
- **Spotify Premium integration** — OAuth + Web Playback SDK for Listen Together
- **Display names** — separate from login username
- **Sidebar expand/collapse** — toggle buttons for both sidebars
- **Emulator error handling** — script.onerror + load timeout recovery
- **Unsupported console guard** — GameCube/PS2/Dreamcast/Xbox greyed out as "Coming Soon"
- **Stream close actually works** — tile × stops your stream or dismisses remote tiles
- **ROM loading fix** — game container visible before EmulatorJS bootstraps (no more 0×0 canvas)
- **Expanded ROM file picker** — 40+ file extensions covering all 32 systems

### 🐛 Bug Fixes Ported from Upstream
- SSL bat file protocol detection ([upstream #2](https://github.com/ancsemi/Haven/issues/2))
- Admin status & display name preserved on reconnect
- Stale JS/CSS after deploy (ETag revalidation replaces maxAge caching)
- Mobile tap-to-reveal message toolbar

### 🐛 Fork-Original Bug Fixes
- GIF picker z-index overlap
- Theme background opacity visibility
- Tunnel/status 403 auth header
- CORS health check URL extraction
- EmulatorJS cleanup crash prevention
- Emulator timeout false-positive on slow loads

---

## Getting Started

> Full setup docs (port forwarding, SSL, Linux/macOS, configuration, etc.) are in the upstream [Haven README](https://github.com/ancsemi/Haven#readme). Everything there applies here — Amni-Haven is a drop-in replacement.

**Quick version (Windows):**

1. Install [Node.js](https://nodejs.org/) (LTS) and restart your PC
2. Download / clone this repo
3. Double-click **`Start Haven.bat`**
4. Browser opens → register with `admin` username → create channels → share your IP + channel code

**Quick version (Linux / macOS):**
```bash
chmod +x start.sh && ./start.sh
```

---

## Theme Gallery

<img width="1917" height="947" alt="Theme gallery showing Haven themes" src="https://github.com/user-attachments/assets/b47be23a-853c-42f8-94a2-d6adcb206966" />

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full log. Current version: **1.3.9**.

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
