class HavenTutorial {
  constructor(skipKey = 'haven_tutorial_done') {
    this.skipKey = skipKey;
    this.currentStep = 0;
    this.overlay = null;
    this.steps = [
      { target: '.server-bar', title: 'Server Bar', desc: 'Your servers live here! Click the hex to stay on this server, or add friends\u0027 Haven servers.', position: 'right' },
      { target: '.sidebar', title: 'Channels & DMs', desc: 'Join channels with codes, create new ones (admin), or start direct messages with other users.', position: 'right' },
      { target: '#channel-list', title: 'Channel List', desc: 'Click a channel to enter. Private channels are admin-only. Use the arrow to expand subchannels.', position: 'right' },
      { target: '.channel-header', title: 'Channel Header', desc: 'Copy channel codes, join voice, search messages, manage members, and access Listen/Game Together here.', position: 'bottom' },
      { target: '.voice-controls', title: 'Voice & Media', desc: 'Join voice chat, share your screen, suppress noise, listen to music together, or play retro games!', position: 'bottom' },
      { target: '.theme-selector', title: 'Themes', desc: 'Pick your vibe! 13 themes including Haven, Discord, Matrix, Tron, HALO, Cyberpunk, and Triangle morphism.', position: 'right' },
      { target: '.welcome-screen, #message-area', title: 'Chat Area', desc: 'Messages, screen shares, search results, and pinned messages all appear in this main area.', position: 'left' },
      { target: '.message-input-area', title: 'Chat Input', desc: 'Type messages, use / for commands, @ for mentions, paste images, add emoji or send GIFs!', position: 'top', fallback: true },
      { target: '.right-sidebar', title: 'Online Users', desc: 'See who\u0027s online and in voice. Click usernames for quick actions like DM or call.', position: 'left' },
      { target: '#open-settings-btn', title: 'Settings', desc: 'Customize sounds, notifications, admin controls, tunneling, and bot management.', position: 'left' },
      { target: '.status-bar', title: 'Status Bar', desc: 'Connection status, voice state, ping, current channel, and online count at a glance.', position: 'top' },
    ];
  }
  shouldShow() { return !localStorage.getItem(this.skipKey); }
  start() {
    if (!this.shouldShow()) return;
    this._createOverlay();
    this._showStep(0);
  }
  skip() { localStorage.setItem(this.skipKey, '1'); this._cleanup(); }
  _createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tutorial-overlay';
    this.overlay.innerHTML = '<div class="tutorial-backdrop"></div><div class="tutorial-spotlight"></div><div class="tutorial-tooltip"><div class="tutorial-header"><span class="tutorial-step-num"></span><h4 class="tutorial-title"></h4></div><p class="tutorial-desc"></p><div class="tutorial-actions"><div class="tutorial-btns"><button class="tutorial-btn tutorial-skip">Skip All</button><button class="tutorial-btn tutorial-prev">\u2190 Back</button><button class="tutorial-btn tutorial-next">Next \u2192</button></div></div></div>';
    document.body.appendChild(this.overlay);
    this.overlay.querySelector('.tutorial-prev').onclick = () => this._prev();
    this.overlay.querySelector('.tutorial-next').onclick = () => this._next();
    this.overlay.querySelector('.tutorial-skip').onclick = () => this.skip();
    this.overlay.querySelector('.tutorial-backdrop').onclick = () => this._next();
  }
  _findTarget(step) {
    const selectors = step.target.split(',').map(s => s.trim());
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
    }
    return null;
  }
  _showStep(idx) {
    if (idx >= this.steps.length) { this._finish(); return; }
    if (idx < 0) idx = 0;
    this.currentStep = idx;
    const step = this.steps[idx];
    let el = this._findTarget(step);
    if (!el) {
      if (idx < this.steps.length - 1) { this._showStep(idx + 1); return; }
      this._finish();
      return;
    }
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const spotlight = this.overlay.querySelector('.tutorial-spotlight');
    const tooltip = this.overlay.querySelector('.tutorial-tooltip');
    spotlight.style.left = `${rect.left - pad}px`;
    spotlight.style.top = `${rect.top - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;
    this.overlay.querySelector('.tutorial-step-num').textContent = `${idx + 1}/${this.steps.length}`;
    this.overlay.querySelector('.tutorial-title').textContent = step.title;
    this.overlay.querySelector('.tutorial-desc').textContent = step.desc;
    const pos = step.position || 'bottom';
    tooltip.className = 'tutorial-tooltip';
    const tw = 300, th = 200;
    const vw = window.innerWidth, vh = window.innerHeight;
    let tx, ty;
    switch (pos) {
      case 'right': tx = rect.right + 20; ty = rect.top; break;
      case 'left': tx = rect.left - tw - 20; ty = rect.top; break;
      case 'bottom': tx = rect.left; ty = rect.bottom + 20; break;
      case 'top': tx = rect.left; ty = rect.top - th - 20; break;
      default: tx = rect.left; ty = rect.bottom + 20;
    }
    tx = Math.max(10, Math.min(tx, vw - tw - 10));
    ty = Math.max(10, Math.min(ty, vh - th - 10));
    tooltip.style.left = `${tx}px`;
    tooltip.style.top = `${ty}px`;
    this.overlay.querySelector('.tutorial-prev').style.display = idx > 0 ? 'inline-block' : 'none';
    this.overlay.querySelector('.tutorial-next').textContent = idx === this.steps.length - 1 ? 'Finish \u2713' : 'Next \u2192';
  }
  _next() {
    if (this.currentStep >= this.steps.length - 1) { this._finish(); return; }
    this._showStep(this.currentStep + 1);
  }
  _prev() { if (this.currentStep > 0) this._showStep(this.currentStep - 1); }
  _finish() {
    localStorage.setItem(this.skipKey, '1');
    this._cleanup();
  }
  _cleanup() { if (this.overlay) { this.overlay.remove(); this.overlay = null; } }
}
if (typeof module !== 'undefined') module.exports = { HavenTutorial };
