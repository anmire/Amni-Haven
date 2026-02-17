#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#  Haven — Interactive Setup & Usage Wizard (Linux / macOS)
#  One-click guided walkthrough for new server hosters
# ══════════════════════════════════════════════════════════════

set -euo pipefail

HAVEN_DIR="$(cd "$(dirname "$0")" && pwd)"
HAVEN_DATA="${HAVEN_DATA_DIR:-$HOME/.haven}"
STEP=0
TOTAL_STEPS=8

# ── Colors ────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────
header() {
    STEP=$((STEP + 1))
    clear
    echo ""
    printf "  ${CYAN}┌────────────────────────────────────────────────────┐${RESET}\n"
    printf "  ${CYAN}│${RESET}            ${BOLD}⬡  HAVEN SETUP WIZARD${RESET}                  ${CYAN}│${RESET}\n"
    printf "  ${CYAN}│${RESET}               Step ${BOLD}$STEP${RESET} of ${TOTAL_STEPS}                          ${CYAN}│${RESET}\n"
    printf "  ${CYAN}└────────────────────────────────────────────────────┘${RESET}\n"
    echo ""
    printf "  ${BOLD}$1${RESET}\n"
    printf "  ${DIM}────────────────────────────────────────────────────────${RESET}\n"
    echo ""
}

ok()   { printf "  ${GREEN}[OK]${RESET} $1\n"; }
warn() { printf "  ${YELLOW}[!]${RESET}  $1\n"; }
fail() { printf "  ${RED}[X]${RESET}  $1\n"; }
info() { printf "  ${DIM}$1${RESET}\n"; }

press_continue() {
    echo ""
    printf "  ${DIM}────────────────────────────────────────────────────────${RESET}\n"
    printf "  Press Enter to continue..."
    read -r
}

# ══════════════════════════════════════════════════════════════
#  WELCOME SCREEN
# ══════════════════════════════════════════════════════════════
clear
echo ""
echo ""
printf "       ${CYAN}╔══════════════════════════════════════════════╗${RESET}\n"
printf "       ${CYAN}║${RESET}                                              ${CYAN}║${RESET}\n"
printf "       ${CYAN}║${RESET}           ${BOLD}⬡   Welcome to HAVEN${RESET}              ${CYAN}║${RESET}\n"
printf "       ${CYAN}║${RESET}                                              ${CYAN}║${RESET}\n"
printf "       ${CYAN}║${RESET}      Private Chat Server Setup Wizard        ${CYAN}║${RESET}\n"
printf "       ${CYAN}║${RESET}                                              ${CYAN}║${RESET}\n"
printf "       ${CYAN}╚══════════════════════════════════════════════╝${RESET}\n"
echo ""
echo ""
echo "   This wizard will walk you through:"
echo ""
echo "     ${BOLD}SETUP${RESET}"
echo "       1.  Check prerequisites (Node.js)"
echo "       2.  Install dependencies"
echo "       3.  Create data directory & config"
echo "       4.  Generate SSL certificates"
echo ""
echo "     ${BOLD}LEARN${RESET}"
echo "       5.  Create your admin account"
echo "       6.  Channels & messaging features"
echo "       7.  Voice chat & screen sharing"
echo "       8.  Admin tools, themes & security"
echo ""
printf "  ${DIM}────────────────────────────────────────────────────────${RESET}\n"
echo ""
printf "   ${BOLD}[S]${RESET}  Start setup wizard\n"
printf "   ${BOLD}[Q]${RESET}  Quit\n"
echo ""
printf "   Your choice: "
read -r CHOICE
case "$CHOICE" in
    [Ss]) ;;
    *) echo ""; echo "  Goodbye!"; exit 0 ;;
esac

# ══════════════════════════════════════════════════════════════
#  STEP 1 — CHECK NODE.JS
# ══════════════════════════════════════════════════════════════
header "CHECK PREREQUISITES"

echo "   Haven runs on Node.js — let's make sure it's installed."
echo ""

if ! command -v node &>/dev/null; then
    fail "Node.js is NOT installed."
    echo ""
    echo "   Haven needs Node.js to run. Install it for your system:"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "     macOS (Homebrew):  brew install node"
        echo "     macOS (download):  https://nodejs.org"
    elif command -v apt-get &>/dev/null; then
        echo "     Ubuntu/Debian:  sudo apt-get install nodejs npm"
    elif command -v dnf &>/dev/null; then
        echo "     Fedora:  sudo dnf install nodejs npm"
    elif command -v pacman &>/dev/null; then
        echo "     Arch:  sudo pacman -S nodejs npm"
    else
        echo "     Download from: https://nodejs.org"
    fi
    echo ""
    echo "   Install Node.js, then run this wizard again."
    echo ""
    exit 1
fi

NODE_VER=$(node -v)
ok "Node.js found: $NODE_VER"
echo ""

if ! command -v npm &>/dev/null; then
    fail "npm not found. Reinstall Node.js."
    exit 1
fi

NPM_VER=$(npm -v)
ok "npm found: v$NPM_VER"
echo ""

if command -v openssl &>/dev/null; then
    ok "OpenSSL found (HTTPS will be enabled)"
else
    warn "OpenSSL not found (optional — Haven will use HTTP)"
    info "    For voice chat over the internet, install openssl."
fi

press_continue

# ══════════════════════════════════════════════════════════════
#  STEP 2 — INSTALL DEPENDENCIES
# ══════════════════════════════════════════════════════════════
header "INSTALL DEPENDENCIES"

echo "   Haven needs some packages from npm (Node's package manager)."
echo "   This downloads everything Haven needs to run."
echo ""

if [ -d "$HAVEN_DIR/node_modules" ]; then
    ok "Dependencies already installed (node_modules exists)."
    echo ""
    echo "   Want to reinstall? This can fix broken installs."
    echo ""
    printf "   ${BOLD}[S]${RESET}  Skip (already installed)\n"
    printf "   ${BOLD}[R]${RESET}  Reinstall (npm install)\n"
    echo ""
    printf "   Your choice: "
    read -r CHOICE
    if [[ "$CHOICE" =~ ^[Rr]$ ]]; then
        echo ""
        echo "   Installing... this may take a minute."
        echo ""
        cd "$HAVEN_DIR"
        npm install
        echo ""
        ok "Dependencies reinstalled."
    else
        echo "   Skipped."
    fi
else
    echo "   Installing... this may take 1-2 minutes on first run."
    echo ""
    cd "$HAVEN_DIR"
    npm install
    echo ""
    ok "Dependencies installed!"
fi

press_continue

# ══════════════════════════════════════════════════════════════
#  STEP 3 — DATA DIRECTORY & CONFIG
# ══════════════════════════════════════════════════════════════
header "DATA DIRECTORY & CONFIGURATION"

echo "   Haven stores all your data (messages, users, uploads)"
echo "   separately from the code, so updates never erase anything."
echo ""
echo "   Data location:  $HAVEN_DATA"
echo ""

if [ ! -d "$HAVEN_DATA" ]; then
    mkdir -p "$HAVEN_DATA"
    ok "Created data directory."
else
    ok "Data directory already exists."
fi
echo ""

if [ ! -f "$HAVEN_DATA/.env" ]; then
    if [ -f "$HAVEN_DIR/.env.example" ]; then
        cp "$HAVEN_DIR/.env.example" "$HAVEN_DATA/.env"
        ok "Created .env config from template."
    else
        warn "No .env.example found. Config will be created on first boot."
    fi
else
    ok "Config file (.env) already exists."
fi
echo ""

printf "  ${CYAN}┌─────────────────────────────────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}  ${BOLD}KEY SETTINGS IN YOUR .env FILE:${RESET}                    ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  PORT=3000          ← Server port                   ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  SERVER_NAME=Haven  ← Display name for your server  ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ADMIN_USERNAME=admin ← Register with this name     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                        to get admin powers           ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  Location: $HAVEN_DATA/.env\n"
printf "  ${CYAN}│${RESET}  Edit with: nano, vim, or any text editor           ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────────────────────────────────────────┘${RESET}\n"

press_continue

# ══════════════════════════════════════════════════════════════
#  STEP 4 — SSL CERTIFICATES
# ══════════════════════════════════════════════════════════════
header "SSL CERTIFICATES"

echo "   HTTPS encrypts all traffic between Haven and users."
echo "   It's required for voice/video chat over the internet."
echo ""

GEN_CERT=false

if [ -f "$HAVEN_DATA/certs/cert.pem" ]; then
    ok "SSL certificate already exists."
    info "    Location: $HAVEN_DATA/certs/"
    echo ""
    echo "   Want to regenerate? Only do this if you have problems."
    echo ""
    printf "   ${BOLD}[S]${RESET}  Skip (keep existing cert)\n"
    printf "   ${BOLD}[R]${RESET}  Regenerate SSL certificate\n"
    echo ""
    printf "   Your choice: "
    read -r CHOICE
    [[ "$CHOICE" =~ ^[Rr]$ ]] && GEN_CERT=true
else
    GEN_CERT=true
fi

if $GEN_CERT; then
    if ! command -v openssl &>/dev/null; then
        warn "OpenSSL not found — skipping certificate generation."
        echo ""
        echo "   Haven will still work, but in HTTP mode:"
        echo "     - Chat and messaging work perfectly"
        echo "     - Voice chat only works on your local machine"
        echo "     - Remote voice/video requires HTTPS"
        echo ""
        echo "   To enable HTTPS later:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "     brew install openssl"
        elif command -v apt-get &>/dev/null; then
            echo "     sudo apt-get install openssl"
        else
            echo "     Install openssl via your package manager"
        fi
        echo "   Then run this wizard again."
    else
        echo "   Generating self-signed SSL certificate..."
        echo ""
        mkdir -p "$HAVEN_DATA/certs"
        openssl req -x509 -newkey rsa:2048 \
            -keyout "$HAVEN_DATA/certs/key.pem" \
            -out "$HAVEN_DATA/certs/cert.pem" \
            -days 3650 -nodes -subj "/CN=Haven" 2>/dev/null

        if [ -f "$HAVEN_DATA/certs/cert.pem" ]; then
            ok "SSL certificate generated! (valid for 10 years)"
            info "    Location: $HAVEN_DATA/certs/"
            echo ""
            printf "  ${YELLOW}┌─────────────────────────────────────────────────────┐${RESET}\n"
            printf "  ${YELLOW}│${RESET}  NOTE: Your browser will show a security warning.   ${YELLOW}│${RESET}\n"
            printf "  ${YELLOW}│${RESET}  This is normal! Self-signed certs aren't trusted    ${YELLOW}│${RESET}\n"
            printf "  ${YELLOW}│${RESET}  by default, but the encryption still works.         ${YELLOW}│${RESET}\n"
            printf "  ${YELLOW}│${RESET}                                                      ${YELLOW}│${RESET}\n"
            printf "  ${YELLOW}│${RESET}  Chrome/Edge: Click \"Advanced\" then \"Proceed\"        ${YELLOW}│${RESET}\n"
            printf "  ${YELLOW}│${RESET}  Firefox: Click \"Advanced\" then \"Accept the Risk\"    ${YELLOW}│${RESET}\n"
            printf "  ${YELLOW}└─────────────────────────────────────────────────────┘${RESET}\n"
        else
            warn "Certificate generation failed."
            info "    Haven will run in HTTP mode (still works, no voice remotely)."
        fi
    fi
fi

press_continue

# ══════════════════════════════════════════════════════════════
#  STEP 5 — CREATE YOUR ADMIN ACCOUNT (GUIDE)
# ══════════════════════════════════════════════════════════════
header "CREATE YOUR ADMIN ACCOUNT"

echo "   Now the setup is done! Let's learn how to use Haven."
echo ""
echo "   When you first open Haven in your browser, you need to"
echo "   register the ADMIN account before anyone else does."
echo ""
printf "  ${CYAN}┌─────────────────────────────────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${BOLD}HOW TO BECOME ADMIN:${RESET}                               ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  1. Open Haven in your browser                      ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}     (the URL is shown when you start the server)    ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  2. Click \"Register\" (NOT Login)                    ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  3. Username:  ${BOLD}admin${RESET}                                ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}     (or whatever ADMIN_USERNAME is in your .env)    ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  4. Choose a ${BOLD}STRONG${RESET} password                        ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}     (this account controls your entire server!)     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  5. You're logged in with full admin powers         ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────────────────────────────────────────┘${RESET}\n"
echo ""
printf "  ${RED}[!]${RESET} IMPORTANT: Do this BEFORE sharing the server with\n"
echo "      anyone. The first person to register as \"admin\""
echo "      gets admin powers."
echo ""
echo "   Want a different admin username? Edit your .env file:"
echo "     $HAVEN_DATA/.env"
echo "     Change: ADMIN_USERNAME=your_name"

press_continue

# ══════════════════════════════════════════════════════════════
#  STEP 6 — CHANNELS & MESSAGING
# ══════════════════════════════════════════════════════════════
header "CHANNELS & MESSAGING"

echo "   Channels are rooms where conversations happen."
echo ""
echo "   ${BOLD}CREATING CHANNELS:${RESET}"
echo "     - Look at the left sidebar"
echo "     - Type a channel name in the text field"
echo "     - Click \"Create\" — the channel appears instantly"
echo ""
echo "   ${BOLD}SUGGESTED STARTER CHANNELS:${RESET}"
printf "  ${CYAN}┌─────────────────┬──────────────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}  #general        ${CYAN}│${RESET}  Main hangout, random chat       ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  #media          ${CYAN}│${RESET}  Links, images, memes            ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  #gaming         ${CYAN}│${RESET}  Game discussion, LFG            ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  #voice-chat     ${CYAN}│${RESET}  Text companion for voice calls  ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────┴──────────────────────────────────┘${RESET}\n"
echo ""
echo "   ${BOLD}MESSAGING FEATURES:${RESET}"
printf "  ${CYAN}┌─────────────────────────────────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}  **bold**           → bold text                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  *italic*           → italic text                   ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ~~strikethrough~~  → strikethrough                 ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  \`code\`             → inline code                   ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ||spoiler||        → hidden until clicked          ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  @username          → mention (autocomplete)        ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────────────────────────────────────────┘${RESET}\n"
echo ""
echo "   ${BOLD}OTHER FEATURES:${RESET}"
echo "     - Reactions: hover a message and click the emoji"
echo "     - Replies: click the reply arrow on any message"
echo "     - File sharing: drag-and-drop or paste images"
echo "     - GIF search: set up GIPHY key in admin settings"
echo ""
echo "   ${BOLD}KEYBOARD SHORTCUTS:${RESET}"
echo "     Enter         → Send message"
echo "     Shift+Enter   → New line"
echo "     Ctrl+F        → Search messages"
echo "     /             → Slash commands (/shrug, /roll, etc.)"

press_continue

# ══════════════════════════════════════════════════════════════
#  STEP 7 — VOICE CHAT & SCREEN SHARING
# ══════════════════════════════════════════════════════════════
header "VOICE CHAT & SCREEN SHARING"

echo "   Haven has peer-to-peer voice and screen sharing."
echo "   Audio goes directly between users — not through your server."
echo ""
echo "   ${BOLD}HOW TO USE VOICE:${RESET}"
printf "  ${CYAN}┌─────────────────────────────────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}  1. Join any text channel                           ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  2. Click the microphone icon (Join Voice)          ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  3. Allow mic access when your browser asks         ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  4. Adjust others' volume with their slider         ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  5. Click the phone icon to leave voice             ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────────────────────────────────────────┘${RESET}\n"
echo ""
echo "   ${BOLD}SCREEN SHARING:${RESET}"
echo "     - Click \"Share Screen\" to broadcast your display"
echo "     - Multiple people can share at the same time"
echo "     - Each person gets their own tile in a grid"
echo ""
echo "   ${BOLD}AUDIO CUES:${RESET}"
echo "     - Hear tones when users join or leave voice"
echo "     - Names glow green when someone is speaking"
echo ""
printf "  ${YELLOW}┌─────────────────────────────────────────────────────┐${RESET}\n"
printf "  ${YELLOW}│${RESET}  NOTE: Voice requires HTTPS for remote users.       ${YELLOW}│${RESET}\n"
printf "  ${YELLOW}│${RESET}  If OpenSSL was set up in Step 4, you're good.      ${YELLOW}│${RESET}\n"
printf "  ${YELLOW}│${RESET}  On localhost, voice always works.                   ${YELLOW}│${RESET}\n"
printf "  ${YELLOW}└─────────────────────────────────────────────────────┘${RESET}\n"

press_continue

# ══════════════════════════════════════════════════════════════
#  STEP 8 — ADMIN, THEMES & SECURITY
# ══════════════════════════════════════════════════════════════
header "ADMIN TOOLS, THEMES & SECURITY"

echo "   ${BOLD}ADMIN PANEL${RESET} (gear icon in sidebar):"
printf "  ${CYAN}┌─────────────────────────────────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}  Kick      → Disconnects a user (they can rejoin)   ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  Mute      → Timed silence (can't send messages)    ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  Ban       → Permanent block from server            ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  Roles     → Assign moderator permissions           ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  Settings  → Server name, EULA, message limits      ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────────────────────────────────────────┘${RESET}\n"
echo ""
echo "   ${BOLD}THEMES${RESET} (20+ built-in):"
echo "     Haven, Discord, Matrix, Cyberpunk, Nord, Dracula,"
echo "     Tron, HALO, Lord of the Rings, Bloodborne, Windows 95..."
echo "     Each user picks their own theme — it's per-person."
echo ""
echo "   ${BOLD}VISUAL EFFECTS${RESET} (stackable on any theme):"
echo "     CRT scanlines, Matrix rain, Snowfall, Campfire embers"
echo ""
echo "   ${BOLD}SECURITY${RESET} (automatic):"
printf "  ${CYAN}┌─────────────────────────────────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}  ${GREEN}[OK]${RESET} Passwords hashed with bcrypt                  ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${GREEN}[OK]${RESET} JWT session tokens                            ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${GREEN}[OK]${RESET} Rate limiting against brute-force              ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${GREEN}[OK]${RESET} CSP headers block cross-site scripting         ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${GREEN}[OK]${RESET} All user input sanitized                       ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${GREEN}[OK]${RESET} JWT + VAPID keys auto-generated                ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────────────────────────────────────────┘${RESET}\n"
echo ""
echo "   ${BOLD}BACKUPS${RESET} — all your data is in one folder:"
echo "     $HAVEN_DATA/"
echo "     Just copy it somewhere safe periodically."
echo ""
echo "   ${BOLD}AUTO-START ON BOOT:${RESET}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "     Create a Launch Agent or add to Login Items."
else
    echo "     Create a systemd service or add to crontab (@reboot)."
fi

press_continue

# ══════════════════════════════════════════════════════════════
#  FINISH — INVITE FRIENDS & LAUNCH
# ══════════════════════════════════════════════════════════════
clear
echo ""
echo ""
printf "       ${GREEN}╔══════════════════════════════════════════════╗${RESET}\n"
printf "       ${GREEN}║${RESET}                                              ${GREEN}║${RESET}\n"
printf "       ${GREEN}║${RESET}         ${BOLD}⬡   Setup Complete!${RESET}                    ${GREEN}║${RESET}\n"
printf "       ${GREEN}║${RESET}                                              ${GREEN}║${RESET}\n"
printf "       ${GREEN}╚══════════════════════════════════════════════╝${RESET}\n"
echo ""
echo ""
printf "  ${CYAN}┌─────── HOW FRIENDS CONNECT ────────────────────────┐${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${BOLD}SAME WIFI${RESET} (easiest):                               ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}    1. Find your local IP:                            ${CYAN}│${RESET}\n"
if [[ "$OSTYPE" == "darwin"* ]]; then
    printf "  ${CYAN}│${RESET}       ipconfig getifaddr en0                        ${CYAN}│${RESET}\n"
else
    printf "  ${CYAN}│${RESET}       hostname -I                                   ${CYAN}│${RESET}\n"
fi
printf "  ${CYAN}│${RESET}    2. Friends open: https://YOUR_IP:3000             ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}    3. They click through cert warning & register     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${BOLD}OVER THE INTERNET:${RESET}                                 ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}    1. Find your public IP: whatismyip.com             ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}    2. Port forward 3000 TCP on your router            ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}    3. Friends open: https://PUBLIC_IP:3000            ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}  ${BOLD}NO PORT FORWARDING?${RESET} Use Haven's built-in tunnel:   ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}    Enable it in Admin Settings > Tunnel section       ${CYAN}│${RESET}\n"
printf "  ${CYAN}│${RESET}                                                     ${CYAN}│${RESET}\n"
printf "  ${CYAN}└─────────────────────────────────────────────────────┘${RESET}\n"
echo ""
printf "  ${DIM}────────────────────────────────────────────────────────${RESET}\n"
echo ""
printf "   ${BOLD}[L]${RESET}  Launch Haven now\n"
printf "   ${BOLD}[Q]${RESET}  Quit\n"
echo ""
printf "   Your choice: "
read -r CHOICE
case "$CHOICE" in
    [Ll])
        echo ""
        echo "   Launching Haven..."
        if [ -f "$HAVEN_DIR/start.sh" ]; then
            exec "$HAVEN_DIR/start.sh"
        else
            cd "$HAVEN_DIR"
            node server.js
        fi
        ;;
    *)
        echo ""
        echo "   Thanks for using Haven! Happy chatting."
        echo ""
        exit 0
        ;;
esac
