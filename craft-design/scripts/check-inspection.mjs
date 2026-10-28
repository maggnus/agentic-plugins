#!/usr/bin/env node
// Behavioral fixtures: defects, legitimate overflow, fonts and final evidence.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), '../skills/craft-design/scripts/inspect.mjs');
const work = mkdtempSync(join(tmpdir(), 'craft-inspection-test-'));
const html = content => `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box}body{margin:0;padding:16px;font:16px/24px Arial,sans-serif;color:#111;background:white}
button,input{font:inherit;min-height:48px;min-width:96px}section{margin-bottom:16px}h1{font-size:36px;line-height:.9;margin:0 0 24px}
.clipped{width:220px;height:42px;overflow:hidden}.scroll{width:250px;height:60px;overflow:auto}
.stack{position:relative;height:50px}.covered{position:absolute;inset:0 auto auto 0}.cover{position:absolute;left:0;top:0;width:220px;height:30px;background:black;color:white}
@font-face{font-family:BrokenFixture;src:url(data:font/woff2;base64,bm90LWEtZm9udA==)}
</style><body>${content}</body></html>`;
const bad = html(`<section class="clipped" data-craft-id="clip">Visible first row<br>Partly hidden row<br>Entirely hidden row</section>
<section class="stack"><span class="covered" data-craft-id="covered">Covered words</span><div class="cover">Opaque panel</div></section>
<img data-craft-id="broken-image" src="missing.png" width="80" height="80" alt="Missing fixture">
<input data-craft-id="unnamed"><p style="font-family:BrokenFixture,Arial">Fallback sample</p>`);
const good = html(`<h1 data-craft-id="tight-leading">Readable title</h1><p data-craft-id="plain">Readable paragraph</p>
<button data-craft-id="nested"><span>Save changes</span></button>
<section class="scroll" data-craft-id="allowed-scroll">Row one<br>Row two<br>Row three<br>Row four</section>
<div hidden class="clipped">Ignored hidden text with overflow</div>
<label>Name <input value="Ada"></label><button id="open">Open</button><section id="state" hidden>Visible after click</section>
<script>document.querySelector('#open').onclick=()=>document.querySelector('#state').hidden=false</script>`);
const repaired = bad.replace('class="clipped"','').replace('<div class="cover">Opaque panel</div>','')
  .replace('src="missing.png"', 'src="data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/>') + '"')
  .replace('<input data-craft-id="unnamed">','<input data-craft-id="unnamed" aria-label="Name">');

function run(name, source, options = [], env = process.env, width = 720) {
  const file = join(work, name + '.html'), out = join(work, name + '.png');
  writeFileSync(file, source);
  const r = spawnSync(process.execPath, [script, file, '--width', String(width), '--height', '640', '--wait', '0', '--out', out, ...options],
    { encoding: 'utf8', timeout: 60000, env });
  const report = existsSync(join(work, name + '.json')) ? JSON.parse(readFileSync(join(work, name + '.json'))) : null;
  return { ...r, file, out, report };
}
try {
  // Match the package's browser-test policy: hosted CI may lack a usable sandbox.
  const badResult = process.env.CI ? { status: 3 } : run('bad', bad, ['--strict'], { ...process.env, CHROME_PATH: join(work, 'absent') });
  if (badResult.status === 3) {
    console.log(`inspection browser fixtures skipped: ${process.env.CI ? 'CI browser sandbox not assumed' : 'browser unavailable'} (not a pass)`);
  } else {
    assert.equal(badResult.status, 1, badResult.stdout + badResult.stderr);
    const findings = badResult.report.findings;
    for (const code of ['text-clipped', 'possible-occlusion', 'broken-image', 'control-name', 'font-load-error'])
      assert.ok(findings.some(f => f.code === code), `${code} detected: ${JSON.stringify(findings)}`);
    assert.equal(findings.find(f => f.code === 'text-clipped').craftId, 'clip');
    assert.ok(badResult.report.fonts.some(f => f.actual.some(a => a.glyphCount > 0)), 'actual fonts have rendered glyphs');
    const hash = value => createHash('sha256').update(value).digest('hex');
    assert.equal(badResult.report.sourceSha256, hash(readFileSync(badResult.file)));
    assert.equal(badResult.report.screenshotSha256, hash(readFileSync(badResult.out)));
    assert.equal(readFileSync(badResult.file, 'utf8'), bad, 'inspection leaves source unchanged');

    const valid = run('good', good, ['--strict']);
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    assert.equal(valid.report.summary.errors, 0);
    assert.ok(!valid.report.findings.some(f => ['text-clipped', 'possible-occlusion'].includes(f.code)), 'tight leading, nested labels and ordinary scroll are not defects');
    const fits = run('no-scroll-contract', good, ['--fit', '--strict']);
    assert.equal(fits.status, 1);
    assert.ok(fits.report.findings.some(f => f.code === 'scroll-region' && f.craftId === 'allowed-scroll'));

    const fixed = run('repaired', repaired, ['--strict']);
    assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
    assert.ok(!fixed.report.findings.some(f => ['text-clipped', 'possible-occlusion', 'broken-image', 'control-name'].includes(f.code)), 'repairs remove the corresponding findings');

    const clicked = run('clicked', good, ['--click', '#open']);
    assert.equal(clicked.status, 0, clicked.stderr);
    assert.equal(clicked.report.coverage.textNodes, valid.report.coverage.textNodes + 1, 'inspection sees the revealed interaction state');
    assert.deepEqual(clicked.report.state.clicks, ['#open']);
    const outside = run('outside', html('<p style="position:absolute;top:700px">Outside frame</p>'), ['--fit', '--strict']);
    assert.equal(outside.status, 1);
    assert.ok(outside.report.findings.some(f => f.code === 'outside-frame'));
    const invalid = run('invalid', good, ['--width', 'Infinity']);
    assert.equal(invalid.status, 2, invalid.stderr);
    const mobileWide = run('mobile-wide', html('<div style="width:800px;height:40px">Wide content</div>'), ['--strict'], process.env, 390);
    assert.equal(mobileWide.status, 1, mobileWide.stdout);
    assert.equal(mobileWide.report.viewport.width, 390, 'requested frame remains separate from expanded mobile layout');
    assert.ok(mobileWide.report.findings.some(f => f.code === 'horizontal-overflow'));
    const mobileFit = run('mobile-fit', html('<div style="width:800px;height:40px">Wide content</div><p style="position:absolute;top:700px">Below frame</p>'), ['--fit','--strict'], process.env, 390);
    assert.equal(mobileFit.status, 1);
    assert.ok(mobileFit.report.findings.some(f => f.code === 'outside-frame'));
    const fixedText = '<div style="width:100px;height:50px;overflow:hidden"><span style="position:fixed;left:200px;top:100px">Fully visible fixed text</span></div>';
    const fixedEscape = run('fixed-escape', html(fixedText), ['--strict']);
    assert.equal(fixedEscape.status, 0, fixedEscape.stdout);
    assert.ok(!fixedEscape.report.findings.some(f => f.code === 'text-clipped'));
    const fixedClipped = run('fixed-clipped', html(fixedText.replace('overflow:hidden','overflow:hidden;transform:translate(0)')), ['--strict']);
    assert.equal(fixedClipped.status, 1);
    assert.ok(fixedClipped.report.findings.some(f => f.code === 'text-clipped'), 'a transformed ancestor really does clip its fixed descendant');
    for (const [property, value] of [['translate','0px'],['rotate','0deg'],['scale','1'],['will-change','translate']]) {
      const transformed = run('fixed-' + property, html(fixedText.replace('overflow:hidden', `overflow:hidden;${property}:${value}`)), ['--strict']);
      assert.equal(transformed.status, 1, transformed.stdout);
      assert.ok(transformed.report.findings.some(f => f.code === 'text-clipped'), `${property} establishes a clipping containing block`);
    }
    const unnamed = run('unnamed-values', html('<select id="choice"><option>Value only</option></select><textarea id="notes">Existing value</textarea>'), ['--strict']);
    assert.equal(unnamed.status, 1);
    assert.deepEqual(unnamed.report.findings.filter(f => f.code === 'control-name').map(f => f.selector).sort(), ['#choice','#notes']);
    const named = run('named-values', html('<label>Choice<select><option>Value</option></select></label><textarea aria-label="Notes">Existing value</textarea>'), ['--strict']);
    assert.equal(named.status, 0, named.stdout);
    console.log('inspection fixtures passed: clipping, occlusion, repair, scroll policy, names, images, fonts, state and hashes');
  }
} finally { rmSync(work, { recursive: true, force: true }); }
