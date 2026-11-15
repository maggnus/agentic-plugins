#!/usr/bin/env node
// craft-design preview: dependency-free read-only multi-frame viewing board.
//
//   node preview.mjs [root] [--port 4178] [--host 127.0.0.1]

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, watch, createReadStream } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

const SKIP = /(^|[\\/])(\.|node_modules)([\\/]|$)/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

const USAGE = 'usage: node preview.mjs [root] [--port 4178] [--host 127.0.0.1]';
const args = process.argv.slice(2);
function takeFlag(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const val = args[i + 1];
  if (val === undefined || val.startsWith('--')) {
    console.error(USAGE);
    process.exit(2);
  }
  return args.splice(i, 2)[1];
}

const portRaw = takeFlag('--port');
const hostRaw = takeFlag('--host');
if (args.some(a => a.startsWith('-')) || args.length > 1) {
  console.error(USAGE);
  process.exit(2);
}

const port = portRaw !== undefined ? Number(portRaw) : 4178;
const host = hostRaw || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(USAGE);
  process.exit(2);
}

const rawRoot = resolve(args[0] || 'design');
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
const encodePath = p => String(p).split('/').map(encodeURIComponent).join('/');

function inside(rel, allowMissingIndex = false) {
  let decoded;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const candidate = resolve(root, '.' + sep + decoded);
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  let real;
  try {
    real = realpathSync(candidate);
  } catch {
    return null;
  }
  if (real !== root && !real.startsWith(root + sep)) return null;
  let st;
  try {
    st = statSync(real);
  } catch {
    return null;
  }
  if (st.isDirectory()) {
    if (!allowMissingIndex) return null;
    const idx = join(real, 'index.html');
    let realIdx;
    try {
      realIdx = realpathSync(idx);
    } catch {
      return null;
    }
    if (!realIdx.startsWith(root + sep)) return null;
    try {
      return statSync(realIdx).isFile() ? realIdx : null;
    } catch {
      return null;
    }
  }
  return st.isFile() ? real : null;
}

function htmlFiles(dir = root, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    let real;
    try {
      real = realpathSync(full);
    } catch {
      continue;
    }
    if (!real.startsWith(root + sep)) continue;
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (/\.html?$/i.test(entry.name) && statSync(real).isFile()) {
      out.push(relative(root, full).split(sep).join('/'));
    }
  }
  return out.sort();
}

function readVerificationSummary() {
  const vDir = join(root, '.craft-verification');
  if (!existsSync(vDir)) return null;
  const candidates = [];
  const direct = join(vDir, 'summary.json');
  if (existsSync(direct)) candidates.push(direct);
  try {
    for (const entry of readdirSync(vDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = join(vDir, entry.name, 'summary.json');
      if (existsSync(p)) candidates.push(p);
    }
  } catch {}
  let latestComplete = null;
  let latestCompleteMtime = -1;
  let latestAny = null;
  let latestAnyMtime = -1;
  for (const file of candidates) {
    try {
      const st = statSync(file);
      const data = JSON.parse(readFileSync(file, 'utf8'));
      const summary = {
        status: String(data.status || 'unknown'),
        stage: String(data.stage || 'full'),
        widths: Array.isArray(data.frames) ? data.frames.map(f => f.width).filter(Number.isFinite) : [],
        clean: Boolean(data.clean),
        updatedAt: new Date(st.mtimeMs).toISOString(),
      };
      if (st.mtimeMs > latestAnyMtime) {
        latestAny = summary;
        latestAnyMtime = st.mtimeMs;
      }
      if (summary.status !== 'incomplete' && st.mtimeMs > latestCompleteMtime) {
        latestComplete = summary;
        latestCompleteMtime = st.mtimeMs;
      }
    } catch {}
  }
  return latestComplete || latestAny;
}

function boardState() {
  const files = htmlFiles();
  const fallbackTitle = basename(root) || 'Design Board';
  const verification = readVerificationSummary();
  const manifestPath = join(root, 'design.json');
  if (existsSync(manifestPath)) {
    try {
      const data = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (data && Array.isArray(data.artboards)) {
        const artboards = [];
        data.artboards.forEach((item, index) => {
          if (!item || typeof item.file !== 'string' || !item.file.trim()) return;
          const cleanFile = item.file.replace(/^\/+/, '');
          const abs = inside(cleanFile, false);
          if (!abs) return;
          const relFile = relative(root, abs).split(sep).join('/');
          const w = Number(item.width);
          const h = Number(item.height);
          artboards.push({
            id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${relFile}-${index}`,
            title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : relFile,
            file: relFile,
            width: Number.isFinite(w) && w > 0 ? Math.round(w) : 1440,
            height: Number.isFinite(h) && h > 0 ? Math.round(h) : null,
            group: typeof item.group === 'string' && item.group.trim() ? item.group.trim() : relFile,
          });
        });
        return {
          root,
          mode: 'manifest',
          title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : fallbackTitle,
          files,
          artboards,
          verification,
        };
      }
    } catch {}
  }
  return {
    root,
    mode: 'auto',
    title: fallbackTitle,
    files,
    artboards: [],
    verification,
  };
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeJson = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

const BASE_STYLE = `
:root{color-scheme:light dark;--bg:oklch(96% .004 260);--canvas:oklch(92% .005 260);--fg:oklch(20% .01 260);--muted:oklch(48% .01 260);--line:oklch(85% .006 260);--panel:oklch(99% .002 260);--accent:oklch(55% .17 255);--dot:oklch(80% .008 260);--ok:oklch(52% .14 155);--warn:oklch(62% .16 70);--bad:oklch(56% .19 25)}
@media (prefers-color-scheme:dark){:root{--bg:oklch(17% .006 260);--canvas:oklch(14% .006 260);--fg:oklch(93% .004 260);--muted:oklch(68% .008 260);--line:oklch(29% .008 260);--panel:oklch(21% .007 260);--accent:oklch(72% .14 255);--dot:oklch(28% .01 260);--ok:oklch(70% .14 155);--warn:oklch(76% .14 75);--bad:oklch(70% .16 25)}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{height:100%;margin:0}
body{font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--fg);overflow:hidden}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:6px;padding:4px 9px;min-height:28px;cursor:pointer;white-space:nowrap}
button:hover{background:color-mix(in oklch,var(--fg) 8%,transparent)}
button:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.muted{color:var(--muted)}
.badge{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);font-size:11px;font-weight:600;white-space:nowrap}
.badge[data-status="passed"]{color:var(--ok);border-color:color-mix(in oklch,var(--ok) 45%,transparent)}
.badge[data-status="needs-review"]{color:var(--warn);border-color:color-mix(in oklch,var(--warn) 45%,transparent)}
.badge[data-status="failed"],.badge[data-status="incomplete"]{color:var(--bad);border-color:color-mix(in oklch,var(--bad) 45%,transparent)}`;

const OVERLAY_CSS = ':host{position:absolute;inset:0;pointer-events:none;overflow:hidden}.grid{position:absolute;inset:0;display:none;background-image:linear-gradient(to right,rgba(59,130,246,.20) 1px,transparent 1px),linear-gradient(to bottom,rgba(59,130,246,.20) 1px,transparent 1px),linear-gradient(to right,rgba(59,130,246,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(59,130,246,.08) 1px,transparent 1px);background-size:64px 64px,64px 64px,8px 8px,8px 8px}.ids{position:absolute;inset:0;display:none}.id-tag{position:absolute;font:600 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff;background:rgba(15,23,42,.78);border:1px solid rgba(59,130,246,.65);border-radius:4px;padding:2px 5px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';

function indexPage() {
  const initial = boardState();
  const navLinks = initial.files.map(f => `<a class="file-chip" data-file="${esc(f)}" href="/view/${encodePath(f)}">${esc(f)}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(initial.title)} · craft-design preview</title><style>${BASE_STYLE}
body{display:flex;flex-direction:column;--zoom:1}
header.topbar{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--line);background:var(--panel);z-index:20;flex-wrap:wrap}
.brand{display:flex;align-items:baseline;gap:8px;margin-right:4px}
.brand strong{font-size:14px;font-weight:600}
.files-bar{display:flex;align-items:center;gap:4px;overflow-x:auto;max-width:34vw;padding:2px 0}
.file-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid var(--line);border-radius:6px;font-size:12px;white-space:nowrap}
.file-chip:hover{background:color-mix(in oklch,var(--fg) 8%,transparent)}
.spacer{flex:1}
.group{display:flex;align-items:center;gap:4px}
.viewport{position:relative;flex:1;overflow:hidden;background-color:var(--canvas);background-image:radial-gradient(var(--dot) 1px,transparent 1px);background-size:20px 20px;cursor:grab;user-select:none}
.viewport.panning{cursor:grabbing}
.stage{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.group-title{position:absolute;font-size:13px;font-weight:600;color:var(--muted);white-space:nowrap;transform-origin:top left;transform:scale(calc(1 / var(--zoom))) translateY(calc(-100% - 34px));pointer-events:none}
.board{position:absolute;background:#fff;box-shadow:0 0 0 1px var(--line),0 10px 30px oklch(0% 0 0/.12);border-radius:2px}
.board-label{position:absolute;left:0;bottom:100%;padding-bottom:6px;display:flex;align-items:center;gap:8px;white-space:nowrap;transform-origin:bottom left;transform:scale(calc(1 / var(--zoom)));font-size:12px;max-width:calc((100% + 64px) * var(--zoom));overflow:hidden}
.board-label strong{font-weight:600;overflow:hidden;text-overflow:ellipsis}
.board-label .dims{color:var(--muted);font-variant-numeric:tabular-nums}
.board-label a{color:var(--muted);padding:1px 5px;border-radius:4px;border:1px solid transparent}
.board-label a:hover{color:var(--fg);border-color:var(--line);background:var(--panel)}
.board-body{position:relative;width:100%;height:100%;overflow:hidden}
.board-body iframe{display:block;border:0;width:100%;height:100%;background:#fff}
.overlay-host{position:absolute;inset:0;pointer-events:none;z-index:5}
.empty{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center}
.empty-card{max-width:440px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 8px 28px oklch(0% 0 0/.08)}
.empty-card h2{margin:0 0 8px;font-size:16px}
.empty-card p{margin:0;color:var(--muted)}
</style></head><body>
<header class="topbar">
  <div class="brand"><strong id="board-title">${esc(initial.title)}</strong><span class="muted" id="file-count">${initial.files.length} file${initial.files.length === 1 ? '' : 's'}</span><span class="badge" id="verify-badge" hidden></span></div>
  <nav class="files-bar" id="files-bar" aria-label="Files">${navLinks}</nav>
  <div class="spacer"></div>
  <div class="group" id="layout-group" role="group" aria-label="Layout widths">
    <button data-layout="pair" aria-pressed="true">Pair 1440+390</button>
    <button data-layout="1440">1440</button>
    <button data-layout="1024">1024</button>
    <button data-layout="768">768</button>
    <button data-layout="390">390</button>
  </div>
  <div class="group" id="theme-group" role="group" aria-label="Theme preview">
    <button data-theme-mode="auto" aria-pressed="true" title="Document default theme">Theme: Auto</button>
    <button data-theme-mode="light" aria-pressed="false" title="Force data-theme=light in memory">Light</button>
    <button data-theme-mode="dark" aria-pressed="false" title="Force data-theme=dark in memory">Dark</button>
  </div>
  <div class="group" role="group" aria-label="Camera">
    <button id="btn-fit" title="Fit all (Cmd/Ctrl+0)">Fit</button>
    <button id="btn-zoom-out" title="Zoom out (Cmd/Ctrl+-)">−</button>
    <button id="btn-zoom-reset" title="100% (Cmd/Ctrl+1)">100%</button>
    <button id="btn-zoom-in" title="Zoom in (Cmd/Ctrl+=)">+</button>
  </div>
  <button id="btn-grid" aria-pressed="false" title="Toggle 8px grid (Shift+G)">Grid 8px</button>
  <button id="btn-ids" aria-pressed="false" title="Toggle data-craft-id labels">IDs</button>
</header>
<main class="viewport" id="viewport">
  <div class="stage" id="stage"></div>
  <div class="empty" id="empty" ${initial.files.length ? 'hidden' : ''}>
    <div class="empty-card">
      <h2>No HTML files yet</h2>
      <p>Watching <code>${esc(root)}</code>. Frames appear automatically when the first HTML artifact is written.</p>
    </div>
  </div>
</main>
<script>
const INITIAL = ${safeJson(initial)};
const GAP_X = 96, GAP_Y = 420, MIN_ZOOM = 0.15, MAX_ZOOM = 4;
const viewport = document.getElementById('viewport');
const stage = document.getElementById('stage');
const emptyEl = document.getElementById('empty');
const filesBar = document.getElementById('files-bar');
const layoutGroup = document.getElementById('layout-group');
const themeGroup = document.getElementById('theme-group');
const boardTitle = document.getElementById('board-title');
const fileCount = document.getElementById('file-count');
const verifyBadge = document.getElementById('verify-badge');
const zoomResetBtn = document.getElementById('btn-zoom-reset');
const gridBtn = document.getElementById('btn-grid');
const idsBtn = document.getElementById('btn-ids');

let state = INITIAL;
let layoutMode = localStorage.getItem('craft-board-layout') || 'pair';
let showGrid = localStorage.getItem('craft-board-grid') === '1';
let showIds = localStorage.getItem('craft-board-ids') === '1';
let themeMode = 'auto';
let cam = { x: 48, y: 64, zoom: 1 };
let boards = [];
let bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
let spaceDown = false;
let initializedCamera = false;

function encodePath(p) {
  return String(p).split('/').map(encodeURIComponent).join('/');
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function defaultHeight(width) {
  return width < 600 ? 844 : 900;
}

function renderVerifyBadge(v) {
  if (!v || !v.status) { verifyBadge.hidden = true; return; }
  verifyBadge.hidden = false;
  verifyBadge.dataset.status = v.status;
  const w = v.widths && v.widths.length ? ' (' + v.widths.join(', ') + ')' : '';
  const st = v.stage && v.stage !== 'full' ? ' [' + v.stage + ']' : '';
  verifyBadge.textContent = 'Verify: ' + v.status + st + w;
}

function buildSpecs(data) {
  if (data.mode === 'manifest') {
    return data.artboards.map(a => ({
      id: a.id,
      title: a.title,
      file: a.file,
      width: a.width,
      fixedHeight: a.height,
      height: a.height || defaultHeight(a.width),
      group: a.group || a.file,
    }));
  }
  const widths = layoutMode === 'pair' ? [1440, 390] : [Number(layoutMode) || 1440];
  const specs = [];
  for (const file of data.files) {
    for (const w of widths) {
      specs.push({
        id: file + '@' + w,
        title: widths.length > 1 ? file + ' · ' + w + 'px' : file,
        file,
        width: w,
        fixedHeight: null,
        height: defaultHeight(w),
        group: file,
      });
    }
  }
  return specs;
}

function layoutBoards(list) {
  const groups = [];
  const byGroup = new Map();
  for (const b of list) {
    let arr = byGroup.get(b.group);
    if (!arr) { arr = []; byGroup.set(b.group, arr); groups.push([b.group, arr]); }
    arr.push(b);
  }
  let y = 0;
  let maxX = 0;
  const groupLabels = [];
  for (const [groupName, items] of groups) {
    let x = 0;
    let rowH = 0;
    groupLabels.push({ name: groupName, x: 0, y });
    for (const b of items) {
      b.x = x;
      b.y = y;
      x += b.width + GAP_X;
      if (b.height > rowH) rowH = b.height;
    }
    maxX = Math.max(maxX, x - GAP_X);
    y += rowH + GAP_Y;
  }
  const maxY = Math.max(0, y - GAP_Y);
  return {
    groups: groupLabels,
    bounds: { minX: 0, minY: list.length ? -96 : 0, maxX, maxY, width: maxX, height: maxY + (list.length ? 96 : 0) },
  };
}

function applyCamera() {
  stage.style.transform = 'translate3d(' + cam.x + 'px,' + cam.y + 'px,0) scale(' + cam.zoom + ')';
  document.body.style.setProperty('--zoom', String(cam.zoom));
  zoomResetBtn.textContent = Math.round(cam.zoom * 100) + '%';
}

function zoomAt(cx, cy, factor) {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor));
  const ratio = next / cam.zoom;
  cam.x = cx - (cx - cam.x) * ratio;
  cam.y = cy - (cy - cam.y) * ratio;
  cam.zoom = next;
  applyCamera();
}

function fitView() {
  if (!boards.length) { cam = { x: 48, y: 64, zoom: 1 }; applyCamera(); return; }
  const rect = viewport.getBoundingClientRect();
  const pad = 84;
  const availW = Math.max(120, rect.width - pad * 2);
  const availH = Math.max(120, rect.height - pad * 2);
  const bw = Math.max(1, bounds.width);
  const bh = Math.max(1, bounds.height);
  const fitH = Math.min(bh, 2400);
  const z = Math.min(1, Math.max(MIN_ZOOM, Math.min(availW / bw, availH / fitH)));
  cam.zoom = z;
  cam.x = (rect.width - bw * z) / 2 - bounds.minX * z;
  cam.y = bh > 2400 ? (pad - bounds.minY * z) : ((rect.height - bh * z) / 2 - bounds.minY * z);
  applyCamera();
}

function focusBoard(board) {
  if (!board) return;
  const rect = viewport.getBoundingClientRect();
  const pad = 56;
  const z = Math.min(1, Math.max(MIN_ZOOM, Math.min((rect.width - pad * 2) / board.width, (rect.height - pad * 2) / Math.min(board.height, 960))));
  cam.zoom = z;
  cam.x = (rect.width - board.width * z) / 2 - board.x * z;
  cam.y = pad - board.y * z;
  applyCamera();
}

function ensureOverlay(board) {
  const host = board.overlayHost;
  if (!host._shadow) {
    host._shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = ${JSON.stringify(OVERLAY_CSS)};
    const grid = document.createElement('div');
    grid.className = 'grid';
    const ids = document.createElement('div');
    ids.className = 'ids';
    host._shadow.append(style, grid, ids);
    host._grid = grid;
    host._ids = ids;
  }
  host._grid.style.display = showGrid ? 'block' : 'none';
  host._ids.style.display = showIds ? 'block' : 'none';
  host._ids.textContent = '';
  if (showIds) {
    let doc;
    try { doc = board.iframe.contentDocument; } catch { doc = null; }
    if (doc) {
      let count = 0;
      for (const el of doc.querySelectorAll('[data-craft-id]')) {
        if (count >= 120) break;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const tag = document.createElement('span');
        tag.className = 'id-tag';
        tag.textContent = el.getAttribute('data-craft-id');
        tag.style.left = Math.max(0, Math.round(r.left)) + 'px';
        tag.style.top = Math.max(0, Math.round(r.top)) + 'px';
        host._ids.appendChild(tag);
        count++;
      }
    }
  }
}

function updateOverlays() {
  gridBtn.setAttribute('aria-pressed', String(showGrid));
  idsBtn.setAttribute('aria-pressed', String(showIds));
  for (const b of boards) if (b.overlayHost) ensureOverlay(b);
}

function applyThemeToBoard(board, force) {
  let doc;
  try { doc = board.iframe.contentDocument; } catch { return; }
  if (!doc || !doc.documentElement) return;
  if (themeMode === 'auto') {
    if (force) doc.documentElement.removeAttribute('data-theme');
  } else {
    doc.documentElement.setAttribute('data-theme', themeMode);
  }
}

function relayout() {
  const res = layoutBoards(boards);
  bounds = res.bounds;
  for (const b of boards) {
    b.el.style.left = b.x + 'px';
    b.el.style.top = b.y + 'px';
    b.el.style.width = b.width + 'px';
    b.el.style.height = b.height + 'px';
    b.dimsEl.textContent = b.width + ' × ' + b.height;
  }
  stage.querySelectorAll('.group-title').forEach(el => el.remove());
  for (const g of res.groups) {
    const label = document.createElement('div');
    label.className = 'group-title';
    label.textContent = g.name;
    label.style.left = g.x + 'px';
    label.style.top = g.y + 'px';
    stage.appendChild(label);
  }
}

function canScroll(doc, dx, dy) {
  const rootEl = doc.scrollingElement || doc.documentElement;
  if (!rootEl) return false;
  if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy < 0 && rootEl.scrollTop > 0) return true;
    if (dy > 0 && rootEl.scrollTop + rootEl.clientHeight < rootEl.scrollHeight - 1) return true;
  } else {
    if (dx < 0 && rootEl.scrollLeft > 0) return true;
    if (dx > 0 && rootEl.scrollLeft + rootEl.clientWidth < rootEl.scrollWidth - 1) return true;
  }
  return false;
}

function isEditable(el) {
  if (!el) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
}

function handleShortcut(e) {
  if (isEditable(e.target)) return false;
  if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'G' || e.key === 'g')) {
    e.preventDefault();
    showGrid = !showGrid;
    localStorage.setItem('craft-board-grid', showGrid ? '1' : '0');
    updateOverlays();
    return true;
  }
  if (!(e.ctrlKey || e.metaKey)) return false;
  const rect = viewport.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomAt(cx, cy, 1.2); return true; }
  if (e.key === '-') { e.preventDefault(); zoomAt(cx, cy, 1 / 1.2); return true; }
  if (e.key === '0') { e.preventDefault(); fitView(); return true; }
  if (e.key === '1') {
    e.preventDefault();
    zoomAt(cx, cy, 1 / cam.zoom);
    return true;
  }
  return false;
}

function attachIframe(board) {
  const frame = board.iframe;
  const measure = () => {
    if (board.fixedHeight) return;
    let doc;
    try { doc = frame.contentDocument; } catch { return; }
    if (!doc || !doc.documentElement) return;
    const minH = defaultHeight(board.width);
    const natural = Math.min(16000, Math.max(minH, doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0));
    if (natural !== board.height) {
      board.height = natural;
      relayout();
    }
    if (showIds) ensureOverlay(board);
  };
  frame.addEventListener('load', () => {
    let win, doc;
    try { win = frame.contentWindow; doc = frame.contentDocument; } catch { return; }
    if (!win || !doc) return;
    applyThemeToBoard(board, false);
    if (board.pendingScrollY) {
      try { win.scrollTo(0, board.pendingScrollY); } catch {}
      board.pendingScrollY = 0;
    }
    measure();
    if (typeof ResizeObserver === 'function' && doc.documentElement) {
      const ro = new ResizeObserver(measure);
      ro.observe(doc.documentElement);
    }
    win.addEventListener('wheel', e => {
      const rect = frame.getBoundingClientRect();
      const vRect = viewport.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const cx = rect.left - vRect.left + e.clientX * cam.zoom;
        const cy = rect.top - vRect.top + e.clientY * cam.zoom;
        zoomAt(cx, cy, Math.exp(-e.deltaY * 0.004));
        return;
      }
      if (!canScroll(doc, e.deltaX, e.deltaY)) {
        e.preventDefault();
        cam.x -= e.deltaX;
        cam.y -= e.deltaY;
        applyCamera();
      }
    }, { passive: false });
    win.addEventListener('keydown', handleShortcut);
    doc.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      let resolved;
      try { resolved = new URL(href, win.location.href); } catch { return; }
      if (resolved.origin !== window.location.origin || !resolved.pathname.startsWith('/raw/')) return;
      let targetFile;
      try { targetFile = decodeURIComponent(resolved.pathname.slice(5)); } catch { return; }
      const targetBoard = boards.find(b => b.file === targetFile);
      if (targetBoard) {
        e.preventDefault();
        focusBoard(targetBoard);
      }
    });
  });
}

function renderBoard(data, preserveCamera = false) {
  state = data;
  boardTitle.textContent = data.title;
  fileCount.textContent = data.files.length + ' file' + (data.files.length === 1 ? '' : 's');
  renderVerifyBadge(data.verification);
  layoutGroup.hidden = data.mode === 'manifest';
  for (const btn of layoutGroup.querySelectorAll('[data-layout]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.layout === layoutMode));
  }
  filesBar.innerHTML = data.files.map(f => '<a class="file-chip" data-file="' + escHtml(f) + '" href="/view/' + encodePath(f) + '">' + escHtml(f) + '</a>').join('');
  for (const chip of filesBar.querySelectorAll('.file-chip')) {
    chip.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = boards.find(b => b.file === chip.dataset.file);
      if (target) { e.preventDefault(); focusBoard(target); }
    });
  }

  const specs = buildSpecs(data);
  emptyEl.hidden = specs.length > 0;
  stage.innerHTML = '';
  boards = specs.map(spec => {
    const el = document.createElement('section');
    el.className = 'board';
    const label = document.createElement('div');
    label.className = 'board-label';
    const title = document.createElement('strong');
    title.textContent = spec.title;
    const dims = document.createElement('span');
    dims.className = 'dims';
    const open = document.createElement('a');
    open.href = '/view/' + encodePath(spec.file);
    open.textContent = '↗';
    open.title = 'Open single view';
    label.append(title, dims, open);

    const body = document.createElement('div');
    body.className = 'board-body';
    const iframe = document.createElement('iframe');
    iframe.title = spec.title;
    iframe.src = '/raw/' + encodePath(spec.file);
    const overlayHost = document.createElement('div');
    overlayHost.className = 'overlay-host';
    body.append(iframe, overlayHost);
    el.append(label, body);
    stage.appendChild(el);

    const board = { ...spec, el, dimsEl: dims, iframe, overlayHost, pendingScrollY: 0 };
    attachIframe(board);
    return board;
  });

  relayout();
  updateOverlays();
  if (!preserveCamera || !initializedCamera) {
    fitView();
    initializedCamera = true;
  } else {
    applyCamera();
  }
}

let drag = null;
viewport.addEventListener('pointerdown', e => {
  if (e.button === 1 || (e.button === 0 && (spaceDown || e.target === viewport || e.target === stage))) {
    e.preventDefault();
    drag = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y, id: e.pointerId };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('panning');
  }
});
viewport.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  cam.x = drag.camX + (e.clientX - drag.x);
  cam.y = drag.camY + (e.clientY - drag.y);
  applyCamera();
});
const endDrag = e => {
  if (!drag || e.pointerId !== drag.id) return;
  drag = null;
  viewport.classList.remove('panning');
};
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);

viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  if (e.ctrlKey || e.metaKey) {
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.004));
  } else {
    cam.x -= e.deltaX;
    cam.y -= e.deltaY;
    applyCamera();
  }
}, { passive: false });

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && !isEditable(e.target)) spaceDown = true;
  handleShortcut(e);
});
window.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });

for (const btn of layoutGroup.querySelectorAll('[data-layout]')) {
  btn.addEventListener('click', () => {
    layoutMode = btn.dataset.layout;
    localStorage.setItem('craft-board-layout', layoutMode);
    renderBoard(state, false);
  });
}

for (const btn of themeGroup.querySelectorAll('[data-theme-mode]')) {
  btn.addEventListener('click', () => {
    themeMode = btn.dataset.themeMode;
    for (const x of themeGroup.querySelectorAll('[data-theme-mode]')) {
      x.setAttribute('aria-pressed', String(x === btn));
    }
    for (const b of boards) applyThemeToBoard(b, true);
  });
}

document.getElementById('btn-fit').addEventListener('click', fitView);
document.getElementById('btn-zoom-in').addEventListener('click', () => {
  const r = viewport.getBoundingClientRect();
  zoomAt(r.width / 2, r.height / 2, 1.25);
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
  const r = viewport.getBoundingClientRect();
  zoomAt(r.width / 2, r.height / 2, 1 / 1.25);
});
zoomResetBtn.addEventListener('click', () => {
  const r = viewport.getBoundingClientRect();
  zoomAt(r.width / 2, r.height / 2, 1 / cam.zoom);
});
gridBtn.addEventListener('click', () => {
  showGrid = !showGrid;
  localStorage.setItem('craft-board-grid', showGrid ? '1' : '0');
  updateOverlays();
});
idsBtn.addEventListener('click', () => {
  showIds = !showIds;
  localStorage.setItem('craft-board-ids', showIds ? '1' : '0');
  updateOverlays();
});

renderBoard(INITIAL, false);

new EventSource('/events').onmessage = async () => {
  try {
    const res = await fetch('/api/board', { cache: 'no-store' });
    if (!res.ok) return;
    const next = await res.json();
    const prevSpecs = buildSpecs(state).map(s => s.id + ':' + s.width + ':' + s.fixedHeight).join('|');
    const nextSpecs = buildSpecs(next).map(s => s.id + ':' + s.width + ':' + s.fixedHeight).join('|');
    renderVerifyBadge(next.verification);
    if (prevSpecs !== nextSpecs || state.mode !== next.mode) {
      const hadBoards = boards.length > 0;
      renderBoard(next, hadBoards);
    } else {
      state = next;
      for (const b of boards) {
        try {
          b.pendingScrollY = b.iframe.contentWindow.scrollY || 0;
          b.iframe.contentWindow.location.reload();
        } catch {
          b.iframe.src = '/raw/' + encodePath(b.file) + '?t=' + Date.now();
        }
      }
    }
  } catch {}
};
</script></body></html>`;
}

function viewPage(file) {
  const encoded = encodePath(file);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(file)} · preview</title><style>${BASE_STYLE}
body{display:flex;flex-direction:column}
header{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);background:var(--panel)}
header .path{font-weight:600;margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:35vw}
.group{display:flex;gap:4px}
.stage{flex:1;overflow:auto;display:flex;justify-content:center;background:var(--bg)}
.frame-wrap{position:relative;height:100%;width:100%;transition:width .2s}
.framed .frame-wrap{box-shadow:0 0 0 1px var(--line),0 8px 32px oklch(0% 0 0/.12)}
iframe{border:0;background:#fff;height:100%;width:100%;display:block}
.overlay-host{position:absolute;inset:0;pointer-events:none;z-index:5}
</style></head><body>
<header>
  <a href="/" aria-label="Back to board">← Board</a>
  <span class="path" title="${esc(file)}">${esc(file)}</span>
  <div class="group" role="group" aria-label="Viewport width">
    <button data-w="" aria-pressed="true">Fill</button>
    <button data-w="1440">Desktop 1440</button>
    <button data-w="1024">Laptop 1024</button>
    <button data-w="768">Tablet 768</button>
    <button data-w="390">Phone 390</button>
  </div>
  <div class="group" id="theme-group" role="group" aria-label="Theme preview">
    <button data-theme-mode="auto" aria-pressed="true">Theme: Auto</button>
    <button data-theme-mode="light" aria-pressed="false">Light</button>
    <button data-theme-mode="dark" aria-pressed="false">Dark</button>
  </div>
  <button id="btn-grid" aria-pressed="false">Grid 8px</button>
  <button id="btn-ids" aria-pressed="false">IDs</button>
  <a href="/raw/${encoded}" target="_blank" rel="noopener">Raw ↗</a>
</header>
<div class="stage" id="stage">
  <div class="frame-wrap" id="wrap">
    <iframe id="frame" title="${esc(file)}" src="/raw/${encoded}"></iframe>
    <div class="overlay-host" id="overlay-host"></div>
  </div>
</div>
<script>
const frame = document.getElementById('frame');
const stage = document.getElementById('stage');
const wrap = document.getElementById('wrap');
const gridBtn = document.getElementById('btn-grid');
const idsBtn = document.getElementById('btn-ids');
const overlayHost = document.getElementById('overlay-host');
const shadow = overlayHost.attachShadow({ mode: 'closed' });
const styleEl = document.createElement('style');
styleEl.textContent = ${JSON.stringify(OVERLAY_CSS)};
const gridDiv = document.createElement('div');
gridDiv.className = 'grid';
const idsDiv = document.createElement('div');
idsDiv.className = 'ids';
shadow.append(styleEl, gridDiv, idsDiv);

let showGrid = localStorage.getItem('craft-board-grid') === '1';
let showIds = localStorage.getItem('craft-board-ids') === '1';
let themeMode = 'auto';
let scroll = 0;

function applyOverlays() {
  gridBtn.setAttribute('aria-pressed', String(showGrid));
  idsBtn.setAttribute('aria-pressed', String(showIds));
  gridDiv.style.display = showGrid ? 'block' : 'none';
  idsDiv.style.display = showIds ? 'block' : 'none';
  idsDiv.textContent = '';
  if (showIds) {
    let doc;
    try { doc = frame.contentDocument; } catch { doc = null; }
    if (doc) {
      let count = 0;
      for (const el of doc.querySelectorAll('[data-craft-id]')) {
        if (count >= 120) break;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const tag = document.createElement('span');
        tag.className = 'id-tag';
        tag.textContent = el.getAttribute('data-craft-id');
        tag.style.left = Math.max(0, Math.round(r.left)) + 'px';
        tag.style.top = Math.max(0, Math.round(r.top)) + 'px';
        idsDiv.appendChild(tag);
        count++;
      }
    }
  }
}

function applyTheme(force) {
  let doc;
  try { doc = frame.contentDocument; } catch { return; }
  if (!doc || !doc.documentElement) return;
  if (themeMode === 'auto') {
    if (force) doc.documentElement.removeAttribute('data-theme');
  } else {
    doc.documentElement.setAttribute('data-theme', themeMode);
  }
}

gridBtn.onclick = () => {
  showGrid = !showGrid;
  localStorage.setItem('craft-board-grid', showGrid ? '1' : '0');
  applyOverlays();
};
idsBtn.onclick = () => {
  showIds = !showIds;
  localStorage.setItem('craft-board-ids', showIds ? '1' : '0');
  applyOverlays();
};
for (const btn of document.querySelectorAll('[data-theme-mode]')) {
  btn.onclick = () => {
    themeMode = btn.dataset.themeMode;
    for (const x of document.querySelectorAll('[data-theme-mode]')) {
      x.setAttribute('aria-pressed', String(x === btn));
    }
    applyTheme(true);
  };
}
applyOverlays();

document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-w]').forEach(x => x.setAttribute('aria-pressed', x === b));
  wrap.style.width = b.dataset.w ? b.dataset.w + 'px' : '100%';
  stage.classList.toggle('framed', !!b.dataset.w);
  localStorage.setItem('craft-w', b.dataset.w);
});
const saved = localStorage.getItem('craft-w');
if (saved) document.querySelector('[data-w="' + saved + '"]')?.click();

frame.addEventListener('load', () => {
  applyTheme(false);
  try { frame.contentWindow.scrollTo(0, scroll); } catch {}
  if (showIds) applyOverlays();
  try { frame.contentWindow.addEventListener('scroll', () => { if (showIds) applyOverlays(); }, { passive: true }); } catch {}
});
new EventSource('/events').onmessage = () => {
  try { scroll = frame.contentWindow.scrollY || 0; } catch {}
  frame.contentWindow.location.reload();
};
</script></body></html>`;
}

const clients = new Set();
function broadcast(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(data);
}

let timer = null;
let changed = new Set();
function onChange(name) {
  if (!name || SKIP.test(name)) return;
  const file = String(name).split(sep).join('/');
  changed.add(file);
  clearTimeout(timer);
  timer = setTimeout(() => {
    broadcast({ files: [...changed] });
    changed = new Set();
  }, 120);
}

try {
  watch(root, { recursive: true }, (_event, name) => onChange(name));
} catch {
  let last = new Map();
  const scan = (dir = root, seen = new Map()) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (SKIP.test(p)) continue;
      try {
        if (e.isDirectory()) scan(p, seen);
        else seen.set(p, statSync(p).mtimeMs);
      } catch {}
    }
    return seen;
  };
  last = scan();
  setInterval(() => {
    const now = scan();
    for (const [p, mtime] of now) if (last.get(p) !== mtime) onChange(relative(root, p));
    for (const p of last.keys()) if (!now.has(p)) onChange(relative(root, p));
    last = now;
  }, 800);
}

function send(res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  if (path === '/') return send(res, 200, indexPage());
  if (path === '/api/info') return send(res, 200, JSON.stringify({ app: 'craft-design-preview', root }), 'application/json');
  if (path === '/api/board') return send(res, 200, JSON.stringify(boardState()), 'application/json');
  if (path === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (path.startsWith('/view/')) {
    const abs = inside(path.slice(6), false);
    if (!abs) return send(res, 404, 'Not found', 'text/plain');
    const rel = relative(root, abs).split(sep).join('/');
    return send(res, 200, viewPage(rel));
  }
  if (path.startsWith('/raw/')) {
    const abs = inside(path.slice(5), true);
    if (!abs) return send(res, 404, 'Not found', 'text/plain');
    res.writeHead(200, { 'content-type': TYPES[extname(abs).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    return createReadStream(abs).pipe(res);
  }
  send(res, 404, 'Not found', 'text/plain');
});

async function existing(p) {
  try {
    const r = await fetch(`http://${host}:${p}/api/info`, { signal: AbortSignal.timeout(800) });
    const info = await r.json();
    return info.app === 'craft-design-preview' ? info.root : null;
  } catch {
    return null;
  }
}

function announce(p, running) {
  const base = `http://${host}:${p}/`;
  console.log(`craft-design preview${running ? ' already running' : ''}: ${base}  (root: ${root})`);
  console.log(`artifacts open at ${base}view/<path under root>, for example ${base}view/<slug>/index.html`);
  for (const file of htmlFiles().slice(0, 12)) console.log(`  ${base}view/${encodePath(file)}`);
}

async function listen(p, attempts = 20) {
  if (await existing(p) === root) { announce(p, true); process.exit(0); }
  const onListening = () => { server.off('error', onError); announce(server.address().port, false); };
  const onError = err => {
    server.off('listening', onListening);
    if (err.code === 'EADDRINUSE' && attempts > 1) listen(p + 1, attempts - 1);
    else { console.error(`craft-design preview: ${err.message}`); process.exit(1); }
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(p, host);
}

listen(port);
