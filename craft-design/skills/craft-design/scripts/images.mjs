#!/usr/bin/env node
// craft-design images: find freely licensed photos and localize them with credits.
//
//   node images.mjs search "<query>" [--source commons|openverse] [--limit 8] [--min-width 1000]
//   node images.mjs get <ref> <artifact-dir> [--name <file-stem>] [--max 1600]
//
// search prints one line per result: ref, size, license, author, title, page.
// get downloads the image as <artifact-dir>/img/<name>.<ext>, at most --max px
// wide, prints its path and size, and appends the credit to img/CREDITS.md.
// <ref> is a ref printed by search (commons:File:…, openverse:<id>) or a direct
// image URL you already know the license of (credit then needs filling by hand).
// Only licenses that allow commercial use and modification are kept: CC0,
// public domain, CC BY, CC BY-SA.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const UA = 'craft-design/1.0 (https://github.com/maggnus/agentic-plugins)';
const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const source = flag('--source', 'commons');
const limit = Number(flag('--limit', 8));
const minWidth = Number(flag('--min-width', 1000));
const max = Number(flag('--max', 1600));
const nameFlag = flag('--name');
const [command, ...rest] = args;

function usage() {
  console.error('usage: node images.mjs search "<query>" [--source commons|openverse] [--limit 8] [--min-width 1000]\n'
    + '       node images.mjs get <ref|url> <artifact-dir> [--name <file-stem>] [--max 1600]');
  process.exit(2);
}

async function fetchRetry(url, { json = true, tries = 3 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        if (!json) return Buffer.from(await res.arrayBuffer());
        const data = await res.json();
        if (!data.error) return data;
        last = new Error(data.error.info || data.error.code);
      } else last = new Error(`HTTP ${res.status}`);
    } catch (err) { last = err; }
    await new Promise(ok => setTimeout(ok, 1500 * (i + 1)));
  }
  throw new Error(`${new URL(url).host}: ${last.message}`);
}

const text = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
// Commons short names: "CC BY-SA 4.0", "CC0", "Public domain", "PD-…".
const freeLicense = name => /^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?[ -][\d.]+)/i.test(name) && !/\b(nc|nd)\b/i.test(name);

const COMMONS = 'https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query';
async function commonsInfo(titles) {
  const url = `${COMMONS}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=${max}`
    + `&iiextmetadatafilter=LicenseShortName|Artist|LicenseUrl|ObjectName&titles=${encodeURIComponent(titles.join('|'))}`;
  const pages = (await fetchRetry(url)).query?.pages ?? [];
  return pages.filter(p => p.imageinfo).map(p => {
    const ii = p.imageinfo[0], meta = ii.extmetadata ?? {};
    return {
      ref: `commons:${p.title}`, title: text(meta.ObjectName?.value) || p.title.replace(/^File:|\.\w+$/g, ''),
      width: ii.width, height: ii.height, mime: ii.mime, license: text(meta.LicenseShortName?.value),
      licenseUrl: meta.LicenseUrl?.value ?? '', author: text(meta.Artist?.value) || 'unknown', page: ii.descriptionurl,
      file: ii.thumburl || ii.url, fileWidth: ii.thumbwidth || ii.width, fileHeight: ii.thumbheight || ii.height, source: 'Wikimedia Commons',
    };
  });
}
async function commonsSearch(query) {
  const url = `${COMMONS}&list=search&srnamespace=6&srlimit=${Math.min(limit * 4, 50)}&srsearch=${encodeURIComponent(query)}`;
  const titles = ((await fetchRetry(url)).query?.search ?? []).map(r => r.title).filter(t => /\.(jpe?g|png|webp)$/i.test(t));
  return titles.length ? commonsInfo(titles) : [];
}

const OPENVERSE = 'https://api.openverse.org/v1/images/';
const openverseItem = r => ({
  ref: `openverse:${r.id}`, title: r.title || 'untitled', width: r.width, height: r.height, mime: `image/${r.filetype || 'jpeg'}`,
  license: r.license === 'cc0' || r.license === 'pdm' ? r.license.toUpperCase() : `CC ${r.license.toUpperCase()} ${r.license_version ?? ''}`.trim(),
  licenseUrl: r.license_url ?? '', author: r.creator || 'unknown', page: r.foreign_landing_url, file: r.url,
  fileWidth: r.width, fileHeight: r.height, source: `Openverse (${r.source})`,
});
async function openverseSearch(query) {
  const url = `${OPENVERSE}?q=${encodeURIComponent(query)}&license_type=commercial,modification&page_size=${Math.min(limit * 2, 20)}&mature=false`;
  return ((await fetchRetry(url, { tries: 2 })).results ?? []).map(openverseItem);
}

async function search(query) {
  const results = (source === 'openverse' ? await openverseSearch(query) : await commonsSearch(query))
    .filter(r => /^image\/(jpeg|png|webp)$/.test(r.mime) && freeLicense(r.license) && (!r.width || r.width >= minWidth))
    .slice(0, limit);
  if (!results.length) {
    console.log(`no freely licensed results for "${query}"${source === 'commons' ? '; try other words, English terms or --source openverse' : ''}`);
    return;
  }
  for (const r of results) {
    console.log(`${r.ref}\n  ${r.width}x${r.height}  ${r.license}  by ${r.author.slice(0, 60)}  "${r.title.slice(0, 80)}"  ${r.page}`);
  }
}

function dimensions(path) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const [w, h] = [/pixelWidth: (\d+)/, /pixelHeight: (\d+)/].map(re => Number(out.match(re)?.[1]));
    if (w && h) return [w, h];
  } catch {}
  try {
    const out = execFileSync('identify', ['-format', '%w %h', `${path}[0]`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const [w, h] = out.split(' ').map(Number);
    if (w && h) return [w, h];
  } catch {}
  return null;
}
function shrink(path, width) {
  for (const [cmd, argv] of [['sips', ['--resampleWidth', String(max), path]], ['magick', [path, '-resize', `${max}x>`, path]], ['convert', [path, '-resize', `${max}x>`, path]]]) {
    if (width <= max) return true;
    try { execFileSync(cmd, argv, { stdio: 'ignore' }); return true; } catch {}
  }
  return false;
}

async function get(ref, dir) {
  if (!ref || !dir) usage();
  let item;
  if (ref.startsWith('commons:')) [item] = await commonsInfo([ref.slice(8)]);
  else if (ref.startsWith('openverse:')) item = openverseItem(await fetchRetry(`${OPENVERSE}${ref.slice(10)}/`));
  else if (/^https?:\/\//.test(ref)) item = { ref, title: '', file: ref, license: '', author: '', page: ref, source: new URL(ref).host };
  if (!item?.file) throw new Error(`not found: ${ref}`);
  if (item.license && !freeLicense(item.license)) throw new Error(`license ${item.license} does not allow commercial use and modification`);
  const imgDir = join(resolve(dir), 'img');
  mkdirSync(imgDir, { recursive: true });
  const ext = (item.file.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const stem = (nameFlag || item.title || 'image').normalize('NFKD').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image';
  let path = join(imgDir, `${stem}.${ext}`);
  for (let n = 2; existsSync(path); n++) path = join(imgDir, `${stem}-${n}.${ext}`);
  const tmp = `${path}.part`;
  writeFileSync(tmp, await fetchRetry(item.file, { json: false }));
  renameSync(tmp, path);
  let size = dimensions(path) ?? (item.fileWidth ? [item.fileWidth, item.fileHeight] : null);
  if (size && size[0] > max && shrink(path, size[0])) size = dimensions(path) ?? size;
  const rel = `img/${path.slice(imgDir.length + 1)}`;
  const credits = join(imgDir, 'CREDITS.md');
  if (!existsSync(credits)) writeFileSync(credits, '# Image credits\n\n');
  const credit = item.license
    ? `- \`${rel}\` — "${item.title}" by ${item.author}, ${item.license}${item.licenseUrl ? ` (${item.licenseUrl})` : ''}, ${item.source}: ${item.page}\n`
    : `- \`${rel}\` — from ${item.page}; author and license: FILL IN\n`;
  if (!readFileSync(credits, 'utf8').includes(`\`${rel}\``)) appendFileSync(credits, credit);
  console.log(rel);
  console.log(`  ${size ? `${size[0]}x${size[1]}` : 'size unknown'}, ${Math.round(statSync(path).size / 1024)} KB, ${item.license || 'license unknown'}${item.author ? `, by ${item.author}` : ''}`);
  if (item.license && !/^(cc0|public domain|pd)/i.test(item.license)) console.log(`  visible credit required: ${item.author}, ${item.license}`);
}

try {
  if (command === 'search' && rest[0]) await search(rest.join(' '));
  else if (command === 'get') await get(rest[0], rest[1]);
  else usage();
} catch (err) {
  console.error(`images: ${err.message}`);
  process.exit(1);
}
