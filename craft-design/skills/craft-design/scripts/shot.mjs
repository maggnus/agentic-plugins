#!/usr/bin/env node
// craft-design screenshot: render an HTML file or URL at an exact CSS viewport
// with an installed Chromium-family browser, print the PNG path and a layout
// report (viewport, page height, horizontal overflow).
//
//   node shot.mjs <file-or-url> [--width 1440,390] [--height 900] [--full]
//                               [--at <y|css-selector>] [--click <css-selector>]...
//                               [--out shot.png] [--wait 1500]
//                               [--mode auto|desktop|mobile] [--contract file.json]
//                               [--scenario fixture.json]
//
// --width takes one or more comma-separated widths (one PNG each); widths below
// 600 emulate a phone in auto mode (mobile viewport, touch, height 844 unless --height is
// given). --full loads lazy images and captures up to 16000px without changing
// the viewport; --at scrolls to a CSS offset or to the
// first element matching a selector. --click (repeatable) clicks the first
// element matching each selector in order before the capture, and a file path
// may end in ?query and/or #fragment, so a state (a tab, the back of a card,
// an open menu) can be shot. Set CHROME_PATH to choose the browser.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { inspectPage } from './inspect.mjs';
import { validateContract, waitForExpectations, evaluateExpectations } from './contract.mjs';
import { validateScenario, applyScenario } from './scenario.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  if (args[i + 1] === undefined || args[i + 1].startsWith('--')) { console.error(`missing value for ${name}`); process.exit(2); }
  return args.splice(i, 2)[1];
};
const clicks = [];
for (let i = args.indexOf('--click'); i >= 0; i = args.indexOf('--click')) {
  if (args[i + 1] === undefined || args[i + 1].startsWith('--')) { console.error('missing value for --click'); process.exit(2); }
  clicks.push(args.splice(i, 2)[1]);
}
const bool = name => { const i = args.indexOf(name); return i >= 0 ? (args.splice(i, 1), true) : false; };
const widths = String(flag('--width', '1440')).split(',').map(Number);
const heightFlag = flag('--height');
const wait = Number(flag('--wait', 1500));
const at = flag('--at', '');
const full = bool('--full');
const stripsFlag = bool('--strips');
const inspect = bool('--inspect');
const fit = bool('--fit');
const strict = bool('--strict');
const mode = flag('--mode', 'auto');
const theme = flag('--theme');
const contractPath = flag('--contract');
const scenarioPath = flag('--scenario');
const outFlag = flag('--out');
const target = args[0];
const unknown = args.filter(a => a.startsWith('--'));
if (unknown.length) { console.error(`unknown option: ${unknown.join(' ')}`); process.exit(2); }
if (!target || args.length > 1 || widths.some(w => !(Number.isFinite(w) && w > 0)) || heightFlag !== undefined && !(Number.isFinite(Number(heightFlag)) && Number(heightFlag) > 0) || !Number.isFinite(wait) || wait < 0 || (fit || strict || contractPath) && !inspect || !['auto', 'desktop', 'mobile'].includes(mode) || (theme !== undefined && !['dark', 'light'].includes(theme))) {
  console.error('usage: node shot.mjs <file-or-url> [--width 1440,390] [--height 900] [--mode auto|desktop|mobile] [--theme dark|light] [--full] [--scenario fixture.json] [--at <y|selector>] [--click <selector>]... [--out shot.png] [--inspect [--fit] [--strict] [--contract file.json]]');
  process.exit(2);
}
let contract = null, contractBytes;
try {
  if (contractPath) { contractBytes = readFileSync(contractPath); contract = validateContract(JSON.parse(contractBytes.toString('utf8'))); }
} catch (error) { console.error(`invalid contract: ${error.message}`); process.exit(2); }
let scenario = null, scenarioBytes;
try {
  if (scenarioPath) { scenarioBytes = readFileSync(scenarioPath); scenario = validateScenario(JSON.parse(scenarioBytes.toString('utf8'))); }
} catch (error) { console.error(`invalid scenario: ${error.message}`); process.exit(2); }

const isUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(target);
const [, file, suffix = ''] = isUrl ? [null, target, ''] : target.match(/^([^?#]*)(.*)$/);
let sourceFile;
try { sourceFile = !isUrl ? resolve(file) : new URL(target).protocol === 'file:' ? fileURLToPath(target) : null; }
catch (error) { console.error(`invalid source: ${error.message}`); process.exit(2); }
if (sourceFile && !existsSync(sourceFile)) { console.error(`not found: ${sourceFile}`); process.exit(2); }
// The preview's /view/ page is a shell around an iframe; shoot the artifact itself.
const url = isUrl ? target.replace(/^(http:\/\/(?:127\.0\.0\.1|localhost):\d+)\/view\//, '$1/raw/') : pathToFileURL(resolve(file)).href + suffix;

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const mac = ['Google Chrome', 'Chromium', 'Microsoft Edge', 'Brave Browser', 'Google Chrome Canary']
    .flatMap(app => [`/Applications/${app}.app/Contents/MacOS/${app}`, `${process.env.HOME}/Applications/${app}.app/Contents/MacOS/${app}`]);
  for (const path of mac) if (existsSync(path)) return path;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable', 'brave-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  }
  return null;
}

const shotDir = join(tmpdir(), 'craft-design-shots');
const stem = isUrl ? new URL(target).pathname.split('/').filter(Boolean).slice(-2).join('-').replace(/\.[^.]+$/, '') || 'page'
  : resolve(file).split(/[\\/]/).slice(-2).join('-').replace(/\.[^.]+$/, '');
function outPath(width, height) {
  if (outFlag) return resolve(widths.length > 1 ? outFlag.replace(/(\.png)?$/i, `-${width}.png`) : outFlag);
  mkdirSync(shotDir, { recursive: true });
  const where = (clicks.length || suffix ? '-state' : '') + (full ? '-full' : at ? `-at-${String(at).replace(/[^\w-]+/g, '')}` : '');
  return join(shotDir, `${stem}-${width}x${height}${where}-${Date.now()}.png`);
}
// A report named like its contract would otherwise destroy the expectations.
// Also refuse aliases/hardlinks to either input, before launching the browser.
if (outFlag) {
  const inputs = [...(sourceFile ? [sourceFile] : []), ...(contractPath ? [contractPath] : []), ...(scenarioPath ? [scenarioPath] : [])];
  const sameFile = (a, b) => {
    if (resolve(a) === resolve(b)) return true;
    if (!existsSync(a) || !existsSync(b)) return false;
    const x = statSync(a), y = statSync(b);
    return x.dev === y.dev && x.ino === y.ino;
  };
  for (const width of widths) {
    const out = outPath(width, 0);
    for (const result of [out, ...(inspect || scenario ? [out.replace(/\.png$/i, '') + '.json'] : [])]) {
      if (inputs.some(input => sameFile(result, input))) {
        console.error(`output would overwrite an input: ${result}`); process.exit(2);
      }
    }
  }
}

const browser = findBrowser();
if (!browser) { console.error('no Chrome, Chromium, Edge or Brave found; set CHROME_PATH or review statically'); process.exit(3); }
if (typeof WebSocket !== 'function') { console.error('Node 22 or newer is required (global WebSocket)'); process.exit(3); }

// Measured inside the page against the requested width: a phone viewport grows
// to fit wide content, so the layout width alone hides overflow.
const MEASURE = width => `(() => {
  const w = Math.min(${width}, document.documentElement.clientWidth);
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.right <= w + 1 && r.left >= -1) continue;
    let p = el.parentElement, clipped = false;
    for (; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) { const pr = p.getBoundingClientRect(); if (pr.right <= w + 1 && pr.left >= -1) { clipped = true; break; } }
    }
    if (clipped) continue;
    const id = el.closest('[data-craft-id]')?.getAttribute('data-craft-id');
    out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList[0] ? '.' + el.classList[0] : '') + (id ? ' [' + id + ']' : '') + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    if (out.length >= 6) break;
  }
  const internalScrollRegions = [...document.querySelectorAll('body,body *')].filter(el => {
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    return r.width>0 && r.height>0 && s.visibility!=='hidden' &&
      (/^(auto|scroll)$/.test(s.overflowY) && el.scrollHeight>el.clientHeight+1 || /^(auto|scroll)$/.test(s.overflowX) && el.scrollWidth>el.clientWidth+1);
  }).length;
  return JSON.stringify({ internalScrollRegions, innerWidth, viewport: w, page: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, overflow: out });
})()`;

const profile = mkdtempSync(join(tmpdir(), 'craft-design-chrome-'));
const chrome = spawn(browser, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--mute-audio', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

function cleanup() {
  try { chrome.kill('SIGKILL'); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
function fail(message) { console.error(`screenshot failed: ${message}`); cleanup(); process.exit(1); }
const timer = setTimeout(() => fail('timed out after 60 s'), 60000);

const endpoint = await new Promise((resolvePromise, reject) => {
  let log = '';
  chrome.stderr.on('data', chunk => {
    log += chunk;
    const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) resolvePromise(match[1]);
  });
  chrome.on('exit', code => reject(new Error(`browser exited (${code}): ${log.trim().split('\n').slice(-2).join(' ')}`)));
}).catch(err => fail(err.message));

const socket = new WebSocket(endpoint);
await new Promise((ok, ko) => { socket.onopen = ok; socket.onerror = () => ko(new Error('cannot connect to the browser')); }).catch(err => fail(err.message));
let seq = 0;
const pending = new Map();
const listeners = [];
socket.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { ok, ko } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? ko(new Error(msg.error.message)) : ok(msg.result);
  } else if (msg.method) for (const l of listeners) l(msg);
};
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => {
  const id = ++seq;
  pending.set(id, { ok, ko });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
});
const once = (method, sessionId) => new Promise(ok => listeners.push(msg => { if (msg.method === method && msg.sessionId === sessionId) ok(msg.params); }));

const SCROLL = `(() => {
  const at = ${JSON.stringify(at)};
  const el = /^\\d+$/.test(at) ? null : document.querySelector(at);
  if (!el && !/^\\d+$/.test(at)) return 'no element matches ' + at;
  window.scrollTo({ top: el ? el.getBoundingClientRect().top + scrollY : Number(at), behavior: 'instant' });
  return '';
})()`;

// After a click or a #fragment, wait for the transitions and animations it started (finite
// ones only, at most 3 s), so the shot shows the state and not the motion.
const SETTLE = `new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok))).then(() => Promise.race([
  Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => null))),
  new Promise(ok => setTimeout(ok, 3000)),
])).then(() => new Promise(ok => setTimeout(ok, 100)))`;

const MAX_CAPTURE_HEIGHT = 16000;
let inspectionFailed = false;
// Resizing the viewport to the page height changes vh layouts and triggers lazy
// images after measurement. Visit the page at the requested viewport instead,
// let those images settle, then measure and capture without resizing.
const PREPARE_FULL = `(async () => {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const step = Math.max(200, Math.floor(innerHeight * 0.8));
  for (let y = 0; y < Math.min(document.documentElement.scrollHeight, ${MAX_CAPTURE_HEIGHT}); y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await pause(100);
  }
  await Promise.race([
    Promise.all([...document.images].map(img => img.decode().catch(() => {}))),
    pause(5000),
  ]);
  window.scrollTo({ top: 0, behavior: 'instant' });
  await pause(100);
  return [...document.images].filter(img => !img.complete || !img.naturalWidth).length;
})()`;

async function checkHoverContrast(s) {
  const findings = [];
  let injected = false;
  try {
    await s('DOM.enable');
    await s('CSS.enable');
    await s('Runtime.evaluate', {
      expression: `(() => {
        if (document.querySelector('style[data-craft-no-transition]')) return;
        const st = document.createElement('style');
        st.setAttribute('data-craft-no-transition', '1');
        st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
        (document.head || document.documentElement).appendChild(st);
      })()`,
    });
    injected = true;
    const { root: docRoot } = await s('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await s('DOM.querySelectorAll', { nodeId: docRoot.nodeId, selector: 'button, a[href]' });
    let tested = 0;
    for (const nodeId of nodeIds) {
      if (tested >= 8) break;
      const { object } = await s('DOM.resolveNode', { nodeId });
      if (!object?.objectId) continue;
      const rest = await s('Runtime.callFunctionOn', {
        objectId: object.objectId,
        functionDeclaration: `function() {
          const r = this.getBoundingClientRect();
          const st = getComputedStyle(this);
          if (r.width <= 0 || r.height <= 0 || st.visibility === 'hidden' || st.display === 'none') return null;
          if (!this.innerText || !this.innerText.trim()) return null;
          const parse = c => {
            if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return [0, 0, 0, 0];
            const m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
            if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
            const cv = window.__craftColorCanvas || (window.__craftColorCanvas = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }));
            const ctx = cv.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          };
          const bg = parse(st.backgroundColor), fg = parse(st.color);
          if (!bg || !fg || bg[3] < 0.9 || fg[3] < 0.9) return null;
          const lum = ([R, G, B]) => [R, G, B].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, b, i) => a + b * [0.2126, 0.7152, 0.0722][i], 0);
          const L1 = lum(fg), L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const sel = this.tagName.toLowerCase() + (this.id ? '#' + this.id : '');
          return { ratio, sel, craftId: this.getAttribute('data-craft-id') || null };
        }`,
        returnByValue: true,
      });
      const base = rest.result?.value;
      if (!base) continue;
      tested++;
      if (base.ratio < 4.5) continue;
      try {
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
        const hov = await s('Runtime.callFunctionOn', {
          objectId: object.objectId,
          functionDeclaration: `function() {
            const st = getComputedStyle(this);
            const parse = c => {
            if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return [0, 0, 0, 0];
            const m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
            if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
            const cv = window.__craftColorCanvas || (window.__craftColorCanvas = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }));
            const ctx = cv.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          };
            const bg = parse(st.backgroundColor), fg = parse(st.color);
            if (!bg || !fg || bg[3] < 0.5) return null;
            const lum = ([R, G, B]) => [R, G, B].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, b, i) => a + b * [0.2126, 0.7152, 0.0722][i], 0);
            const L1 = lum(fg), L2 = lum(bg);
            return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          }`,
          returnByValue: true,
        });
        const hoverRatio = hov.result?.value;
        if (typeof hoverRatio === 'number' && hoverRatio < 3.0) {
          findings.push({
            code: 'hover-contrast-loss',
            severity: 'review',
            selector: base.sel,
            craftId: base.craftId,
            message: `Contrast drops from ${base.ratio.toFixed(2)} to ${hoverRatio.toFixed(2)} on :hover.`,
          });
        }
      } finally {
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }).catch(() => {});
      }
    }
  } catch {} finally {
    if (injected) {
      await s('Runtime.evaluate', {
        expression: `document.querySelectorAll('style[data-craft-no-transition]').forEach(el => el.remove())`,
      }).catch(() => {});
    }
  }
  return findings;
}

async function shoot(width) {
  const mobile = mode === 'mobile' || mode === 'auto' && width < 600;
  const height = Number(heightFlag ?? (mobile ? 844 : 900));
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => send(method, params, sessionId);
  const metricsFor = h => ({ width, height: h, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height });
  const runtime = { errors: [], truncated: false };
  const collectRuntime = msg => {
    if (msg.sessionId !== sessionId) return;
    let entry;
    if (msg.method === 'Runtime.exceptionThrown') {
      const e = msg.params.exceptionDetails;
      entry = { kind: 'exception', message: e.exception?.description ?? e.text, url: e.url ?? null, line: e.lineNumber ?? null };
    } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(msg.params.type)) {
      entry = { kind: 'console', message: msg.params.args.map(a => a.value ?? a.description ?? '').join(' ') };
    }
    if (entry) {
      entry.message = String(entry.message).slice(0, 2000);
      if (runtime.errors.length < 100) runtime.errors.push(entry); else runtime.truncated = true;
    }
  };
  if (inspect) { listeners.push(collectRuntime); await s('Runtime.enable'); }
  await s('Page.enable');
  await s('Emulation.setDeviceMetricsOverride', metricsFor(height));
  if (mobile) await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const loaded = once('Page.loadEventFired', sessionId);
  const nav = await s('Page.navigate', { url });
  if (nav.errorText) throw new Error(`${nav.errorText} (${url})`);
  let loadTimer;
  try {
    await Promise.race([loaded, new Promise(ok => { loadTimer = setTimeout(ok, 20000); })]);
  } finally {
    clearTimeout(loadTimer);
  }
  await s('Runtime.evaluate', { expression: 'document.fonts ? document.fonts.ready.then(() => true) : true', awaitPromise: true });
  if (theme) {
    await s('Runtime.evaluate', { expression: `document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})` });
    await s('Runtime.evaluate', { expression: SETTLE, awaitPromise: true });
  }
  await new Promise(ok => setTimeout(ok, wait));
  const appliedScenario = scenario ? await applyScenario(s, scenario) : null;
  if (scenario) {
    await s('Runtime.evaluate', { expression: SETTLE, awaitPromise: true });
    await s('Runtime.evaluate', { expression: 'document.fonts ? document.fonts.ready.then(() => true) : true', awaitPromise: true });
  }
  if (suffix) await s('Runtime.evaluate', { expression: SETTLE, awaitPromise: true });
  for (const selector of clicks) {
    const prep = (await s('Runtime.evaluate', {
      expression: `(async () => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return { error: 'no element matches ' + ${JSON.stringify(selector)} };
        const st = getComputedStyle(el);
        if (!el.getClientRects().length || st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) {
          return { error: 'click target is not visible: ' + ${JSON.stringify(selector)} };
        }
        let safeTop = 0, safeBottom = innerHeight;
        for (const f of document.querySelectorAll('body *')) {
          const fs = getComputedStyle(f);
          if ((fs.position !== 'fixed' && fs.position !== 'sticky') || !f.getClientRects().length || fs.visibility === 'hidden' || fs.display === 'none') continue;
          if (f === el || f.contains(el) || el.contains(f)) continue;
          const fr = f.getBoundingClientRect();
          if (fr.width < innerWidth * 0.35 || fr.height <= 0 || fr.height >= innerHeight * 0.45) continue;
          if (fr.top <= 40) safeTop = Math.max(safeTop, fr.bottom + 2);
          if (fr.bottom >= innerHeight - 40) safeBottom = Math.min(safeBottom, fr.top - 2);
        }
        const r0 = el.getBoundingClientRect();
        const absTop = r0.top + scrollY;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        const safeCenter = safeTop + Math.max(0, safeBottom - safeTop) / 2;
        const targetY = Math.max(0, Math.min(maxScroll, absTop + r0.height / 2 - safeCenter));
        window.scrollTo({ top: targetY, behavior: 'instant' });
        await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) {
          return { error: 'click target outside viewport after scroll: ' + ${JSON.stringify(selector)} };
        }
        const hit = document.elementFromPoint(cx, cy);
        if (!hit || (hit !== el && !el.contains(hit) && !hit.contains(el))) {
          const desc = hit ? (hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : hit.classList[0] ? '.' + hit.classList[0] : '')) : 'nothing';
          return { error: 'click target occluded by ' + desc };
        }
        return { cx, cy };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })).result.value;
    if (prep?.error) throw new Error(prep.error);
    await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: prep.cx, y: prep.cy, button: 'none' });
    await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: prep.cx, y: prep.cy, button: 'left', clickCount: 1 });
    await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: prep.cx, y: prep.cy, button: 'left', clickCount: 1 });
    await s('Runtime.evaluate', { expression: SETTLE, awaitPromise: true });
  }
  const readiness = contract ? await waitForExpectations(s, contract) : null;
  if (full) {
    const prepared = await s('Runtime.evaluate', { expression: PREPARE_FULL, awaitPromise: true, returnByValue: true });
    if (prepared.exceptionDetails) throw new Error('could not prepare the full page');
    if (prepared.result.value) console.error(`warning: ${prepared.result.value} image(s) failed to load or were not ready within 5 s`);
  } else if (at) {
    const missing = (await s('Runtime.evaluate', { expression: SCROLL, returnByValue: true })).result.value;
    if (missing) throw new Error(missing);
    await new Promise(ok => setTimeout(ok, 100));
  }
  const hoverFindings = inspect ? await checkHoverContrast(s) : [];
  const metrics = JSON.parse((await s('Runtime.evaluate', { expression: MEASURE(width), returnByValue: true })).result.value);
  const params = { format: 'png' };
  if (full) {
    const page = Math.min(metrics.page, MAX_CAPTURE_HEIGHT);
    if (metrics.page > page) console.error(`warning: full capture limited to ${page}px of ${metrics.page}px`);
    params.clip = { x: 0, y: 0, width, height: page, scale: 1 };
    params.captureBeyondViewport = true;
  }
  const { data } = await s('Page.captureScreenshot', params);
  const out = outPath(width, height);
  writeFileSync(out, Buffer.from(data, 'base64'));
  const hash = value => createHash('sha256').update(value).digest('hex');
  const strips = [];
  const uncoveredIntervals = [];
  if (full && (stripsFlag || inspect)) {
    const captureHeight = Math.min(metrics.page, MAX_CAPTURE_HEIGHT);
    if (captureHeight > height * 1.35) {
      const MAX_STRIPS = 24;
      const step = Math.max(120, height - 80);
      const yList = [0];
      while (yList[yList.length - 1] + height < captureHeight && yList.length < MAX_STRIPS) {
        const nextY = Math.min(captureHeight - height, yList[yList.length - 1] + step);
        if (nextY <= yList[yList.length - 1]) break;
        yList.push(nextY);
      }
      for (let idx = 0; idx < yList.length; idx++) {
        const y = yList[idx];
        const stripHeight = Math.min(height, captureHeight - y);
        const { data: stripData } = await s('Page.captureScreenshot', {
          format: 'png',
          clip: { x: 0, y, width, height: stripHeight, scale: 1 },
          captureBeyondViewport: true,
        });
        const stripPath = out.replace(/\.png$/i, `-s${idx + 1}.png`);
        const stripBuf = Buffer.from(stripData, 'base64');
        writeFileSync(stripPath, stripBuf);
        strips.push({ index: idx + 1, y, width, height: stripHeight, screenshot: stripPath, screenshotSha256: hash(stripBuf) });
      }
      let coveredEnd = 0;
      for (const st of strips) {
        if (st.y > coveredEnd) uncoveredIntervals.push({ from: coveredEnd, to: st.y });
        coveredEnd = Math.max(coveredEnd, st.y + st.height);
      }
      if (coveredEnd < metrics.page) uncoveredIntervals.push({ from: coveredEnd, to: metrics.page });
    } else if (captureHeight < metrics.page) {
      uncoveredIntervals.push({ from: captureHeight, to: metrics.page });
    }
  }
  let evidence;
  if (inspect || scenario) {
    const rendered = await s('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true });
    evidence = { schemaVersion: 1, source: target, url, capturedAt: new Date().toISOString(), screenshot: out, strips, uncoveredIntervals, viewport: { width, height },
      capture: { width, height: full ? Math.min(metrics.page, MAX_CAPTURE_HEIGHT) : height, documentHeight: metrics.page, documentWidth: metrics.scrollWidth, internalScrollRegions: metrics.internalScrollRegions,
        fullDocument: metrics.internalScrollRegions === 0 && metrics.scrollWidth <= width && (full ? metrics.page <= MAX_CAPTURE_HEIGHT : !at && metrics.page <= height), limited: full && metrics.page > MAX_CAPTURE_HEIGHT },
      screenshotSha256: hash(Buffer.from(data, 'base64')), sourceSha256: sourceFile ? hash(readFileSync(sourceFile)) : null,
      renderedHtmlSha256: hash(rendered.result.value), state: { clicks, fragment: suffix, at, full, mode, mobile, theme: theme ?? null } };
    if (scenario) evidence.state.scenario = { path: resolve(scenarioPath), sha256: hash(scenarioBytes), apply: scenario.apply, ...appliedScenario };
  }
  if (inspect) {
    const report = await inspectPage(s, { fit, width, height });
    Object.assign(report, evidence, { runtime });
    if (hoverFindings.length) report.findings.push(...hoverFindings);
    if (evidence.capture.limited) report.findings.push({ code: 'capture-truncated', severity: 'error', selector: null,
      message: 'The full-page capture exceeded the image height limit. Capture and review the remaining sections explicitly.', evidence: evidence.capture });
    if (contract) {
      const ready = await evaluateExpectations(s, contract.ready ?? []);
      const checks = await evaluateExpectations(s, contract.checks ?? []);
      report.contract = { path: resolve(contractPath), sha256: hash(contractBytes), readiness, ready, checks };
      if (readiness.timedOut) report.findings.push({ code: 'readiness-timeout', severity: 'error', selector: null,
        message: 'Required ready state did not appear before the contract timeout.', evidence: readiness });
      for (const result of [...ready, ...checks].filter(r => !r.pass)) report.findings.push({ code: 'content-contract', severity: 'error',
        selector: result.check.selector, message: 'Rendered content does not meet an explicit expectation.', evidence: result });
    }
    for (const error of runtime.errors) report.findings.push({ code: 'runtime-error', severity: contract?.noRuntimeErrors ? 'error' : 'review',
      selector: null, message: 'The browser reported an exception or console error.', evidence: error });
    if (runtime.truncated) report.findings.push({ code: 'runtime-truncated', severity: contract?.noRuntimeErrors ? 'error' : 'review',
      selector: null, message: 'Runtime errors exceeded the 100-entry capture limit.' });
    report.summary = { errors: report.findings.filter(f => f.severity === 'error').length,
      review: report.findings.filter(f => f.severity === 'review').length };
    report.limitations.push('Runtime coverage: current page and same-process frames; caught errors, worker/OOPIF failures and private framework error channels are not exhaustively captured.');
    const reportPath = out.replace(/\.png$/i, '') + '.json';
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`  inspection: ${report.summary.errors} error(s), ${report.summary.review} review finding(s)${report.truncated ? '; truncated' : ''}: ${reportPath}`);
    for (const f of report.findings.slice(0, 12)) console.log(`    ${f.severity} ${f.code}: ${f.selector ?? 'page'}${f.craftId ? ' [' + f.craftId + ']' : ''}`);
    inspectionFailed ||= report.summary.errors > 0 || report.truncated;
    listeners.splice(listeners.indexOf(collectRuntime), 1);
  } else if (scenario) {
    const reportPath = out.replace(/\.png$/i, '') + '.json';
    writeFileSync(reportPath, JSON.stringify({ ...evidence, kind: 'capture-evidence', inspected: false }, null, 2) + '\n');
    console.log(`  scenario evidence (not inspection): ${reportPath}`);
  }
  await send('Target.closeTarget', { targetId });
  const layout = metrics.innerWidth === width ? '' : `, laid out ${metrics.innerWidth}px wide`;
  const overflow = metrics.scrollWidth > width + 1 || metrics.overflow.length
    ? `HORIZONTAL OVERFLOW (page ${metrics.scrollWidth}px): ${metrics.overflow.join('; ') || 'source not found'}`
    : 'no horizontal overflow';
  console.log(out);
  console.log(`  ${width}x${height}${mobile ? ' mobile' : ''}${layout}, page height ${metrics.page}px, ${overflow}`);
}

try {
  for (const width of widths) await shoot(width);
} catch (err) {
  fail(err.message);
}
clearTimeout(timer);
socket.close();
cleanup();
if (strict && inspectionFailed) process.exitCode = 1;
