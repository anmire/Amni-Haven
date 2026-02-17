# Haven — First-Time Server Hoster's Guide

> **A complete walkthrough for setting up your own Haven chat server from scratch.**
> No technical experience required. Windows-focused, with Linux/macOS notes where applicable.

---

## Table of Contents

1. [What Is Haven?](#what-is-haven)
2. [What You'll Need](#what-youll-need)
3. [Installation (One-Click)](#installation-one-click)
4. [Starting Your Server](#starting-your-server)
5. [Creating Your Admin Account](#creating-your-admin-account)
6. [Creating Channels](#creating-channels)
7. [Inviting Friends (Same WiFi)](#inviting-friends-same-wifi)
8. [Inviting Friends (Over the Internet)](#inviting-friends-over-the-internet)
9. [Understanding the Admin Panel](#understanding-the-admin-panel)
10. [Customizing Your Server](#customizing-your-server)
11. [Security Best Practices](#security-best-practices)
12. [Keeping Haven Running](#keeping-haven-running)
13. [Backing Up Your Data](#backing-up-your-data)
14. [Troubleshooting](#troubleshooting)
15. [FAQ](#faq)

---

## What Is Haven?

Haven is a **private chat server** that runs on your computer. Think of it like Discord, but:

- **You own everything** — all messages, files, and data stay on your machine
- **No cloud services** — nothing is sent to any company's servers
- **No accounts needed** — no email, phone number, or sign-up with any service
- **Completely free** — no subscriptions, no ads, no premium tiers

You run Haven on your computer, and your friends connect to it through their web browser. That's it.

### What Can Haven Do?

| Feature | Description |
|---------|-------------|
| **Text Chat** | Real-time messaging with images, reactions, replies, @mentions |
| **Voice Chat** | Peer-to-peer audio between users |
| **Screen Sharing** | Share your screen with the group |
| **Channels** | Organize conversations into topics |
| **Direct Messages** | Private 1-on-1 conversations |
| **Themes** | 20+ visual themes (Discord, Matrix, Cyberpunk, etc.) |
| **GIF Search** | Send GIFs inline via GIPHY |
| **File Sharing** | Upload and share documents, images, audio, video |
| **Games** | Built-in games with server-wide leaderboards |
| **Moderation** | Kick, mute, ban users — full admin controls |

---

## What You'll Need

| Requirement | Details |
|-------------|---------|
| **Computer** | Windows 10/11, Linux, or macOS — anything that can run Node.js |
| **Internet** | Required for friends to connect (unless everyone is on the same WiFi) |
| **~100 MB disk space** | For Haven + Node.js + dependencies |
| **That's it** | Seriously. No special hardware, no paid services. |

> **Good to know:** Haven is extremely lightweight. It runs comfortably on old laptops, mini PCs, even Raspberry Pis. You don't need a beefy gaming rig.

---

## Installation (One-Click)

### Windows

1. **Download Haven** — Download the repository as a ZIP from GitHub, or clone it with git
2. **Unzip** it anywhere — your Desktop, Documents, a flash drive — doesn't matter
3. **Double-click `Install Haven.bat`**

The installer will:
- Check if Node.js is installed (and offer to install it if not)
- Install Haven's code dependencies
- Create your data directory at `%APPDATA%\Haven`
- Generate SSL certificates (if OpenSSL is available)
- Add a Windows Firewall rule for port 3000
- Create a "Start Haven" shortcut on your Desktop

**That's it.** When it finishes, it'll ask if you want to launch Haven right away.

### Linux / macOS

```bash
# 1. Make sure Node.js is installed (v18+)
node -v

# 2. If not, install it:
#    Ubuntu/Debian:  sudo apt install nodejs npm
#    macOS (brew):   brew install node
#    Fedora:         sudo dnf install nodejs

# 3. Navigate to the Haven folder and run:
chmod +x scripts/start.sh
scripts/start.sh
```

The start script handles everything automatically on Linux/macOS too.

---

## Starting Your Server

### Windows

Double-click the **"Start Haven"** shortcut on your Desktop (or `Start Haven.bat` in the Haven folder).

A green terminal window will appear. When you see:

```
  ========================================
    Haven is LIVE on port 3000 (HTTPS)
  ========================================

  Local:    https://localhost:3000
```

...your server is running! Your browser should open automatically.

### Linux / macOS

```bash
scripts/start.sh
# Or: npm start
```

### What to Expect on First Launch

1. **The terminal stays open** — this IS the server. Closing the terminal stops Haven.
2. **Your browser opens** to `https://localhost:3000`
3. **You'll see a certificate warning** — this is normal and expected:
   - **Chrome:** Click "Advanced" → "Proceed to localhost (unsafe)"
   - **Firefox:** Click "Advanced" → "Accept the Risk and Continue"
   - **Edge:** Click "Advanced" → "Continue to localhost (unsafe)"

> **Why the warning?** Haven uses a self-signed SSL certificate for encryption. It's perfectly safe — your browser just doesn't recognize the certificate because you made it yourself (as opposed to a company like Let's Encrypt).

---

## Creating Your Admin Account

When Haven opens in your browser, you'll see a login page.

### Step 1: Register

1. Click **Register** (not Login — you don't have an account yet)
2. Enter the username **`admin`**
   - This is the default admin username. If you changed it in your `.env` file, use that name instead.
3. Choose a **strong password** — this account controls your entire server
4. Click **Register**

### Step 2: You're Now the Admin

You'll be logged in automatically. As the admin, you have access to:
- Channel creation and deletion
- User management (kick, mute, ban)
- Server settings
- Moderation tools

> **Important:** The first person to register with the admin username gets admin powers. Do this before sharing your server with anyone else.

---

## Creating Channels

Channels are where conversations happen. Think of them like rooms.

### Create Your First Channel

1. Look at the **left sidebar** — you'll see a text input field
2. Type a channel name (e.g., "general", "gaming", "music")
3. Click **Create**
4. The channel appears in the sidebar — click it to enter

### Channel Invite Codes

When you create a channel, Haven generates an **invite code** (8 characters, like `a3f8b2c1`).

- **Public channels:** Anyone who registers on your server can see and join them
- **Private channels:** Require an invite code to join

### Sub-channels

You can create channels inside other channels for organization:
- `gaming` → `minecraft`, `valorant`, `retro`
- `music` → `recommendations`, `production`

### Suggested Channel Setup for a Friend Group

| Channel | Purpose |
|---------|---------|
| `general` | Main hangout — random conversation |
| `voice-chat` | Text companion for voice sessions |
| `media` | Share links, videos, memes |
| `gaming` | Game discussion and coordination |

---

## Inviting Friends (Same WiFi)

If your friends are on the **same WiFi network** (e.g., at your house), this is the easiest setup.

### Step 1: Find Your Local IP Address

**Windows:**
1. Open Command Prompt (press `Win+R`, type `cmd`, press Enter)
2. Type: `ipconfig`
3. Look for **IPv4 Address** — it'll look like `192.168.1.50` or `10.0.0.15`

**Linux/macOS:**
```bash
hostname -I    # Linux
ipconfig getifaddr en0    # macOS
```

### Step 2: Share With Friends

Tell your friends to open their browser and go to:

```
https://192.168.1.50:3000
```

(Replace `192.168.1.50` with YOUR local IP address)

### Step 3: They Register and Join

1. They'll see the same certificate warning — tell them to click through it (Advanced → Proceed)
2. They click **Register** and pick a username + password
3. They're in!

---

## Inviting Friends (Over the Internet)

If your friends are NOT on your WiFi (they're at their own house), you need to do two extra things: **port forward** and **share your public IP**.

### Step 1: Find Your Public IP Address

Go to [whatismyip.com](https://whatismyip.com) in your browser. Write down the IP address shown.

### Step 2: Port Forwarding

Port forwarding tells your router: "When someone connects to port 3000, send them to my computer."

1. **Open your router's admin page:**
   - Type `192.168.1.1` or `10.0.0.1` in your browser (this is your router — the exact address depends on your ISP/router brand)
   - Common login: admin / admin or admin / password (check the sticker on your router)

2. **Find the Port Forwarding section:**
   - It might be called "Port Forwarding", "NAT", "Virtual Servers", or "Applications & Gaming"
   - Every router is different — if you can't find it, search "[your router brand] port forwarding" on YouTube

3. **Add a new rule:**
   | Field | Value |
   |-------|-------|
   | Name | Haven |
   | Protocol | TCP |
   | External Port | 3000 |
   | Internal Port | 3000 |
   | Internal IP | Your local IP (the `192.168.x.x` from earlier) |

4. **Save** the rule

### Step 3: Windows Firewall

If you ran the `Install Haven.bat` installer, this was already done for you.

If not, open **PowerShell as Administrator** and run:

```powershell
New-NetFirewallRule -DisplayName "Haven Chat" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Step 4: Share With Friends

Send your friends:

```
https://YOUR_PUBLIC_IP:3000
```

Replace `YOUR_PUBLIC_IP` with the IP you found on whatismyip.com.

Tell them to:
1. Click past the certificate warning (Advanced → Proceed)
2. Click Register
3. Pick a username and password
4. Join the channel you created

### Dynamic DNS (Optional but Recommended)

Most home internet connections have a **dynamic IP** — it changes occasionally. This means the address you give friends might stop working after a few days.

**Solution: Free Dynamic DNS**

Services like [No-IP](https://www.noip.com/) or [DuckDNS](https://www.duckdns.org/) give you a free hostname like `myhaven.duckdns.org` that always points to your current IP. Set it up once and share the hostname instead of an IP address.

### Using Haven's Built-in Tunnel (Alternative to Port Forwarding)

Haven has a built-in **localtunnel** feature that creates a public URL without any port forwarding:

1. Open Haven's admin settings (⚙️ gear icon)
2. Look for the **Tunnel** section
3. Enable it — Haven will generate a public URL like `https://your-haven.loca.lt`
4. Share that URL with friends

> **Pros:** No router configuration needed, works immediately
> **Cons:** Depends on a third-party relay service, slightly slower, URL may change on restart

---

## Understanding the Admin Panel

Click the **⚙️ gear icon** in the sidebar to access settings.

### User Management

| Action | What It Does | Icon |
|--------|-------------|------|
| **Kick** | Disconnects a user — they can reconnect | 👢 |
| **Mute** | Prevents sending messages for a set time | 🔇 |
| **Ban** | Permanently blocks the user from connecting | 🚫 |
| **Delete User** | Removes a banned user's account entirely | 🗑️ |

### Server Settings

| Setting | What It Does |
|---------|-------------|
| **Server Name** | The name shown in the header and multi-server sidebar |
| **EULA** | Custom terms shown to users (optional) |
| **Max Message Age** | Auto-delete messages older than X days |
| **DB Size Limit** | Maximum database size before auto-cleanup |

### Channel Management

- Click the **✕** next to a channel name to delete it
- Create sub-channels by expanding a parent channel
- Set channels as private (invite-only)
- Manage invite codes: public/private, static/dynamic, auto-rotation

### Roles & Permissions

Haven has a role system for granular permissions:
- Assign roles like "Moderator" to trusted users
- Control who can kick, mute, delete messages per channel
- Manage roles in the admin panel

---

## Customizing Your Server

### Server Name

1. Open Settings (⚙️)
2. Change the **Server Name** field
3. Click Save

### Themes

Haven includes 20+ themes. Users can pick their own — themes are per-user, not server-wide.

Click the **theme selector** in the sidebar to browse themes like:
- **Haven** (default dark theme)
- **Discord** (familiar dark look)
- **Matrix** (green terminal aesthetic)
- **Cyberpunk** (neon pink/blue)
- **Nord** (soft blue-gray)
- **Dracula** (purple dark theme)
- **Windows 95** (retro nostalgia)

### Visual Effects

On top of themes, users can enable stackable visual effects:
- **CRT scanlines** — retro monitor look
- **Matrix rain** — falling green characters
- **Snowfall** — ambient snow particles
- **Campfire embers** — warm floating sparks

Effects have configurable intensity and frequency sliders.

### GIF Search

To enable the built-in GIF picker:

1. Go to [developers.giphy.com](https://developers.giphy.com/) and create a free account
2. Create an App → choose API → copy the API key
3. In Haven, click the **GIF button** (🎞️) in the message area
4. Paste your API key and save

All users can now search and send GIFs. The free tier has generous limits you won't hit.

### Configuration File (.env)

Advanced settings are in your `.env` file:

| OS | Location |
|----|----------|
| Windows | `%APPDATA%\Haven\.env` |
| Linux/macOS | `~/.haven/.env` |

Open it in any text editor (Notepad works fine). Key settings:

```env
PORT=3000                    # Server port (change if 3000 is taken)
SERVER_NAME=Haven            # Your server's display name
ADMIN_USERNAME=admin         # The username that gets admin powers
```

After editing, restart Haven for changes to take effect.

---

## Security Best Practices

Haven is designed to be secure by default, but here are tips for running a safe server:

### Do

- ✅ **Use HTTPS** — Install OpenSSL so Haven can generate SSL certificates. Voice chat over the internet requires HTTPS.
- ✅ **Pick a strong admin password** — Your admin account controls everything.
- ✅ **Keep Node.js updated** — Run the installer periodically, or download from nodejs.org.
- ✅ **Only port-forward port 3000** — Don't open other ports.
- ✅ **Know who's on your server** — Haven is designed for friend groups, not the public internet.

### Don't

- ❌ **Don't share your .env file** — It contains your JWT secret and VAPID keys.
- ❌ **Don't run Haven as administrator** — Normal user permissions are sufficient.
- ❌ **Don't expose your router admin page** — Only port forward 3000.
- ❌ **Don't post your IP publicly** — Share it directly with friends you trust.

### What Haven Does Automatically

- **Bcrypt password hashing** — Passwords are never stored in plain text
- **JWT authentication** — Secure session tokens
- **Rate limiting** — Prevents spam and brute-force attacks
- **CSP headers** — Protects against cross-site scripting
- **Input validation** — Sanitizes all user input
- **Auto-generated secrets** — JWT secret and VAPID keys are generated on first boot

---

## Keeping Haven Running

### The Terminal Window

Haven runs as long as the terminal window is open. If you close it, the server stops.

**Tips for keeping it running:**
- Minimize the terminal window instead of closing it
- Use `Start Haven.bat` to launch — it handles everything automatically

### Auto-Start on Windows Boot (Optional)

If you want Haven to start automatically when your computer turns on:

1. Press `Win+R`, type `shell:startup`, press Enter
2. Copy the "Start Haven" shortcut from your Desktop into this folder
3. Haven will now launch every time you log in

### Checking If Haven Is Running

- Look for the green terminal window
- Visit `https://localhost:3000` in your browser
- Friends' servers will show as "online" in their multi-server sidebar

---

## Backing Up Your Data

All your data lives in one folder:

| OS | Location |
|----|----------|
| Windows | `%APPDATA%\Haven\` |
| Linux/macOS | `~/.haven/` |

This folder contains:
| File/Folder | What It Is |
|-------------|-----------|
| `haven.db` | All messages, users, channels |
| `.env` | Your server configuration |
| `certs/` | SSL certificates |
| `uploads/` | Uploaded images and files |

### How to Back Up

Just copy the entire folder somewhere safe (external drive, cloud storage, another computer).

The Haven code folder itself contains no personal data — you can always re-download it.

### Restoring From Backup

1. Install Haven on the new machine (use `Install Haven.bat`)
2. Copy your backup over the data directory
3. Launch Haven — everything will be exactly as you left it

---

## Troubleshooting

### "Node.js is not installed"

- Install from [nodejs.org](https://nodejs.org/) (LTS version)
- **Restart your PC** after installing — this is required
- Run the Haven installer again

### Browser Shows a Certificate Warning

This is **normal and expected**. Haven uses a self-signed certificate.
- Chrome: Advanced → Proceed to localhost
- Firefox: Advanced → Accept the Risk and Continue
- Edge: Advanced → Continue to localhost

### "SSL_ERROR_RX_RECORD_TOO_LONG"

Your browser is trying `https://` but Haven is running HTTP (no SSL certificates).
- Change the URL to `http://localhost:3000`
- Or install OpenSSL and re-run the installer to generate certificates

### Friends Can't Connect

| Check | How |
|-------|-----|
| Is Haven running? | Look for the green terminal window |
| Right IP address? | Check [whatismyip.com](https://whatismyip.com) for public IP |
| Port forwarded? | Log into router and verify port 3000 rule |
| Firewall? | Run `Install Haven.bat` again (it adds the firewall rule) |
| Using HTTPS? | Friends should use `https://` in the URL |
| Certificate? | Tell friends to click through the certificate warning |

### "Error: EADDRINUSE"

Another program is using port 3000. Either:
- Close the other program
- Or edit `%APPDATA%\Haven\.env` and change `PORT=3000` to something else (e.g., `PORT=3001`)

### Voice Chat Doesn't Work for Remote Friends

Voice chat requires **HTTPS**. Make sure:
1. OpenSSL is installed on your machine
2. Haven generated SSL certificates (check `%APPDATA%\Haven\certs\`)
3. Friends are using `https://` (not `http://`)

If you see `(HTTP)` in the Haven terminal banner, SSL is not active.

### Haven Starts but Nobody Can Connect

1. Check your port forward rule on the router
2. Make sure the internal IP in the port forward matches your computer's current IP
   - Your local IP can change! Check with `ipconfig` and update the rule if needed
3. Test from your phone (on mobile data, not WiFi) to see if the port forward works

### Database Errors

If Haven won't start and mentions database errors:
1. Close Haven
2. Navigate to `%APPDATA%\Haven\`
3. Rename `haven.db` to `haven.db.backup`
4. Restart Haven — it'll create a fresh database
5. You'll need to re-register, but your backup still has the old data

---

## FAQ

**Q: Can I run Haven on a Raspberry Pi?**
A: Yes! Install Node.js for ARM, copy the Haven files over, and run `scripts/start.sh`.

**Q: Can multiple people be admin?**
A: The server has one admin username (set in `.env`). You can also assign roles with moderator-level permissions to trusted users through the admin panel.

**Q: Is it safe to port forward?**
A: Port forwarding port 3000 is standard practice and safe when configured correctly. Haven has built-in security (rate limiting, input validation, bcrypt passwords). Only share your IP with people you trust.

**Q: What happens if my IP address changes?**
A: Your friends won't be able to connect until they have your new IP. Consider using a free Dynamic DNS service (No-IP, DuckDNS) to get a permanent hostname.

**Q: Can I use Haven with a custom domain?**
A: Yes. Point your domain's DNS to your public IP, and optionally use a reverse proxy (nginx, Caddy) for proper SSL certificates.

**Q: How much bandwidth does Haven use?**
A: Text chat uses almost nothing. Voice chat uses about 50-100 KB/s per user. Screen sharing uses more depending on resolution.

**Q: Can I update Haven without losing data?**
A: Yes — your data is stored separately from the code (in `%APPDATA%\Haven`). Just download the new version, replace the code files, and run `npm install` again. Your messages, users, and settings are preserved.

**Q: How many users can my server handle?**
A: For a typical home connection, Haven comfortably supports 10-50 concurrent text users. Voice chat is peer-to-peer and depends on everyone's bandwidth. For most friend groups, it's more than enough.

**Q: What happens if I close my laptop?**
A: The server stops. Your friends won't be able to connect until you open it again and restart Haven. For 24/7 hosting, consider running it on a desktop, Raspberry Pi, or VPS.

---

## Quick Reference Card

| Task | How |
|------|-----|
| **Start Haven** | Double-click "Start Haven" on Desktop |
| **Stop Haven** | Close the green terminal window (or Ctrl+C) |
| **Open Haven** | Go to `https://localhost:3000` in your browser |
| **Admin settings** | Click ⚙️ gear icon in the sidebar |
| **Find your local IP** | Run `ipconfig` in Command Prompt |
| **Find your public IP** | Visit [whatismyip.com](https://whatismyip.com) |
| **Edit configuration** | Open `%APPDATA%\Haven\.env` in Notepad |
| **View server data** | Open `%APPDATA%\Haven\` in File Explorer |
| **Back up everything** | Copy the `%APPDATA%\Haven\` folder |
| **Report a bug** | Open an issue on GitHub |

---

*Happy hosting! Your conversations are yours. 🏠*
