#!/usr/bin/env node
// craft-design brand kit: render brand.html from a (possibly partial) brand.json
// with the brand-extract template, the way OpenDesign's `od brand preview` does.
//
//   node brand-kit.mjs <dir>/brand.json [--status extracting|ready|draft|failed] [--out <dir>/brand.html]
//
// While the status is `extracting` the page reloads itself, so each pass shows
// up live in the craft-design preview.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '../library/skills/brand-extract/templates/brand-kit.html');
const STATUSES = ['extracting', 'ready', 'draft', 'failed'];

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const status = flag('--status', 'extracting');
const input = args[0];
if (!input || !STATUSES.includes(status)) {
  console.error(`usage: node brand-kit.mjs <brand.json> [--status ${STATUSES.join('|')}] [--out brand.html]`);
  process.exit(2);
}
const brandPath = resolve(input);
const dir = dirname(brandPath);
const out = resolve(flag('--out', join(dir, 'brand.html')));

let brand;
try { brand = JSON.parse(readFileSync(brandPath, 'utf8')); } catch (err) { console.error(`cannot read ${input}: ${err.message}`); process.exit(1); }

function hostOf(value) {
  try { return value.sourceUrl ? new URL(value.sourceUrl).hostname.replace(/^www\./i, '') : 'Brand'; } catch { return 'Brand'; }
}

const payload = {
  status,
  host: hostOf(brand),
  brand,
  assets: [],
  system: null,
  brandMd: existsSync(join(dir, 'BRAND.md')) ? { href: 'BRAND.md' } : null,
  locale: 'en',
};
// Escape `</` and U+2028/U+2029 so the JSON cannot break out of its script tag.
const json = JSON.stringify(payload).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const fontFace = existsSync(join(dir, 'fonts/fonts.css')) ? '@import url("fonts/fonts.css");' : '';

const html = readFileSync(TEMPLATE, 'utf8')
  .split('__OD_BRAND_PAYLOAD__').join(json)
  .split('__OD_BRAND_FONTFACE__').join(fontFace)
  .split('__OD_BRAND_LANG__').join('en')
  .split('__OD_BRAND_TITLE__').join('Brand Kit');
writeFileSync(out, html);
console.log(out);
