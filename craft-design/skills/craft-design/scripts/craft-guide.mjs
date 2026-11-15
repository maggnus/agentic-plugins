#!/usr/bin/env node
// Bounded instruction delivery & targeted rule compiler. Receipts confirm delivery, not cognition.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, statSync, readdirSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { consumeInvocation } from './guide-runtime.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const skillRoot = resolve(here, '..');
export const PAGE_BYTES = 16000;
const DETAIL_INLINE_LIMIT = 60000;
const DETAIL_PAGE_BYTES = 48000;
const hash = value => createHash('sha256').update(value).digest('hex');
const read = file => readFileSync(file, 'utf8');
export const capabilities = JSON.parse(read(join(skillRoot, 'references/capabilities.json')));

export function splitText(text, limit = PAGE_BYTES) {
  const parts = []; let part = '';
  for (const paragraph of text.match(/[^]*?(?:\n\n|$)/g).filter(Boolean)) {
    if (Buffer.byteLength(paragraph) <= limit) {
      if (Buffer.byteLength(part + paragraph) > limit) { parts.push(part); part = ''; }
      part += paragraph;
    } else {
      if (part) { parts.push(part); part = ''; }
      let rest = paragraph;
      while (Buffer.byteLength(rest) > limit) {
        let prefix = '';
        for (const char of rest) { if (Buffer.byteLength(prefix + char) > limit) break; prefix += char; }
        const boundary = Math.max(prefix.lastIndexOf('\n'), prefix.lastIndexOf(' '));
        const end = boundary > 0 ? boundary + 1 : prefix.length;
        parts.push(rest.slice(0, end)); rest = rest.slice(end);
      }
      part = rest;
    }
  }
  if (part) parts.push(part);
  return parts;
}

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const mac = ['Google Chrome', 'Chromium', 'Microsoft Edge', 'Brave Browser', 'Google Chrome Canary']
    .flatMap(app => [`/Applications/${app}.app/Contents/MacOS/${app}`, `${process.env.HOME}/Applications/${app}.app/Contents/MacOS/${app}`]);
  for (const p of mac) if (existsSync(p)) return p;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable', 'brave-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  }
  return null;
}

function catalog() {
  return read(join(skillRoot, 'library/catalog.tsv')).trim().split('\n').slice(1).map(line => {
    const [kind, id, mode, platform, scenario, _system, craft, path, summary] = line.split('\t');
    return { kind, id, mode, platform, scenario, craft, path, summary };
  });
}

const quote = value => /^[\w@%+=:,./-]+$/.test(String(value)) ? String(value) : "'" + String(value).replaceAll("'", "'\"'\"'") + "'";
const guideCommand = (...args) => ['node', join(skillRoot, 'scripts/craft-guide.mjs'), ...args].map(quote).join(' ');

const STOP = new Set('a an and the for with of to in on by my our new page pages site design ui make create build simple modern и в во на для с со из по или страница страницу страницы сделай сделать создай создать нужен нужна нужно новый новая дизайн макет'.split(' '));
const RU = Object.entries({ лендинг: 'landing', посадочн: 'landing', сайт: 'website landing', дашборд: 'dashboard', панел: 'dashboard admin', админ: 'admin', аналитик: 'analytics', отчет: 'report', онбординг: 'onboarding', регистрац: 'signup onboarding', авторизац: 'login', логин: 'login', мобильн: 'mobile', приложени: 'app', кофе: 'coffee cafe', кафе: 'cafe coffee', ресторан: 'restaurant', меню: 'menu', магазин: 'ecommerce shop store', оплат: 'checkout payment', тариф: 'pricing', прайс: 'pricing', постер: 'poster', плакат: 'poster', открытк: 'card', визитк: 'card', карточк: 'card', брошюр: 'brochure', печат: 'print', документ: 'document', резюме: 'resume', портфолио: 'portfolio', блог: 'blog', стать: 'article', журнал: 'magazine editorial', бренд: 'brand', логотип: 'logo', анкет: 'form survey', настройк: 'settings', профил: 'profile', таблиц: 'table', график: 'chart', диаграм: 'diagram chart', бронирован: 'booking', расписан: 'schedule calendar', календар: 'calendar', письм: 'email', рассылк: 'newsletter email', видео: 'video', анимац: 'animation motion', финанс: 'finance fintech', банк: 'banking fintech', крипт: 'crypto', медицин: 'medical health', клиник: 'clinic health', образован: 'education', курс: 'course education', путешеств: 'travel', мероприят: 'event', конференц: 'conference event', чат: 'chat', темн: 'dark', инфограф: 'infographic' });
const NON_DESIGN_IDS = new Set(['agent-browser', 'x-research', 'hatch-pet', 'pr-feedback-quality-gate', 'dcf-valuation', 'last30days']);
const isExcludedSeed = row => NON_DESIGN_IDS.has(row.id) || row.id.startsWith('orbit-') || String(row.summary || '').startsWith('Templated palette');

const terms = text => String(text ?? '').toLowerCase().replaceAll('ё', 'е').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const singular = word => word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
const matches = (term, word) => word === term || singular(word) === singular(term) || term.length >= 5 && word.startsWith(term);

export function searchCatalog(query, { includeSeeds = false } = {}) {
  const words = terms(query), groups = [], ignored = [], unknown = [];
  for (const word of words) {
    if (STOP.has(word)) ignored.push(word);
    else if (/\p{Script=Cyrillic}/u.test(word)) { const hit = RU.find(([stem]) => word.startsWith(stem)); if (hit) groups.push(hit[1].split(' ')); else unknown.push(word); }
    else groups.push([word]);
  }
  const exact = new Set([words.join('-'), words.filter(w => !STOP.has(w)).join('-')]);
  const allRows = catalog().filter(r => includeSeeds || exact.has(r.id) || words.includes(r.id) || !isExcludedSeed(r));
  const rows = allRows.map((row, order) => ({ row, order, fields: [[4, terms(row.id)], [2, terms([row.kind, row.mode, row.platform, row.scenario].join(' '))], [1, terms(row.summary)]] }));
  const idf = new Map(groups.flat().map(t => [t, Math.log((rows.length + 1) / (rows.filter(r => r.fields.some(([, f]) => f.some(w => matches(t, w)))).length + 1)) + 1]));
  const ranked = rows.map(r => {
    let covered = 0, score = 0;
    for (const group of groups) { let best = 0; for (const t of group) for (const [weight, f] of r.fields) if (f.some(w => matches(t, w))) best = Math.max(best, weight * idf.get(t)); if (best) { covered++; score += best; } }
    return { ...r, covered, score: score + (exact.has(r.row.id) ? 1000 : 0) + (words.includes(r.row.id) ? 100 : 0) };
  }).filter(r => r.covered).sort((a, b) => b.covered - a.covered || b.score - a.score || a.order - b.order);
  return { groups, ignored, unknown, complete: ranked.filter(r => r.covered === groups.length).length, rows: ranked.slice(0, 8).map(r => r.row) };
}

const READABLE = /\.(md|css|html|json|txt|ya?ml|svg|js|mjs|ts|tsx)$/i;
export function libraryResource(path, { root = join(skillRoot, 'library') } = {}) {
  const label = String(path ?? '').replace(/^library\//, '');
  if (!label.trim() || isAbsolute(label) || label.split(/[\\/]/).includes('..')) throw new Error('read --path takes a path inside library/, such as skills/ID/ or design-systems/ID/DESIGN.md.');
  const base = realpathSync(root); let real;
  try { real = realpathSync(join(base, label)); } catch { throw new Error('No such library path: ' + label); }
  if (real === base) throw new Error('Search with catalog --query instead of listing the whole library.');
  if (!real.startsWith(base + sep)) throw new Error('Library path resolves outside library/: ' + label);
  if (statSync(real).isDirectory()) {
    const files = [], seen = new Set();
    const walk = dir => {
      if (seen.has(dir)) return; seen.add(dir);
      for (const name of readdirSync(dir).sort()) {
        let target; try { target = realpathSync(join(dir, name)); } catch { continue; }
        if (!target.startsWith(base + sep)) continue;
        if (statSync(target).isDirectory()) walk(target); else if (READABLE.test(name)) files.push(relative(base, join(dir, name)) + ' (' + statSync(target).size + ' bytes)');
      }
    };
    walk(real);
    return { label, pages: splitText(`Directory ${label}: ${files.length} readable file(s). Read one with read --path FILE --page N.\n` + files.join('\n') + '\n') };
  }
  if (real === join(base, 'catalog.tsv')) throw new Error('Search the catalog with catalog --query WORDS.');
  if (!READABLE.test(real)) throw new Error('Not a readable text resource: ' + label);
  const pages = splitText(read(real));
  return { label, pages: pages.length ? pages : [''] };
}

function entry(id) {
  const row = catalog().find(r => r.kind === 'skill' && r.id === id);
  if (!row) throw new Error('Select a skill entry id from the catalog, not a guessed path.');
  return row;
}

function craftFilesForEntry(row) {
  let names = (row.craft || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!names.length) {
    try {
      const md = read(join(skillRoot, row.path));
      const fm = md.match(/^---\n([\s\S]*?)\n---/);
      if (fm) {
        const inline = fm[1].match(/^\s*requires:\s*\[([^\]]*)\]/m);
        if (inline) {
          names = inline[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        } else {
          const block = fm[1].match(/^\s*craft:\s*\n(?:\s+[^\n]+\n)*?\s*requires:\s*\n((?:\s*-\s+[^\n]+\n?)*)/m);
          if (block) {
            names = [...block[1].matchAll(/^\s*-\s+([^\n]+)/gm)].map(m => m[1].trim().replace(/^['"]|['"]$/g, ''));
          }
        }
      }
    } catch {}
  }
  const existing = names.filter(n => existsSync(join(skillRoot, 'library/craft', n + '.md')));
  const finalNames = existing.length ? existing : ['typography', 'color', 'anti-ai-slop'];
  return finalNames.map(name => 'library/craft/' + name + '.md');
}

export function coreBriefing() {
  const capLines = capabilities.map(c => `- **${c.id}**: ${c.when} (${c.commands.join(', ') || 'host/library'})`).join('\n');
  return [
    '# craft-design Core Briefing',
    '',
    '## Instruction Priority & Scope',
    '- Follow explicit user instructions, existing project/brand sources, and the core craft rules below.',
    '- Decks/slides and rendered `.mp4` video are out of scope.',
    '- Complete the brief without extra turns when requirements are clear; ask at most one focused round only for consequential structural gaps.',
    '',
    '## Visual Contract & Theme Registry',
    '- Bind one visual contract before authoring: supplied brand source, active project design system, or a subject-specific design spec written in an HTML comment at the top of the file.',
    '- Place all visual tokens inside the first `<style>` between `/* tokens:start */` and `/* tokens:end */`. Bind colors, typography, radii, shadows, and surfaces via `var(...)`; never leave unbacked literal colors or duplicated magic values outside the theme.',
    '- For library design systems, read `USAGE.md -> DESIGN.md -> tokens.css` and preserve real theme values.',
    '',
    '## Honesty & Demo Data',
    '- Preserve supplied facts verbatim; never invent metrics, testimonials, or unverified brand assets.',
    '- Mark any placeholder/demo data with `data-demo`, quiet footnotes, and honest non-submitting demo forms.',
    '- Add stable `data-craft-id="kebab-case-id"` to key regions, headings, CTAs, controls, and repeated cards.',
    '',
    '## Two-Stage Build & Verification',
    '- For multi-section pages, build the first screen (hero/header/primary view) and run `verify.mjs FILE --state STATE --stage calibrate --width 1440,390` first, inspect the 1:1 PNGs, then build remaining sections.',
    '- Run full `verify.mjs FILE --state STATE --width 1440,390` after final edits, then inspect the generated 1:1 viewport `strips` (`frame-*-s*.png`) and full PNGs against the brief.',
    '',
    '## Capabilities Map (know all; use only what the task needs)',
    capLines,
  ].join('\n');
}

export function curriculum(extra = []) {
  const core = coreBriefing();
  const extraFiles = extra.filter((s, i, a) => a.indexOf(s) === i).map(p => [p, read(join(skillRoot, p))]);
  const pages = [{ source: 'capability-map', part: 1, total: 1, body: core }];
  if (extraFiles.length) {
    const combined = extraFiles.map(([source, text]) => `=== ${source} ===\n${text}`).join('\n\n');
    const chunks = splitText(combined, DETAIL_PAGE_BYTES);
    chunks.forEach((body, idx) => {
      pages.push({ source: extraFiles[0][0], part: idx + 1, total: chunks.length, body });
    });
  }
  const refFiles = ['references/charter.md', 'references/charter-craft.md', 'references/visual-concepts.md'];
  return {
    edition: hash(JSON.stringify([read(join(skillRoot, 'SKILL.md')), core, ...refFiles.map(p => read(join(skillRoot, p))), extraFiles])),
    pages,
  };
}

export function loadState(path) {
  const state = JSON.parse(read(path));
  if (state.schema !== 1 || !Array.isArray(state.extra) || JSON.stringify(state.extra) !== JSON.stringify(state.plan ? validatePlan(state.plan) : [])) {
    throw new Error('Invalid guide state. Start a new state file.');
  }
  const guide = curriculum(state.extra);
  if (state.edition !== guide.edition) throw new Error('Instructions changed. Start a new state file and reconsider the route; old receipts are not valid.');
  if (!Number.isInteger(state.acknowledged) || state.acknowledged < 0 || state.acknowledged > guide.pages.length) throw new Error('Invalid guide position.');
  return { state, guide };
}

function save(path, state, initial = false) {
  state.updatedAt = new Date().toISOString();
  state.events ??= [];
  state.events.push({ at: state.updatedAt, phase: state.phase, acknowledged: state.acknowledged });
  mkdirSync(dirname(path), { recursive: true });
  if (initial) writeFileSync(path, JSON.stringify(state, null, 2) + '\n', { flag: 'wx' });
  else { const tmp = path + '.' + randomUUID() + '.tmp'; writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx' }); renameSync(tmp, path); }
}

export function validatePlan(plan) {
  if (!plan || !['direct', 'reference', 'generated'].includes(plan.visualPath)) throw new Error('visualPath must be direct, reference or generated.');
  for (const kind of ['generation', 'viewing']) {
    const v = plan.tools?.[kind];
    if (!v || !['available', 'unavailable', 'unknown'].includes(v.status) || typeof v.evidence !== 'string' || !v.evidence.trim()) {
      throw new Error(`tools.${kind} needs status and observed evidence; unknown is allowed but not a claim of absence.`);
    }
  }
  if (plan.visualPath === 'generated' && ['generation', 'viewing'].some(k => plan.tools[k].status !== 'available')) throw new Error('Generated proposals require both generation and visual inspection.');
  if (plan.visualPath === 'reference' && plan.tools.viewing.status !== 'available') throw new Error('Visual reference transfer requires visual inspection.');
  if (typeof plan.reason !== 'string' || !plan.reason.trim()) throw new Error('Explain the selected visual path in reason.');

  const allIds = capabilities.map(c => c.id);
  let normalizedCaps;
  if (Array.isArray(plan.use)) {
    for (const id of plan.use) {
      if (!allIds.includes(id)) throw new Error(`Unknown capability in use: ${id}`);
    }
    normalizedCaps = {};
    for (const id of allIds) {
      if (plan.capabilities && plan.capabilities[id]) {
        normalizedCaps[id] = plan.capabilities[id];
      } else if (plan.use.includes(id)) {
        normalizedCaps[id] = { choice: 'use', evidence: plan.reason };
      } else {
        normalizedCaps[id] = { choice: 'skip', evidence: 'Not needed for this task scope' };
      }
    }
  } else {
    if (JSON.stringify(Object.keys(plan.capabilities ?? {}).sort()) !== JSON.stringify([...allIds].sort())) {
      throw new Error('Assess every capability exactly once; use the ids from the capability map.');
    }
    normalizedCaps = plan.capabilities;
  }

  for (const c of capabilities) {
    const v = normalizedCaps[c.id];
    if (!['use', 'skip', 'unavailable'].includes(v?.choice) || typeof v.evidence !== 'string' || !v.evidence.trim()) {
      throw new Error(`Capability ${c.id} needs choice (use/skip/unavailable) and a task-specific reason.`);
    }
  }

  const extra = capabilities.filter(c => normalizedCaps[c.id].choice === 'use').flatMap(c => c.details);
  if (normalizedCaps.library.choice === 'use') {
    const row = entry(plan.entryId);
    extra.push(row.path, ...craftFilesForEntry(row));
  }
  return [...new Set(extra)];
}

export function requireReady(path) {
  const { state, guide } = loadState(path);
  if (state.phase !== 'ready' || state.acknowledged !== guide.pages.length || !state.plan) {
    throw new Error('Guide incomplete: receive and acknowledge every packet, then decide and read applicable details before implementation/verification.');
  }
  validatePlan(state.plan);
  return state;
}

function choosePrompt(path) {
  return 'BASE COMPLETE. Before authoring: inspect actual tools and select the route. Save plan JSON: {"visualPath":"direct|reference|generated","reason":"why for this task","tools":{"generation":{"status":"available|unavailable|unknown","evidence":"observed tool or discovery result"},"viewing":{"status":"available|unavailable|unknown","evidence":"observed viewer"}},"entryId":"catalog id when using library","use":["library","tokens","inspection","preview"]}.\nIds: ' + capabilities.map(c => c.id).join(', ') + '\nSelect with ' + guideCommand('catalog', '--query', 'WORDS') + ' (ranked), ' + guideCommand('entry', '--id', 'ID') + ' and ' + guideCommand('read', '--path', 'skills/ID/') + ' (or design-systems/ID/) to list files; read --path FILE --page N pages any listed text file. Then ' + guideCommand('decide', '--state', path, '--json', 'JSON') + ' (or --plan PLAN.json).';
}

function readyOutput(state) {
  const usesLibrary = Boolean(state.plan?.use?.includes('library') || state.plan?.capabilities?.library?.choice === 'use');
  const row = usesLibrary && state.plan?.entryId ? entry(state.plan.entryId) : null;
  const folder = row && dirname(row.path).replace(/^library\//, '') + '/';
  return 'READY. Delivered and acknowledged: core briefing, capability map, and targeted detail packets' + (row ? `, plus ${row.path} and its craft files` : '') + '. Route recorded. Not delivered automatically: ' + (row ? `the other files of ${folder} (sections, references, templates, examples), ` : '') + 'design-system and brand files. Read those the task needs before authoring' + (row ? '; ' + guideCommand('read', '--path', folder) + ' lists the entry files' : '') + '. Build within scope, then use verify.mjs with this state.';
}

function formatCatalog(query, includeSeeds = false) {
  const result = searchCatalog(query, { includeSeeds });
  if (!result.groups.length) {
    throw new Error('No searchable word in the query' + (result.unknown.length ? ' (unmapped: ' + result.unknown.join(', ') + ')' : '') + '. Use English catalog words such as landing, dashboard, mobile, onboarding, poster, report, or an id.');
  }
  const note = [result.ignored.length ? 'ignored: ' + result.ignored.join(', ') : '', result.unknown.length ? 'unmapped: ' + result.unknown.join(', ') : ''].filter(Boolean).join('; ');
  return `Catalog matches for ${result.groups.map(g => g.join('/')).join(' + ')}${note ? ' (' + note + ')' : ''}. ${result.complete ? Math.min(result.complete, 8) + ' shown match every word.' : 'No entry matches every word; partial matches, best first.'}\n` + (result.rows.map(r => `${r.kind} ${r.id} ${[r.mode, r.platform, r.scenario].filter(Boolean).join('/')}: ${r.summary.slice(0, 180)}`).join('\n') || 'No matching entry.') + `\nPreview a skill: ${guideCommand('entry', '--id', 'ID')}. List an entry's or system's files: ${guideCommand('read', '--path', 'skills/ID/')} or design-systems/ID/.`;
}

export function main(argv) {
  const args = [...argv], command = args.shift();
  const take = flag => { const i = args.indexOf(flag); if (i < 0) return null; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing ${flag} value`); return args.splice(i, 2)[1]; };
  const has = flag => { const i = args.indexOf(flag); if (i < 0) return false; args.splice(i, 1); return true; };

  if (command === '--help' || !command) {
    return console.log('craft-guide.mjs begin --state FILE [--query WORDS]\ncraft-guide.mjs decide --state FILE (--json JSON | --plan PLAN.json)\ncraft-guide.mjs next|status --state FILE [--receipt TOKEN]\ncraft-guide.mjs catalog --query WORDS [--include-seeds] | entry --id ID [--page N] | read --path LIBRARY_PATH [--page N]');
  }
  if (command === 'catalog') {
    const query = take('--query'), includeSeeds = has('--include-seeds');
    if (!query?.trim() || args.length) throw new Error("catalog --query 'WORDS': English catalog words or an id; common Russian artifact words are mapped.");
    console.log(formatCatalog(query, includeSeeds));
    return;
  }
  if (command === 'entry') {
    const id = take('--id'), number = Number(take('--page') || 1), row = entry(id), pages = splitText(read(join(skillRoot, row.path)));
    if (args.length || !Number.isInteger(number) || number < 1 || number > pages.length) throw new Error('entry --id ID --page N');
    const folder = dirname(row.path).replace(/^library\//, '') + '/', split = existsSync(join(skillRoot, dirname(row.path), 'sections'));
    console.log(`${row.path} ${number}/${pages.length}\n${pages[number - 1]}\nCandidate preview. decide delivers only this ENTRY.md and its catalog craft files.${split ? ' This ENTRY.md is an index; its content is in sections/.' : ''} Sections, references, templates, examples and design-system files are not delivered automatically: read those the task needs. ${guideCommand('read', '--path', folder)} lists them.`);
    return;
  }
  if (command === 'read') {
    const target = take('--path'), number = Number(take('--page') || 1);
    if (!target || args.length) throw new Error('read --path LIBRARY_PATH [--page N]');
    const { label, pages } = libraryResource(target);
    if (!Number.isInteger(number) || number < 1 || number > pages.length) throw new Error(`read --path ${label} --page 1..${pages.length}`);
    console.log(`LIBRARY ${label} ${number}/${pages.length}\n${pages[number - 1]}\nEND PAGE ${number}/${pages.length}. ${number < pages.length ? 'Next page: ' + guideCommand('read', '--path', label, '--page', number + 1) : 'End of resource.'}`);
    return;
  }

  const stateArg = take('--state'), receipt = take('--receipt'), planFile = take('--plan'), inlinePlan = take('--json'), cancelReason = take('--reason'), beginQuery = take('--query');
  if (!stateArg || args.length || !['begin', 'next', 'status', 'decide', 'cancel'].includes(command)) throw new Error('Use --help; a state file is required.');
  const path = resolve(stateArg); let state, guide;

  if (command === 'begin') {
    guide = curriculum();
    const browser = findBrowser();
    state = { schema: 1, edition: guide.edition, extra: [], acknowledged: 1, phase: 'choose', pending: null, plan: null };
    save(path, state, true);
    console.log(`Browser: ${browser ? 'detected (' + browser + ')' : 'unavailable'}`);
    console.log(guide.pages[0].body);
    if (beginQuery?.trim()) {
      console.log('');
      try { console.log(formatCatalog(beginQuery)); } catch (err) { console.log('Catalog note: ' + err.message); }
    }
    console.log('\n' + choosePrompt(path));
    return;
  }

  try { ({ state, guide } = loadState(path)); } catch (error) {
    if (command === 'cancel' && cancelReason?.trim()) { console.log('CANCELLED. Host guard released; unreadable or absent state left unchanged. No readiness claim.'); return; }
    throw error;
  }

  if (command === 'cancel') {
    if (!cancelReason?.trim()) throw new Error('cancel needs --reason documenting an explicit task cancellation.');
    state.phase = 'cancelled'; state.pending = null; state.cancelReason = cancelReason; save(path, state);
    console.log('CANCELLED. No readiness claim; checks requiring READY remain unavailable.');
    return;
  }

  if (command === 'next') {
    if (state.phase !== 'reading' || !receipt || receipt !== state.pending) throw new Error('Missing/wrong receipt. Read the complete pending packet with status; no progress recorded.');
    state.acknowledged++;
    state.pending = state.acknowledged < guide.pages.length ? randomUUID() : null;
    if (!state.pending) state.phase = state.plan ? 'ready' : 'choose';
    save(path, state);
  } else if (command === 'decide') {
    if (state.phase !== 'choose' || state.acknowledged !== guide.pages.length) throw new Error('Finish base instructions before choosing the route.');
    if (!!planFile === !!inlinePlan) throw new Error('Provide either --plan FILE or --json JSON with visualPath, reason, tools, capabilities or use, and entryId when using the library.');
    const plan = JSON.parse(inlinePlan ?? read(resolve(planFile)));
    const extra = validatePlan(plan);
    state.plan = plan; state.extra = extra;
    guide = curriculum(extra); state.edition = guide.edition;
    const detailsPages = guide.pages.slice(1);
    const totalDetailBytes = detailsPages.reduce((sum, p) => sum + Buffer.byteLength(p.body), 0);
    if (!detailsPages.length || totalDetailBytes <= DETAIL_INLINE_LIMIT) {
      state.acknowledged = guide.pages.length;
      state.pending = null;
      state.phase = 'ready';
      save(path, state);
      if (detailsPages.length) console.log(detailsPages.map(p => p.body).join('\n\n'));
      console.log(readyOutput(state));
      return;
    }
    state.acknowledged = 1;
    state.pending = randomUUID();
    state.phase = 'reading';
    save(path, state);
  }

  if (state.phase === 'reading') {
    const p = guide.pages[state.acknowledged];
    console.log(`CRAFT GUIDE ${state.acknowledged + 1}/${guide.pages.length} | ${p.source} ${p.part}/${p.total}\n${p.body}\nEND PACKET. Receipt: ${state.pending}\nNext: ${guideCommand('next', '--state', path, '--receipt', state.pending)}\nOne packet per tool call; retain the whole output (at least 4500 output tokens).`);
  } else if (state.phase === 'choose') {
    console.log(choosePrompt(path));
  } else if (state.phase === 'cancelled') {
    console.log('CANCELLED. No readiness claim; checks requiring READY remain unavailable.');
  } else {
    console.log(readyOutput(state));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { if (process.argv[2] && process.argv[2] !== '--help') consumeInvocation(skillRoot, process.cwd(), process.argv.slice(2)); main(process.argv.slice(2)); }
  catch (error) { console.error('guide: ' + error.message); process.exitCode = 2; }
}
