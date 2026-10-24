#!/usr/bin/env node
// Rebuild the craft-design library from an OpenDesign checkout.
//
//   node craft-design/scripts/sync-from-open-design.mjs <open-design checkout>
//
// The selection lives in craft-design/sync.config.json. Library files are
// generated: change the selection, the overlays or this script, never the
// generated copy. The skill's own references/ and scripts/ are hand-written
// and are not touched here.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginRoot = resolve(import.meta.dirname, '..');
const skillRoot = join(pluginRoot, 'skills/craft-design');
const libraryRoot = join(skillRoot, 'library');
const overlaysRoot = join(pluginRoot, 'overlays');
const config = JSON.parse(readFileSync(join(pluginRoot, 'sync.config.json'), 'utf8'));

const odRoot = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(odRoot, 'design-systems')) || !existsSync(join(odRoot, 'craft'))) {
  console.error('usage: sync-from-open-design.mjs <open-design checkout>');
  process.exit(2);
}

// ---------------------------------------------------------------- frontmatter

// A small YAML subset: nested maps, scalar lists, flow lists, block scalars and
// quoted strings. Enough for SKILL.md frontmatter; unknown shapes fall back to
// raw strings rather than failing the sync.
function parseYaml(text) {
  const lines = text.split('\n');
  let i = 0;
  const indentOf = line => line.match(/^ */)[0].length;
  const skip = () => { while (i < lines.length && /^\s*(#.*)?$/.test(lines[i])) i++; };
  const scalar = raw => {
    const v = raw.trim();
    if (v === '') return '';
    if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
    if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(s => scalar(s)).filter(s => s !== '');
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v.replace(/\s+#.*$/, '');
  };
  const block = (style, parentIndent) => {
    const out = [];
    let indent = null;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '') { out.push(''); i++; continue; }
      const n = indentOf(line);
      if (n <= parentIndent) break;
      indent ??= n;
      out.push(line.slice(indent));
      i++;
    }
    while (out.length && out.at(-1) === '') out.pop();
    return style.startsWith('>') ? out.join(' ').replace(/\s+/g, ' ').trim() : out.join('\n');
  };
  const node = indent => {
    skip();
    if (i >= lines.length) return null;
    const first = lines[i];
    if (indentOf(first) < indent) return null;
    if (first.trim().startsWith('- ') || first.trim() === '-') {
      const list = [];
      const at = indentOf(first);
      while (i < lines.length) {
        skip();
        if (i >= lines.length) break;
        const line = lines[i];
        if (indentOf(line) !== at || !line.trim().startsWith('-')) break;
        const rest = line.trim().slice(1).trim();
        if (/^[\w.-]+:(\s|$)/.test(rest)) {
          // A map item: re-read it as a map indented past the dash.
          lines[i] = ' '.repeat(at + 2) + rest;
          list.push(map(at + 2));
        } else { i++; list.push(scalar(rest)); }
      }
      return list;
    }
    return map(indentOf(first));
  };
  const map = at => {
    const out = {};
    while (i < lines.length) {
      skip();
      if (i >= lines.length) break;
      const line = lines[i];
      const n = indentOf(line);
      if (n < at) break;
      if (n > at) { i++; continue; }
      const m = line.trim().match(/^([^:]+?):(?:\s+(.*))?$/);
      if (!m) { i++; continue; }
      const [, key, value = ''] = m;
      i++;
      if (/^[|>][+-]?$/.test(value.trim())) out[key] = block(value.trim(), at);
      else if (value.trim() === '') out[key] = node(at + 1);
      else out[key] = scalar(value);
    }
    return out;
  };
  return map(0);
}

function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, front: '', body: text };
  let meta = {};
  try { meta = parseYaml(m[1]) ?? {}; } catch { meta = {}; }
  return { meta, front: m[0], body: text.slice(m[0].length) };
}

// ---------------------------------------------------------------- helpers

const oneLine = value => String(value ?? '').replace(/\s+/g, ' ').replace(/\t/g, ' ').trim();
const list = value => (Array.isArray(value) ? value : value ? [value] : []).map(v => oneLine(v)).filter(Boolean);
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'section';
const clip = (text, n) => (text.length > n ? text.slice(0, n - 1).trimEnd() + '…' : text);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const hasSips = (() => {
  try { execFileSync('sips', ['--help'], { stdio: 'ignore' }); return true; } catch { return false; }
})();
const warnings = [];

// Large sample images are downscaled in place. Names and formats stay as they
// are because templates and their scripts address the files by name.
function downscaleImages(dir) {
  for (const path of walk(dir)) {
    if (!/\.(png|jpe?g)$/i.test(path) || statSync(path).size <= config.downscaleImagesOverBytes) continue;
    if (!hasSips) { warnings.push(`kept large image (no sips): ${basename(dir)}/${relative(dir, path)}`); continue; }
    execFileSync('sips', ['-Z', String(config.downscaleMaxPixels), path], { stdio: 'ignore' });
  }
}

// Split oversized entry files by level-2 heading, ignoring headings inside
// fenced code, so one read costs the core and sections load on demand.
function splitEntry(dir, text) {
  const { front, body } = splitFrontmatter(text);
  const lines = body.split('\n');
  const sections = [];
  let preamble = [];
  let current = null;
  let fence = null;
  for (const line of lines) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) fence = fence === null ? f[1][0] : (line.trim().startsWith(fence) ? null : fence);
    if (fence === null && !f && /^## \S/.test(line)) {
      current = { title: line.slice(3).trim(), lines: [line] };
      sections.push(current);
    } else if (current) current.lines.push(line);
    else preamble.push(line);
  }
  if (sections.length < 3) return text;
  mkdirSync(join(dir, 'sections'), { recursive: true });
  const toc = sections.map((section, n) => {
    const file = `sections/${String(n + 1).padStart(2, '0')}-${slug(section.title)}.md`;
    const content = section.lines.join('\n').trimEnd() + '\n';
    writeFileSync(join(dir, file), content);
    return `| [${section.title.replace(/\|/g, '\\|')}](${file}) | ${Math.ceil(content.length / 1024)} KB |`;
  });
  return front + preamble.join('\n').trimEnd() + `

## Sections

This entry was split by craft-design so that only the needed parts are read.
Read every section the task depends on before building; the list keeps the
original order, and the final checks are part of the contract.

| Section | Size |
|---|---|
${toc.join('\n')}
`;
}

// ---------------------------------------------------------------- build

const stage = mkdtempSync(join(tmpdir(), 'craft-design-library-'));
const catalog = [];
const seen = new Set();

for (const entry of config.entries) {
  const source = join(odRoot, entry);
  const id = basename(entry);
  if (seen.has(id)) throw new Error(`duplicate entry id: ${id}`);
  seen.add(id);
  if (!existsSync(join(source, 'SKILL.md'))) throw new Error(`missing entry: ${entry}`);
  const target = join(stage, 'skills', id);
  cpSync(source, target, { recursive: true, filter: path => !/(^|\/)(node_modules|\.DS_Store|__pycache__)(\/|$)/.test(path) });
  // Hosts discover SKILL.md files; library entries must stay invisible until
  // the router opens them, so every nested SKILL.md is renamed.
  for (const path of walk(target)) if (basename(path) === 'SKILL.md') renameSync(path, join(dirname(path), 'ENTRY.md'));
  const entryPath = join(target, 'ENTRY.md');
  let text = readFileSync(entryPath, 'utf8');
  const { meta } = splitFrontmatter(text);
  const overlay = join(overlaysRoot, `${id}.md`);
  if (existsSync(overlay)) {
    const { front, body } = splitFrontmatter(text);
    text = front + '\n' + readFileSync(overlay, 'utf8').trimEnd() + '\n\n' + body.replace(/^\n+/, '');
  }
  if (Buffer.byteLength(text) > config.splitThresholdBytes) text = splitEntry(target, text);
  writeFileSync(entryPath, text);
  downscaleImages(target);
  const od = meta.od ?? {};
  const description = oneLine(meta.en_description || meta.description);
  catalog.push([
    'skill', id,
    oneLine(od.mode) || (entry.startsWith('design-templates/') ? 'template' : 'utility'),
    oneLine(od.platform || od.surface),
    oneLine(od.scenario),
    od.design_system?.requires === true ? 'ds' : '',
    // OpenDesign silently skips craft names that have no file yet; so does the catalog.
    list(od.craft?.requires).filter(name => existsSync(join(odRoot, 'craft', `${name}.md`))).join(','),
    `library/skills/${id}/ENTRY.md`,
    clip([description, list(meta.triggers).join('; ')].filter(Boolean).join(' Triggers: '), 400),
  ]);
}

// Craft rulebooks.
mkdirSync(join(stage, 'craft'), { recursive: true });
for (const name of readdirSync(join(odRoot, 'craft'))) {
  if (!name.endsWith('.md') || config.craftExclude.includes(name)) continue;
  cpSync(join(odRoot, 'craft', name), join(stage, 'craft', name));
  if (name === 'README.md') continue;
  const text = readFileSync(join(odRoot, 'craft', name), 'utf8');
  const title = (text.match(/^#\s+(.+)$/m)?.[1] ?? name).trim();
  catalog.push(['craft', name.replace(/\.md$/, ''), 'craft', '', '', '', '', `library/craft/${name}`, clip(oneLine(title), 400)]);
}

// Design-system packages without previews, rendered kits, provenance dumps or
// translations.
for (const id of readdirSync(join(odRoot, 'design-systems')).sort()) {
  const source = join(odRoot, 'design-systems', id);
  if (id.startsWith('_') || !statSync(source).isDirectory() || !existsSync(join(source, 'DESIGN.md'))) continue;
  const target = join(stage, 'design-systems', id);
  mkdirSync(target, { recursive: true });
  for (const file of config.designSystemFiles) if (existsSync(join(source, file))) cpSync(join(source, file), join(target, file));
  // Upstream adapters declare `@theme { --x: var(--x) }`: Tailwind then emits
  // self-references in its theme layer, and utilities ignore token overrides in
  // nested scopes (a dark band, a second theme). `@theme inline` makes utilities
  // read the live tokens.css variables instead.
  const adapter = join(target, 'tailwind-v4.css');
  if (existsSync(adapter)) writeFileSync(adapter, readFileSync(adapter, 'utf8').replace(/^@theme\s*\{/m, '@theme inline {'));
  let manifest = {};
  if (existsSync(join(target, 'manifest.json'))) {
    manifest = JSON.parse(readFileSync(join(target, 'manifest.json'), 'utf8'));
    delete manifest.preview;
    writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  }
  const design = readFileSync(join(source, 'DESIGN.md'), 'utf8');
  const name = manifest.name ?? design.match(/^#\s+(.+)$/m)?.[1] ?? id;
  const category = manifest.category ?? design.match(/^> Category:\s*(.+)$/m)?.[1] ?? '';
  const blurb = design.match(/^> (?!Category:)(.+)$/m)?.[1] ?? manifest.description ?? '';
  const parts = existsSync(join(target, 'tokens.css')) ? 'tokens' : 'prose';
  // Upstream generates some systems from a style template: every token reads
  // "Token from style foundations" and the prose is generic. Mark them so a
  // catalog query shows they carry a palette, not a studied brand.
  const templated = design.includes('Token from style foundations') ? 'Templated palette, generic prose. ' : '';
  catalog.push(['system', id, 'design-system', '', oneLine(category), parts, list(manifest.craft?.suggested).join(','),
    `library/design-systems/${id}/`, clip(oneLine(`${templated}${name}. ${blurb}`), 400)]);
}
if (existsSync(join(odRoot, 'design-systems/_schema/defaults.css'))) {
  mkdirSync(join(stage, 'design-systems/_schema'), { recursive: true });
  cpSync(join(odRoot, 'design-systems/_schema/defaults.css'), join(stage, 'design-systems/_schema/defaults.css'));
}

// Shared device frames (iPhone, Pixel, iPad, MacBook, browser window).
if (existsSync(join(odRoot, 'assets/frames'))) {
  cpSync(join(odRoot, 'assets/frames'), join(stage, 'frames'), { recursive: true });
  for (const name of readdirSync(join(stage, 'frames')).filter(n => n.endsWith('.html')).sort()) {
    catalog.push(['frame', name.replace(/\.html$/, ''), 'frame', '', '', '', '', `library/frames/${name}`,
      'Shared device frame; embeds ?screen=<relative path> inside the device chrome.']);
  }
}

// Visual directions, rendered from OpenDesign's own library.
const directions = await import(pathToFileURL(join(odRoot, 'apps/daemon/src/prompts/directions.ts')).href);
writeFileSync(join(stage, 'directions.md'), `# Direction library

Use when no design system or brand source is active. Infer the best match from
the brief's domain, audience and tone, then bind the palette and font stacks
**verbatim** into the artifact's \`:root\`. Never infer colors or fonts from a
name alone. Posture cues describe how the direction behaves (border weight,
radius, accent budget); honour them in layout choices. When the user wants to
compare directions, offer these by label and bind the one they pick.

${directions.DESIGN_DIRECTIONS.map(d => directions.renderDirectionSpec(d).trim()).join('\n\n')}
`);
for (const d of directions.DESIGN_DIRECTIONS) {
  catalog.push(['direction', d.id, 'direction', '', '', '', '', 'library/directions.md', clip(oneLine(`${d.label}. ${d.mood}`), 400)]);
}

const header = ['kind', 'id', 'mode', 'platform', 'scenario', 'design_system', 'craft', 'path', 'summary'];
writeFileSync(join(stage, 'catalog.tsv'), [header, ...catalog].map(row => row.join('\t')).join('\n') + '\n');

const commit = execFileSync('git', ['-C', odRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const version = JSON.parse(readFileSync(join(odRoot, 'package.json'), 'utf8')).version;
writeFileSync(join(stage, 'SOURCE.json'), JSON.stringify({
  repository: 'https://github.com/nexu-io/open-design',
  version, commit, license: 'Apache-2.0',
  counts: Object.fromEntries(['skill', 'craft', 'system', 'direction', 'frame'].map(k => [k, catalog.filter(r => r[0] === k).length])),
}, null, 2) + '\n');

rmSync(libraryRoot, { recursive: true, force: true });
cpSync(stage, libraryRoot, { recursive: true });
rmSync(stage, { recursive: true, force: true });

const counts = JSON.parse(readFileSync(join(libraryRoot, 'SOURCE.json'), 'utf8')).counts;
console.log(`craft-design library rebuilt from open-design ${version} (${commit.slice(0, 12)}):`, counts);
for (const w of warnings) console.warn('warning:', w);
