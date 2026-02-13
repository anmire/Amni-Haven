class GameManager {
  constructor(socket, userId, username) {
    this.socket = socket;
    this.userId = userId;
    this.username = username;
    this.library = null;
    this.currentSession = null;
    this.emulator = null;
    this.isHost = false;
    this.players = new Map();
    this.spectators = new Set();
    this.controllerMap = new Map();
    this.inputBuffer = [];
    this.netplayEnabled = false;
    this._setupSocketListeners();
  }
  async loadLibrary() {
    try {
      const res = await fetch('/games/library.json');
      this.library = await res.json();
      return this.library;
    } catch (e) {
      console.error('Failed to load game library:', e);
      return null;
    }
  }
  getConsoles() { return this.library?.consoles || []; }
  getConsole(id) { return this.getConsoles().find(c => c.id === id); }
  async startGame(consoleId, romFile, channelCode) {
    const console = this.getConsole(consoleId);
    if (!console) throw new Error('Unknown console');
    this.isHost = true;
    this.currentSession = { consoleId, romName: romFile.name, channelCode, hostId: this.userId, hostName: this.username, players: [{ id: this.userId, name: this.username, controller: 1 }], state: 'loading' };
    this.socket.emit('game-start', { consoleId, romName: romFile.name, channelCode, maxPlayers: console.maxPlayers });
    await this._loadEmulator(console, romFile);
    this.currentSession.state = 'playing';
    this.socket.emit('game-state', { channelCode, state: 'playing' });
  }
  async _loadEmulator(console, romFile) {
    const container = document.getElementById('game-container');
    if (!container) throw new Error('Game container not found');
    container.innerHTML = '<div class="game-placeholder">Loading emulator...</div>';
    ['EJS_emulator','EJS_player','EJS_core','EJS_gameUrl','EJS_gameID','EJS_pathtodata','EJS_startOnLoaded','EJS_color','EJS_defaultControls','EJS_Buttons','EJS_biosUrl','EJS_onGameStart','EJS_onSaveState','EJS_onLoadState'].forEach(k => delete window[k]);
    const romUrl = URL.createObjectURL(romFile);
    window.EJS_player = '#game-container';
    window.EJS_core = console.core;
    window.EJS_gameUrl = romUrl;
    window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
    window.EJS_startOnLoaded = true;
    window.EJS_color = '#7289da';
    window.EJS_gameID = romFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    window.EJS_defaultControls = true;
    window.EJS_Buttons = { playPause: true, restart: true, mute: true, settings: true, fullscreen: true, saveState: true, loadState: true, screenRecord: false, gamepad: true, cheat: false, volume: true, saveSavFiles: true, loadSavFiles: true, quickSave: true, quickLoad: true, screenshot: true, cacheManager: false };
    if (console.needsBios) window.EJS_biosUrl = `/games/bios/${console.id}/`;
    window.EJS_onGameStart = () => { this._onGameStarted(); };
    window.EJS_onSaveState = (data) => { this._onSaveState(data); };
    window.EJS_onLoadState = () => { this._onLoadState(); };
    const existing = document.querySelector('script[src*="emulatorjs"]');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    script.async = true;
    document.body.appendChild(script);
    return new Promise((resolve) => {
      script.onload = () => { setTimeout(resolve, 500); };
    });
  }
  _onGameStarted() {
    this.emulator = window.EJS_emulator;
    if (this.netplayEnabled && this.isHost) this._startNetplay();
  }
  _onSaveState(data) {
    if (this.isHost && this.currentSession) {
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentSession.romName.replace(/\.[^/.]+$/, '')}_save.state`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
  _onLoadState() {}
  joinGame(sessionData) {
    this.currentSession = sessionData;
    this.isHost = false;
  }
  requestController(controllerId) {
    if (!this.currentSession) return;
    this.socket.emit('game-request-controller', { channelCode: this.currentSession.channelCode, controllerId });
  }
  releaseController() {
    if (!this.currentSession) return;
    const myController = [...this.controllerMap.entries()].find(([_, uid]) => uid === this.userId);
    if (myController) {
      this.socket.emit('game-release-controller', { channelCode: this.currentSession.channelCode, controllerId: myController[0] });
    }
  }
  sendInput(controllerId, input) {
    if (!this.netplayEnabled || !this.currentSession) return;
    this.socket.emit('game-input', { channelCode: this.currentSession.channelCode, controllerId, input, frame: this._getCurrentFrame() });
  }
  _getCurrentFrame() { return this.emulator?.getFrameCount?.() || 0; }
  _startNetplay() {
    this.netplayEnabled = true;
    if (this.emulator && this.emulator.netplay) {
      this.emulator.netplay.start();
    }
  }
  endGame() {
    if (this.currentSession) {
      this.socket.emit('game-end', { channelCode: this.currentSession.channelCode });
    }
    this._cleanup();
  }
  _cleanup() {
    this.currentSession = null;
    this.isHost = false;
    this.players.clear();
    this.spectators.clear();
    this.controllerMap.clear();
    this.netplayEnabled = false;
    const container = document.getElementById('game-container');
    if (container) container.innerHTML = '<div class="game-placeholder">Select a game to play</div>';
    if (window.EJS_emulator) {
      try { window.EJS_emulator.pause(); } catch {}
    }
    this.emulator = null;
  }
  _setupSocketListeners() {
    this.socket.on('game-session', (data) => {
      if (data) {
        this.currentSession = data;
        this.players = new Map(data.players.map(p => [p.id, p]));
        this.controllerMap = new Map(data.controllers || []);
        this._renderPlayers();
        if (this.onSessionUpdate) this.onSessionUpdate(data);
      } else {
        this._cleanup();
        if (this.onSessionEnd) this.onSessionEnd();
      }
    });
    this.socket.on('game-player-joined', (data) => {
      this.players.set(data.userId, { id: data.userId, name: data.username, controller: null });
      this._renderPlayers();
      if (this.onPlayerJoin) this.onPlayerJoin(data);
    });
    this.socket.on('game-player-left', (data) => {
      this.players.delete(data.userId);
      this._renderPlayers();
      if (this.onPlayerLeave) this.onPlayerLeave(data);
    });
    this.socket.on('game-controller-assigned', (data) => {
      this.controllerMap.set(data.controllerId, data.userId);
      const player = this.players.get(data.userId);
      if (player) player.controller = data.controllerId;
      this._renderPlayers();
      if (this.onControllerChange) this.onControllerChange(data);
    });
    this.socket.on('game-controller-released', (data) => {
      this.controllerMap.delete(data.controllerId);
      const player = this.players.get(data.userId);
      if (player) player.controller = null;
      this._renderPlayers();
    });
    this.socket.on('game-input-sync', (data) => {
      if (!this.netplayEnabled || this.isHost) return;
      this.inputBuffer.push(data);
      this._applyInputs();
    });
    this.socket.on('game-state-sync', (data) => {
      if (this.isHost || !this.emulator) return;
      if (data.saveState) {
        const arr = new Uint8Array(data.saveState);
        this.emulator.loadState(arr);
      }
    });
    this.socket.on('game-ended', () => {
      this._cleanup();
      if (this.onSessionEnd) this.onSessionEnd();
    });
  }
  _applyInputs() {
    while (this.inputBuffer.length > 0) {
      const input = this.inputBuffer.shift();
      if (this.emulator && this.emulator.setInput) {
        this.emulator.setInput(input.controllerId, input.input);
      }
    }
  }
  _renderPlayers() {
    const el = document.getElementById('game-players-list');
    if (!el) return;
    const players = [...this.players.values()];
    el.innerHTML = players.map(p => `<div class="game-player-item ${p.controller ? 'has-controller' : ''}"><span class="gp-name">${this._escapeHtml(p.name)}</span><span class="gp-controller">${p.controller ? `🎮 P${p.controller}` : '👁️ Spectating'}</span></div>`).join('');
  }
  _escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  onSessionUpdate = null;
  onSessionEnd = null;
  onPlayerJoin = null;
  onPlayerLeave = null;
  onControllerChange = null;
}
if (typeof module !== 'undefined') module.exports = { GameManager };
