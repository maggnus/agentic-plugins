#!/usr/bin/env node
// craft-design screenshot: render an HTML file or URL with an installed
// Chromium-family browser in headless mode and print the PNG path.
//
//   node shot.mjs <file-or-url> [--width 1440] [--height 900] [--out shot.png] [--wait 1500]
//
// Set CHROME_PATH to choose the browser explicitly.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const width = Number(flag('--width', 1440));
const height = Number(flag('--height', 900));
const wait = Number(flag('--wait', 1500));
let out = flag('--out');
const target = args[0];
if (!target) { console.error('usage: node shot.mjs <file-or-url> [--width 1440] [--height 900] [--out shot.png]'); process.exit(2); }

const isUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(target);
if (!isUrl && !existsSync(target)) { console.error(`not found: ${target}`); process.exit(2); }
// A craft-design preview page keeps an event stream open, which stalls headless
// rendering; shoot the raw artifact behind it instead.
const url = isUrl ? target.replace(/^(http:\/\/(?:127\.0\.0\.1|localhost):\d+)\/view\//, '$1/raw/') : pathToFileURL(resolve(target)).href;

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

const browser = findBrowser();
if (!browser) { console.error('no Chrome, Chromium, Edge or Brave found; set CHROME_PATH or review statically'); process.exit(3); }

if (!out) {
  const dir = join(tmpdir(), 'craft-design-shots');
  mkdirSync(dir, { recursive: true });
  const name = isUrl ? new URL(target).hostname : basename(target).replace(/\.[^.]+$/, '');
  out = join(dir, `${name}-${width}x${height}-${Date.now()}.png`);
}
out = resolve(out);

const profile = mkdtempSync(join(tmpdir(), 'craft-design-chrome-'));
try {
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    `--virtual-time-budget=${wait}`, `--screenshot=${out}`, url,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000 });
} catch (err) {
  console.error(`screenshot failed: ${String(err.stderr || err.message).trim().split('\n').slice(-3).join(' ')}`);
  process.exit(1);
} finally {
  rmSync(profile, { recursive: true, force: true });
}
if (!existsSync(out) || statSync(out).size === 0) { console.error('screenshot failed: no image written'); process.exit(1); }
console.log(out);
