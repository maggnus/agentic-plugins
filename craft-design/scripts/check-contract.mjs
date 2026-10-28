#!/usr/bin/env node
// End-to-end render contracts: readiness, required content, runtime and frame mode.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateContract, waitForExpectations } from '../skills/craft-design/scripts/contract.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), '../skills/craft-design/scripts/inspect.mjs');
const work = mkdtempSync(join(tmpdir(), 'craft-contract-test-'));
const html = content => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:16px/24px Arial;color:#111;background:white}button{font:inherit;min-width:96px;min-height:48px}</style><body>${content}</body>`;
function run(name, source, contract, options = []) {
  const file = join(work, name + '.html'), out = join(work, name + '.png');
  const contractFile = join(work, name + '-contract.json');
  writeFileSync(file, source);
  if (contract) writeFileSync(contractFile, JSON.stringify(contract));
  const r = spawnSync(process.execPath, [script, file, ...(options.includes('--width') ? [] : ['--width', '720']), '--height', '640', '--wait', '0', '--strict', ...(options.includes('--out') ? [] : ['--out', out]),
    ...(contract ? ['--contract', contractFile] : []), ...options], { encoding: 'utf8', timeout: 60000 });
  const reportFile = join(work, name + '.json');
  return { ...r, file, contractFile, report: existsSync(reportFile) ? JSON.parse(readFileSync(reportFile)) : null };
}
try {
  for (const bad of [{version:2}, {version:1}, {version:1,checks:[{selector:'p',cout:1}]},
    {version:1,checks:[{selector:'p',count:1,min:1}]}, {version:1,ready:[{selector:'p',box:{}}]},
    {version:1,noRuntimeErrors:'true'}, {version:1,timeoutMs:15001,noRuntimeErrors:true}]) {
    assert.throws(() => validateContract(bad));
  }
  const slowTransport = () => new Promise(ok => setTimeout(() => ok({result:{value:[{pass:true}]}}),100));
  const delayedProbe = await waitForExpectations(slowTransport,{ready:[{selector:'#ready'}],timeoutMs:10});
  assert.equal(delayedProbe.timedOut,true,'late transport response cannot satisfy a positive deadline');
  const immediateProbe = await waitForExpectations(slowTransport,{ready:[{selector:'#ready'}],timeoutMs:0});
  assert.equal(immediateProbe.timedOut,false,'zero requests one probe without polling');
  const collision = run('collision',html('<main>Ready</main>'),{version:1,checks:[{selector:'main'}]},['--out',join(work,'collision-contract.png')]);
  assert.equal(collision.status,2);
  assert.equal(JSON.parse(readFileSync(collision.contractFile)).version,1,'report cannot overwrite the contract');
  const sourceCollision = run('source-collision',html('<main>Ready</main>'),null,['--out',join(work,'source-collision.html')]);
  assert.equal(sourceCollision.status,2);
  assert.equal(readFileSync(sourceCollision.file,'utf8'),html('<main>Ready</main>'),'capture cannot overwrite its source');
  const urlInput = join(work,'url-source.html'), alias = join(work,'url-alias.png');
  writeFileSync(urlInput,html('<main>Ready</main>')); linkSync(urlInput,alias);
  const urlCollision = spawnSync(process.execPath,[script,pathToFileURL(urlInput).href,'--out',alias],{encoding:'utf8',timeout:60000});
  assert.equal(urlCollision.status,2,urlCollision.stdout+urlCollision.stderr);
  assert.equal(readFileSync(urlInput,'utf8'),html('<main>Ready</main>'),'file URLs protect the source inode too');
  const loading = html('<main>Loading…</main><script>throw new Error("render-fixture-failed")</script>');
  const baseline = process.env.CI ? { status:3 } : run('uncontracted', loading);
  if (baseline.status === 3) {
    console.log(`contract browser fixtures skipped: ${process.env.CI ? 'CI browser sandbox not assumed' : 'browser unavailable'} (not a pass)`);
  } else {
    assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
    assert.ok(baseline.report.findings.some(f => f.code === 'runtime-error' && f.severity === 'review'));
    const required = {version:1,timeoutMs:100,ready:[{selector:'#ready',count:1}],checks:[{selector:'.row',count:3}],noRuntimeErrors:true};
    const broken = run('broken', loading, required);
    assert.equal(broken.status, 1, broken.stdout + broken.stderr);
    for (const code of ['runtime-error','readiness-timeout','content-contract']) assert.ok(broken.report.findings.some(f=>f.code===code && f.severity==='error'), code);
    assert.ok(broken.report.runtime.errors.some(e=>e.message.includes('render-fixture-failed')));

    const delayed = html(`<main id="loading">Loading…</main><script>setTimeout(()=>{document.querySelector('main').outerHTML='<main id="ready"><div class="row">Alpha</div><div class="row">Beta</div><div class="row">Gamma</div></main>'},700)</script>`);
    const healthy = run('healthy', delayed, {...required,timeoutMs:4000,checks:[...required.checks,{selector:'#loading',count:0},{selector:'#ready',textIncludes:'Alpha Beta Gamma'}]});
    assert.equal(healthy.status, 0, healthy.stdout + healthy.stderr);
    assert.equal(healthy.report.contract.readiness.timedOut, false);
    assert.ok(healthy.report.contract.readiness.waitedMs > 0, 'the rendered ready state is awaited');
    assert.equal(healthy.report.contract.sha256, createHash('sha256').update(readFileSync(healthy.contractFile)).digest('hex'));
    assert.equal(readFileSync(healthy.file,'utf8'),delayed,'inspection does not modify its source');

    const hidden = run('hidden-copy',html('<main>Loading<span hidden>Required evidence</span></main><p hidden class="row">Hidden row</p>'),
      {version:1,checks:[{selector:'main',textIncludes:'Required evidence'},{selector:'.row',count:1}]});
    assert.equal(hidden.status,1);
    assert.equal(hidden.report.contract.checks.filter(c=>!c.pass).length,2,'hidden copy and hidden rows cannot satisfy displayed-content conditions');
    const transparent = run('transparent-copy',html('<main>Loading<span style="opacity:0">Required evidence</span></main>'),{version:1,checks:[{selector:'main',textIncludes:'Required evidence'}]});
    assert.equal(transparent.status,1,'transparent descendants are not displayed text');
    const visibility = run('visibility-override',html('<div style="visibility:hidden"><span class="loading" style="visibility:visible">Still loading</span></div>'),{version:1,checks:[{selector:'.loading',count:0}]});
    assert.equal(visibility.status,1,'visible descendants can override inherited visibility');
    const contents = run('display-contents',html('<div class="loading" style="display:contents">Still loading</div>'),{version:1,checks:[{selector:'.loading',count:0}]});
    assert.equal(contents.status,1,'display:contents is not absence');
    const contentsEffects = run('contents-effects',html('<main style="display:contents;opacity:0;content-visibility:hidden"><p class="loading">Still loading</p></main>'),{version:1,checks:[{selector:'.loading',count:0},{selector:'main',textIncludes:'Still loading'}]});
    assert.equal(contentsEffects.status,1,'box effects on display:contents do not hide its rendered descendants');
    assert.equal(contentsEffects.report.contract.checks[0].pass,false);
    assert.equal(contentsEffects.report.contract.checks[1].pass,true);
    const contentsVisibility = run('contents-visibility',html('<main style="display:contents;visibility:hidden">Hidden text<span style="visibility:visible">Visible text</span></main>'),{version:1,checks:[{selector:'main',textIncludes:'Visible text'},{selector:'main',textIncludes:'Hidden text'}]});
    assert.equal(contentsVisibility.status,1);
    assert.deepEqual(contentsVisibility.report.contract.checks.map(c=>c.pass),[true,false]);
    const text = run('inline-copy',html('<main><p>Re<span>quired</span> evidence</p><p>Next line</p></main>'),{version:1,checks:[{selector:'main',textIncludes:'Required evidence Next line'}]});
    assert.equal(text.status,0,text.stdout + text.stderr);
    const late = run('late-ready',html('<main>Loading</main><script>setTimeout(()=>{const end=performance.now()+700;while(performance.now()<end){} document.querySelector("main").id="ready";},50)</script>'),{version:1,timeoutMs:200,ready:[{selector:'#ready'}]});
    assert.equal(late.status,1,late.stdout + late.stderr);
    assert.equal(late.report.contract.readiness.timedOut,true);
    const absence = run('absence',html('<p hidden class="spinner">Waiting</p>'),{version:1,checks:[{selector:'.spinner',count:0},{selector:'.spinner',count:1,visible:false}]});
    assert.equal(absence.status,0,absence.stdout);
    const invalid = run('bad-selector',html('<main>Ready</main>'),{version:1,checks:[{selector:'['}]});
    assert.equal(invalid.status,1);
    assert.deepEqual(invalid.report.contract.checks[0].failures,['evaluation']);
    const invalidSchema = run('bad-schema',html('Ready'),{version:1,checks:[{selector:'main',cout:1}]});
    assert.equal(invalidSchema.status,2);
    assert.equal(invalidSchema.report,null);

    const framed = html('<iframe id="artboard" title="Artboard" style="width:320px;height:240px;border:0" srcdoc="<style>body{margin:0}.card{width:300px;height:200px}</style><div class=card>Expected card</div>"></iframe>');
    const frameContract = {version:1,ready:[{frame:'#artboard',selector:'.card',count:1}],checks:[{frame:'#artboard',selector:'.card',textIncludes:'Expected card',box:{width:300,height:200,tolerance:0}}]};
    const frame = run('frame',framed,frameContract);
    assert.equal(frame.status,0,frame.stdout + frame.stderr);
    const wrongBox = run('wrong-box',framed,{...frameContract,checks:[{frame:'#artboard',selector:'.card',box:{width:301,tolerance:0}}]});
    assert.equal(wrongBox.status,1);
    assert.deepEqual(wrongBox.report.contract.checks[0].failures,['box size']);
    const opaqueFrame = run('opaque-frame',framed.replace('id="artboard"','id="artboard" sandbox'),{version:1,checks:frameContract.checks});
    assert.equal(opaqueFrame.status,1);
    assert.match(opaqueFrame.report.contract.checks[0].evidence.error,/unavailable/);

    const narrow = '<!doctype html><style>body{margin:0}main{width:100vw;height:100px}</style><main>Fixed artboard</main>';
    const size = {version:1,checks:[{selector:'main',box:{width:390}}]};
    const auto = run('auto-mobile',narrow,size,['--width','390']);
    assert.equal(auto.status,1,'legacy automatic mobile mode retains its browser layout behavior');
    assert.equal(auto.report.state.mobile,true);
    const desktop = run('narrow-desktop',narrow,size,['--width','390','--mode','desktop']);
    assert.equal(desktop.status,0,desktop.stdout + desktop.stderr);
    assert.equal(desktop.report.state.mobile,false);
    const explicitMobile = run('explicit-mobile',narrow,size,['--width','720','--mode','mobile']);
    assert.equal(explicitMobile.report.state.mobile,true);
    const wrongMode = run('wrong-mode',narrow,null,['--mode','unknown']);
    assert.equal(wrongMode.status,2);
    const clicked = run('clicked-error',html('<button id="open" onclick="console.error(\'click-fixture-failed\')">Open</button>'),{version:1,noRuntimeErrors:true},['--click','#open']);
    assert.equal(clicked.status,1);
    assert.ok(clicked.report.runtime.errors.some(e=>e.message.includes('click-fixture-failed')));
    console.log('contract fixtures passed: missing/hidden content, readiness, runtime, frames, exact dimensions, source integrity and explicit mode');
  }
} finally { rmSync(work, {recursive:true,force:true}); }
