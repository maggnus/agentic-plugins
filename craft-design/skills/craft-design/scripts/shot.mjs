#!/usr/bin/env node
// craft-design screenshot: render an HTML file or URL at an exact CSS viewport
// with an installed Chromium-family browser, print the PNG path and a layout
// report (viewport, page height, horizontal overflow).
//
//   node shot.mjs <file-or-url> [--width 1440,390] [--height 900] [--full]
//                               [--at <y|css-selector>] [--click <css-selector>]...
//                               [--out shot.png] [--wait 1500]
//                               [--mode auto|desktop|mobile] [--contract file.json]
//
// --width takes one or more comma-separated widths (one PNG each); widths below
// 600 emulate a phone in auto mode (mobile viewport, touch, height 844 unless --height is
// given). --full loads lazy images and captures up to 16000px without changing
// the viewport; --at scrolls to a CSS offset or to the
// first element matching a selector. --click (repeatable) clicks the first
// element matching each selector in order before the capture, and a file path
// may end in #fragment, so a state (a tab, the back of a card, an open menu)
// can be shot. Set CHROME_PATH to choose the browser.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { inspectPage } from './inspect.mjs';
import { validateContract, waitForExpectations, evaluateExpectations } from './contract.mjs';

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
const inspect = bool('--inspect');
const fit = bool('--fit');
const strict = bool('--strict');
const mode = flag('--mode', 'auto');
const contractPath = flag('--contract');
const outFlag = flag('--out');
const target = args[0];
const unknown = args.filter(a => a.startsWith('--'));
if (unknown.length) { console.error(`unknown option: ${unknown.join(' ')}`); process.exit(2); }
if (!target || args.length > 1 || widths.some(w => !(Number.isFinite(w) && w > 0)) || heightFlag !== undefined && !(Number.isFinite(Number(heightFlag)) && Number(heightFlag) > 0) || !Number.isFinite(wait) || wait < 0 || (fit || strict || contractPath) && !inspect || !['auto', 'desktop', 'mobile'].includes(mode)) {
  console.error('usage: node shot.mjs <file-or-url> [--width 1440,390] [--height 900] [--mode auto|desktop|mobile] [--full] [--at <y|selector>] [--click <selector>]... [--out shot.png] [--inspect [--fit] [--strict] [--contract file.json]]');
  process.exit(2);
}
let contract = null, contractBytes;
try {
  if (contractPath) { contractBytes = readFileSync(contractPath); contract = validateContract(JSON.parse(contractBytes.toString('utf8'))); }
} catch (error) { console.error(`invalid contract: ${error.message}`); process.exit(2); }

const isUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(target);
const [file, fragment = ''] = isUrl ? [target] : target.split(/(?=#)/, 2);
let sourceFile;
try { sourceFile = !isUrl ? resolve(file) : new URL(target).protocol === 'file:' ? fileURLToPath(target) : null; }
catch (error) { console.error(`invalid source: ${error.message}`); process.exit(2); }
if (sourceFile && !existsSync(sourceFile)) { console.error(`not found: ${sourceFile}`); process.exit(2); }
// The preview's /view/ page is a shell around an iframe; shoot the artifact itself.
const url = isUrl ? target.replace(/^(http:\/\/(?:127\.0\.0\.1|localhost):\d+)\/view\//, '$1/raw/') : pathToFileURL(resolve(file)).href + fragment;

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
  const where = (clicks.length || fragment ? '-state' : '') + (full ? '-full' : at ? `-at-${String(at).replace(/[^\w-]+/g, '')}` : '');
  return join(shotDir, `${stem}-${width}x${height}${where}-${Date.now()}.png`);
}
// A report named like its contract would otherwise destroy the expectations.
// Also refuse aliases/hardlinks to either input, before launching the browser.
if (outFlag) {
  const inputs = [...(sourceFile ? [sourceFile] : []), ...(contractPath ? [contractPath] : [])];
  const sameFile = (a, b) => {
    if (resolve(a) === resolve(b)) return true;
    if (!existsSync(a) || !existsSync(b)) return false;
    const x = statSync(a), y = statSync(b);
    return x.dev === y.dev && x.ino === y.ino;
  };
  for (const width of widths) {
    const out = outPath(width, 0);
    for (const result of [out, ...(inspect ? [out.replace(/\.png$/i, '') + '.json'] : [])]) {
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
  return JSON.stringify({ innerWidth, viewport: w, page: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, overflow: out });
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
  await new Promise(ok => setTimeout(ok, wait));
  if (fragment) await s('Runtime.evaluate', { expression: SETTLE, awaitPromise: true });
  for (const selector of clicks) {
    const clicked = (await s('Runtime.evaluate', { expression: `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`, returnByValue: true })).result.value;
    if (!clicked) throw new Error(`no element matches ${selector}`);
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
  if (inspect) {
    const report = await inspectPage(s, { fit, width, height });
    const rendered = await s('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true });
    const hash = value => createHash('sha256').update(value).digest('hex');
    Object.assign(report, { schemaVersion: 1, source: target, url, capturedAt: new Date().toISOString(), screenshot: out,
      screenshotSha256: hash(Buffer.from(data, 'base64')), sourceSha256: sourceFile ? hash(readFileSync(sourceFile)) : null,
      renderedHtmlSha256: hash(rendered.result.value), state: { clicks, fragment, at, full, mode, mobile }, runtime });
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
