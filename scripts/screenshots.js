const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'https://localhost:3000';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--ignore-certificate-errors', '--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  console.log('1/6 — Login page...');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(1500);
  await page.screenshot({ path: path.join(OUT, '01-login.png'), fullPage: false });
  console.log('  saved 01-login.png');
  const hasRegister = await page.$('#toggle-register, .register-toggle, [data-action="register"]');
  if (hasRegister) {
    await hasRegister.click();
    await delay(500);
  }
  const usernameField = await page.$('input[name="username"], #username, input[type="text"]');
  const passwordField = await page.$('input[name="password"], #password, input[type="password"]');
  if (usernameField && passwordField) {
    await usernameField.type('ScreenshotBot', { delay: 30 });
    await passwordField.type('Screenshot123!', { delay: 30 });
    const submitBtn = await page.$('button[type="submit"], .login-btn, #login-btn, .register-btn');
    if (submitBtn) {
      await submitBtn.click();
      await delay(3000);
    }
  }
  console.log('2/6 — Main chat view...');
  await delay(2000);
  await page.screenshot({ path: path.join(OUT, '02-main-chat.png'), fullPage: false });
  console.log('  saved 02-main-chat.png');
  console.log('3/6 — Settings modal...');
  const settingsBtn = await page.$('#open-settings-btn');
  if (settingsBtn) {
    await settingsBtn.click();
    await delay(1000);
    await page.screenshot({ path: path.join(OUT, '03-settings.png'), fullPage: false });
    console.log('  saved 03-settings.png');
    const closeSettings = await page.$('.modal-close, .settings-close, #settings-close');
    if (closeSettings) await closeSettings.click();
    await delay(500);
  }
  console.log('4/6 — Game panel...');
  const gameBtn = await page.$('#game-together-btn');
  if (gameBtn) {
    await gameBtn.evaluate(el => el.style.display = 'inline-flex');
    await delay(200);
    await gameBtn.click();
    await delay(1500);
    await page.screenshot({ path: path.join(OUT, '04-games.png'), fullPage: false });
    console.log('  saved 04-games.png');
    const romTab = await page.$('[data-tab="rom-loader"]');
    if (romTab) {
      await romTab.click();
      await delay(500);
      await page.screenshot({ path: path.join(OUT, '05-rom-loader.png'), fullPage: false });
      console.log('  saved 05-rom-loader.png');
    }
    const closeGame = await page.$('#game-panel-close');
    if (closeGame) await closeGame.click();
    await delay(500);
  }
  console.log('5/6 — Setup wizard...');
  await page.goto(`${BASE}/setup`, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await delay(1500);
  await page.screenshot({ path: path.join(OUT, '06-setup-wizard.png'), fullPage: false });
  console.log('  saved 06-setup-wizard.png');
  console.log('6/6 — Theme cycling...');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 15000 });
  await delay(2000);
  const themes = ['midnight', 'cyberpunk', 'forest', 'sakura', 'ocean'];
  for (const t of themes) {
    await page.evaluate(th => {
      document.body.setAttribute('data-theme', th);
      localStorage.setItem('theme', th);
    }, t);
    await delay(800);
    await page.screenshot({ path: path.join(OUT, `07-theme-${t}.png`), fullPage: false });
    console.log(`  saved 07-theme-${t}.png`);
  }
  await browser.close();
  const files = fs.readdirSync(OUT);
  console.log(`\nDone! ${files.length} screenshots saved to docs/screenshots/`);
  files.forEach(f => console.log(`  ${f}`));
})().catch(err => {
  console.error('Screenshot error:', err.message);
  process.exit(1);
});
