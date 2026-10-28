#!/usr/bin/env node
// Check the craft-design package: manifests, the single router skill, library
// integrity and a smoke run of the bundled scripts.

import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { importTokens, inspectHtml, themeRange } from '../skills/craft-design/scripts/tokens.mjs';

const plugin = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(plugin, '..');
const skill = join(plugin, 'skills/craft-design');
const library = join(skill, 'library');
const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out); else out.push(path);
  }
  return out;
}

// Read actual screenshot pixels: a successful capture can still omit images or
// crop the footer. Chrome writes 8-bit RGB/RGBA PNGs with standard row filters.
function screenshot(path) {
  const png = readFileSync(path);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(png[24], 8, '8-bit screenshot');
  assert.ok([2, 6].includes(png[25]), 'RGB or RGBA screenshot');
  const channels = png[25] === 6 ? 4 : 3, chunks = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.ok(filter <= 4, 'known PNG row filter');
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const left = x >= channels ? pixels[i - channels] : 0;
      const up = y ? pixels[i - stride] : 0;
      const corner = y && x >= channels ? pixels[i - stride - channels] : 0;
      const p = left + up - corner;
      const paeth = Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - corner)
        ? left : Math.abs(p - up) <= Math.abs(p - corner) ? up : corner;
      const prediction = [0, left, up, Math.floor((left + up) / 2), paeth][filter];
      pixels[i] = (raw[y * (stride + 1) + 1 + x] + prediction) & 255;
    }
  }
  return { width, height, pixel: (x, y) => [...pixels.subarray((y * width + x) * channels, (y * width + x) * channels + 3)] };
}

// Manifests share the repository version and differ only by the Codex suffix.
const claude = json(join(plugin, '.claude-plugin/plugin.json'));
const codex = json(join(plugin, '.codex-plugin/plugin.json'));
const reference = json(join(repo, 'open-design/.claude-plugin/plugin.json'));
assert.equal(claude.name, 'craft-design');
assert.equal(codex.name, 'craft-design');
assert.equal(claude.version, reference.version, 'Claude Code version follows the shared release');
assert.match(codex.version, new RegExp(`^${claude.version.replace(/\./g, '\\.')}\\+codex\\.\\d{14}$`));
assert.equal(codex.skills, './skills/');
assert.ok(codex.interface?.displayName && codex.interface?.defaultPrompt?.length);
const market = json(join(repo, '.claude-plugin/marketplace.json')).plugins.find(p => p.name === 'craft-design');
assert.equal(market?.source, './craft-design');

// Exactly one discoverable skill; library entries are ENTRY.md.
const skills = walk(plugin).filter(p => p.endsWith('/SKILL.md')).map(p => relative(plugin, p));
assert.deepEqual(skills, ['skills/craft-design/SKILL.md'], 'only the router is a skill');
const router = read(join(skill, 'SKILL.md'));
const front = router.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
assert.match(front, /^name: craft-design$/m);
const description = front.match(/^description: "(.*)"$/m)?.[1] ?? '';
assert.ok(description.length > 40 && description.length <= 500, 'router description stays short');
assert.ok(Buffer.byteLength(router, 'utf8') < 8000, 'router body stays small (bytes)');
for (const name of readdirSync(join(skill, 'references'))) {
  const bytes = statSync(join(skill, 'references', name)).size;
  assert.ok(bytes < 26000, `references/${name} fits one read without host truncation (${bytes} bytes)`);
}
for (const ref of new Set(router.match(/<skill>\/[\w./-]+\.(?:md|mjs|tsv)/g))) {
  assert.ok(existsSync(join(skill, ref.slice('<skill>/'.length))), `router reference exists: ${ref}`);
}
assert.ok(existsSync(join(skill, 'agents/openai.yaml')));

// Catalog rows resolve and match the recorded counts.
const source = json(join(plugin, 'library-source.json'));
const rows = read(join(library, 'catalog.tsv')).trimEnd().split('\n').map(line => line.split('\t'));
assert.deepEqual(rows[0], ['kind', 'id', 'mode', 'platform', 'scenario', 'design_system', 'craft', 'path', 'summary']);
const counts = {};
const crafts = new Set(readdirSync(join(library, 'craft')).map(n => n.replace(/\.md$/, '')));
for (const row of rows.slice(1)) {
  assert.equal(row.length, 9, `catalog row has 9 columns: ${row[1]}`);
  counts[row[0]] = (counts[row[0]] ?? 0) + 1;
  assert.ok(existsSync(join(skill, row[7])), `catalog path exists: ${row[7]}`);
  if (row[0] === 'skill') for (const c of row[6].split(',').filter(Boolean)) assert.ok(crafts.has(c), `craft rule exists: ${c} (${row[1]})`);
}
assert.deepEqual(counts, source.counts);
assert.ok(counts.skill >= 100 && counts.system >= 100, 'library is complete');

// Split entries link to existing sections; overlays are applied.
for (const entry of readdirSync(join(library, 'skills'))) {
  const text = read(join(library, 'skills', entry, 'ENTRY.md'));
  for (const [, link] of text.matchAll(/\]\((sections\/[^)]+)\)/g)) {
    assert.ok(existsSync(join(library, 'skills', entry, link)), `section exists: ${entry}/${link}`);
  }
}
const config = json(join(plugin, 'sync.config.json'));
for (const name of readdirSync(join(plugin, 'overlays'))) {
  const id = name.replace(/\.md$/, '');
  assert.ok(config.entries.some(e => e.endsWith(`/${id}`)), `overlay targets a synced entry: ${id}`);
  const overlay = read(join(plugin, 'overlays', name)).trim().split('\n')[0];
  assert.ok(read(join(library, 'skills', id, 'ENTRY.md')).includes(overlay), `overlay applied: ${id}`);
}
for (const system of readdirSync(join(library, 'design-systems')).filter(n => !n.startsWith('_'))) {
  assert.ok(existsSync(join(library, 'design-systems', system, 'DESIGN.md')), `DESIGN.md exists: ${system}`);
  assert.ok(!existsSync(join(library, 'design-systems', system, 'preview')), `no preview bundle: ${system}`);
}
const size = walk(library).reduce((sum, p) => sum + statSync(p).size, 0);
assert.ok(size < 40 * 1024 * 1024, `library stays under 40 MB (${(size / 1048576).toFixed(1)} MB)`);

// Ratchet: the skill directory speaks only in craft-design's own terms. The
// upstream name lives only in LICENSE-library and the maintainer-only sync
// files, all outside skills/craft-design/. Case-insensitive names, plus the
// short `od` forms matched narrowly so that code, mode, good or period (and the
// Polish word "od") never trip it.
const upstreamNames = [
  /open ?design|opendesign|open-design|nexu|claude design|data-od-|\$OD_/i,
  /\bOD\b|(?<![A-Za-z0-9])OD_/,
  /(?<![\w.-])od(?=[-:])/i,
  /(?<![\w.-])od(?= (?:brand|media|tools|plugin|project|daemon|research|browser)\b)/,
];
const leaks = [];
for (const path of walk(skill)) {
  const data = readFileSync(path);
  if (data.subarray(0, 8192).includes(0)) continue;
  data.toString('utf8').replace(/base64,[A-Za-z0-9+/=]{200,}/g, 'base64,').split('\n').forEach((line, n) => {
    if (upstreamNames.some(pattern => pattern.test(line))) leaks.push(`${relative(plugin, path)}:${n + 1}: ${line.trim().slice(0, 120)}`);
  });
}
assert.equal(leaks.length, 0, `upstream names inside the skill directory:\n${leaks.slice(0, 40).join('\n')}`);

// Scripts parse; preview and brand kit run end to end.
const scripts = join(skill, 'scripts');
for (const name of readdirSync(scripts)) execFileSync(process.execPath, ['--check', join(scripts, name)]);
execFileSync(process.execPath, ['--check', join(plugin, 'scripts/sync-library.mjs')]);
execFileSync(process.execPath, [join(plugin, 'scripts/check-inspection.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [join(plugin, 'scripts/check-contract.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [join(plugin, 'scripts/check-scenario.mjs')], { stdio: 'inherit' });

const work = mkdtempSync(join(tmpdir(), 'craft-design-check-'));
const root = join(work, 'design');
mkdirSync(join(root, 'demo'), { recursive: true });
writeFileSync(join(root, 'demo/index.html'), '<!doctype html><h1 data-craft-id="title">Demo</h1>');
// Theme fixtures live with the screenshot demos and require no installed plugin.
const tokenScript = join(scripts, 'tokens.mjs');
const goodTokens = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>/* tokens:start */
:root {
  --bg: #fcfaf7; --fg: #14232e; --accent: #b12642;
  --font-display: Georgia, serif;
  --text-4xl: clamp(36px, 4vw, 64px); --space-4: 19px; --radius-card: 13px;
}
@media (max-width: 600px) { :root { --text-4xl: 36px; --space-4: 17px; } }
.on-dark { --bg: #19394a; --fg: #fdf0df; }
/* tokens:end */
@font-face { font-family: "Fixture face"; src: local("Georgia"); }
@keyframes example { from { color: red; } to { color: blue; } }
body { margin: 0; color: var(--fg); background: var(--bg); font-family: var(--font-display); }
h1 { font-size: var(--text-4xl); margin: 0; }
.card { padding: var(--space-4); border-radius: var(--radius-card); }
.on-dark { color: var(--fg); background: var(--bg); }
.accent { color: var(--accent); }
/* Strings, selectors and ignored rules must not become declarations. */
.card[data-note="a;b:c"]::before { content: "red; { font-size: 99px; var(--not-a-token) /* text */ }"; }
</style>
<body><h1 id="title">Theme test</h1><p class="accent">Accent</p>
<section class="card on-dark">Local theme</section>
<div style="color:var(--accent);width:100%;display:grid;grid-template-columns:1fr 2fr">Inline</div></body>`;
const badTokens = goodTokens.replace('--bg: #fcfaf7;', '--unused: 22px; --bg: #fcfaf7;').replace('</style>', `
.bad { color: #abcdef; background: var(--missing); }
@media (max-width: 600px) { h1 { font-size: 36px; } }
</style>`).replace('</body>', '<p class="bad" style="font-size:15px">Bad</p></body>');
const goodFile = join(root, 'demo/tokens-good.html'), badFile = join(root, 'demo/tokens-bad.html');
writeFileSync(goodFile, goodTokens);
writeFileSync(badFile, badTokens);
assert.deepEqual(inspectHtml(goodTokens).warnings, [], 'good theme passes static checks, including local themes and ignored rules');
const badWarnings = inspectHtml(badTokens).warnings;
assert.ok(badWarnings.some(w => w.code === 'literal' && /color/.test(w.message) && w.selector === '.bad' && w.line > 1));
assert.ok(badWarnings.some(w => w.code === 'literal' && /font-size/.test(w.message) && /@media.*h1/.test(w.selector)), 'responsive literals retain their location');
assert.ok(badWarnings.some(w => w.code === 'literal' && /\[style\]/.test(w.selector)), 'inline styles are checked');
assert.ok(badWarnings.some(w => w.code === 'undefined-token' && /--missing/.test(w.message)));
assert.ok(badWarnings.some(w => w.code === 'unused-token' && /--unused/.test(w.message)));
assert.ok(inspectHtml('<style>h1{color:red}</style>').warnings.some(w => w.code === 'theme-markers'));
assert.ok(inspectHtml('<style>/* tokens:start */ /* tokens:end */</style>').warnings.some(w => w.code === 'theme-registry'), 'empty markers do not constitute a theme');
const svgWarnings = inspectHtml(goodTokens.replace('</body>', '<svg><path fill="#123456"/><path stroke="red"/></svg></body>')).warnings;
assert.equal(svgWarnings.length, 1);
assert.match(svgWarnings[0].message, /^2 literal color occurrence/);
assert.equal(svgWarnings[0].code, 'svg-colors');
assert.ok(inspectHtml(goodTokens.replace('color: var(--accent);', '--local-color: red; color: var(--local-color);')).warnings.some(w => w.code === 'literal' && /--local-color/.test(w.message)), 'literal local aliases cannot hide decorative values');
assert.deepEqual(inspectHtml(goodTokens.replace('color: var(--accent);', 'color: oklch(from var(--accent) l c h / .8);')).warnings, [], 'derived colors remain valid');
assert.deepEqual(inspectHtml(goodTokens.replace('--accent: #b12642;', '--accent: #b12642; --animation-color: red;').replace('from { color: red;', 'from { color: var(--animation-color);')).warnings, [], 'references in ignored keyframes still count as use');
assert.throws(() => themeRange(goodTokens.replace('/* tokens:end */', '/* tokens:start */')), /exactly one ordered/);
assert.throws(() => themeRange('<style>p{content:"/* tokens:start */ :root{} /* tokens:end */"}</style>'), /exactly one ordered/, 'quoted marker text cannot be used for extract or sync');
assert.deepEqual(inspectHtml(goodTokens.replace('--accent: #b12642;', '--accent: #b12642; --illustration: #123456;').replace('</body>', '<svg><path fill="var(--illustration)"/></svg></body>')).warnings, [], 'SVG presentation attributes can reference tokens');
const scripted = goodTokens.replace('--accent: #b12642;', '--accent: #b12642; --flora-rose: #c34; --flora-sky: #8ac; --chart: #123;')
  .replace('</body>', '<script>const v = c => `var(--flora-${c})`; el.style.setProperty("--chart", "1");</script></body>');
assert.deepEqual(inspectHtml(scripted).warnings, [], 'tokens referenced from scripts, including built names, count as used');

const runTokens = (args, options = {}) => spawnSync(process.execPath, [tokenScript, ...args], { encoding: 'utf8', timeout: 60000, ...options });
const noBrowser = { env: { ...process.env, CHROME_PATH: join(work, 'no-browser') } };
const staticGood = runTokens(['check', goodFile, '--strict'], noBrowser);
assert.equal(staticGood.status, 3, staticGood.stderr);
assert.match(staticGood.stdout, /browser unavailable: static checks only/);
const staticBad = runTokens(['check', badFile, '--strict'], noBrowser);
assert.equal(staticBad.status, 1, 'strict static warnings take precedence over no browser');
assert.match(staticBad.stdout, /undefined-token/);
assert.equal(read(goodFile), goodTokens, 'check does not change HTML');

const sharedTokens = join(root, 'demo/tokens.css');
let operation = runTokens(['extract', goodFile, '--out', sharedTokens]);
assert.equal(operation.status, 0, operation.stderr);
const range = themeRange(goodTokens), originalTheme = goodTokens.slice(range.start, range.end);
assert.equal(read(sharedTokens), originalTheme, 'extract preserves theme contents exactly');
const copyFile = join(root, 'demo/tokens-copy.html');
writeFileSync(copyFile, goodTokens);
operation = runTokens(['sync', sharedTokens, copyFile]);
assert.equal(operation.status, 0, operation.stderr);
assert.equal(read(copyFile), goodTokens, 'unchanged round trip is byte-identical');
const updatedTheme = originalTheme.replace('#b12642', '#bc2345');
writeFileSync(sharedTokens, updatedTheme);
operation = runTokens(['sync', sharedTokens, copyFile, join(root, 'demo/index.html')]);
assert.equal(operation.status, 2, 'missing markers are reported without changing that file');
assert.match(operation.stdout, /updated:/);
assert.match(operation.stderr, /not changed:.*index.html/);
assert.equal(read(join(root, 'demo/index.html')), '<!doctype html><h1 data-craft-id="title">Demo</h1>');
assert.equal(read(copyFile), goodTokens.slice(0, range.start) + updatedTheme + goodTokens.slice(range.end), 'sync preserves all content outside the theme');
operation = runTokens(['extract', copyFile, '--out', sharedTokens]);
assert.equal(operation.status, 0, operation.stderr);
assert.equal(read(sharedTokens), updatedTheme, 'updated theme also survives extract');

// import: DTCG, Style Dictionary and plain JSON merge into one theme with a dark scope.
const dtcg = { color: { $type: 'color', ink: { 0: { $value: '#ffffff' }, 950: { $value: '#0b0b0c', $description: 'Darkest ink.' } },
  accent: { $root: { $value: { colorSpace: 'oklch', components: [0.62, 0.17, 262] } }, hover: { $value: { colorSpace: 'srgb', components: [0.2, 0.4, 0.8], alpha: 0.8, hex: '#3366cc' } } },
  page: { $value: { light: '{color.ink.0}', dark: '{color.ink.950}' } }, veil: { $value: { colorSpace: 'hsl', components: [210, 50, 40], alpha: 0.5 } } },
  font: { sans: { $type: 'fontFamily', $value: ['Inter Tight', 'system-ui', 'sans-serif'] }, weight: { $type: 'fontWeight', strong: { $value: 'semi-bold' } } },
  size: { $type: 'dimension', base: { $value: { value: 16, unit: 'px' } }, lg: { $value: '{size.base} * 1.5' } },
  ease: { out: { $type: 'cubicBezier', $value: [0.2, 0, 0, 1] } }, time: { fast: { $type: 'duration', $value: { value: 150, unit: 'ms' } } },
  shadow: { card: { $type: 'shadow', $value: [{ offsetX: '0px', offsetY: '2px', blur: '6px', color: '{color.ink.950}' }, { offsetX: '0px', offsetY: '0px', blur: '0px', spread: '1px', color: '#00000022', inset: true }] } },
  stroke: { $type: 'border', $value: { width: { value: 1, unit: 'px' }, style: 'solid', color: '{color.ink.950}' } },
  move: { $type: 'transition', $value: { duration: '{time.fast}', timingFunction: '{ease.out}', delay: '0ms' } },
  text: { body: { $type: 'typography', $value: { fontFamily: '{font.sans}', fontSize: '{size.base}', fontWeight: 400, lineHeight: 1.5, letterSpacing: { value: 0.1, unit: 'px' } } } },
  wash: { $type: 'gradient', $value: [{ color: '{color.ink.0}', position: 0 }, { color: '#000', position: 1 }] },
  named: { $value: '4px', $extensions: { 'craft-design': { name: '--gap-named' } } }, $extensions: { ignored: true } };
const styleDictionary = { space: { md: { value: '8px', type: 'dimension', comment: 'Base step.' }, lg: { value: '{space.md.value}*2' } },
  radius: { control: { value: { px: 10, rem: 0.625 }, purpose: 'Buttons and fields.', token: '--radius-ctl' } },
  motion: { token: '--motion-ctl', duration: { value: '120ms', type: 'duration' } } };
const plain = { ink: { 900: '#111' }, copy: '{ink.900}', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
  areas: '"head head"\n"side main"', tracking: -0.01, ratio: '12px/1.5', pair: '8px -4px', diff: '{space.lg}-{space.md}', sum: '16px+4px', half: '{space.md}/2',
  weight: { light: 300, regular: 400, bold: 700 }, border: { light: '#eee', strong: '#999' }, canvas: { light: '#fff', dark: '#000' },
  spacing: { px: '1px', 0: '0px' }, surface: { page: { token: '--page', value: '#fdfdfc' } }, '色': '#abcdef' };
const modeSplit = { light: { panel: '#f4f4f4' }, dark: { panel: '#202020' } };
const darkSet = { color: { accent: { $root: { $value: '#7aa2ff' } } }, surface: { page: { value: '#101010' } } };
const registryMap = { '--bg': '{color.page}', '--fg': { light: '{color.ink.950}', dark: '{color.ink.0}' }, '--accent': '{color.accent}', '--font-body': '{font.sans}', '--space-4': '{space.md}', '--text-lg': '{size.lg}', '--page': '{surface.page}', '--muted': '#777' };
const imported = importTokens({ sources: [{ file: 'dtcg.json', json: dtcg }, { file: 'sd.json', json: styleDictionary }, { file: 'plain.json', json: plain }, { json: modeSplit }], dark: [{ json: darkSet }], map: registryMap });
assert.deepEqual(imported.warnings, [], 'clean sources import without warnings');
const rootBlock = imported.css.slice(0, imported.css.indexOf('[data-theme=dark] {')), darkBlock = imported.css.slice(imported.css.indexOf('[data-theme=dark] {'));
for (const line of ['--color-ink-950: #0b0b0c;', '--color-accent: oklch(0.62 0.17 262);', '--color-accent-hover: rgb(51 102 204 / 0.8);', '--color-page: var(--color-ink-0);', '--color-veil: hsl(210 50% 40% / 0.5);',
  '--font-sans: "Inter Tight", system-ui, sans-serif;', '--font-weight-strong: 600;', '--size-base: 16px;', '--size-lg: calc(var(--size-base) * 1.5);', '--ease-out: cubic-bezier(0.2, 0, 0, 1);', '--time-fast: 150ms;',
  '--shadow-card: 0px 2px 6px var(--color-ink-950), inset 0px 0px 0px 1px #00000022;', '--stroke: 1px solid var(--color-ink-950);', '--move: var(--time-fast) var(--ease-out) 0ms;',
  '--text-body: 400 var(--size-base)/1.5 var(--font-sans);', '--text-body-letter-spacing: 0.1px;', '--wash: linear-gradient(var(--color-ink-0) 0%, #000 100%);', '--gap-named: 4px;',
  '--space-lg: calc(var(--space-md) * 2);', '--radius-ctl: 10px;', '--motion-ctl-duration: 120ms;',
  '--copy: var(--ink-900);', '--stack: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\';',
  '--areas: "head head"\n"side main";', '--tracking: -0.01;', '--ratio: 12px/1.5;', '--pair: 8px -4px;', '--diff: calc(var(--space-lg) - var(--space-md));', '--sum: calc(16px + 4px);', '--half: calc(var(--space-md) / 2);',
  '--weight-light: 300;', '--weight-bold: 700;', '--border-light: #eee;', '--border-strong: #999;', '--canvas: #fff;', '--spacing-px: 1px;', '--page: #fdfdfc;', '--色: #abcdef;', '--panel: #f4f4f4;',
  '--bg: var(--color-page);', '--text-lg: var(--size-lg);', '--muted: #777;']) {
  assert.ok(rootBlock.includes(`\n  ${line}\n`), `import emits ${line}`);
}
assert.ok(!/ignored|Darkest|Base step|purpose|--motion-ctl-token/.test(imported.css), 'format metadata and explicit names are not tokens');
assert.ok(!/light-\$value|--color-page-light/.test(imported.css), 'a mode pair is one token, not two');
for (const line of ['--color-page: var(--color-ink-950);', '--color-accent: #7aa2ff;', '--canvas: #000;', '--panel: #202020;', '--page: #101010;', '--fg: var(--color-ink-0);',
  '--bg: var(--color-page);']) {
  assert.ok(darkBlock.includes(`\n  ${line}\n`), `dark scope emits ${line}`);
}
assert.ok(!darkBlock.includes('--size-base') && !darkBlock.includes('--stroke') && !darkBlock.includes('--page-'), 'dark scope holds dark values and their dependents only, and never renames');
assert.ok(imported.css.indexOf(':root {') < imported.css.indexOf('[data-theme=dark] {'), 'the registry precedes the dark scope');
const withMapWarning = importTokens({ sources: [{ json: { fg: { $value: '#111' } } }], map: { '--fg': '#222', '--bg': '{fg}' } });
assert.deepEqual(withMapWarning.warnings, ['map --fg replaces the source token of the same name']);
assert.ok(withMapWarning.css.includes('--fg: #222;') && !withMapWarning.css.includes('--fg: #111'), 'the map wins over a source token of the same name, with a warning');
assert.equal(importTokens({ sources: [{ json: { bg: { $value: '#fff' } } }], map: { '--bg': '{bg}' } }).css.split('\n').filter(l => l.startsWith('  --')).join(), '  --bg: #fff;', 'an identity map entry is a no-op');
const mapped = importTokens({ sources: [{ json: dtcg }], map: { '--accent': '{color.accent.hover}', '--bg': '{color.page}' }, mappedOnly: true });
assert.deepEqual([...new Set(mapped.css.match(/^  --[^:]+/gm).map(l => l.trim()))].sort(), ['--accent', '--bg', '--color-accent-hover', '--color-ink-0', '--color-ink-950', '--color-page'], 'mapped-only keeps map targets and their chains');
const sdInput = { color: { brand: { value: 'red' } } };
importTokens({ sources: [{ json: sdInput }, { json: { color: { brand: { value: 'blue' } } } }] });
assert.equal(sdInput.color.brand.value, 'red', 'inputs are not mutated');
assert.throws(() => importTokens({ sources: [{ json: JSON.parse('{"__proto__":{"polluted":"yes"}}') }] }), /__proto__/);
assert.equal(({}).polluted, undefined, 'merge never touches Object.prototype');
for (const [label, options, pattern] of [
  ['alias cycle', { sources: [{ json: { a: { $value: '{b}' }, b: { $value: '{a}' } } }] }, /alias cycle --a → --b → --a/],
  ['self reference', { sources: [{ json: { c: { $value: '{c}' } } }] }, /alias cycle --c → --c/],
  ['unresolved alias', { sources: [{ json: { fg: { $value: '{ink.900}' } } }] }, /fg: unresolved alias \{ink\.900\}/],
  ['alias to a group', { sources: [{ json: { ink: { 900: { $value: '#111' } }, fg: { $value: '{ink}' } } }] }, /fg: unresolved alias \{ink\}/],
  ['unresolved alias inside a composite', { sources: [{ json: { s: { $type: 'shadow', $value: { offsetX: '0px', offsetY: '1px', color: '{nope}' } } } }] }, /unresolved alias \{nope\}/],
  ['dark-only token', { sources: [{ json: { a: { $value: '#fff' } } }], dark: [{ json: { b: { $value: '#000' } } }] }, /b \(dark\): declared only in the dark set/],
  ['dimension without a unit', { sources: [{ json: { size: { base: { value: 16, type: 'dimension' } } } }] }, /size\.base: dimension needs a unit \(16\)/],
  ['dimension string without a unit', { sources: [{ json: { size: { $type: 'dimension', x: { $value: '16' } } } }] }, /size\.x: dimension needs a unit/],
  ['unknown color space', { sources: [{ json: { c: { $type: 'color', $value: { colorSpace: 'cmyk', components: [0, 0, 0, 1] } } } }] }, /c: color needs colorSpace/],
  ['$ref', { sources: [{ json: { size: { $value: { $ref: '#/space/$value' } } } }] }, /size: \$ref is not supported/],
  ['$extends', { sources: [{ json: { ext: { $extends: '{color}', x: { $value: '#123' } } } }] }, /ext\.\$extends: \$extends is not supported/],
  ['unsupported composite', { sources: [{ json: { s: { $type: 'strokeStyle', $value: { dashArray: ['1px'], lineCap: 'round' } } } }] }, /s: unsupported strokeStyle value/],
  ['injected name', { sources: [{ json: { a: { token: '--ok: red; --bad', value: 'blue' } } }] }, /"--ok: red; --bad" is not a custom property name/],
  ['injected map key', { sources: [{ json: { a: { $value: 'blue' } } }], map: { '--bad; color': 'red' } }, /map: "--bad; color" is not a custom property name/],
  ['bad map key', { sources: [{ json: { a: { $value: 'blue' } } }], map: { bad: '1' } }, /map: "bad" is not a custom property name/],
  ['bad dark selector', { sources: [{ json: { a: { $value: 'blue' } } }], darkSelector: '.x{}' }, /not a selector/],
  ['name collision', { sources: [{ json: { fooBar: { $value: 'red' }, 'foo-bar': { $value: 'blue' } } }] }, /foo-bar and fooBar both become --foo-bar/],
  ['value with a semicolon', { sources: [{ json: { d: { value: 'x; y' } } }] }, /d: value contains ; or \}/],
  ['boolean value', { sources: [{ json: { flag: true } }] }, /flag: boolean is not a token value/],
  ['null value', { sources: [{ json: { gone: null } }] }, /gone: null is not a token value/],
  ['key without a CSS name', { sources: [{ json: { '!!': '#fff' } }] }, /!!: key cannot become a CSS name/],
  ['bad cubic bezier', { sources: [{ json: { e: { $type: 'cubicBezier', $value: [1, 2] } } }] }, /e: cubicBezier needs four numbers/],
  ['top level array', { sources: [{ json: { list: [{ a: 1 }] } }] }, /list: an array without \$type is not a token value/],
]) assert.throws(() => importTokens(options), pattern, `import rejects ${label}`);
const laterFile = importTokens({ sources: [{ file: 'a.json', json: { c: { $value: 'red' } } }, { file: 'b.json', json: { c: { $value: 'blue' } } }] });
assert.deepEqual(laterFile.warnings, ['c.$value: redefined by b.json (the later file wins)']);
assert.ok(laterFile.css.includes('--c: blue;'));
assert.deepEqual(importTokens({ sources: [{ json: { a: { $value: 'var(--outside)' } } }] }).warnings, [':root: --a uses --outside, which this import does not declare']);
assert.ok(inspectHtml(goodTokens.replace('--accent: #b12642;', '--accent: var(--loop); --loop: var(--accent);')).warnings.some(w => w.code === 'token-cycle' && /--accent → --loop → --accent/.test(w.message)), 'check reports alias cycles');
const importedTheme = goodTokens.replace(/\/\* tokens:start \*\/[^]*\/\* tokens:end \*\//, `/* tokens:start */\n${imported.css}/* tokens:end */`)
  .replace('var(--text-4xl)', 'var(--text-lg)').replace('var(--font-display)', 'var(--font-body)').replace('var(--radius-card)', 'var(--radius-ctl)');
assert.ok(!inspectHtml(importedTheme).warnings.some(w => w.code !== 'unused-token'), 'an imported theme passes the static checks apart from unused scale steps');
for (const [name, json] of Object.entries({ 'dtcg.json': dtcg, 'sd.json': styleDictionary, 'plain.json': plain, 'dark.json': darkSet, 'map.json': registryMap, 'cycle.json': { a: { $value: '{b}' }, b: { $value: '{a}' } } })) writeFileSync(join(root, name), JSON.stringify(json));
operation = runTokens(['import', 'dtcg.json', 'sd.json', 'plain.json', '--dark', 'dark.json', '--map', 'map.json', '--out', join(root, 'brand/tokens.css')], { cwd: root });
assert.equal(operation.status, 0, operation.stderr);
assert.match(operation.stdout, /imported: .*brand\/tokens.css \(\d+ token\(s\), \d+ dark, 0 warning\(s\)\)/);
assert.match(operation.stderr, /note: registry names not bound by the map: --surface, --fg-2, --border/, 'the CLI lists registry names the map leaves unbound');
const written = read(join(root, 'brand/tokens.css'));
assert.match(written, /^\/\* Imported by tokens\.mjs import: import dtcg\.json sd\.json plain\.json --dark dark\.json --map map\.json\. /, 'the header records the relative command');
assert.ok(written.includes('--radius-ctl: 10px;') && written.includes('[data-theme=dark] {'), 'the CLI writes the function result');
operation = runTokens(['import', join(root, 'cycle.json'), '--out', join(root, 'brand/cycle.css')]);
assert.equal(operation.status, 2, 'an invalid import exits 2');
assert.match(operation.stderr, /nothing written:\n  :root: alias cycle --a → --b → --a/);
assert.ok(!existsSync(join(root, 'brand/cycle.css')), 'an invalid import writes nothing');
operation = runTokens(['sync', join(root, 'brand/tokens.css'), copyFile]);
assert.equal(operation.status, 0, 'an imported theme syncs into an artifact');
assert.equal(runTokens(['import', join(root, 'dtcg.json'), '--dark']).status, 2, 'a flag without a value is an input error');
assert.equal(runTokens(['import', join(root, 'dtcg.json'), '--out', copyFile]).status, 2, 'import refuses to overwrite HTML');
assert.equal(read(copyFile).includes('--radius-ctl: 10px;'), true, 'sync placed the imported theme');
writeFileSync(join(root, 'brand.json'), JSON.stringify({ name: 'Demo', sourceUrl: 'https://www.example.com/', note: '</script> ' }));
const kit = execFileSync(process.execPath, [join(scripts, 'brand-kit.mjs'), join(root, 'brand.json'), '--status', 'ready'], { encoding: 'utf8' }).trim();
const kitHtml = read(kit);
assert.ok(!kitHtml.includes('__CRAFT_BRAND_'), 'brand kit tokens replaced');
assert.ok(!kitHtml.includes('</script> ') && kitHtml.includes('"host":"example.com"'), 'brand payload escaped');

const port = 47000 + Math.floor(Math.random() * 2000);
const server = spawn(process.execPath, [join(scripts, 'preview.mjs'), root, '--port', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
try {
  let printed = '';
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview did not start')), 10000);
    server.stdout.on('data', chunk => {
      printed += chunk;
      const url = printed.match(/http:\/\/[\d.]+:\d+\//)?.[0];
      if (url && printed.includes('view/demo/index.html')) { clearTimeout(timer); resolve(url); }
    });
  });
  assert.match(await (await fetch(base)).text(), /demo\/index\.html/);
  assert.equal((await fetch(`${base}view/demo/index.html`)).status, 200);
  assert.match(await (await fetch(`${base}raw/demo/index.html`)).text(), /data-craft-id="title"/);
  assert.equal((await fetch(`${base}raw/%2e%2e/%2e%2e/etc/passwd`)).status, 404);
  const comment = await (await fetch(`${base}api/comments`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file: 'demo/index.html', odId: 'title', selector: 'h1', text: 'Demo', note: 'Larger' }),
  })).json();
  const listed = execFileSync(process.execPath, [join(scripts, 'preview.mjs'), '--comments', root], { encoding: 'utf8' });
  assert.match(listed, new RegExp(comment.id));
  execFileSync(process.execPath, [join(scripts, 'preview.mjs'), '--resolve', root, comment.id]);
  assert.deepEqual(await (await fetch(`${base}api/comments`)).json(), []);
  // Screenshots need a local browser; CI runners lack a usable Chrome sandbox.
  if (!process.env.CI) {
    const checked = runTokens(['check', goodFile, '--width', '1440,390', '--strict']);
    if (checked.status !== 3) {
      assert.equal(checked.status, 0, `good theme has no warnings, including mutations: ${checked.stdout}\n${checked.stderr}`);
      assert.match(checked.stdout, /1440px --text-4xl: [1-9]\d* element\(s\) changed; restored/);
      assert.match(checked.stdout, /390px --text-4xl: [1-9]\d* element\(s\) changed; restored/);
      assert.match(checked.stdout, /tokens: 0 warning/);
      const broken = runTokens(['check', badFile, '--width', '1440,390']);
      assert.equal(broken.status, 0, `warnings are nonblocking by default: ${broken.stderr}`);
      assert.match(broken.stdout, /1440px --text-4xl: [1-9]\d* element\(s\) changed; restored/);
      assert.match(broken.stdout, /mutation-no-effect:.*390px --text-4xl/);
      assert.match(broken.stdout, /possible-duplicate:.*390px --text-4xl:.*h1#title.*font-size/);
      const strict = runTokens(['check', badFile, '--width', '390', '--strict']);
      assert.equal(strict.status, 1, strict.stderr);
      assert.equal(read(goodFile), goodTokens, 'browser mutations leave the good file unchanged');
      assert.equal(read(badFile), badTokens, 'browser mutations leave the bad file unchanged');
    }
    writeFileSync(join(root, 'demo/wide.html'), '<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0"><div data-craft-id="wide" style="width:700px;height:40px"></div>');
    const shot = spawnSync(process.execPath, [join(scripts, 'shot.mjs'), join(root, 'demo/wide.html'), '--width', '1440,390', '--wait', '0', '--out', join(work, 'shot.png')], { encoding: 'utf8' });
    if (shot.status !== 3) {
      assert.equal(shot.status, 0, `shot.mjs runs: ${shot.stderr}`);
      assert.match(shot.stdout, /1440x900, page height \d+px, no horizontal overflow/);
      assert.match(shot.stdout, /390x844 mobile.*HORIZONTAL OVERFLOW.*\[wide\]/);
      assert.ok(existsSync(join(work, 'shot-390.png')), 'one PNG per width');

      // No dimensions are reserved for this far-below-the-fold lazy image.
      // Its decoded height must enter the report and the full-page capture.
      writeFileSync(join(root, 'demo/lazy.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><path fill="#0000ff" d="M0 0h1000v1000H0z"/></svg>');
      writeFileSync(join(root, 'demo/full.html'), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>html{scroll-behavior:smooth}body{margin:0;background:white}img{display:block;width:100%;height:auto}</style>
        <div style="height:50vh;background:red"></div><div id="target" style="height:80px;background:#ff00ff"></div>
        <div style="height:4200px"></div><img src="lazy.svg" loading="lazy"><footer style="height:80px;background:#00ff00"></footer>`);
      const full = spawnSync(process.execPath, [join(scripts, 'shot.mjs'), join(root, 'demo/full.html'), '--width', '1440,390', '--wait', '0', '--full', '--out', join(work, 'full.png')], { encoding: 'utf8', timeout: 60000 });
      assert.equal(full.status, 0, `full capture runs: ${full.stderr}`);
      for (const [width, viewportHeight] of [[1440, 900], [390, 844]]) {
        const png = screenshot(join(work, `full-${width}.png`));
        const expected = viewportHeight / 2 + 80 + 4200 + width + 80;
        assert.equal(png.width, width);
        assert.equal(png.height, expected, `full capture includes decoded image at ${width}px`);
        assert.match(full.stdout, new RegExp(`${width}x${viewportHeight}.*page height ${expected}px, no horizontal overflow`));
        assert.deepEqual(png.pixel(10, viewportHeight / 2 - 1), [255, 0, 0], 'vh uses the original viewport');
        assert.deepEqual(png.pixel(10, viewportHeight / 2 + 1), [255, 0, 255], 'capture does not stretch vh layout');
        assert.deepEqual(png.pixel(10, expected - 90), [0, 0, 255], 'lazy image is visible');
        assert.deepEqual(png.pixel(10, expected - 1), [0, 255, 0], 'footer is not cropped');
      }
      const scrolled = spawnSync(process.execPath, [join(scripts, 'shot.mjs'), join(root, 'demo/full.html'), '--width', '390', '--wait', '0', '--at', '#target', '--out', join(work, 'at.png')], { encoding: 'utf8', timeout: 60000 });
      assert.equal(scrolled.status, 0, `scrolled capture runs: ${scrolled.stderr}`);
      assert.deepEqual(screenshot(join(work, 'at.png')).pixel(10, 0), [255, 0, 255], 'scroll target is reached even when CSS requests smooth scrolling');
      writeFileSync(join(root, 'demo/state.html'), `<!doctype html><style>body{margin:0}#panel{height:100vh;background:red;transition:background-color .6s}
        .on #panel{background:#0000ff}:target{background:#00ff00!important}</style>
        <button id="open" onclick="document.body.classList.add('on')">open</button><div id="panel"></div>`);
      const clicked = spawnSync(process.execPath, [join(scripts, 'shot.mjs'), join(root, 'demo/state.html'), '--width', '390', '--wait', '0', '--click', '#open', '--out', join(work, 'state.png')], { encoding: 'utf8', timeout: 60000 });
      assert.equal(clicked.status, 0, `clicked capture runs: ${clicked.stderr}`);
      assert.deepEqual(screenshot(join(work, 'state.png')).pixel(10, 400), [0, 0, 255], 'the click is captured after its transition ends');
      const targeted = spawnSync(process.execPath, [join(scripts, 'shot.mjs'), `${join(root, 'demo/state.html')}#panel`, '--width', '390', '--wait', '0', '--out', join(work, 'target.png')], { encoding: 'utf8', timeout: 60000 });
      assert.equal(targeted.status, 0, `fragment capture runs: ${targeted.stderr}`);
      assert.deepEqual(screenshot(join(work, 'target.png')).pixel(10, 400), [0, 255, 0], 'a #fragment in the file path opens that state');
      const missing = spawnSync(process.execPath, [join(scripts, 'shot.mjs'), join(root, 'demo/state.html'), '--width', '390', '--wait', '0', '--click', '#nope', '--out', join(work, 'nope.png')], { encoding: 'utf8', timeout: 60000 });
      assert.notEqual(missing.status, 0, 'a selector that matches nothing fails the capture');
      assert.match(missing.stderr + missing.stdout, /no element matches #nope/);
    }
  }
} finally {
  server.kill();
  rmSync(work, { recursive: true, force: true });
}

console.log(`craft-design package ok: ${JSON.stringify(counts)}, ${(size / 1048576).toFixed(1)} MB`);
