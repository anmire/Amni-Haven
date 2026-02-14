const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execSync } = require('child_process');
const DATA_DIR = process.env.HAVEN_DATA_DIR || (process.platform === 'win32' ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Haven') : path.join(os.homedir(), '.haven'));
const WIZARD_FLAG = path.join(DATA_DIR, '.setup-complete');
function isFirstRun() { return !fs.existsSync(WIZARD_FLAG); }
function markComplete() { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(WIZARD_FLAG, new Date().toISOString()); }
function getLocalIPs() {
  const nets = os.networkInterfaces(), ips = [];
  Object.values(nets).forEach(ifaces => ifaces?.forEach(i => { if (i.family === 'IPv4' && !i.internal) ips.push(i.address); }));
  return ips;
}
function checkPort(port) {
  try { const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf-8', timeout: 5000 }); return out.includes('LISTENING'); } catch { return false; }
}
function generateWizardHTML(ips) {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Amni-Haven Setup Wizard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;display:flex;align-items:center;justify-content:center}
.wizard{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px 40px;max-width:600px;width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.logo{text-align:center;margin-bottom:24px}
.logo span{font-size:48px;color:#7289da}
.logo h1{font-size:22px;color:#fff;margin-top:8px;font-weight:700}
.logo p{font-size:13px;color:#8b949e;margin-top:4px}
.step{display:none}.step.active{display:block}
.step h2{font-size:16px;color:#58a6ff;margin-bottom:16px;border-bottom:1px solid #30363d;padding-bottom:8px}
.field{margin-bottom:14px}
.field label{display:block;font-size:13px;color:#8b949e;margin-bottom:4px;font-weight:600}
.field input,.field select{width:100%;padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;font-size:14px}
.field input:focus,.field select:focus{border-color:#58a6ff;outline:none}
.field small{color:#8b949e;font-size:11px;margin-top:4px;display:block}
.info-box{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:13px;line-height:1.5}
.info-box .ip{color:#58a6ff;font-weight:600;font-family:monospace}
.btn-row{display:flex;gap:10px;margin-top:20px;justify-content:flex-end}
.btn{padding:8px 20px;border:1px solid #30363d;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.btn-primary{background:#238636;border-color:#238636;color:#fff}
.btn-primary:hover{background:#2ea043}
.btn-secondary{background:transparent;color:#c9d1d9}
.btn-secondary:hover{background:#21262d}
.check{color:#3fb950;margin-right:6px}
.warn{color:#d29922;margin-right:6px}
.progress{display:flex;gap:8px;justify-content:center;margin-bottom:20px}
.dot{width:10px;height:10px;border-radius:50%;background:#30363d;transition:background .2s}
.dot.active{background:#58a6ff}
.dot.done{background:#3fb950}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0}
.toggle-row span{font-size:13px}
</style>
</head><body>
<div class="wizard">
<div class="logo"><span>◆</span><h1>AMNI-HAVEN</h1><p>First-Run Setup Wizard</p></div>
<div class="progress" id="progress"><div class="dot active"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
<div class="step active" id="step-1">
<h2>1. Server Identity</h2>
<div class="field"><label>Server Name</label><input type="text" id="w-server-name" value="My Haven Server" maxlength="64"><small>Visible to users in the multi-server sidebar</small></div>
<div class="field"><label>Admin Username</label><input type="text" id="w-admin" value="admin" maxlength="32"><small>Register with this username first to get admin powers</small></div>
<div class="field"><label>Port</label><input type="number" id="w-port" value="3000" min="1024" max="65535"><small>Default: 3000. Change if another app uses this port</small></div>
<div class="btn-row"><button class="btn btn-primary" onclick="nextStep(2)">Next →</button></div>
</div>
<div class="step" id="step-2">
<h2>2. Network & Access</h2>
<div class="info-box">Your local IP(s): ${ips.map(ip => `<span class="ip">${ip}</span>`).join(', ') || '<span class="warn">No LAN IPs detected</span>'}</div>
<div class="field"><label>Access Method</label>
<select id="w-access">
<option value="lan">LAN Only (same network)</option>
<option value="portforward">Port Forwarding (router config needed)</option>
<option value="tunnel">Tunnel (localtunnel / cloudflared — no router changes)</option>
</select>
<small>LAN = local only. Port forward = you open a port on your router. Tunnel = auto public URL</small>
</div>
<div id="pf-info" style="display:none">
<div class="info-box">
<b>Port Forwarding Steps:</b><br>
1. Open your router admin page (usually <span class="ip">192.168.1.1</span>)<br>
2. Find "Port Forwarding" or "Virtual Server"<br>
3. Forward external port <span class="ip" id="pf-port">3000</span> → internal IP <span class="ip">${ips[0] || '?.?.?.?'}</span> port <span class="ip" id="pf-port2">3000</span><br>
4. Protocol: TCP<br>
5. Save &amp; restart router if needed
</div>
</div>
<div id="tunnel-info" style="display:none">
<div class="field"><label>Tunnel Provider</label>
<select id="w-tunnel">
<option value="localtunnel">LocalTunnel (free, no install)</option>
<option value="cloudflared">Cloudflare Tunnel (faster, needs cloudflared CLI)</option>
</select>
<small>LocalTunnel: npm auto-installs. Cloudflare: install from cloudflare.com/dl</small>
</div>
</div>
<div class="field"><label>HTTPS / SSL</label>
<select id="w-ssl">
<option value="auto">Auto-generate self-signed cert</option>
<option value="custom">I have my own certificate</option>
<option value="none">No SSL (HTTP only — voice won't work remotely)</option>
</select>
</div>
<div class="btn-row"><button class="btn btn-secondary" onclick="nextStep(1)">← Back</button><button class="btn btn-primary" onclick="nextStep(3)">Next →</button></div>
</div>
<div class="step" id="step-3">
<h2>3. Features</h2>
<div class="toggle-row"><span>Enable Tunnel on startup</span><select id="w-auto-tunnel" style="width:80px"><option value="no">No</option><option value="yes">Yes</option></select></div>
<div class="toggle-row"><span>Spotify Integration</span><select id="w-spotify" style="width:80px"><option value="no">No</option><option value="yes">Yes</option></select></div>
<div class="toggle-row"><span>GIF Picker</span><select id="w-gif" style="width:80px"><option value="yes">Yes</option><option value="no">No</option></select></div>
<div class="toggle-row"><span>Flash Games (Ruffle)</span><select id="w-flash" style="width:80px"><option value="yes">Yes</option><option value="no">No</option></select></div>
<div class="toggle-row"><span>ROM Emulation (EmulatorJS)</span><select id="w-emu" style="width:80px"><option value="yes">Yes</option><option value="no">No</option></select></div>
<div class="btn-row"><button class="btn btn-secondary" onclick="nextStep(2)">← Back</button><button class="btn btn-primary" onclick="nextStep(4)">Next →</button></div>
</div>
<div class="step" id="step-4">
<h2>4. Review & Launch</h2>
<div class="info-box" id="review-summary"></div>
<div id="setup-status" style="margin-top:12px"></div>
<div class="btn-row"><button class="btn btn-secondary" onclick="nextStep(3)">← Back</button><button class="btn btn-primary" id="finish-btn" onclick="finishSetup()">🚀 Launch Haven</button></div>
</div>
</div>
<script>
let step=1;
const $=id=>document.getElementById(id);
const access=$('w-access');
access.addEventListener('change',()=>{$('pf-info').style.display=access.value==='portforward'?'block':'none';$('tunnel-info').style.display=access.value==='tunnel'?'block':'none';});
function nextStep(n){
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  $('step-'+n).classList.add('active');
  const dots=document.querySelectorAll('.dot');
  dots.forEach((d,i)=>{d.className='dot';i<n-1?d.classList.add('done'):i===n-1&&d.classList.add('active');});
  if(n===4)buildReview();
  step=n;
}
function buildReview(){
  const srv=$('w-server-name').value||'My Haven Server';
  const admin=$('w-admin').value||'admin';
  const port=$('w-port').value||'3000';
  const acc=access.value;
  const ssl=$('w-ssl').value;
  $('review-summary').innerHTML=
    '<b>Server:</b> '+srv+'<br>'+
    '<b>Admin:</b> '+admin+'<br>'+
    '<b>Port:</b> '+port+'<br>'+
    '<b>Access:</b> '+(acc==='lan'?'LAN Only':acc==='portforward'?'Port Forward':'Tunnel ('+($('w-tunnel')?.value||'localtunnel')+')')+'<br>'+
    '<b>SSL:</b> '+(ssl==='auto'?'Auto self-signed':ssl==='custom'?'Custom cert':'None');
}
async function finishSetup(){
  const btn=$('finish-btn');
  btn.disabled=true;btn.textContent='Setting up...';
  const cfg={
    serverName:$('w-server-name').value,
    admin:$('w-admin').value,
    port:parseInt($('w-port').value)||3000,
    access:access.value,
    tunnel:$('w-tunnel')?.value||'localtunnel',
    ssl:$('w-ssl').value,
    autoTunnel:$('w-auto-tunnel').value==='yes',
    spotify:$('w-spotify').value==='yes',
    gif:$('w-gif').value==='yes',
    flash:$('w-flash').value==='yes',
    emulator:$('w-emu').value==='yes'
  };
  try{
    const res=await fetch('/api/setup-wizard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)});
    const data=await res.json();
    if(data.ok){
      $('setup-status').innerHTML='<p style="color:#3fb950"><span class="check">✓</span>Setup complete! Redirecting...</p>';
      setTimeout(()=>window.location.href='/',2000);
    }else{
      $('setup-status').innerHTML='<p style="color:#f85149">'+data.error+'</p>';
      btn.disabled=false;btn.textContent='🚀 Launch Haven';
    }
  }catch(e){
    $('setup-status').innerHTML='<p style="color:#f85149">Connection error: '+e.message+'</p>';
    btn.disabled=false;btn.textContent='🚀 Launch Haven';
  }
}
</script>
</body></html>`;
}
function setupWizardRoutes(app) {
  app.get('/setup', (req, res) => {
    if (!isFirstRun()) return res.redirect('/');
    const ips = getLocalIPs();
    res.send(generateWizardHTML(ips));
  });
  app.post('/api/setup-wizard', (req, res) => {
    try {
      const cfg = req.body;
      const envPath = path.join(DATA_DIR, '.env');
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const jwtSecret = crypto.randomBytes(48).toString('base64');
      let envContent = `PORT=${cfg.port || 3000}\n`;
      envContent += `HOST=0.0.0.0\n`;
      envContent += `SERVER_NAME=${cfg.serverName || 'Haven Server'}\n`;
      envContent += `JWT_SECRET=${jwtSecret}\n`;
      envContent += `ADMIN_USERNAME=${cfg.admin || 'admin'}\n`;
      cfg.autoTunnel && (envContent += `AUTO_TUNNEL=true\nTUNNEL_PROVIDER=${cfg.tunnel || 'localtunnel'}\n`);
      cfg.ssl === 'auto' && (envContent += `SSL_CERT_PATH=./certs/cert.pem\nSSL_KEY_PATH=./certs/key.pem\n`);
      cfg.ssl === 'none' && (envContent += `# SSL disabled by wizard\n`);
      fs.writeFileSync(envPath, envContent);
      if (cfg.ssl === 'auto') {
        const certsDir = path.join(DATA_DIR, 'certs');
        fs.mkdirSync(certsDir, { recursive: true });
        try {
          execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${path.join(certsDir, 'key.pem')}" -out "${path.join(certsDir, 'cert.pem')}" -days 3650 -nodes -subj "/CN=Haven"`, { timeout: 15000 });
        } catch { /* SSL gen failed; server falls back to HTTP */ }
      }
      markComplete();
      res.json({ ok: true });
    } catch (e) {
      res.json({ ok: false, error: e.message });
    }
  });
}
function wizardMiddleware(req, res, next) {
  if (!isFirstRun()) return next();
  if (req.path === '/setup' || req.path === '/api/setup-wizard' || req.path.startsWith('/socket.io')) return next();
  return res.redirect('/setup');
}
module.exports = { isFirstRun, markComplete, setupWizardRoutes, wizardMiddleware, getLocalIPs };
