// ═══════════════════════════════════════════════════════════
// Haven — Shared Theme Switcher (loaded on all pages)
// Features: theme switching, RGB cycling, custom palette
// ═══════════════════════════════════════════════════════════

let _rgbInterval = null;
let _rgbPhase = 0;

function hsl(h, s, l) { return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`; }
function hsla(h, s, l, a) { return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a.toFixed(2)})`; }

// ── Custom Palette Generator ──────────────────────────────
function generateCustomPalette(hue, vibrancy) {
  const s = vibrancy;
  const r = document.documentElement.style;
  r.setProperty('--accent', hsl(hue, s, 55));
  r.setProperty('--accent-hover', hsl(hue, Math.min(100, s + 10), 65));
  r.setProperty('--accent-dim', hsl(hue, Math.max(0, s - 10), 42));
  r.setProperty('--accent-glow', hsla(hue, s, 55, 0.3));
  r.setProperty('--bg-primary', hsl(hue, 15, 8));
  r.setProperty('--bg-secondary', hsl(hue, 15, 10));
  r.setProperty('--bg-tertiary', hsl(hue, 14, 14));
  r.setProperty('--bg-hover', hsl(hue, 13, 18));
  r.setProperty('--bg-active', hsl(hue, 14, 22));
  r.setProperty('--bg-input', hsl(hue, 16, 6));
  r.setProperty('--bg-card', hsl(hue, 15, 9));
  r.setProperty('--text-primary', hsl(hue, 15, 92));
  r.setProperty('--text-secondary', hsl(hue, 12, 68));
  r.setProperty('--text-muted', hsl(hue, 10, 40));
  r.setProperty('--text-link', hsl(hue, s, 65));
  r.setProperty('--border', hsl(hue, 12, 18));
  r.setProperty('--border-light', hsl(hue, 10, 24));
  r.setProperty('--led-on', hsl(hue, s, 55));
  r.setProperty('--led-glow', hsla(hue, s, 55, 0.5));
  r.setProperty('--msg-glow', `0 0 4px ${hsla(hue, s, 55, 0.08)}`);
}

// ── RGB Cycling ───────────────────────────────────────────
function startRgbCycle(speed, vibrancy) {
  stopRgbCycle();
  const interval = Math.max(16, 200 - speed * 18);
  _rgbInterval = setInterval(() => {
    _rgbPhase = (_rgbPhase + 1) % 360;
    generateCustomPalette(_rgbPhase, vibrancy);
  }, interval);
}

function stopRgbCycle() {
  if (_rgbInterval) {
    clearInterval(_rgbInterval);
    _rgbInterval = null;
  }
}

function initThemeSwitcher(containerId, socket) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const saved = localStorage.getItem('haven_theme') || 'amni';
  const rgbPanel = document.getElementById('rgb-controls-panel');
  const customPanel = document.getElementById('custom-theme-panel');

  function showPanels(theme) {
    if (rgbPanel) rgbPanel.style.display = theme === 'rgb' ? 'block' : 'none';
    if (customPanel) customPanel.style.display = theme === 'custom' ? 'block' : 'none';
  }

  function applyTheme(theme) {
    // Stop RGB cycle when switching away
    if (theme !== 'rgb') stopRgbCycle();
    // Clear inline styles from custom/rgb themes
    if (theme !== 'rgb' && theme !== 'custom') {
      document.documentElement.style.cssText = '';
    }

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('haven_theme', theme);

    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === theme);
    });

    showPanels(theme);

    if (theme === 'rgb') {
      const speed = parseInt(localStorage.getItem('haven_rgb_speed') || '5');
      const vib = parseInt(localStorage.getItem('haven_rgb_vibrancy') || '70');
      const speedSlider = document.getElementById('rgb-speed');
      const vibSlider = document.getElementById('rgb-vibrancy');
      if (speedSlider) speedSlider.value = speed;
      if (vibSlider) vibSlider.value = vib;
      startRgbCycle(speed, vib);
    } else if (theme === 'custom') {
      const hue = parseInt(localStorage.getItem('haven_custom_hue') || '200');
      const vib = parseInt(localStorage.getItem('haven_custom_vibrancy') || '65');
      const hueSlider = document.getElementById('custom-hue');
      const vibSlider = document.getElementById('custom-vibrancy');
      if (hueSlider) hueSlider.value = hue;
      if (vibSlider) vibSlider.value = vib;
      generateCustomPalette(hue, vib);
    }

    if (socket && socket.connected) {
      socket.emit('set-preference', { key: 'theme', value: theme });
    }
  }

  // Set active button
  container.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === saved);
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  // RGB controls
  const rgbSpeed = document.getElementById('rgb-speed');
  const rgbVib = document.getElementById('rgb-vibrancy');
  if (rgbSpeed) {
    rgbSpeed.addEventListener('input', () => {
      const speed = parseInt(rgbSpeed.value);
      const vib = parseInt(rgbVib?.value || '70');
      localStorage.setItem('haven_rgb_speed', speed);
      if (document.documentElement.getAttribute('data-theme') === 'rgb') {
        startRgbCycle(speed, vib);
      }
    });
  }
  if (rgbVib) {
    rgbVib.addEventListener('input', () => {
      const speed = parseInt(rgbSpeed?.value || '5');
      const vib = parseInt(rgbVib.value);
      localStorage.setItem('haven_rgb_vibrancy', vib);
      if (document.documentElement.getAttribute('data-theme') === 'rgb') {
        startRgbCycle(speed, vib);
      }
    });
  }

  // Custom theme controls
  const customHue = document.getElementById('custom-hue');
  const customVib = document.getElementById('custom-vibrancy');
  if (customHue) {
    customHue.addEventListener('input', () => {
      const h = parseInt(customHue.value);
      const v = parseInt(customVib?.value || '65');
      localStorage.setItem('haven_custom_hue', h);
      if (document.documentElement.getAttribute('data-theme') === 'custom') {
        generateCustomPalette(h, v);
      }
    });
  }
  if (customVib) {
    customVib.addEventListener('input', () => {
      const h = parseInt(customHue?.value || '200');
      const v = parseInt(customVib.value);
      localStorage.setItem('haven_custom_vibrancy', v);
      if (document.documentElement.getAttribute('data-theme') === 'custom') {
        generateCustomPalette(h, v);
      }
    });
  }

  // Apply saved theme on load
  showPanels(saved);
  if (saved === 'rgb') {
    const speed = parseInt(localStorage.getItem('haven_rgb_speed') || '5');
    const vib = parseInt(localStorage.getItem('haven_rgb_vibrancy') || '70');
    if (rgbSpeed) rgbSpeed.value = speed;
    if (rgbVib) rgbVib.value = vib;
    startRgbCycle(speed, vib);
  } else if (saved === 'custom') {
    const hue = parseInt(localStorage.getItem('haven_custom_hue') || '200');
    const vib = parseInt(localStorage.getItem('haven_custom_vibrancy') || '65');
    if (customHue) customHue.value = hue;
    if (customVib) customVib.value = vib;
    generateCustomPalette(hue, vib);
  }
}

function applyThemeFromServer(theme) {
  if (!theme) return;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('haven_theme', theme);
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  if (theme === 'rgb') {
    const speed = parseInt(localStorage.getItem('haven_rgb_speed') || '5');
    const vib = parseInt(localStorage.getItem('haven_rgb_vibrancy') || '70');
    startRgbCycle(speed, vib);
  } else if (theme === 'custom') {
    const hue = parseInt(localStorage.getItem('haven_custom_hue') || '200');
    const vib = parseInt(localStorage.getItem('haven_custom_vibrancy') || '65');
    generateCustomPalette(hue, vib);
  } else {
    stopRgbCycle();
  }
}
