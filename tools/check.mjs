/* Проверка мини-аппа в headless Chrome на размере телефона.
   node tools/check.mjs  → кадры в tools/shots/, ошибки консоли и проверки в выводе. */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'shots');
const PORT = 8231, DBG = 9351;
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (process.env.LITE && rel.endsWith('.mp4')) { res.writeHead(404); return res.end(); }   // как облегчённая версия на Vercel
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const [a, b] = range.replace('bytes=', '').split('-'); const s = +a, e = b ? +b : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 });
      return fs.createReadStream(file, { start: s, end: e }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size }); fs.createReadStream(file).pipe(res);
  });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const browser = spawn(exe, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'mre-'))}`,
  '--no-first-run', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); } }
const ws = new WebSocket(wsUrl);
await new Promise(r => { ws.onopen = r; });
let seq = 0; const pending = new Map(); const logs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + m.params.exceptionDetails.exception?.description);
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' '));
  else if (m.method === 'Network.loadingFailed' && !m.params.canceled) logs.push('NET ' + m.params.errorText);
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
for (const d of ['Page.enable', 'Runtime.enable', 'Network.enable']) await send(d, {}, s);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true }, s);
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, s)).result.value;
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, s);
  fs.writeFileSync(path.join(OUT, name + '.jpg'), Buffer.from(r.data, 'base64'));
};
// честное нажатие: в центр элемента, с проверкой, что сверху именно он
const tap = async sel => {
  const r = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
    el.scrollIntoView({block:'center',behavior:'instant'}); const b = el.getBoundingClientRect();
    const x = b.left + b.width/2, y = b.top + b.height/2, top = document.elementFromPoint(x, y);
    return { x, y, ok: !!top && (top === el || el.contains(top)), top: top && (top.className || top.tagName) }; })()`);
  if (!r) { logs.push('TAP нет элемента ' + sel); return; }
  if (!r.ok) logs.push(`TAP перекрыт ${sel} → ${r.top}`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 }, s);
  await sleep(500);
};

await send('Page.navigate', { url: process.env.URL || `http://127.0.0.1:${PORT}/` }, s);   // URL=https://… — проверить выложенную версию
for (const t of [300, 1200, 2200, 3300, 4300]) { await sleep(t - (shot.t || 0)); shot.t = t; await shot('intro-' + t); }
await sleep(1500);
await shot('01-list');
await ev(`window.scrollTo(0, 900)`); await sleep(400); await shot('02-list-scroll');
const audit = await ev(`({
  overflowX: document.documentElement.scrollWidth > innerWidth,
  hiddenShown: [...document.querySelectorAll('[hidden]')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className),
  locked: document.body.classList.contains('is-locked'), intro: !!document.getElementById('intro'),
  cards: document.querySelectorAll('.card').length })`);
console.log('audit', audit);
await tap('.chips--soft button[data-v="family"]'); await shot('03-filter-family');
await tap('.chips--soft button[data-v="family"]');
await tap('.card__open[data-open="36"]'); await sleep(800); await shot('04-detail-photos');
await ev(`document.querySelector('#detail').scrollTo(0, 560)`); await sleep(500); await shot('05-detail-mid');
await ev(`document.querySelector('#detail').scrollTo(0, 1200)`); await sleep(1200); await shot('06-detail-map');
await tap('#dtBook'); await sleep(500); await shot('07-sheet');
await ev(`document.querySelector('#bookForm').name.value='Ахмад'`);
const msg = await ev(`(() => { let u; const o = window.open; window.open = x => { u = x; }; document.querySelector('#sendTg').click(); window.open = o; return decodeURIComponent(u); })()`);
console.log('tg link:\n' + msg);
await tap('[data-close-detail]');
await tap('.card__open[data-open="56"]'); await sleep(600);
await tap('.dt__play'); await sleep(2500);
console.log('video', await ev(`(() => { const v = document.querySelector('#detail video'); return v && { t: v.currentTime.toFixed(1), paused: v.paused, w: v.videoWidth }; })()`));
await shot('08-detail-video');
await tap('[data-close-detail]');
await tap('#viewToggle'); await sleep(2500); await shot('09-map');
await tap('.leaflet-marker-icon.pin--group'); await sleep(1500); await shot('10-map-zoomed');
await tap('.leaflet-marker-icon.pin:not(.pin--haram):not(.pin--group)'); await sleep(500); await shot('11-map-card');
console.log(logs.length ? logs.join('\n') : 'ошибок нет');
browser.kill(); server.close(); process.exit(0);
