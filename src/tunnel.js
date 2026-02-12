const { spawn } = require('child_process');
const { getDb } = require('./database');
let tunnelProcess = null, tunnelUrl = null, tunnelProvider = 'localtunnel';
function getSetting(key) {
  try {
    const row = getDb().prepare("SELECT value FROM server_settings WHERE key = ?").get(key);
    return row ? row.value : null;
  } catch { return null; }
}
async function startTunnel(port) {
  if (tunnelProcess) return tunnelUrl;
  const provider = getSetting('tunnel_provider') || 'localtunnel';
  tunnelProvider = provider;
  try {
    if (provider === 'cloudflared') return await startCloudflared(port);
    return await startLocaltunnel(port);
  } catch (err) {
    console.error(`Tunnel (${provider}) failed:`, err.message);
    return null;
  }
}
async function startLocaltunnel(port) {
  try {
    const lt = require('localtunnel');
    const tunnel = await lt({ port, allow_invalid_cert: true });
    tunnelUrl = tunnel.url;
    tunnelProcess = tunnel;
    tunnel.on('close', () => { tunnelProcess = null; tunnelUrl = null; console.log('Tunnel closed'); });
    tunnel.on('error', (err) => console.error('Tunnel error:', err.message));
    console.log(`🌐 Tunnel active: ${tunnelUrl}`);
    return tunnelUrl;
  } catch {
    console.log('localtunnel not installed — run: npm install localtunnel');
    return null;
  }
}
async function startCloudflared(port) {
  return new Promise((resolve) => {
    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'] });
    tunnelProcess = proc;
    let resolved = false;
    const handler = (data) => {
      const line = data.toString();
      const match = line.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        tunnelUrl = match[0];
        console.log(`🌐 Cloudflare tunnel: ${tunnelUrl}`);
        resolve(tunnelUrl);
      }
    };
    proc.stdout.on('data', handler);
    proc.stderr.on('data', handler);
    proc.on('error', () => { tunnelProcess = null; resolve(null); });
    proc.on('close', () => { tunnelProcess = null; tunnelUrl = null; });
    setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 15000);
  });
}
function stopTunnel() {
  if (!tunnelProcess) return;
  try {
    tunnelProvider === 'cloudflared' ? tunnelProcess.kill() : tunnelProcess.close();
  } catch {}
  tunnelProcess = null;
  tunnelUrl = null;
  console.log('🌐 Tunnel stopped');
}
function getTunnelStatus() {
  return { active: !!tunnelProcess, url: tunnelUrl, provider: tunnelProvider };
}
module.exports = { startTunnel, stopTunnel, getTunnelStatus };
