class TriangleMorph {
  constructor(container, labels, colorStops, key, onChange) {
    this.el = typeof container === 'string' ? document.getElementById(container) : container;
    this.labels = labels;
    this.colors = colorStops;
    this.key = key;
    this.onChange = onChange;
    this.w = 130;
    this.h = 113;
    this.verts = [[65, 8], [8, 105], [122, 105]];
    this.pos = this._centroid();
    this._dragging = false;
    this._load();
    this._build();
    this._update();
  }
  _centroid() { return [this.verts.reduce((s, v) => s + v[0], 0) / 3, this.verts.reduce((s, v) => s + v[1], 0) / 3]; }
  _load() {
    try {
      const d = JSON.parse(localStorage.getItem('haven_tri_' + this.key));
      if (d && d.length === 2) this.pos = d;
    } catch {}
  }
  _save() { localStorage.setItem('haven_tri_' + this.key, JSON.stringify(this.pos)); }
  _build() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
    svg.setAttribute('class', 'tri-morph-svg');
    svg.style.cssText = 'width:130px;height:113px;cursor:crosshair;touch-action:none;';
    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.id = 'tg_' + this.key;
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
    this.colors.forEach((c, i) => {
      const stop = document.createElementNS(ns, 'stop');
      stop.setAttribute('offset', (i * 50) + '%');
      stop.setAttribute('stop-color', c);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);
    const tri = document.createElementNS(ns, 'polygon');
    tri.setAttribute('points', this.verts.map(v => v.join(',')).join(' '));
    tri.setAttribute('fill', `url(#tg_${this.key})`);
    tri.setAttribute('stroke', 'var(--text-muted)');
    tri.setAttribute('stroke-width', '1.5');
    tri.setAttribute('opacity', '0.85');
    svg.appendChild(tri);
    this.verts.forEach((v, i) => {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', v[0] + (i === 0 ? 0 : i === 1 ? -6 : 6));
      t.setAttribute('y', v[1] + (i === 0 ? -4 : 14));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'tri-label');
      t.textContent = this.labels[i];
      svg.appendChild(t);
    });
    this.dot = document.createElementNS(ns, 'circle');
    this.dot.setAttribute('r', '6');
    this.dot.setAttribute('class', 'tri-dot');
    svg.appendChild(this.dot);
    this.ring = document.createElementNS(ns, 'circle');
    this.ring.setAttribute('r', '9');
    this.ring.setAttribute('class', 'tri-ring');
    svg.appendChild(this.ring);
    this.el.appendChild(svg);
    this.svg = svg;
    const getPos = (e) => {
      const r = svg.getBoundingClientRect();
      const cl = e.touches ? e.touches[0] : e;
      return [(cl.clientX - r.left) / r.width * this.w, (cl.clientY - r.top) / r.height * this.h];
    };
    const onMove = (e) => {
      if (!this._dragging) return;
      e.preventDefault();
      const p = getPos(e);
      this.pos = this._clamp(p);
      this._update();
    };
    const onUp = () => { this._dragging = false; this._save(); };
    svg.addEventListener('mousedown', (e) => { this._dragging = true; onMove(e); });
    svg.addEventListener('touchstart', (e) => { this._dragging = true; onMove(e); }, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }
  _clamp(p) {
    const [a, b, c] = this.verts;
    const bary = this._bary(p);
    if (bary[0] >= 0 && bary[1] >= 0 && bary[2] >= 0) return p;
    let best = p, bestD = Infinity;
    [[a, b], [b, c], [a, c]].forEach(([s, e]) => {
      const cp = this._closestOnSeg(p, s, e);
      const d = (cp[0] - p[0]) ** 2 + (cp[1] - p[1]) ** 2;
      if (d < bestD) { bestD = d; best = cp; }
    });
    return best;
  }
  _closestOnSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    return [a[0] + t * dx, a[1] + t * dy];
  }
  _bary(p) {
    const [[x1, y1], [x2, y2], [x3, y3]] = this.verts;
    const det = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
    const w1 = ((y2 - y3) * (p[0] - x3) + (x3 - x2) * (p[1] - y3)) / det;
    const w2 = ((y3 - y1) * (p[0] - x3) + (x1 - x3) * (p[1] - y3)) / det;
    return [w1, w2, 1 - w1 - w2];
  }
  _update() {
    this.dot.setAttribute('cx', this.pos[0]);
    this.dot.setAttribute('cy', this.pos[1]);
    this.ring.setAttribute('cx', this.pos[0]);
    this.ring.setAttribute('cy', this.pos[1]);
    const w = this._bary(this.pos).map(v => Math.max(0, v));
    const sum = w[0] + w[1] + w[2];
    const norm = sum > 0 ? w.map(v => v / sum) : [1 / 3, 1 / 3, 1 / 3];
    this.onChange(norm);
  }
  getWeights() { return this._bary(this.pos).map(v => Math.max(0, v)); }
  reset() { this.pos = this._centroid(); this._save(); this._update(); }
}
function initTriangleMorph() {
  const panel = document.getElementById('triangle-morph-panel');
  if (!panel) return;
  const lerpHSL = (stops, weights) => {
    let h = 0, s = 0, l = 0;
    stops.forEach((c, i) => { h += c[0] * weights[i]; s += c[1] * weights[i]; l += c[2] * weights[i]; });
    return [Math.round(h), Math.round(s), Math.round(l)];
  };
  const hslStr = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;
  const hslA = (h, s, l, a) => `hsla(${h}, ${s}%, ${l}%, ${a})`;
  const vibeStops = { accent: [[220, 60, 65], [350, 85, 55], [280, 50, 50]], bg: [[220, 25, 10], [350, 30, 8], [280, 30, 9]], text: [[220, 40, 90], [350, 50, 92], [280, 35, 88]] };
  const eraStops = { radius: [12, 2, 16], glow: [0.1, 0.4, 0.15], sat: [0.7, 1.3, 0.85] };
  let vibeW = [1 / 3, 1 / 3, 1 / 3], eraW = [1 / 3, 1 / 3, 1 / 3];
  const applyMorph = () => {
    if (document.documentElement.getAttribute('data-theme') !== 'triangle') return;
    const r = document.documentElement.style;
    const ac = lerpHSL(vibeStops.accent, vibeW);
    const bg = lerpHSL(vibeStops.bg, vibeW);
    const tx = lerpHSL(vibeStops.text, vibeW);
    const satMul = eraStops.sat.reduce((s, v, i) => s + v * eraW[i], 0);
    const glowAmt = eraStops.glow.reduce((s, v, i) => s + v * eraW[i], 0);
    const radVal = Math.round(eraStops.radius.reduce((s, v, i) => s + v * eraW[i], 0));
    const aSat = Math.round(ac[1] * satMul);
    r.setProperty('--accent', hslStr(ac[0], aSat, ac[1]));
    r.setProperty('--accent-hover', hslStr(ac[0], Math.min(100, aSat + 10), ac[2] + 10));
    r.setProperty('--accent-dim', hslStr(ac[0], Math.max(0, aSat - 15), ac[2] - 10));
    r.setProperty('--accent-glow', hslA(ac[0], aSat, ac[2], glowAmt));
    r.setProperty('--bg-primary', hslStr(bg[0], bg[1], bg[2]));
    r.setProperty('--bg-secondary', hslStr(bg[0], bg[1], bg[2] + 3));
    r.setProperty('--bg-tertiary', hslStr(bg[0], bg[1], bg[2] + 6));
    r.setProperty('--bg-hover', hslStr(bg[0], bg[1], bg[2] + 10));
    r.setProperty('--bg-active', hslStr(bg[0], bg[1], bg[2] + 14));
    r.setProperty('--bg-input', hslStr(bg[0], bg[1], Math.max(2, bg[2] - 3)));
    r.setProperty('--bg-card', hslStr(bg[0], bg[1], bg[2] + 2));
    r.setProperty('--text-primary', hslStr(tx[0], tx[1], tx[2]));
    r.setProperty('--text-secondary', hslStr(tx[0], Math.max(0, tx[1] - 15), tx[2] - 20));
    r.setProperty('--text-muted', hslStr(tx[0], Math.max(0, tx[1] - 25), tx[2] - 40));
    r.setProperty('--text-link', hslStr(ac[0], aSat, ac[2] + 5));
    r.setProperty('--border', hslStr(bg[0], bg[1], bg[2] + 8));
    r.setProperty('--border-light', hslStr(bg[0], bg[1], bg[2] + 12));
    r.setProperty('--led-on', hslStr(ac[0], aSat, ac[2]));
    r.setProperty('--led-glow', hslA(ac[0], aSat, ac[2], 0.5));
    r.setProperty('--msg-glow', `0 0 4px ${hslA(ac[0], aSat, ac[2], 0.08)}`);
    r.setProperty('--radius-sm', radVal + 'px');
    r.setProperty('--radius-md', (radVal + 4) + 'px');
    r.setProperty('--radius-lg', (radVal + 8) + 'px');
  };
  const vibeBox = document.createElement('div');
  vibeBox.className = 'tri-morph-group';
  vibeBox.innerHTML = '<span class="tri-morph-title">Vibe</span>';
  const eraBox = document.createElement('div');
  eraBox.className = 'tri-morph-group';
  eraBox.innerHTML = '<span class="tri-morph-title">Era</span>';
  panel.appendChild(vibeBox);
  panel.appendChild(eraBox);
  new TriangleMorph(vibeBox, ['Serene', 'Fierce', 'Mystic'], ['#4488cc', '#ff3366', '#9944cc'], 'vibe', (w) => { vibeW = w; applyMorph(); });
  new TriangleMorph(eraBox, ['Retro', 'Cyber', 'Organic'], ['#cc8833', '#00ffcc', '#66aa44'], 'era', (w) => { eraW = w; applyMorph(); });
  const resetBtn = document.createElement('button');
  resetBtn.className = 'tri-morph-reset';
  resetBtn.textContent = '↺ Reset';
  resetBtn.onclick = () => {
    panel.querySelectorAll('.tri-morph-group').forEach(g => g.remove());
    localStorage.removeItem('haven_tri_vibe');
    localStorage.removeItem('haven_tri_era');
    document.documentElement.style.cssText = '';
    panel.innerHTML = '';
    initTriangleMorph();
  };
  panel.appendChild(resetBtn);
  applyMorph();
  const obs = new MutationObserver(() => {
    const isTriangle = document.documentElement.getAttribute('data-theme') === 'triangle';
    panel.style.display = isTriangle ? 'flex' : 'none';
    isTriangle ? applyMorph() : document.documentElement.style.cssText = '';
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  panel.style.display = document.documentElement.getAttribute('data-theme') === 'triangle' ? 'flex' : 'none';
}
document.addEventListener('DOMContentLoaded', initTriangleMorph);
