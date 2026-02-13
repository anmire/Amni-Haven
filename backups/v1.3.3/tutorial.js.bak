class HavenTutorial {
  constructor(skipKey = 'haven_tutorial_done') {
    this.skipKey = skipKey;
    this.currentStep = 0;
    this.overlay = null;
    this.steps = [
      { target: '.server-bar', title: 'Server Bar', desc: 'Your servers live here! Click the hex to stay on this server, or add friends\' Haven servers.', position: 'right' },
      { target: '.sidebar', title: 'Channels & DMs', desc: 'Join channels with codes, create new ones (admin), or start direct messages with other users.', position: 'right' },
      { target: '#channel-list', title: 'Channel List', desc: 'Click a channel to enter. 🔒 Private channels are admin-only. Use the arrow to expand subchannels.', position: 'right' },
      { target: '.channel-header', title: 'Channel Header', desc: 'Copy channel codes, join voice, search messages, manage members, and access Listen/Game Together!', position: 'bottom' },
      { target: '#voice-join-btn', title: 'Voice Chat', desc: 'Click to join voice chat. You can share your screen, mute/deafen, and enable noise suppression.', position: 'bottom', waitFor: '#voice-join-btn', optional: true },
      { target: '#listen-together-btn', title: 'Listen Together', desc: 'Sync music with your channel! Paste YouTube, Spotify, SoundCloud, or Vimeo links.', position: 'bottom', waitFor: '#listen-together-btn', optional: true },
      { target: '#game-together-btn', title: 'Game Together', desc: 'Play retro games with friends! Load your ROMs and share controllers for N64, PS2, GameCube and more.', position: 'bottom', waitFor: '#game-together-btn', optional: true },
      { target: '.message-input-area', title: 'Chat Input', desc: 'Type messages here. Use / for commands, @ for mentions, paste images, or send GIFs!', position: 'top' },
      { target: '#emoji-btn', title: 'Reactions & Emoji', desc: 'Click to add emoji, or right-click any message to react with emoji or GIFs!', position: 'top' },
      { target: '.right-sidebar', title: 'Online Users', desc: 'See who\'s online and in voice. Click usernames for quick actions like DM or call.', position: 'left' },
      { target: '#open-settings-btn', title: 'Settings', desc: 'Customize themes, notifications, volume, and admin options. 13 themes available!', position: 'left' },
      { target: '.theme-selector', title: 'Themes', desc: 'Pick your vibe! Haven, Discord, Matrix, Tron, HALO, Cyberpunk, and more...', position: 'right' }
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
    this.overlay.innerHTML = `<div class="tutorial-backdrop"></div><div class="tutorial-spotlight"></div><div class="tutorial-tooltip"><div class="tutorial-header"><span class="tutorial-step-num"></span><h4 class="tutorial-title"></h4></div><p class="tutorial-desc"></p><div class="tutorial-actions"><label class="tutorial-skip-label"><input type="checkbox" id="tutorial-dont-show"> Don't show again</label><div class="tutorial-btns"><button class="tutorial-btn tutorial-prev">← Back</button><button class="tutorial-btn tutorial-next">Next →</button></div></div></div>`;
    document.body.appendChild(this.overlay);
    this.overlay.querySelector('.tutorial-prev').onclick = () => this._prev();
    this.overlay.querySelector('.tutorial-next').onclick = () => this._next();
    this.overlay.querySelector('.tutorial-backdrop').onclick = () => this._next();
  }
  _showStep(idx) {
    while (idx < this.steps.length) {
      const step = this.steps[idx];
      const el = document.querySelector(step.target);
      if (el && el.offsetParent !== null) break;
      if (step.optional) { idx++; continue; }
      break;
    }
    if (idx >= this.steps.length) { this._finish(); return; }
    this.currentStep = idx;
    const step = this.steps[idx];
    const el = document.querySelector(step.target);
    if (!el) { this._next(); return; }
    const rect = el.getBoundingClientRect();
    const spotlight = this.overlay.querySelector('.tutorial-spotlight');
    const tooltip = this.overlay.querySelector('.tutorial-tooltip');
    spotlight.style.left = `${rect.left - 8}px`;
    spotlight.style.top = `${rect.top - 8}px`;
    spotlight.style.width = `${rect.width + 16}px`;
    spotlight.style.height = `${rect.height + 16}px`;
    this.overlay.querySelector('.tutorial-step-num').textContent = `${idx + 1}/${this.steps.length}`;
    this.overlay.querySelector('.tutorial-title').textContent = step.title;
    this.overlay.querySelector('.tutorial-desc').textContent = step.desc;
    const pos = step.position || 'bottom';
    tooltip.className = 'tutorial-tooltip tutorial-pos-' + pos;
    switch (pos) {
      case 'right': tooltip.style.left = `${rect.right + 20}px`; tooltip.style.top = `${rect.top}px`; break;
      case 'left': tooltip.style.left = `${rect.left - 320}px`; tooltip.style.top = `${rect.top}px`; break;
      case 'bottom': tooltip.style.left = `${rect.left}px`; tooltip.style.top = `${rect.bottom + 20}px`; break;
      case 'top': tooltip.style.left = `${rect.left}px`; tooltip.style.top = `${rect.top - 180}px`; break;
    }
    this.overlay.querySelector('.tutorial-prev').style.display = idx > 0 ? 'inline-block' : 'none';
    this.overlay.querySelector('.tutorial-next').textContent = idx === this.steps.length - 1 ? 'Finish ✓' : 'Next →';
  }
  _next() {
    if (this.currentStep >= this.steps.length - 1) { this._finish(); return; }
    this._showStep(this.currentStep + 1);
  }
  _prev() { if (this.currentStep > 0) this._showStep(this.currentStep - 1); }
  _finish() {
    const dontShow = this.overlay.querySelector('#tutorial-dont-show').checked;
    if (dontShow) localStorage.setItem(this.skipKey, '1');
    this._cleanup();
  }
  _cleanup() { if (this.overlay) { this.overlay.remove(); this.overlay = null; } }
}
if (typeof module !== 'undefined') module.exports = { HavenTutorial };
