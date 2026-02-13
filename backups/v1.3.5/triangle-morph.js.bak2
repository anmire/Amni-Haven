class TriangleMorph {
  constructor(el, vibes, key, onChange) {
    this.el = typeof el === 'string' ? document.getElementById(el) : el;
    this.vibes = vibes;
    this.key = key;
    this.onChange = onChange;
    this.w = 180;
    this.h = 165;
    this.verts = [[90, 10], [10, 145], [170, 145]];
    this.pos = this._centroid();
    this._dragging = false;
    this._load();
    this._build();
    this._update();
  }
  _centroid() { return [this.verts.reduce((s, v) => s + v[0], 0) / 3, this.verts.reduce((s, v) => s + v[1], 0) / 3]; }
  _load() { try { const d = JSON.parse(localStorage.getItem('haven_tri_' + this.key)); if (d && d.length === 2) this.pos = d; } catch {} }
  _save() { localStorage.setItem('haven_tri_' + this.key, JSON.stringify(this.pos)); }
  _build() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
    svg.setAttribute('class', 'tri-morph-svg');
    svg.style.cssText = 'width:180px;height:165px;cursor:crosshair;touch-action:none;';
    const defs = `<defs><radialGradient id="rg_${this.key}" cx="50%" cy="50%" r="70%">${this.vibes.map((v, i) => `<stop offset="${i * 50}%" stop-color="hsl(${v.hue},${v.sat}%,${v.lit + 15}%)"/>`).join('')}</radialGradient><filter id="glow_${this.key}"><feGaussianBlur stdDeviation="2.5"/></filter></defs>`;
    svg.innerHTML = defs;
    const tri = document.createElementNS(ns, 'polygon');
    tri.setAttribute('points', this.verts.map(v => v.join(',')).join(' '));
    tri.setAttribute('fill', `url(#rg_${this.key})`);
    tri.setAttribute('stroke', 'var(--border-light)');
    tri.setAttribute('stroke-width', '2');
    tri.setAttribute('opacity', '0.7');
    svg.appendChild(tri);
    this.vibes.forEach((v, i) => {
      const [vx, vy] = this.verts[i];
      const ox = i === 0 ? 0 : i === 1 ? -10 : 10;
      const oy = i === 0 ? -8 : 18;
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', vx + ox);
      t.setAttribute('y', vy + oy);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'tri-label');
      t.setAttribute('fill', `hsl(${v.hue},${v.sat}%,${v.lit + 25}%)`);
      t.textContent = v.name;
      svg.appendChild(t);
    });
    const glow = document.createElementNS(ns, 'circle');
    glow.setAttribute('r', '14');
    glow.setAttribute('class', 'tri-glow');
    glow.setAttribute('filter', `url(#glow_${this.key})`);
    svg.appendChild(glow);
    this.glow = glow;
    this.dot = document.createElementNS(ns, 'circle');
    this.dot.setAttribute('r', '8');
    this.dot.setAttribute('class', 'tri-dot');
    svg.appendChild(this.dot);
    this.ring = document.createElementNS(ns, 'circle');
    this.ring.setAttribute('r', '11');
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
    [this.dot, this.ring, this.glow].forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
    const w = this._bary(this.pos).map(v => Math.max(0, v)), sum = w[0] + w[1] + w[2], norm = sum > 0 ? w.map(v => v / sum) : [1 / 3, 1 / 3, 1 / 3];
    const blendHue = this.vibes.reduce((h, v, i) => h + v.hue * norm[i], 0);
    this.glow.setAttribute('fill', `hsl(${blendHue},70%,50%)`);
    this.dot.setAttribute('fill', `hsl(${blendHue},80%,55%)`);
    this.onChange(norm);
  }
  getWeights() { return this._bary(this.pos).map(v => Math.max(0, v)); }
  reset() { this.pos = this._centroid(); this._save(); this._update(); }
}
function initTriangleMorph() {
  const panel = document.getElementById('triangle-morph-panel');
  if (!panel) return;
  const vibes = [
    { name: 'Chill', hue: 210, sat: 55, lit: 55, bg: [210, 25, 10], txt: [210, 35, 88], glow: 0.12, radius: 12 },
    { name: 'Heat', hue: 10, sat: 80, lit: 52, bg: [10, 30, 9], txt: [10, 45, 90], glow: 0.35, radius: 4 },
    { name: 'Dream', hue: 280, sat: 50, lit: 50, bg: [280, 28, 10], txt: [280, 32, 86], glow: 0.22, radius: 16 }
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
    r.setProperty('--accent', hsl(h, sat, lit));
    r.setProperty('--accent-hover', hsl(h, Math.min(100, sat + 10), lit + 8));
    r.setProperty('--accent-dim', hsl(h, Math.max(0, sat - 15), lit - 10));
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
    r.setProperty('--text-link', hsl(h, sat, lit + 5));
    r.setProperty('--border', hsl(bgArr[0], bgArr[1], bgArr[2] + 8));
    r.setProperty('--border-light', hsl(bgArr[0], bgArr[1], bgArr[2] + 12));
    r.setProperty('--led-on', hsl(h, sat, lit));
    r.setProperty('--led-glow', hsla(h, sat, lit, 0.5));
    r.setProperty('--msg-glow', `0 0 4px ${hsla(h, sat, lit, 0.08)}`);
    r.setProperty('--radius-sm', radVal + 'px');
    r.setProperty('--radius-md', (radVal + 4) + 'px');
    r.setProperty('--radius-lg', (radVal + 8) + 'px');
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
