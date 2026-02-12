class TriangleMorph {
  constructor(el, vibes, key, onChange) {
    this.el = typeof el === 'string' ? document.getElementById(el) : el;
    this.vibes = vibes;
    this.key = key;
    this.onChange = onChange;
    this.w = 200;
    this.h = 210;
    this.verts = [[100, 15], [10, 170], [190, 170]];
    this.pos = this._centroid();
    this._dragging = false;
    this._pulsePhase = 0;
    this._load();
    this._build();
    this._update();
    this._animate();
  }
  _centroid() { return [this.verts.reduce((s, v) => s + v[0], 0) / 3, this.verts.reduce((s, v) => s + v[1], 0) / 3]; }
  _load() { try { const d = JSON.parse(localStorage.getItem('haven_tri_' + this.key)); if (d && d.length === 2) this.pos = d; } catch {} }
  _save() { localStorage.setItem('haven_tri_' + this.key, JSON.stringify(this.pos)); }
  _build() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
    svg.setAttribute('class', 'tri-morph-svg');
    svg.style.cssText = 'width:100%;max-width:200px;height:auto;cursor:crosshair;touch-action:none;';
    const pts = this.verts.map(v => v.join(',')).join(' ');
    const defs = `<defs>
<radialGradient id="rg_${this.key}" cx="50%" cy="50%" r="75%">
${this.vibes.map((v, i) => `<stop offset="${i * 45}%" stop-color="hsl(${v.hue},${v.sat}%,${v.lit + 20}%)" stop-opacity="0.9"/>`).join('')}
<stop offset="100%" stop-color="hsl(${this.vibes[0].hue},${this.vibes[0].sat}%,${this.vibes[0].lit}%)" stop-opacity="0.6"/>
</radialGradient>
<filter id="glow_${this.key}"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="edgeglow_${this.key}"><feGaussianBlur stdDeviation="3"/></filter>
<linearGradient id="edge_${this.key}" x1="0%" y1="0%" x2="100%" y2="100%">
${this.vibes.map((v, i) => `<stop offset="${i * 50}%" stop-color="hsl(${v.hue},${v.sat + 20}%,${v.lit + 15}%)"/>`).join('')}
</linearGradient>
</defs>`;
    svg.innerHTML = defs;
    const edgeGlow = document.createElementNS(ns, 'polygon');
    edgeGlow.setAttribute('points', pts);
    edgeGlow.setAttribute('fill', 'none');
    edgeGlow.setAttribute('stroke', `url(#edge_${this.key})`);
    edgeGlow.setAttribute('stroke-width', '6');
    edgeGlow.setAttribute('filter', `url(#edgeglow_${this.key})`);
    edgeGlow.setAttribute('class', 'tri-edge-glow');
    svg.appendChild(edgeGlow);
    this.edgeGlow = edgeGlow;
    const tri = document.createElementNS(ns, 'polygon');
    tri.setAttribute('points', pts);
    tri.setAttribute('fill', `url(#rg_${this.key})`);
    tri.setAttribute('stroke', `url(#edge_${this.key})`);
    tri.setAttribute('stroke-width', '2');
    tri.setAttribute('class', 'tri-body');
    svg.appendChild(tri);
    this.triBg = tri;
    const glass = document.createElementNS(ns, 'polygon');
    glass.setAttribute('points', pts);
    glass.setAttribute('fill', 'rgba(255,255,255,0.04)');
    glass.setAttribute('stroke', 'rgba(255,255,255,0.1)');
    glass.setAttribute('stroke-width', '1');
    svg.appendChild(glass);
    this.vibes.forEach((v, i) => {
      const [vx, vy] = this.verts[i];
      const ox = i === 0 ? 0 : i === 1 ? -8 : 8;
      const oy = i === 0 ? -12 : 22;
      const vGlow = document.createElementNS(ns, 'circle');
      vGlow.setAttribute('cx', vx);
      vGlow.setAttribute('cy', vy);
      vGlow.setAttribute('r', '18');
      vGlow.setAttribute('fill', `hsl(${v.hue},${v.sat + 15}%,${v.lit + 10}%)`);
      vGlow.setAttribute('opacity', '0.15');
      vGlow.setAttribute('filter', `url(#edgeglow_${this.key})`);
      svg.appendChild(vGlow);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', vx + ox);
      t.setAttribute('y', vy + oy);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'middle');
      t.setAttribute('class', 'tri-label');
      t.setAttribute('fill', `hsl(${v.hue},${v.sat + 20}%,${v.lit + 30}%)`);
      t.textContent = v.name;
      svg.appendChild(t);
    });
    const glow = document.createElementNS(ns, 'circle');
    glow.setAttribute('r', '18');
    glow.setAttribute('class', 'tri-glow');
    glow.setAttribute('filter', `url(#glow_${this.key})`);
    svg.appendChild(glow);
    this.glow = glow;
    const outerRing = document.createElementNS(ns, 'circle');
    outerRing.setAttribute('r', '16');
    outerRing.setAttribute('class', 'tri-outer-ring');
    svg.appendChild(outerRing);
    this.outerRing = outerRing;
    this.dot = document.createElementNS(ns, 'circle');
    this.dot.setAttribute('r', '9');
    this.dot.setAttribute('class', 'tri-dot');
    svg.appendChild(this.dot);
    this.ring = document.createElementNS(ns, 'circle');
    this.ring.setAttribute('r', '13');
    this.ring.setAttribute('class', 'tri-ring');
    svg.appendChild(this.ring);
    this.el.appendChild(svg);
    this.svg = svg;
    const getPos = (e) => { const r = svg.getBoundingClientRect(), cl = e.touches ? e.touches[0] : e; return [(cl.clientX - r.left) / r.width * this.w, (cl.clientY - r.top) / r.height * this.h]; };
    const onMove = (e) => { if (!this._dragging) return; e.preventDefault(); this.pos = this._clamp(getPos(e)); this._update(); };
    const onUp = () => { this._dragging = false; this._save(); };
    svg.addEventListener('mousedown', (e) => { this._dragging = true; onMove(e); });
    svg.addEventListener('touchstart', (e) => { this._dragging = true; onMove(e); }, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }
  _animate() {
    this._pulsePhase += 0.02;
    const pulse = 0.3 + Math.sin(this._pulsePhase) * 0.15;
    if (this.edgeGlow) this.edgeGlow.setAttribute('opacity', pulse.toFixed(2));
    if (this.outerRing) this.outerRing.setAttribute('opacity', (0.2 + Math.sin(this._pulsePhase * 1.3) * 0.1).toFixed(2));
    requestAnimationFrame(() => this._animate());
  }
  _clamp(p) {
    const [a, b, c] = this.verts, bary = this._bary(p);
    if (bary[0] >= 0 && bary[1] >= 0 && bary[2] >= 0) return p;
    let best = p, bestD = Infinity;
    [[a, b], [b, c], [a, c]].forEach(([s, e]) => { const cp = this._closestOnSeg(p, s, e), d = (cp[0] - p[0]) ** 2 + (cp[1] - p[1]) ** 2; if (d < bestD) { bestD = d; best = cp; } });
    return best;
  }
  _closestOnSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy, t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)); return [a[0] + t * dx, a[1] + t * dy]; }
  _bary(p) { const [[x1, y1], [x2, y2], [x3, y3]] = this.verts, det = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3), w1 = ((y2 - y3) * (p[0] - x3) + (x3 - x2) * (p[1] - y3)) / det, w2 = ((y3 - y1) * (p[0] - x3) + (x1 - x3) * (p[1] - y3)) / det; return [w1, w2, 1 - w1 - w2]; }
  _update() {
    const [x, y] = this.pos;
    [this.dot, this.ring, this.glow, this.outerRing].forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
    const w = this._bary(this.pos).map(v => Math.max(0, v)), sum = w[0] + w[1] + w[2], norm = sum > 0 ? w.map(v => v / sum) : [1 / 3, 1 / 3, 1 / 3];
    const blendHue = this.vibes.reduce((h, v, i) => h + v.hue * norm[i], 0);
    const blendSat = this.vibes.reduce((s, v, i) => s + v.sat * norm[i], 0);
    this.glow.setAttribute('fill', `hsl(${blendHue},${blendSat + 10}%,55%)`);
    this.dot.setAttribute('fill', `hsl(${blendHue},${blendSat + 15}%,60%)`);
    this.outerRing.setAttribute('stroke', `hsl(${blendHue},${blendSat}%,50%)`);
    const stops = this.svg.querySelectorAll(`#rg_${this.key} stop`);
    stops.forEach((s, i) => { if (this.vibes[i]) s.setAttribute('stop-color', `hsl(${this.vibes[i].hue},${this.vibes[i].sat + norm[i] * 20}%,${this.vibes[i].lit + norm[i] * 15}%)`); });
    this.onChange(norm);
  }
  getWeights() { return this._bary(this.pos).map(v => Math.max(0, v)); }
  reset() { this.pos = this._centroid(); this._save(); this._update(); }
}
function initTriangleMorph() {
  const panel = document.getElementById('triangle-morph-panel');
  if (!panel) return;
  const vibes = [
    { name: 'Chill', hue: 200, sat: 70, lit: 58, bg: [210, 30, 8], txt: [200, 40, 90], glow: 0.18, radius: 14, glass: 0.06, blur: 12 },
    { name: 'Heat', hue: 5, sat: 90, lit: 55, bg: [5, 35, 7], txt: [10, 50, 92], glow: 0.45, radius: 3, glass: 0.04, blur: 8 },
    { name: 'Dream', hue: 275, sat: 65, lit: 52, bg: [280, 35, 8], txt: [275, 38, 88], glow: 0.3, radius: 18, glass: 0.08, blur: 16 }
  ];
  const hsl = (h, s, l) => `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
  const hsla = (h, s, l, a) => `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a.toFixed(2)})`;
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpArr = (arrs, w) => arrs[0].map((_, i) => arrs.reduce((s, arr, j) => s + arr[i] * w[j], 0));
  const applyMorph = (weights) => {
    if (document.documentElement.getAttribute('data-theme') !== 'triangle') return;
    const r = document.documentElement.style;
    const h = vibes.reduce((s, v, i) => s + v.hue * weights[i], 0);
    const sat = vibes.reduce((s, v, i) => s + v.sat * weights[i], 0);
    const lit = vibes.reduce((s, v, i) => s + v.lit * weights[i], 0);
    const bgArr = lerpArr(vibes.map(v => v.bg), weights);
    const txArr = lerpArr(vibes.map(v => v.txt), weights);
    const glowAmt = vibes.reduce((s, v, i) => s + v.glow * weights[i], 0);
    const radVal = Math.round(vibes.reduce((s, v, i) => s + v.radius * weights[i], 0));
    const glassOpacity = vibes.reduce((s, v, i) => s + v.glass * weights[i], 0);
    const blurVal = Math.round(vibes.reduce((s, v, i) => s + v.blur * weights[i], 0));
    r.setProperty('--accent', hsl(h, sat, lit));
    r.setProperty('--accent-hover', hsl(h, Math.min(100, sat + 15), lit + 10));
    r.setProperty('--accent-dim', hsl(h, Math.max(0, sat - 10), lit - 12));
    r.setProperty('--accent-glow', hsla(h, sat, lit, glowAmt));
    r.setProperty('--bg-primary', hsl(bgArr[0], bgArr[1], bgArr[2]));
    r.setProperty('--bg-secondary', hsl(bgArr[0], bgArr[1], bgArr[2] + 3));
    r.setProperty('--bg-tertiary', hsl(bgArr[0], bgArr[1], bgArr[2] + 6));
    r.setProperty('--bg-hover', hsl(bgArr[0], bgArr[1], bgArr[2] + 10));
    r.setProperty('--bg-active', hsl(bgArr[0], bgArr[1], bgArr[2] + 14));
    r.setProperty('--bg-input', hsl(bgArr[0], bgArr[1], Math.max(2, bgArr[2] - 3)));
    r.setProperty('--bg-card', hsl(bgArr[0], bgArr[1], bgArr[2] + 2));
    r.setProperty('--text-primary', hsl(txArr[0], txArr[1], txArr[2]));
    r.setProperty('--text-secondary', hsl(txArr[0], Math.max(0, txArr[1] - 15), txArr[2] - 18));
    r.setProperty('--text-muted', hsl(txArr[0], Math.max(0, txArr[1] - 25), txArr[2] - 38));
    r.setProperty('--text-link', hsl(h, sat + 5, lit + 8));
    r.setProperty('--border', hsla(h, sat * 0.4, bgArr[2] + 12, 0.5));
    r.setProperty('--border-light', hsla(h, sat * 0.3, bgArr[2] + 18, 0.4));
    r.setProperty('--led-on', hsl(h, sat, lit));
    r.setProperty('--led-glow', hsla(h, sat, lit, 0.6));
    r.setProperty('--msg-glow', `0 0 6px ${hsla(h, sat, lit, 0.12)}`);
    r.setProperty('--radius-sm', radVal + 'px');
    r.setProperty('--radius-md', (radVal + 4) + 'px');
    r.setProperty('--radius-lg', (radVal + 8) + 'px');
    r.setProperty('--glass-bg', hsla(bgArr[0], bgArr[1] + 5, bgArr[2] + 4, 0.65 + glassOpacity));
    r.setProperty('--glass-border', hsla(h, sat * 0.5, lit + 20, 0.15));
    r.setProperty('--glass-blur', blurVal + 'px');
    r.setProperty('--glass-highlight', `inset 0 1px 0 ${hsla(h, sat * 0.3, 90, 0.06)}`);
    r.setProperty('--vibe-shadow', `0 4px 24px ${hsla(h, sat, lit * 0.4, glowAmt * 0.6)}, 0 0 80px ${hsla(h, sat * 0.7, lit * 0.3, glowAmt * 0.2)}`);
  };
  const box = document.createElement('div');
  box.className = 'tri-morph-group';
  box.innerHTML = '<span class="tri-morph-title">Vibe Morph</span>';
  panel.appendChild(box);
  const morph = new TriangleMorph(box, vibes, 'morph', applyMorph);
  const resetBtn = document.createElement('button');
  resetBtn.className = 'tri-morph-reset';
  resetBtn.textContent = '↺ Reset';
  resetBtn.onclick = () => { localStorage.removeItem('haven_tri_morph'); document.documentElement.style.cssText = ''; morph.reset(); };
  panel.appendChild(resetBtn);
  applyMorph([1/3, 1/3, 1/3]);
  const obs = new MutationObserver(() => {
    const isTriangle = document.documentElement.getAttribute('data-theme') === 'triangle';
    panel.style.display = isTriangle ? 'flex' : 'none';
    if (isTriangle) applyMorph(morph.getWeights().map(v => Math.max(0, v) / (morph.getWeights().reduce((a, b) => a + Math.max(0, b), 0) || 1)));
    else document.documentElement.style.cssText = '';
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  panel.style.display = document.documentElement.getAttribute('data-theme') === 'triangle' ? 'flex' : 'none';
}
document.addEventListener('DOMContentLoaded', initTriangleMorph);
