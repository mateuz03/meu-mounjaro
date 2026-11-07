const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5199';
const OUT = 'C:\\Users\\mateu\\.verdent\\verdent-projects\\crie-um-app-voltada\\playstore';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickByText(page, selector, text) {
  const ok = await page.evaluate((sel, txt) => {
    const els = Array.from(document.querySelectorAll(sel));
    const el = els.find((e) => (e.textContent || '').trim().toLowerCase().includes(txt.toLowerCase()) && e.offsetParent !== null);
    if (el) { el.click(); return true; }
    return false;
  }, selector, text);
  if (!ok) throw new Error(`not found: "${text}" in ${selector}`);
}

async function shot(page, name) {
  await sleep(900);
  await page.screenshot({ path: `${OUT}\\${name}` });
  console.log('saved', name);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-first-run', '--disable-extensions'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 786, deviceScaleFactor: 3 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);

  // start demo mode
  await clickByText(page, 'button', 'demonstra');
  await sleep(2000);

  // Mounjaro mode
  await shot(page, 'shot-1-inicio.png');
  await clickByText(page, '.bottom-nav button', 'Aplica');
  await shot(page, 'shot-2-aplicacoes.png');
  await clickByText(page, '.bottom-nav button', 'Evolu');
  await shot(page, 'shot-3-evolucao.png');
  await clickByText(page, '.bottom-nav button', 'Di');
  await shot(page, 'shot-4-diario.png');

  // switch to Fitness via avatar menu
  await page.click('.avatar-btn');
  await sleep(500);
  await clickByText(page, '.user-menu-area', 'Fitness');
  await sleep(1200);
  await clickByText(page, '.bottom-nav button', 'Treinos');
  await shot(page, 'shot-5-treinos.png');

  // switch to Dieta
  await page.click('.avatar-btn');
  await sleep(500);
  await clickByText(page, '.user-menu-area', 'Dieta');
  await sleep(1200);
  await clickByText(page, '.bottom-nav button', 'Refei');
  await shot(page, 'shot-6-refeicoes.png');
  await clickByText(page, '.bottom-nav button', 'Evolu');
  await shot(page, 'shot-7-evolucao-dieta.png');

  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
