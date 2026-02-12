class SpotifyPlayer {
  constructor(onReady, onError, onStateChange) {
    this.onReady = onReady;
    this.onError = onError;
    this.onStateChange = onStateChange;
    this.player = null;
    this.deviceId = null;
    this.token = null;
    this.isPremium = false;
    this.linked = false;
    this._sdkReady = false;
    this._initPromise = null;
  }
  async checkStatus() {
    const res = await fetch('/api/spotify/status', { headers: { Authorization: `Bearer ${localStorage.getItem('haven_token')}` } }).catch(() => null);
    if (!res?.ok) return { linked: false, premium: false, configured: false };
    return res.json();
  }
  async getAuthUrl() {
    const res = await fetch('/api/spotify/auth-url', { headers: { Authorization: `Bearer ${localStorage.getItem('haven_token')}` } }).catch(() => null);
    if (!res?.ok) return null;
    const data = await res.json();
    return data.url;
  }
  async unlink() {
    await fetch('/api/spotify/unlink', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('haven_token')}` } }).catch(() => {});
    this.linked = false;
    this.isPremium = false;
    this.token = null;
    if (this.player) { this.player.disconnect(); this.player = null; }
  }
  async getToken() {
    const res = await fetch('/api/spotify/token', { headers: { Authorization: `Bearer ${localStorage.getItem('haven_token')}` } }).catch(() => null);
    if (!res?.ok) return null;
    const data = await res.json();
    this.token = data.accessToken;
    this.isPremium = data.product === 'premium';
    this.linked = true;
    return data;
  }
  async loadSDK() {
    if (this._sdkReady) return true;
    if (this._initPromise) return this._initPromise;
    this._initPromise = new Promise((resolve) => {
      if (window.Spotify) { this._sdkReady = true; resolve(true); return; }
      window.onSpotifyWebPlaybackSDKReady = () => { this._sdkReady = true; resolve(true); };
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
      setTimeout(() => resolve(this._sdkReady), 10000);
    });
    return this._initPromise;
  }
  async init() {
    const tokenData = await this.getToken();
    if (!tokenData) { this.onError?.('not_linked'); return false; }
    if (!this.isPremium) { this.onError?.('not_premium'); return false; }
    const sdkOk = await this.loadSDK();
    if (!sdkOk) { this.onError?.('sdk_failed'); return false; }
    return new Promise((resolve) => {
      this.player = new Spotify.Player({
        name: 'Haven Listen Together',
        getOAuthToken: async (cb) => {
          const data = await this.getToken();
          cb(data?.accessToken || this.token);
        },
        volume: 0.5
      });
      this.player.addListener('ready', ({ device_id }) => {
        this.deviceId = device_id;
        this.onReady?.(device_id);
        resolve(true);
      });
      this.player.addListener('not_ready', () => { this.deviceId = null; });
      this.player.addListener('player_state_changed', (state) => { this.onStateChange?.(state); });
      this.player.addListener('initialization_error', ({ message }) => { this.onError?.('init_error', message); resolve(false); });
      this.player.addListener('authentication_error', ({ message }) => { this.onError?.('auth_error', message); resolve(false); });
      this.player.addListener('account_error', ({ message }) => { this.onError?.('account_error', message); resolve(false); });
      this.player.connect();
    });
  }
  async play(spotifyUri) {
    if (!this.deviceId || !this.token) return false;
    const body = spotifyUri.includes(':track:') ? { uris: [spotifyUri] } : { context_uri: spotifyUri };
    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).catch(() => null);
    return res?.ok || false;
  }
  async pause() {
    if (!this.player) return;
    await this.player.pause();
  }
  async resume() {
    if (!this.player) return;
    await this.player.resume();
  }
  async seek(ms) {
    if (!this.player) return;
    await this.player.seek(ms);
  }
  async setVolume(vol) {
    if (!this.player) return;
    await this.player.setVolume(vol);
  }
  async getCurrentState() {
    if (!this.player) return null;
    return this.player.getCurrentState();
  }
  disconnect() {
    if (this.player) { this.player.disconnect(); this.player = null; this.deviceId = null; }
  }
  spotifyUrlToUri(url) {
    const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    return m ? `spotify:${m[1]}:${m[2]}` : null;
  }
}
window.SpotifyPlayer = SpotifyPlayer;
