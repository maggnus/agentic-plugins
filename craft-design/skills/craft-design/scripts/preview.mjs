#!/usr/bin/env node
// craft-design preview: a dependency-free local server for design artifacts.
//
//   node preview.mjs <root> [--port 4178]     serve <root> with live reload
//   node preview.mjs --comments <root>        print open comments
//   node preview.mjs --resolve <root> <id>…   mark comments as handled
//
// The page lists every HTML file under <root>, reloads it on save, switches
// viewport widths and lets the user Alt+click an element to leave a comment.
// Comments are stored in <root>/.craft-comments.jsonl, one JSON object per line.

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync, createReadStream } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const COMMENTS = '.craft-comments.jsonl';
const SKIP = /(^|[\\/])(node_modules|\.git)([\\/]|$)/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const has = name => { const i = args.indexOf(name); return i >= 0 ? (args.splice(i, 1), true) : false; };

function readComments(root) {
  const file = join(root, COMMENTS);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}
function writeComments(root, list) {
  writeFileSync(join(root, COMMENTS), list.map(c => JSON.stringify(c)).join('\n') + (list.length ? '\n' : ''));
}

if (has('--comments')) {
  const root = resolve(args[0] || 'design');
  const open = readComments(root).filter(c => c.status !== 'resolved');
  if (!open.length) console.log('no open comments');
  for (const c of open) console.log(JSON.stringify(c));
  process.exit(0);
}
if (has('--resolve')) {
  const [dir, ...ids] = args;
  const root = resolve(dir || 'design');
  const list = readComments(root);
  let n = 0;
  for (const c of list) if (ids.includes(c.id) && c.status !== 'resolved') { c.status = 'resolved'; c.resolvedAt = new Date().toISOString(); n++; }
  writeComments(root, list);
  console.log(`resolved ${n} of ${ids.length}`);
  process.exit(n === ids.length ? 0 : 1);
}

const port = Number(flag('--port') || 4178);
const host = flag('--host') || '127.0.0.1';
const root = resolve(args[0] || 'design');
mkdirSync(root, { recursive: true });

function inside(rel) {
  const path = resolve(root, '.' + sep + decodeURIComponent(rel));
  return path === root || path.startsWith(root + sep) ? path : null;
}

function htmlFiles(dir = root, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(path, out);
    else if (/\.html?$/i.test(entry.name)) out.push(relative(root, path).split(sep).join('/'));
  }
  return out.sort();
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const STYLE = `
:root{color-scheme:light dark;--bg:oklch(97% .004 260);--fg:oklch(22% .01 260);--muted:oklch(50% .01 260);--line:oklch(88% .006 260);--panel:oklch(100% 0 0);--accent:oklch(55% .17 255)}
@media (prefers-color-scheme:dark){:root{--bg:oklch(19% .006 260);--fg:oklch(93% .004 260);--muted:oklch(68% .008 260);--line:oklch(32% .008 260);--panel:oklch(23% .007 260);--accent:oklch(72% .14 255)}}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--fg)}
a{color:inherit}button{font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:6px;padding:4px 10px;min-height:30px;cursor:pointer}
button:hover{background:color-mix(in oklch,var(--fg) 8%,transparent)}button:focus-visible,a:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.muted{color:var(--muted)}`;

function indexPage() {
  const files = htmlFiles();
  const open = readComments(root).filter(c => c.status !== 'resolved');
  const count = f => open.filter(c => c.file === f).length;
  const rows = files.map(f => `<li><a href="/view/${encodeURI(f)}">${esc(f)}</a>${count(f) ? ` <span class="muted">· ${count(f)} open comment${count(f) > 1 ? 's' : ''}</span>` : ''}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>craft-design preview</title><style>${STYLE}
main{max-width:760px;margin:48px auto;padding:0 24px}h1{font-size:20px;margin:0 0 4px}ul{list-style:none;padding:0;margin:24px 0}li{padding:10px 0;border-bottom:1px solid var(--line)}li a{text-decoration:none;font-weight:600}li a:hover{text-decoration:underline}</style></head>
<body><main><h1>craft-design preview</h1><p class="muted">${esc(root)}</p>${files.length ? `<ul>${rows}</ul>` : '<p>No HTML files yet. This page refreshes when the first one is written.</p>'}</main>
<script>new EventSource('/events').onmessage=()=>location.reload()</script></body></html>`;
}

function viewPage(file) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(file)} · preview</title><style>${STYLE}
html,body{height:100%}body{display:flex;flex-direction:column}
header{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);background:var(--panel)}
header .path{font-weight:600;margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40vw}
.group{display:flex;gap:4px}.stage{flex:1;overflow:auto;display:flex;justify-content:center;background:var(--bg)}
iframe{border:0;background:#fff;height:100%;width:100%;transition:width .2s}.framed iframe{box-shadow:0 0 0 1px var(--line),0 8px 32px oklch(0% 0 0/.12)}
aside{position:fixed;right:12px;top:56px;width:340px;max-height:70vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;box-shadow:0 12px 40px oklch(0% 0 0/.18)}
aside[hidden]{display:none}aside h2{font-size:13px;margin:0 0 8px}aside li{margin:0 0 10px;padding:0 0 10px;border-bottom:1px solid var(--line);list-style:none}aside ul{padding:0;margin:0}
aside code{font-size:12px;word-break:break-all}dialog{border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--fg);width:min(440px,92vw);padding:16px}
dialog::backdrop{background:oklch(0% 0 0/.3)}textarea{width:100%;min-height:96px;font:inherit;color:inherit;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px}
.row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--fg);color:var(--bg);padding:8px 14px;border-radius:8px;opacity:0;transition:opacity .2s;pointer-events:none}.toast.in{opacity:1}
</style></head><body>
<header><a href="/" aria-label="All files">←</a><span class="path" title="${esc(file)}">${esc(file)}</span>
<div class="group" role="group" aria-label="Viewport width">
<button data-w="" aria-pressed="true">Fill</button><button data-w="1440">Desktop 1440</button><button data-w="1024">Laptop 1024</button><button data-w="768">Tablet 768</button><button data-w="390">Phone 390</button></div>
<button id="comments" aria-expanded="false">Comments <span id="count"></span></button>
<span class="muted">Alt+click an element to comment</span></header>
<div class="stage" id="stage"><iframe id="frame" title="${esc(file)}" src="/raw/${encodeURI(file)}"></iframe></div>
<aside id="panel" hidden><h2>Open comments</h2><ul id="list"></ul></aside>
<dialog id="dlg"><form method="dialog"><p style="margin:0 0 8px"><strong>Comment on</strong> <code id="target"></code></p><textarea id="note" required placeholder="What should change?"></textarea>
<div class="row"><button value="cancel" formnovalidate>Cancel</button><button value="ok" class="primary">Save and copy</button></div></form></dialog>
<div class="toast" id="toast" role="status"></div>
<script>
const FILE=${JSON.stringify(file).replace(/</g, '\\u003c')};const frame=document.getElementById('frame'),stage=document.getElementById('stage');
let pending=null,scroll=0;
const toast=t=>{const el=document.getElementById('toast');el.textContent=t;el.classList.add('in');setTimeout(()=>el.classList.remove('in'),1800)};
document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-w]').forEach(x=>x.setAttribute('aria-pressed',x===b));
  frame.style.width=b.dataset.w?b.dataset.w+'px':'100%';stage.classList.toggle('framed',!!b.dataset.w);localStorage.setItem('craft-w',b.dataset.w)});
const saved=localStorage.getItem('craft-w');if(saved)document.querySelector('[data-w="'+saved+'"]')?.click();
function selectorOf(el){const parts=[];while(el&&el.nodeType===1&&el.tagName!=='HTML'){if(el.id){parts.unshift('#'+CSS.escape(el.id));break}
  let i=1,s=el;while((s=s.previousElementSibling))if(s.tagName===el.tagName)i++;parts.unshift(el.tagName.toLowerCase()+':nth-of-type('+i+')');el=el.parentElement}return parts.join(' > ')}
function attach(){let doc;try{doc=frame.contentDocument}catch{return}if(!doc)return;try{frame.contentWindow.scrollTo(0,scroll)}catch{}
  let hot=null;const mark=el=>{if(hot)hot.style.outline=hot.dataset.craftOutline||'';hot=el;if(el){el.dataset.craftOutline=el.style.outline;el.style.outline='2px solid #3b82f6'}};
  doc.addEventListener('mousemove',e=>mark(e.altKey?(e.target.closest('[data-craft-id]')||e.target):null),true);
  doc.addEventListener('keyup',e=>{if(e.key==='Alt')mark(null)},true);
  doc.addEventListener('click',e=>{if(!e.altKey)return;e.preventDefault();e.stopPropagation();const el=e.target.closest('[data-craft-id]')||e.target;mark(null);
    pending={file:FILE,craftId:el.getAttribute('data-craft-id')||null,selector:selectorOf(el),text:(el.innerText||el.getAttribute('alt')||'').trim().replace(/\\s+/g,' ').slice(0,160)};
    document.getElementById('target').textContent=pending.craftId?'[data-craft-id="'+pending.craftId+'"]':pending.selector;document.getElementById('note').value='';document.getElementById('dlg').showModal()},true)}
frame.addEventListener('load',attach);
document.getElementById('dlg').addEventListener('close',async e=>{if(e.target.returnValue!=='ok'||!pending)return;const note=document.getElementById('note').value.trim();if(!note)return;
  const r=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...pending,note})});const c=await r.json();
  const line='In '+c.file+', '+(c.craftId?'[data-craft-id="'+c.craftId+'"]':c.selector)+(c.text?' ("'+c.text.slice(0,60)+'")':'')+': '+c.note;
  try{await navigator.clipboard.writeText(line);toast('Saved and copied for the agent')}catch{toast('Saved for the agent')}load()});
async function load(){const list=(await (await fetch('/api/comments')).json()).filter(c=>c.file===FILE);document.getElementById('count').textContent=list.length?'('+list.length+')':'';
  document.getElementById('list').innerHTML=list.length?list.map(c=>'<li><code>'+esc(c.craftId?'[data-craft-id="'+c.craftId+'"]':c.selector)+'</code><div>'+esc(c.note)+'</div></li>').join(''):'<li class="muted">None</li>'}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
document.getElementById('comments').onclick=e=>{const p=document.getElementById('panel');p.hidden=!p.hidden;e.currentTarget.setAttribute('aria-expanded',!p.hidden)};
new EventSource('/events').onmessage=m=>{const d=JSON.parse(m.data);if(d.comments){load();return}try{scroll=frame.contentWindow.scrollY}catch{}frame.contentWindow.location.reload()};
load();
</script></body></html>`;
}

const clients = new Set();
function broadcast(payload) { for (const res of clients) res.write(`data: ${JSON.stringify(payload)}\n\n`); }
let timer = null, changed = new Set();
function onChange(name) {
  if (!name || SKIP.test(name)) return;
  const file = String(name).split(sep).join('/');
  if (file.endsWith(COMMENTS)) { broadcast({ comments: true }); return; }
  changed.add(file);
  clearTimeout(timer);
  timer = setTimeout(() => { broadcast({ files: [...changed] }); changed = new Set(); }, 120);
}
try {
  watch(root, { recursive: true }, (_event, name) => onChange(name));
} catch {
  // Platforms without recursive watching: poll modification times.
  let last = new Map();
  const scan = (dir = root, seen = new Map()) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      if (SKIP.test(path)) continue;
      try { if (e.isDirectory()) scan(path, seen); else seen.set(path, statSync(path).mtimeMs); } catch {}
    }
    return seen;
  };
  last = scan();
  setInterval(() => {
    const now = scan();
    for (const [path, mtime] of now) if (last.get(path) !== mtime) onChange(relative(root, path));
    for (const path of last.keys()) if (!now.has(path)) onChange(relative(root, path));
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
  if (path === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (path === '/api/comments' && req.method === 'GET') {
    return send(res, 200, JSON.stringify(readComments(root).filter(c => c.status !== 'resolved')), 'application/json');
  }
  if (path === '/api/comments' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 65536) req.destroy(); });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        const comment = {
          id: randomUUID().slice(0, 8), time: new Date().toISOString(), status: 'open',
          file: String(input.file || ''), craftId: input.craftId ? String(input.craftId) : null,
          selector: String(input.selector || ''), text: String(input.text || '').slice(0, 200), note: String(input.note || '').slice(0, 4000),
        };
        writeComments(root, [...readComments(root), comment]);
        send(res, 201, JSON.stringify(comment), 'application/json');
      } catch { send(res, 400, '{"error":"bad request"}', 'application/json'); }
    });
    return;
  }
  if (path.startsWith('/view/')) {
    const file = decodeURIComponent(path.slice(6));
    const abs = inside(path.slice(6));
    if (!abs || !existsSync(abs)) return send(res, 404, 'Not found', 'text/plain');
    return send(res, 200, viewPage(file));
  }
  if (path.startsWith('/raw/')) {
    let abs = inside(path.slice(5));
    if (abs && existsSync(abs) && statSync(abs).isDirectory()) abs = join(abs, 'index.html');
    if (!abs || !existsSync(abs) || !statSync(abs).isFile()) return send(res, 404, 'Not found', 'text/plain');
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
  } catch { return null; }
}

// Artifacts open at /view/<path under root>; print the pattern and the current files.
function announce(p, running) {
  const base = `http://${host}:${p}/`;
  console.log(`craft-design preview${running ? ' already running' : ''}: ${base}  (root: ${root})`);
  console.log(`artifacts open at ${base}view/<path under root>, for example ${base}view/<slug>/index.html`);
  for (const file of htmlFiles().slice(0, 12)) console.log(`  ${base}view/${encodeURI(file)}`);
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
