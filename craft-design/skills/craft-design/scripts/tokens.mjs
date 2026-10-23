#!/usr/bin/env node
// Dependency-free theme diagnostics. Node 22+, an installed Chromium browser.
// check HTML [--width 1440,390] [--strict] | sync CSS HTML… | extract HTML [--out CSS]
// import JSON… [--dark JSON[,JSON]] [--map JSON] [--mapped-only] [--prefix name] [--dark-selector SEL] [--out CSS]
// Exit: 0 completed (warnings allowed), 1 strict warnings, 2 input/runtime error,
// 3 static checks completed but no browser available (strict warnings take priority).
// Static analysis covers embedded styles and style attributes, not external CSS.
// Mutation reports observable computed-style changes, not proof of author intent.
// import reads W3C Design Tokens (DTCG), Style Dictionary or plain nested JSON,
// merges the files, resolves {a.b.c} aliases to var() and arithmetic to calc(),
// and writes one theme: a :root registry plus a dark scope. Lost or invalid
// values are errors (exit 2, nothing written), never silent.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const START = /^\/\*\s*tokens:start\s*\*\/$/;
const END = /^\/\*\s*tokens:end\s*\*\/$/;
function maskCss(text, strings = false, comments) {
  let out = '', quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      out += strings ? ' ' : c;
      if (c === '\\' && i + 1 < text.length) { out += strings ? ' ' : text[i + 1]; i++; }
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") { quote = c; out += strings ? ' ' : c; }
    else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2), length = (end < 0 ? text.length : end + 2) - i;
      comments?.push({ index: i, text: text.slice(i, i + length) });
      out += ' '.repeat(length); i += length - 1;
    } else out += c;
  }
  return out;
}
const refs = value => [...maskCss(value, true).matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]);
const uncomment = text => maskCss(text);
const lineAt = (text, offset) => text.slice(0, offset).split('\n').length;
const entity = text => text.replace(/&(#x[\da-f]+|#\d+|quot|apos|amp|lt|gt);/gi, (all, name) => {
  if (name[0] !== '#') return ({ quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' })[name.toLowerCase()];
  const n = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
});

// Find delimiters outside comments, quoted strings, functions and attribute
// selectors. This deliberately stops short of implementing the CSS cascade.
function delimiter(text, from, end, chars) {
  let quote = '', parens = 0, brackets = 0;
  for (let i = from; i < end; i++) {
    const c = text[i];
    if (c === '\\') { i++; continue; }
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '/' && text[i + 1] === '*') {
      const close = text.indexOf('*/', i + 2); i = close < 0 ? end : close + 1; continue;
    }
    if (c === '(') parens++;
    else if (c === ')') parens--;
    else if (c === '[') brackets++;
    else if (c === ']') brackets--;
    else if (!parens && !brackets && chars.includes(c)) return i;
  }
  return end;
}

function htmlParts(html) {
  const styles = [], inline = [], svgColors = [], links = [], scripts = [];
  let i = 0, svg = 0;
  while ((i = html.indexOf('<', i)) >= 0) {
    if (html.startsWith('<!--', i)) { const e = html.indexOf('-->', i + 4); i = e < 0 ? html.length : e + 3; continue; }
    const match = html.slice(i).match(/^<(\/?)([a-z][\w:-]*)\b/i);
    if (!match) { i++; continue; }
    const closing = !!match[1], tag = match[2].toLowerCase();
    const end = delimiter(html, i + match[0].length, html.length, '>');
    if (end === html.length) break;
    if (closing) { if (tag === 'svg') svg = Math.max(0, svg - 1); i = end + 1; continue; }
    if (tag === 'svg') svg++;
    const attrs = [];
    const attrStart = i + match[0].length;
    for (const a of html.slice(attrStart, end).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      attrs.push({ name: a[1].toLowerCase(), value: entity(a[2] ?? a[3] ?? a[4] ?? ''), start: attrStart + a.index });
    }
    const attr = name => attrs.find(a => a.name === name)?.value;
    const selector = tag + (attr('id') ? '#' + attr('id') : attr('class') ? '.' + attr('class').trim().split(/\s+/).join('.') : '');
    for (const a of attrs) {
      if (a.name === 'style') inline.push({ ...a, selector: selector + ' [style]', svg: !!svg });
      if (svg && /^(fill|stroke|stop-color|flood-color|lighting-color)$/.test(a.name)) svgColors.push(a);
    }
    if (tag === 'link' && /\bstylesheet\b/i.test(attr('rel') ?? '')) links.push({ start: i, href: attr('href') });
    if (tag === 'style' || tag === 'script' || tag === 'textarea' || tag === 'title') {
      const close = new RegExp(`</${tag}\\s*>`, 'ig'); close.lastIndex = end + 1;
      const found = close.exec(html);
      if (tag === 'style') styles.push({ css: html.slice(end + 1, found?.index ?? html.length), start: end + 1 });
      if (tag === 'script') scripts.push(html.slice(end + 1, found?.index ?? html.length));
      i = found ? close.lastIndex : html.length;
    } else { if (tag === 'svg' && html[end - 1] === '/') svg--; i = end + 1; }
  }
  return { styles, inline, svgColors, links, scripts };
}

export function themeRange(html, parts = htmlParts(html)) {
  const first = parts.styles[0];
  if (!first) throw new Error('no first <style> with tokens:start / tokens:end markers');
  const comments = [];
  maskCss(first.css, false, comments);
  const starts = comments.filter(c => START.test(c.text)), ends = comments.filter(c => END.test(c.text));
  if (starts.length !== 1 || ends.length !== 1 || starts[0].index >= ends[0].index) {
    throw new Error('first <style> must contain exactly one ordered tokens:start / tokens:end pair');
  }
  return { start: first.start + starts[0].index + starts[0].text.length, end: first.start + ends[0].index,
    prefix: first.css.slice(0, starts[0].index), marker: first.start + starts[0].index };
}

function declarations(css, offset, selector = '', inline = false) {
  const out = [];
  function walk(from, end, scope, ignored = false) {
    let pos = from;
    while (pos < end) {
      const stop = delimiter(css, pos, end, ';{}');
      const head = uncomment(css.slice(pos, stop)).trim();
      if (css[stop] === '{') {
        // Match this block, including nested selectors and conditional rules.
        let close = stop + 1, depth = 1;
        while (close < end && depth) {
          close = delimiter(css, close, end, '{}');
          if (css[close] === '{') depth++; else if (css[close] === '}') depth--;
          if (depth) close++;
        }
        walk(stop + 1, close, scope ? `${scope} > ${head}` : head,
          ignored || /^@(?:font-face|(?:-\w+-)?keyframes)\b/i.test(head));
        pos = close + 1;
      } else {
        const colon = delimiter(css, pos, stop, ':');
        const prop = uncomment(css.slice(pos, colon)).trim();
        if (colon < stop && /^(?:--[\w-]+|[a-z-]+)$/i.test(prop)) {
          const leading = uncomment(css.slice(pos, colon)).search(/\S/);
          out.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value: css.slice(colon + 1, stop).trim(),
            start: offset + pos + Math.max(0, leading), selector: scope || (inline ? '[style]' : '(stylesheet)'), ignored });
        }
        pos = stop + 1;
      }
    }
  }
  walk(0, css.length, selector);
  return out;
}

const COLOR_NAMES = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));
const COLOR_PROPERTY = /^(?:color|background(?:-.+)?|border(?:-.+)?|outline(?:-.+)?|(?:box|text)-shadow|fill|stroke|stop-color|flood-color|lighting-color|caret-color|accent-color|column-rule(?:-.+)?|text-decoration(?:-.+)?|scrollbar-color|filter)$/;
const STYLE_PROPERTY = /^(?:font-family|font-size|border(?:-(?:top|bottom)-(?:left|right))?-radius|box-shadow)$/;

function colorLiterals(value) {
  const cleaned = uncomment(value).replace(/url\((?:[^()"']|"[^"]*"|'[^']*')*\)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gi, ' ');
  const found = [];
  for (const m of cleaned.matchAll(/#[\da-f]{3,8}\b|[-\w]+/gi)) {
    const word = m[0].toLowerCase(), rest = cleaned.slice(m.index + word.length);
    if (word[0] === '#' || COLOR_NAMES.has(word)) found.push(word);
    else if (/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/.test(word) && /^\s*\(/.test(rest)) {
      const open = cleaned.indexOf('(', m.index);
      let depth = 1, end = open + 1;
      while (end < cleaned.length && depth) { if (cleaned[end] === '(') depth++; if (cleaned[end] === ')') depth--; end++; }
      if (!refs(cleaned.slice(open, end)).length) found.push(word + '(…)');
    }
  }
  return found;
}

// Token-bearing functions (var/calc/clamp/color-mix/relative colors) may derive
// values. Standalone literal fragments alongside them still bypass the theme.
function tokenExpression(value) {
  let rest = uncomment(value).replace(/!important\s*$/i, '');
  for (let i = 0; i < rest.length;) {
    const m = rest.slice(i).match(/^[\w-]+\(/);
    if (!m) { i++; continue; }
    const from = i, open = i + m[0].length - 1;
    let depth = 1, end = open + 1;
    while (end < rest.length && depth) { if (rest[end] === '(') depth++; if (rest[end] === ')') depth--; end++; }
    if (refs(rest.slice(from, end)).length) { rest = rest.slice(0, from) + ' '.repeat(end - from) + rest.slice(end); i = end; }
    else i = end;
  }
  return !rest.replace(/\b(?:inherit|initial|unset|revert|revert-layer|none|normal|transparent|currentColor)\b|\b0(?:\.0+)?(?:px|rem|em|%)?\b|[\s,/]/gi, '').trim();
}

export function inspectHtml(html) {
  const parts = htmlParts(html), warnings = [];
  const warn = (code, message, start = 0, selector = '') => warnings.push({ code, message, line: lineAt(html, start), selector });
  let theme;
  try {
    theme = themeRange(html, parts);
    if (theme.prefix.trim()) warn('theme-position', 'theme must begin the first <style>', theme.marker);
  } catch (err) { warn('theme-markers', err.message); }
  const decls = parts.styles.flatMap(s => declarations(s.css, s.start));
  for (const s of parts.inline) decls.push(...declarations(s.value, s.start, s.selector, true).map(d => ({ ...d, start: s.start, svg: s.svg })));
  const definitions = new Map(), used = new Set(), decorative = new Set();
  for (const d of decls) {
    if (d.prop.startsWith('--') && !definitions.has(d.prop)) definitions.set(d.prop, d);
    const uses = refs(d.value);
    uses.forEach(name => used.add(name));
    if (STYLE_PROPERTY.test(d.prop) || COLOR_PROPERTY.test(d.prop)) uses.forEach(name => decorative.add(name));
  }
  for (const a of parts.svgColors) for (const name of refs(a.value)) {
    used.add(name);
    if (!definitions.has(name)) warn('undefined-token', `${name} is not declared in this HTML`, a.start, 'svg [' + a.name + ']');
  }
  // Scripts may set tokens by name, including built names such as `--flora-${c}`.
  for (const js of parts.scripts) {
    for (const m of js.matchAll(/--[\w-]+/g)) {
      if (/\$\{/.test(js.slice(m.index + m[0].length, m.index + m[0].length + 2))) {
        for (const name of definitions.keys()) if (name.startsWith(m[0])) used.add(name);
      } else used.add(m[0]);
    }
  }
  // Follow local aliases, including forward references, without treating every
  // geometric custom property (such as --columns: 3) as a design value.
  for (let previous = -1; previous !== decorative.size;) {
    previous = decorative.size;
    for (const d of decls) if (decorative.has(d.prop)) refs(d.value).forEach(name => decorative.add(name));
  }
  let svgCount = parts.svgColors.reduce((sum, a) => sum + colorLiterals(a.value).length, 0);
  for (const d of decls) {
    if (d.ignored) continue;
    for (const name of new Set(refs(d.value))) if (!definitions.has(name)) warn('undefined-token', `${name} is not declared in this HTML`, d.start, d.selector);
    if (theme && d.start >= theme.start && d.start < theme.end) continue;
    const colors = COLOR_PROPERTY.test(d.prop) || d.prop.startsWith('--') ? colorLiterals(d.value) : [];
    if (d.svg) svgCount += colors.length;
    else if (colors.length) warn('literal', `${d.prop}: literal color ${[...new Set(colors)].join(', ')}`, d.start, d.selector);
    if ((STYLE_PROPERTY.test(d.prop) || decorative.has(d.prop)) && !tokenExpression(d.value) && !(colors.length && !d.svg)) {
      warn('literal', `${d.prop}: decorative value outside the theme (${d.value})`, d.start, d.selector);
    }
    if (/^font$/.test(d.prop) && !tokenExpression(d.value)) warn('literal', 'font shorthand contains values outside the theme', d.start, d.selector);
  }
  // Alias cycles make every token in the chain invalid at computed-value time.
  const state = new Map();
  const visit = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') { const d = definitions.get(name); warn('token-cycle', `alias cycle ${[...trail.slice(trail.indexOf(name)), name].join(' → ')}`, d.start, d.selector); return; }
    state.set(name, 'open');
    for (const ref of refs(definitions.get(name)?.value ?? '')) if (definitions.has(ref)) visit(ref, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of definitions.keys()) visit(name, []);
  // A full system scale legitimately keeps steps a page does not use: one line.
  const unused = [...definitions].filter(([name]) => !used.has(name));
  if (unused.length) warn('unused-token', `${unused.length} token(s) declared but never referenced by var(): ${unused.slice(0, 40).map(([name]) => name).join(', ')}${unused.length > 40 ? `, … ${unused.length - 40} more` : ''}`, unused[0][1].start, unused[0][1].selector);
  if (svgCount) warn('svg-colors', `${svgCount} literal color occurrence(s) in SVG illustrations; review as one group`, parts.svgColors[0]?.start ?? 0, 'svg');
  for (const link of parts.links) warn('external-css', `linked CSS is not statically inspected: ${link.href ?? '(no href)'}`, link.start);
  const registry = theme ? decls.filter(d => d.start >= theme.start && d.start < theme.end && d.prop.startsWith('--') && /(^|[\s>,]):root\b/.test(d.selector)) : [];
  if (theme && !registry.length) warn('theme-registry', 'no :root token registry between the theme markers', theme.start);
  const tokens = [...new Set(registry.map(d => d.prop))]
    .filter(name => used.has(name) && /^(?:--accent|--fg|--bg|--font-display|--text-[\w-]+|--space-[\w-]+|--radius-[\w-]+)$/.test(name));
  return { warnings, tokens };
}

// Serialized into the page, so keep this function self-contained.
async function mutateTheme(tokens) {
  const root = document.documentElement, original = root.getAttribute('style');
  const freeze = document.createElement('style');
  freeze.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}';
  document.head.append(freeze);
  const probe = document.createElement('span');
  probe.style.cssText = 'position:fixed;left:-10000px;visibility:hidden;pointer-events:none';
  root.append(probe);
  const elements = [...document.querySelectorAll('body,body *')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  const label = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.getAttribute('data-od-id') ? `[data-od-id="${el.getAttribute('data-od-id')}"]` : el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
  const results = [];
  const restore = () => original === null ? root.removeAttribute('style') : root.setAttribute('style', original);
  try {
    for (const token of tokens) {
      const kind = token === '--font-display' ? 'font' : token.startsWith('--text-') ? 'text' : token.startsWith('--space-') ? 'space' : token.startsWith('--radius-') ? 'radius' : 'color';
      const properties = kind === 'font' ? ['font-family'] : kind === 'text' ? ['font-size', 'line-height'] : kind === 'radius'
        ? ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius']
        : kind === 'space' ? ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'row-gap', 'column-gap', 'width', 'height', 'top', 'right', 'bottom', 'left']
        : ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', 'fill', 'stroke', 'box-shadow', 'text-shadow', 'background-image'];
      const sampleProperty = { font: 'font-family', text: 'font-size', space: 'padding-top', radius: 'border-top-left-radius', color: 'color' }[kind];
      probe.style.setProperty(sampleProperty, `var(${token})`);
      const raw = getComputedStyle(root).getPropertyValue(token).trim();
      const sample = getComputedStyle(probe).getPropertyValue(sampleProperty);
      const snapshot = () => elements.map(el => { const style = getComputedStyle(el); return properties.map(p => style.getPropertyValue(p)); });
      const before = snapshot();
      let control = kind === 'font' ? (sample === 'monospace' ? 'serif' : 'monospace') : kind === 'color'
        ? (sample === 'rgb(17, 239, 113)' ? 'rgb(231, 19, 193)' : 'rgb(17, 239, 113)') : `${Math.max(1, parseFloat(sample) || 0) * 1.37 + 13}px`;
      let after, restored, restoration;
      try {
        root.style.setProperty(token, control, 'important');
        after = snapshot();
      } finally {
        restore();
        restoration = { original, actual: root.getAttribute('style'), raw, computed: getComputedStyle(root).getPropertyValue(token).trim() };
        // CSSOM may serialize a removed empty style attribute as style="".
        restored = (restoration.actual === original || original === null && restoration.actual === '') && restoration.computed === raw;
      }
      const changed = [], duplicates = [];
      for (let i = 0; i < elements.length; i++) {
        if (before[i].some((v, j) => v !== after[i][j])) changed.push(label(elements[i]));
        // Natural box dimensions can coincide with a spacing step by accident;
        // they remain observable effects, but are not duplicate-value evidence.
        const same = properties.filter((p, j) => (kind !== 'space' || /^(padding|margin|row-gap|column-gap)/.test(p))
          && (kind !== 'text' || p === 'font-size') && before[i][j] === sample && after[i][j] === sample);
        // A zero radius/space matches almost every default box; it is not useful
        // evidence of copying a literal. Other matches remain only candidates.
        if (same.length && raw && !/^(?:0|0px)$/.test(sample)) duplicates.push({ element: label(elements[i]), properties: same });
      }
      results.push({ token, changed: changed.length, examples: changed.slice(0, 5), duplicates: duplicates.slice(0, 8), duplicateCount: duplicates.length, restored, ...(!restored && { restoration }) });
    }
    return { results, elements: elements.length, viewport: innerWidth };
  } finally { restore(); probe.remove(); freeze.remove(); }
}

function findBrowser() {
  // An explicit path is authoritative, also allowing a reproducible no-browser test.
  if (process.env.CHROME_PATH) return existsSync(process.env.CHROME_PATH) ? process.env.CHROME_PATH : null;
  for (const app of ['Google Chrome', 'Chromium', 'Microsoft Edge', 'Brave Browser', 'Google Chrome Canary']) {
    for (const path of [`/Applications/${app}.app/Contents/MacOS/${app}`, `${process.env.HOME}/Applications/${app}.app/Contents/MacOS/${app}`]) if (existsSync(path)) return path;
  }
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable', 'brave-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  }
  return null;
}

async function browserCheck(file, widths, tokens, report) {
  const browser = findBrowser();
  if (!browser || typeof WebSocket !== 'function') return false;
  const profile = mkdtempSync(join(tmpdir(), 'craft-design-tokens-'));
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let socket, seq = 0;
  const pending = new Map(), listeners = new Set();
  const timed = (promise, ms, message) => {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]).finally(() => clearTimeout(timer));
  };
  try {
    const endpoint = await timed(new Promise((ok, ko) => {
      let log = '';
      chrome.stderr.on('data', chunk => { log = (log + chunk).slice(-16000); const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
      chrome.once('error', ko);
      chrome.once('exit', code => ko(new Error(`browser exited (${code}): ${log.trim().split('\n').slice(-2).join(' ')}`)));
    }), 15000, 'browser startup timed out');
    socket = new WebSocket(endpoint);
    await timed(new Promise((ok, ko) => { socket.onopen = ok; socket.onerror = () => ko(new Error('cannot connect to browser')); }), 10000, 'browser connection timed out');
    socket.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (pending.has(msg.id)) { const { ok, ko } = pending.get(msg.id); pending.delete(msg.id); msg.error ? ko(new Error(msg.error.message)) : ok(msg.result); }
      else for (const listener of listeners) listener(msg);
    };
    socket.onclose = () => { for (const { ko } of pending.values()) ko(new Error('browser connection closed')); pending.clear(); };
    const send = (method, params = {}, sessionId) => {
      const id = ++seq;
      return timed(new Promise((ok, ko) => { pending.set(id, { ok, ko }); socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) })); }), 60000, `${method} timed out`).finally(() => pending.delete(id));
    };
    for (const width of widths) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const s = (method, params) => send(method, params, sessionId);
      try {
        await s('Page.enable');
        await s('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 600 });
        let listener;
        const loaded = new Promise(ok => { listener = msg => { if (msg.method === 'Page.loadEventFired' && msg.sessionId === sessionId) ok(); }; listeners.add(listener); });
        try {
          const nav = await s('Page.navigate', { url: pathToFileURL(resolve(file)).href });
          if (nav.errorText) throw new Error(nav.errorText);
          await timed(loaded, 20000, 'page load timed out');
        } finally { listeners.delete(listener); }
        await s('Runtime.evaluate', { expression: 'Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,5000))]).then(()=>true)', awaitPromise: true });
        const result = await s('Runtime.evaluate', { expression: `(${mutateTheme.toString()})(${JSON.stringify(tokens)})`, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
        report(width, result.result.value);
      } finally { await send('Target.closeTarget', { targetId }); }
    }
    return true;
  } finally {
    socket?.close();
    const exited = new Promise(ok => { if (chrome.exitCode !== null || chrome.signalCode) ok(); else chrome.once('exit', ok); });
    chrome.kill('SIGKILL');
    await timed(exited, 3000, 'browser cleanup timed out').catch(() => {});
    rmSync(profile, { recursive: true, force: true });
  }
}

// ---- import: token JSON → theme CSS ----------------------------------------
// Contract (also in charter.md, "One brand or product, one theme"):
// - DTCG: a token is an object with $value; $type inherits down groups; $root
//   is the group's own token; $description/$extensions/$deprecated are skipped;
//   $extensions["craft-design"].name sets the custom property name; $ref and
//   $extends are rejected.
// - Style Dictionary: a token is an object with value; type, comment and other
//   keys beside it are metadata; token: "--name" sets the name.
// - Plain JSON: every string or number is a token, every object a group, except
//   {light, dark} with scalar values (a themed token), {px, rem} with numbers
//   (px wins) and a top-level {light, dark} of groups (a file split by mode).
// - A key token: "--prefix" on a group prefixes its children.
// Aliases {a.b.c} become var(); arithmetic becomes calc(); colors, composites
// and arithmetic are rendered to valid CSS or rejected with the token path.
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const dict = () => Object.create(null);
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const NAME = /^--[\p{L}\p{N}_-]+$/u;
const kebab = s => String(s).replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1-$2').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const quoteFamily = f => /[^\w-]/.test(f) && !/^["']|^var\(/.test(f) ? `"${f}"` : f;
const WEIGHTS = { thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300, normal: 400, regular: 400, book: 400, medium: 500, 'semi-bold': 600, 'demi-bold': 600, bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900, 'extra-black': 950, 'ultra-black': 950 };
const COLOR_SPACES = { srgb: 'rgb', hsl: 'hsl', hwb: 'hwb', lab: 'lab', lch: 'lch', oklab: 'oklab', oklch: 'oklch', 'srgb-linear': 'color', 'display-p3': 'color', 'a98-rgb': 'color', 'prophoto-rgb': 'color', rec2020: 'color', 'xyz-d65': 'color', 'xyz-d50': 'color', xyz: 'color' };
const DIMENSIONAL = new Set(['dimension', 'duration']);
const sameKeys = (node, keys) => { const own = Object.keys(node); return own.length > 0 && own.every(k => keys.includes(k)); };
const scalar = v => typeof v === 'string' || typeof v === 'number';
const round = n => Math.round(n * 10000) / 10000;

// Deep copy into prototype-free objects; inputs stay untouched.
function clone(value, where) {
  if (Array.isArray(value)) return value.map((v, i) => clone(v, `${where}[${i}]`));
  if (!isObject(value)) return value;
  const out = dict();
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) throw new Error(`${where || 'root'}: key "${key}" is not allowed in token JSON`);
    out[key] = clone(value[key], where ? `${where}.${key}` : key);
  }
  return out;
}
function merge(target, source, file, where, warn) {
  for (const key of Object.keys(source)) {
    const path = where ? `${where}.${key}` : key;
    if (isObject(source[key]) && isObject(target[key])) merge(target[key], source[key], file, path, warn);
    else { if (key in target) warn(`${path}: redefined by ${file ?? 'a later file'} (the later file wins)`); target[key] = source[key]; }
  }
  return target;
}

// Arithmetic: numbers with units, var(), + - * / and parentheses. Binary
// operators are either spaced on both sides or on neither; "a -b" stays a list.
// A lone "/" without an alias is a literal (12px/1.5, 1/-1), not a division.
function arithmetic(text) {
  const out = []; let i = 0;
  const operand = () => out.length > 0 && !/^[-+*/(]$/.test(out[out.length - 1]);
  const number = /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?(?:[a-z]+|%)?/i;
  while (i < text.length) {
    const c = text[i], rest = text.slice(i);
    let m;
    if (/\s/.test(c)) { i++; continue; }
    if ((m = rest.match(/^var\(--[^\s()]+\)/))) { if (operand()) return null; out.push(m[0]); i += m[0].length; continue; }
    if (c === '(') { if (operand()) return null; out.push(c); i++; continue; }
    if (c === ')') { if (!operand()) return null; out.push(c); i++; continue; }
    if ('+-*/'.includes(c)) {
      const before = i > 0 && /\s/.test(text[i - 1]), after = /\s/.test(text[i + 1] ?? ' ');
      if (operand() && before === after) { out.push(c); i++; continue; }
      if (operand() || !(m = rest.match(number))) return null;
      out.push(m[0]); i += m[0].length; continue;
    }
    if ((m = rest.match(number))) { if (operand()) return null; out.push(m[0]); i += m[0].length; continue; }
    return null;
  }
  if (!operand()) return null;
  let depth = 0;
  for (const t of out) { if (t === '(') depth++; else if (t === ')' && --depth < 0) return null; }
  if (depth) return null;
  const operators = out.filter(t => /^[-+*/]$/.test(t));
  if (!operators.length || operators.every(t => t === '/') && !out.some(t => t.startsWith('var('))) return null;
  return out.map(t => /^[-+*/]$/.test(t) ? ` ${t} ` : t).join('');
}

// Collect leaves: { path, name, type, light, dark } with raw JSON values.
function flatten(node, name, path, type, out, ctx) {
  const where = path || 'root';
  if (!isObject(node)) {
    if (!scalar(node)) { ctx.error(`${where}: ${node === null ? 'null' : Array.isArray(node) ? 'an array without $type' : typeof node} is not a token value`); return; }
    out.push({ path, name, type, light: node }); return;
  }
  const has = k => Object.hasOwn(node, k);
  const leaf = (raw, own, t) => {
    if (isObject(raw) && sameKeys(raw, ['light', 'dark'])) out.push({ path, name: own, type: t, light: raw.light, dark: raw.dark });
    else out.push({ path, name: own, type: t, light: raw });
  };
  if (has('$value')) {
    const t = typeof node.$type === 'string' ? node.$type : type;
    const ext = node.$extensions?.['craft-design']?.name;
    if (has('$extends') || has('$ref')) ctx.error(`${where}: $extends and $ref are not supported`);
    leaf(node.$value, typeof ext === 'string' ? ext : name, t); return;
  }
  if (has('value')) {
    if (has('unit') && sameKeys(node, ['value', 'unit']) && typeof node.value === 'number') { out.push({ path, name, type: type ?? 'dimension', light: `${node.value}${node.unit}` }); return; }
    const t = typeof node.type === 'string' ? node.type : type;
    leaf(node.value, typeof node.token === 'string' ? node.token : name, t); return;
  }
  if (sameKeys(node, ['light', 'dark']) && Object.values(node).every(scalar)) { out.push({ path, name, type, light: node.light, dark: node.dark }); return; }
  if (sameKeys(node, ['px', 'rem']) && Object.values(node).every(v => typeof v === 'number')) { out.push({ path, name, type: type ?? 'dimension', light: has('px') ? `${node.px}px` : `${node.rem}rem` }); return; }
  const t = typeof node.$type === 'string' ? node.$type : type;
  const own = typeof node.token === 'string' && node.token.startsWith('--') ? node.token : name;
  for (const key of Object.keys(node)) {
    const child = node[key], childPath = path ? `${path}.${key}` : key;
    if (key === '$root') { flatten(child, own, path, t, out, ctx); continue; }
    if (key === '$extends') { ctx.error(`${childPath}: $extends is not supported`); continue; }
    if (/^\$(?:type|description|extensions|deprecated|schema)$/.test(key)) continue;
    if (key.startsWith('$')) { ctx.warn(`${childPath}: unknown $-key ignored`); continue; }
    if (key === 'token' && own !== name) continue;
    const part = kebab(key);
    if (!part) { ctx.error(`${childPath}: key cannot become a CSS name`); continue; }
    flatten(child, own === '--' ? '--' + part : `${own}-${part}`, childPath, t, out, ctx);
  }
}

// Render one raw value to CSS text; aliases become var(), formulas calc().
function render(raw, type, where, ctx, emit) {
  const text = (value, t = type, at = where) => render(value, t, at, ctx, emit);
  if (raw == null || typeof raw === 'boolean') { ctx.error(`${where}: ${raw === undefined ? 'missing' : String(raw)} is not a token value`); return null; }
  if (typeof raw === 'number') {
    if (DIMENSIONAL.has(type) && raw !== 0) { ctx.error(`${where}: ${type} needs a unit (${raw})`); return null; }
    return String(raw);
  }
  if (typeof raw === 'string') {
    if (type === 'fontWeight' && WEIGHTS[raw.toLowerCase()] != null) return String(WEIGHTS[raw.toLowerCase()]);
    if (DIMENSIONAL.has(type) && /^[-+]?\d*\.?\d+$/.test(raw) && Number(raw) !== 0) { ctx.error(`${where}: ${type} needs a unit (${raw})`); return null; }
    let failed = false;
    const substituted = raw.replace(/\{([^{}]+)\}/g, (all, ref) => {
      const path = ref.trim().replace(/\.\$?value$/, ''), name = ctx.names.get(path);
      if (!name) { failed = true; ctx.error(`${where}: unresolved alias {${ref}}`); return all; }
      return `var(${name})`;
    }).trim();
    if (failed) return null;
    if (/[;}]/.test(substituted)) { ctx.error(`${where}: value contains ; or } (${substituted.slice(0, 60)})`); return null; }
    if (/^calc\(/.test(substituted)) return substituted;
    const formula = arithmetic(substituted);
    return formula ? `calc(${formula})` : substituted;
  }
  if (Array.isArray(raw)) {
    if (type === 'cubicBezier') {
      if (raw.length === 4 && raw.every(n => typeof n === 'number')) return `cubic-bezier(${raw.join(', ')})`;
      ctx.error(`${where}: cubicBezier needs four numbers`); return null;
    }
    if (type === 'shadow') { const parts = raw.map((v, i) => text(v, 'shadow', `${where}[${i}]`)); return parts.includes(null) ? null : parts.join(', '); }
    if (type === 'gradient') {
      const stops = raw.map((stop, i) => isObject(stop) && 'color' in stop && typeof stop.position === 'number' ? [text(stop.color, 'color', `${where}[${i}].color`), `${round(stop.position * 100)}%`] : null);
      if (stops.some(s => !s)) { ctx.error(`${where}: gradient stops need color and position`); return null; }
      return stops.some(([c]) => c === null) ? null : `linear-gradient(${stops.map(s => s.join(' ')).join(', ')})`;
    }
    if (!raw.every(scalar)) { ctx.error(`${where}: array of ${type ?? 'unknown'} values is not supported`); return null; }
    const parts = raw.map((v, i) => text(v, type === 'fontFamily' ? 'fontFamily' : type, `${where}[${i}]`));
    return parts.includes(null) ? null : (type === 'fontFamily' ? parts.map(quoteFamily) : parts).join(', ');
  }
  if ('$ref' in raw) { ctx.error(`${where}: $ref is not supported`); return null; }
  if (sameKeys(raw, ['px', 'rem']) && Object.values(raw).every(v => typeof v === 'number')) return Object.hasOwn(raw, 'px') ? `${raw.px}px` : `${raw.rem}rem`;
  if (type === 'color' || 'colorSpace' in raw || 'hex' in raw) {
    const { colorSpace, components, alpha, hex } = raw;
    if (typeof hex === 'string' && !Array.isArray(components)) return alpha != null && alpha !== 1 ? `color(from ${hex} srgb r g b / ${alpha})` : hex;
    const fn = COLOR_SPACES[colorSpace];
    if (!fn || !Array.isArray(components) || components.length !== 3 || !components.every(c => typeof c === 'number' || c === 'none')) {
      ctx.error(`${where}: color needs colorSpace (${Object.keys(COLOR_SPACES).join(', ')}) and three components`); return null;
    }
    const a = alpha != null && alpha !== 1 ? ` / ${alpha}` : '';
    const c = components.map(v => typeof v === 'number' ? round(v) : v);
    if (fn === 'rgb') { if (typeof hex === 'string' && !a) return hex; return `rgb(${c.map(v => typeof v === 'number' ? round(v * 255) : v).join(' ')}${a})`; }
    if (fn === 'hsl' || fn === 'hwb') return `${fn}(${c[0]} ${c[1]}% ${c[2]}%${a})`;
    if (fn === 'color') return `color(${colorSpace} ${c.join(' ')}${a})`;
    return `${fn}(${c.join(' ')}${a})`;
  }
  if ('value' in raw && 'unit' in raw && sameKeys(raw, ['value', 'unit'])) return typeof raw.value === 'number' ? `${raw.value}${raw.unit}` : text(raw.value, type);
  const field = (key, t, required = true) => {
    if (!(key in raw)) { if (required) { ctx.error(`${where}: ${type} needs ${key}`); return null; } return ''; }
    return text(raw[key], t, `${where}.${key}`);
  };
  const join = parts => parts.includes(null) ? null : parts.filter(Boolean).join(' ');
  if (type === 'shadow' || 'offsetX' in raw && 'offsetY' in raw) {
    return join([raw.inset ? 'inset' : '', field('offsetX', 'dimension'), field('offsetY', 'dimension'), field('blur', 'dimension', false), field('spread', 'dimension', false), field('color', 'color')]);
  }
  if (type === 'border') return join([field('width', 'dimension'), field('style', 'strokeStyle'), field('color', 'color')]);
  if (type === 'transition') return join([field('duration', 'duration'), field('timingFunction', 'cubicBezier'), field('delay', 'duration', false)]);
  if (type === 'typography') {
    // The token is the `font` shorthand; letter-spacing cannot join it and
    // becomes a sibling token.
    const family = field('fontFamily', 'fontFamily'), size = field('fontSize', 'dimension');
    const weight = field('fontWeight', 'fontWeight', false), leading = field('lineHeight', 'number', false);
    const spacing = field('letterSpacing', 'dimension', false);
    if ([family, size, weight, leading, spacing].includes(null)) return null;
    if (spacing) emit('-letter-spacing', spacing);
    return `${weight ? weight + ' ' : ''}${size}${leading ? '/' + leading : ''} ${family}`;
  }
  ctx.error(`${where}: unsupported ${type ? type + ' ' : ''}value (an object; supported composites: color, dimension, shadow, border, transition, typography, gradient)`);
  return null;
}

export function importTokens({ sources, dark = [], map = null, prefix = '', darkSelector = '[data-theme=dark]', mappedOnly = false, command = '' }) {
  const warnings = [], errors = [];
  const ctx = { names: new Map(), warn: m => warnings.push(m), error: m => errors.push(m) };
  if (!/^[^{};]+$/.test(darkSelector)) throw new Error(`dark selector "${darkSelector}" is not a selector`);
  const root = prefix ? `--${kebab(prefix)}` : '--';
  if (prefix && !NAME.test(root)) throw new Error(`prefix "${prefix}" cannot become a CSS name`);
  // A file split by mode contributes its light groups to the sources and its
  // dark groups to the dark set.
  const split = (set, into, darkInto) => set.forEach(s => {
    const json = clone(s.json, '');
    if (sameKeys(json, ['light', 'dark']) && Object.values(json).every(isObject)) {
      if (json.light) into.push({ file: s.file, json: json.light });
      if (json.dark) darkInto.push({ file: s.file, json: json.dark });
    } else into.push({ file: s.file, json });
  });
  const lightSet = [], darkSet = [];
  split(sources, lightSet, darkSet); split(dark, darkSet, darkSet);
  const tree = (set, label) => set.reduce((acc, s) => merge(acc, s.json, s.file && `${s.file}${label}`, '', ctx.warn), dict());
  const leaves = [], overlay = [];
  flatten(tree(lightSet, ''), root, '', undefined, leaves, ctx);
  flatten(tree(darkSet, ' (dark)'), root, '', undefined, overlay, ctx);
  // Names come from the light set only; a dark value reassigns by path.
  const owners = new Map();
  for (const leaf of leaves) {
    if (!NAME.test(leaf.name)) { ctx.error(`${leaf.path || 'root'}: "${leaf.name}" is not a custom property name`); continue; }
    const owner = owners.get(leaf.name);
    if (owner !== undefined && owner !== leaf.path) ctx.error(`${leaf.path} and ${owner} both become ${leaf.name}; rename one or set an explicit name`);
    owners.set(leaf.name, leaf.path);
    ctx.names.set(leaf.path, leaf.name);
  }
  for (const leaf of overlay) {
    const name = ctx.names.get(leaf.path);
    if (!name) { ctx.error(`${leaf.path || 'root'} (dark): declared only in the dark set; give it a light value too`); continue; }
    leaf.name = name;
  }
  const light = new Map(), night = new Map();
  const put = (scope, name, raw, where, type) => {
    if (raw === undefined) return;
    const css = render(raw, type, where, ctx, (suffix, value) => scope.set(name + suffix, value));
    if (css !== null) scope.set(name, css);
  };
  for (const leaf of leaves) { put(light, leaf.name, leaf.light, leaf.path || 'root', leaf.type); put(night, leaf.name, leaf.dark, `${leaf.path} (dark)`, leaf.type); }
  for (const leaf of overlay) put(night, leaf.name, leaf.dark ?? leaf.light, `${leaf.path} (dark)`, leaf.type);
  if (map) {
    if (!isObject(map)) throw new Error('map must be an object of { "--name": value }');
    for (const name of Object.keys(map)) {
      if (!NAME.test(name)) { ctx.error(`map: "${name}" is not a custom property name`); continue; }
      const spec = map[name], themed = isObject(spec) && sameKeys(spec, ['light', 'dark']);
      const value = themed ? spec.light : spec, darkValue = themed ? spec.dark : undefined;
      const own = typeof value === 'string' && ctx.names.get(value.trim().replace(/^\{|\}$/g, ''));
      if (own === name) { if (darkValue !== undefined) put(night, name, darkValue, `map ${name} (dark)`); continue; } // identity: already named so
      if (light.has(name) && value !== undefined) ctx.warn(`map ${name} replaces the source token of the same name`);
      put(light, name, value, `map ${name}`); put(night, name, darkValue, `map ${name} (dark)`);
    }
  }
  // Reference graph: every var() must resolve, no cycles in either scope.
  const check = (scope, label, fallback) => {
    const expr = name => scope.get(name) ?? fallback?.get(name);
    const state = new Map();
    const visit = (name, trail) => {
      if (state.get(name) === 'done') return;
      if (state.get(name) === 'open') { ctx.error(`${label}: alias cycle ${[...trail.slice(trail.indexOf(name)), name].join(' → ')}`); return; }
      state.set(name, 'open');
      for (const ref of refs(expr(name) ?? '')) {
        if (expr(ref) === undefined) ctx.warn(`${label}: ${name} uses ${ref}, which this import does not declare`);
        else visit(ref, [...trail, name]);
      }
      state.set(name, 'done');
    };
    for (const name of scope.keys()) visit(name, []);
  };
  check(light, ':root'); check(night, darkSelector, light);
  if (errors.length) throw new Error(`${errors.length} error(s), nothing written:\n  ${errors.join('\n  ')}`);
  // Custom properties resolve where they are declared, so a dark scope on an
  // inner element needs every token whose chain reaches a dark value.
  for (let grew = true; grew;) {
    grew = false;
    for (const [name, css] of light) if (!night.has(name) && refs(css).some(ref => night.has(ref))) { night.set(name, css); grew = true; }
  }
  if (mappedOnly && map) {
    const keep = new Set();
    const add = name => { if (keep.has(name)) return; keep.add(name); for (const ref of refs(light.get(name) ?? '')) add(ref); for (const ref of refs(night.get(name) ?? '')) add(ref); };
    Object.keys(map).forEach(add);
    for (const name of [...light.keys()]) if (!keep.has(name)) light.delete(name);
    for (const name of [...night.keys()]) if (!keep.has(name)) night.delete(name);
  }
  const ordered = scope => [...light.keys(), ...[...scope.keys()].filter(n => !light.has(n))].filter(n => scope.has(n));
  const block = (selector, scope) => scope.size ? `${selector} {\n${ordered(scope).map(n => `  ${n}: ${scope.get(n)};`).join('\n')}\n}\n` : '';
  const files = [...sources, ...dark].map(s => s.file).filter(Boolean).join(', ');
  const css = `/* Imported by tokens.mjs import${command ? ': ' + command : files ? ' from ' + files : ''}. Edit the sources or the map and re-import; do not edit by hand. */\n`
    + block(':root', light) + block(darkSelector, night);
  return { css, warnings, count: light.size, darkCount: night.size };
}

export const REGISTRY = ['--bg', '--surface', '--fg', '--fg-2', '--muted', '--border', '--accent', '--accent-on', '--font-display', '--font-body', '--font-mono'];

export async function main(argv) {
  const args = [...argv], command = args.shift();
  const take = (name, fallback) => { const i = args.indexOf(name); if (i < 0) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`missing value for ${name}`); return args.splice(i, 2)[1]; };
  if (command === 'import') {
    const out = take('--out'), darkFiles = take('--dark', ''), mapFile = take('--map'), prefix = take('--prefix', ''), darkSelector = take('--dark-selector', '[data-theme=dark]');
    const mappedIndex = args.indexOf('--mapped-only'), mappedOnly = mappedIndex >= 0;
    if (mappedOnly) args.splice(mappedIndex, 1);
    if (!args.length || args.some(a => a.startsWith('--'))) throw new Error('usage: tokens.mjs import tokens.json… [--dark dark.json[,…]] [--map map.json] [--mapped-only] [--prefix name] [--dark-selector "[data-theme=dark]"] [--out tokens.css]');
    const load = file => { try { const json = JSON.parse(readFileSync(file, 'utf8')); if (!isObject(json)) throw new Error('top level must be an object'); return { file: relative(process.cwd(), file) || file, json }; } catch (err) { throw new Error(`${file}: ${err.message}`); } };
    const sources = args.map(load), dark = darkFiles.split(',').filter(Boolean).map(load), mapSource = mapFile ? load(mapFile) : null;
    const command = ['import', ...sources.map(s => s.file), ...(dark.length ? ['--dark', dark.map(s => s.file).join(',')] : []), ...(mapSource ? ['--map', mapSource.file] : []),
      ...(mappedOnly ? ['--mapped-only'] : []), ...(prefix ? ['--prefix', prefix] : []), ...(darkSelector !== '[data-theme=dark]' ? ['--dark-selector', darkSelector] : [])].join(' ');
    const result = importTokens({ sources, dark, map: mapSource?.json ?? null, prefix, darkSelector, mappedOnly, command });
    for (const w of result.warnings) console.error(`warning: ${w}`);
    if (mapSource) {
      const unbound = REGISTRY.filter(name => !new RegExp(`^  ${name}: `, 'm').test(result.css));
      if (unbound.length) console.error(`note: registry names not bound by the map: ${unbound.join(', ')}`);
    }
    if (!out) { process.stdout.write(result.css); return 0; }
    const target = resolve(out);
    if (/\.html?$/i.test(target)) throw new Error('import writes CSS; use sync to place it into HTML');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, result.css);
    console.log(`imported: ${target} (${result.count} token(s), ${result.darkCount} dark, ${result.warnings.length} warning(s))`);
    return 0;
  }
  if (command === 'extract') {
    const out = take('--out');
    if (args.length !== 1 || args[0].startsWith('--')) throw new Error('usage: tokens.mjs extract file.html [--out tokens.css]');
    const file = resolve(args[0]), html = readFileSync(file, 'utf8'), theme = themeRange(html);
    const target = resolve(out ?? join(dirname(file), 'tokens.css'));
    if (file === target) throw new Error('extract output must differ from the HTML input');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html.slice(theme.start, theme.end));
    console.log(`extracted: ${target}`); return 0;
  }
  if (command === 'sync') {
    if (args.length < 2 || args.some(a => a.startsWith('--'))) throw new Error('usage: tokens.mjs sync tokens.css file.html…');
    const css = readFileSync(args.shift(), 'utf8');
    if (/<\/style\b/i.test(css) || /\/\*\s*tokens:(?:start|end)\s*\*\//.test(css)) throw new Error('tokens.css must contain CSS only, without theme markers or </style>');
    let failed = false;
    for (const file of args) {
      try {
        const html = readFileSync(file, 'utf8'), theme = themeRange(html);
        const next = html.slice(0, theme.start) + css + html.slice(theme.end);
        if (next !== html) { writeFileSync(file, next); console.log(`updated: ${resolve(file)}`); }
        else console.log(`unchanged: ${resolve(file)}`);
      } catch (err) { failed = true; console.error(`not changed: ${file}: ${err.message}`); }
    }
    return failed ? 2 : 0;
  }
  if (command !== 'check') throw new Error('usage: tokens.mjs check|sync|extract|import …');
  const widths = String(take('--width', '1440,390')).split(',').map(Number);
  const strictIndex = args.indexOf('--strict'), strict = strictIndex >= 0;
  if (strict) args.splice(strictIndex, 1);
  if (args.length !== 1 || args[0].startsWith('--') || widths.some(w => !Number.isInteger(w) || w < 1 || w > 10000)) throw new Error('usage: tokens.mjs check file.html [--width 1440,390] [--strict]');
  const file = resolve(args[0]), html = readFileSync(file, 'utf8');
  const { warnings, tokens } = inspectHtml(html);
  let count = 0;
  const warning = (code, message, line, selector) => { count++; console.log(`warning ${code}: ${file}${line ? ':' + line : ''}${selector ? ' [' + selector + ']' : ''}: ${message}`); };
  warnings.forEach(w => warning(w.code, w.message, w.line, w.selector));
  const available = await browserCheck(file, widths, tokens, (width, result) => {
    console.log(`${width}px: inspected ${result.elements} rendered element(s)`);
    if (result.viewport !== width) warning('viewport-mismatch', `${width}px requested, page laid out at ${result.viewport}px; check the viewport meta tag`);
    for (const row of result.results) {
      console.log(`  ${width}px ${row.token}: ${row.changed} element(s) changed; ${row.restored ? 'restored' : 'RESTORATION FAILED'}`);
      if (!row.restored) throw new Error(`could not restore ${row.token}: ${JSON.stringify(row.restoration)}`);
      if (!row.changed) warning('mutation-no-effect', `${width}px ${row.token}: no visible effect; review overrides, hidden components or local themes`);
      if (row.duplicateCount) warning('possible-duplicate', `${width}px ${row.token}: ${row.duplicateCount} element(s) matched the old value but did not follow it: ${row.duplicates.map(d => d.element + ' (' + d.properties.join(', ') + ')').join('; ')}`);
    }
  });
  if (!available) console.log('browser unavailable: static checks only (set CHROME_PATH; Node 22+ required)');
  console.log(`tokens: ${count} warning(s); HTML unchanged`);
  return strict && count ? 1 : available ? 0 : 3;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = await main(process.argv.slice(2)); }
  catch (err) { console.error(`tokens failed: ${err.message}`); process.exitCode = 2; }
}
