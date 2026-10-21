#!/usr/bin/env node
// Dependency-free theme diagnostics. Node 22+, an installed Chromium browser.
// check HTML [--width 1440,390] [--strict] | sync CSS HTML… | extract HTML [--out CSS]
// Exit: 0 completed (warnings allowed), 1 strict warnings, 2 input/runtime error,
// 3 static checks completed but no browser available (strict warnings take priority).
// Static analysis covers embedded styles and style attributes, not external CSS.
// Mutation reports observable computed-style changes, not proof of author intent.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
  // A full system scale legitimately keeps steps a page does not use: one line.
  const unused = [...definitions].filter(([name]) => !used.has(name));
  if (unused.length) warn('unused-token', `${unused.length} token(s) declared but never referenced by var(): ${unused.map(([name]) => name).join(', ')}`, unused[0][1].start, unused[0][1].selector);
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

export async function main(argv) {
  const args = [...argv], command = args.shift();
  const take = (name, fallback) => { const i = args.indexOf(name); if (i < 0) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`missing value for ${name}`); return args.splice(i, 2)[1]; };
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
  if (command !== 'check') throw new Error('usage: tokens.mjs check|sync|extract …');
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
