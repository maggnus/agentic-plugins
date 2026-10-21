#!/usr/bin/env node
// Check the craft-design package: manifests, the single router skill, library
// integrity and a smoke run of the bundled scripts.

import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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
assert.ok(router.length < 8000, 'router body stays small');
for (const ref of new Set(router.match(/<skill>\/[\w./-]+\.(?:md|mjs|tsv)/g))) {
  assert.ok(existsSync(join(skill, ref.slice('<skill>/'.length))), `router reference exists: ${ref}`);
}
assert.ok(existsSync(join(skill, 'agents/openai.yaml')));

// Catalog rows resolve and match the recorded counts.
const source = json(join(library, 'SOURCE.json'));
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

// Scripts parse; preview and brand kit run end to end.
const scripts = join(skill, 'scripts');
for (const name of readdirSync(scripts)) execFileSync(process.execPath, ['--check', join(scripts, name)]);
execFileSync(process.execPath, ['--check', join(plugin, 'scripts/sync-from-open-design.mjs')]);

const work = mkdtempSync(join(tmpdir(), 'craft-design-check-'));
const root = join(work, 'design');
mkdirSync(join(root, 'demo'), { recursive: true });
writeFileSync(join(root, 'demo/index.html'), '<!doctype html><h1 data-od-id="title">Demo</h1>');
writeFileSync(join(root, 'brand.json'), JSON.stringify({ name: 'Demo', sourceUrl: 'https://www.example.com/', note: '</script> ' }));
const kit = execFileSync(process.execPath, [join(scripts, 'brand-kit.mjs'), join(root, 'brand.json'), '--status', 'ready'], { encoding: 'utf8' }).trim();
const kitHtml = read(kit);
assert.ok(!kitHtml.includes('__OD_BRAND_'), 'brand kit tokens replaced');
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
  assert.match(await (await fetch(`${base}raw/demo/index.html`)).text(), /data-od-id="title"/);
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
    writeFileSync(join(root, 'demo/wide.html'), '<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0"><div data-od-id="wide" style="width:700px;height:40px"></div>');
    const shot = spawnSync(process.execPath, [join(scripts, 'shot.mjs'), join(root, 'demo/wide.html'), '--width', '1440,390', '--wait', '0', '--out', join(work, 'shot.png')], { encoding: 'utf8' });
    if (shot.status !== 3) {
      assert.equal(shot.status, 0, `shot.mjs runs: ${shot.stderr}`);
      assert.match(shot.stdout, /1440x900, page height \d+px, no horizontal overflow/);
      assert.match(shot.stdout, /390x844 mobile.*HORIZONTAL OVERFLOW.*\[wide\]/);
      assert.ok(existsSync(join(work, 'shot-390.png')), 'one PNG per width');
    }
  }
} finally {
  server.kill();
  rmSync(work, { recursive: true, force: true });
}

console.log(`craft-design package ok: ${JSON.stringify(counts)}, ${(size / 1048576).toFixed(1)} MB`);
