#!/usr/bin/env node
// Regression cases from the independent review: supplied scales, browser defaults,
// long-page evidence and explicit required content across responsive widths.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inspectHtml } from '../skills/craft-design/scripts/tokens.mjs';
import { capabilities, validatePlan, curriculum } from '../skills/craft-design/scripts/craft-guide.mjs';
const skill=join(dirname(fileURLToPath(import.meta.url)),'../skills/craft-design');
const css=readFileSync(join(skill,'library/design-systems/stripe/tokens.css'),'utf8');
const wrap=(theme,styles,body='<h1>Review fixture</h1><p>Required information</p>')=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>/* tokens:start */\n${theme}\n/* tokens:end */\n${styles}</style><body>${body}</body></html>`;
const system=wrap(css,'body{background:var(--bg);color:var(--fg);font-family:var(--font-body);padding:var(--space-4)}h1{font-family:var(--font-display)}article{background:var(--surface)}button{background:var(--accent);color:var(--accent-on)}','<h1>Review fixture</h1><article><p>Required information</p><button>Continue</button></article>');
const report=inspectHtml(system);
assert.equal(report.warnings.length,0,JSON.stringify(report.warnings));
assert.ok(report.exceptions[0].matchingSystems.includes('stripe'));
assert.ok(report.exceptions[0].tokens.length>0);
assert.match(report.exceptions[0].tokenMapSha256,/^[a-f0-9]{64}$/);
assert.ok(inspectHtml(system.replace('/* tokens:end */',':root{--unused-custom:19px}/* tokens:end */')).warnings.some(w=>w.code==='unused-token'&&w.message.includes('--unused-custom')),'custom values are not waived by an existing bundled scale');
assert.equal(inspectHtml(system.replace('--bg:           #ffffff;','--bg:           #fefefe;')).exceptions.length,0,'a changed scale cannot claim unchanged provenance');
assert.ok(inspectHtml(system.replace('--bg:           #ffffff;','--bg:           #fefefe;')).warnings.some(w=>w.code==='unused-token'));
for (const name of readdirSync(join(skill,'library/design-systems'))) {
  const file=join(skill,'library/design-systems',name,'tokens.css');if(!existsSync(file))continue;
  const r=inspectHtml(wrap(readFileSync(file,'utf8'),'body{color:var(--fg)}'));
  assert.ok(r.exceptions.some(e=>e.matchingSystems.includes(name)),name+': every copied scale must include its own source among matches');
  assert.ok(!r.warnings.some(w=>w.code==='unused-token'),name+': supplied scale is preserved');
}
const theme=':root{--bg:#fff;--fg:#111;--font-body:Arial,sans-serif;--text-base:16px;--space-4:16px}';
const styles='body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);font-size:var(--text-base);padding:var(--space-4)}';
const ua=wrap(theme,styles);
const work=mkdtempSync(join(tmpdir(),'craft-review-fixes-'));
try {
  if(!process.env.CI){
    const html=join(work,'index.html');
    const runTokens=text=>{writeFileSync(html,text);const r=spawnSync(process.execPath,[join(skill,'scripts/tokens.mjs'),'check',html,'--width','1440,390','--strict','--json'],{encoding:'utf8',timeout:120000});assert.ifError(r.error);return {...r,data:JSON.parse(r.stdout)};};
    let r=runTokens(system);
    assert.equal(r.status,0,r.stdout+r.stderr);
    assert.equal(r.data.findings.length,0,'distinct semantic variables with the same values are valid');
    r=runTokens(ua);
    assert.equal(r.status,0,r.stdout+r.stderr);
    assert.equal(r.data.findings.length,0,'default p margin is not a copied author value');
    r=runTokens(ua.replace('</style>','p{margin:16px}</style>'));
    assert.equal(r.status,1,'authored literal remains a duplicate candidate');
    assert.ok(r.data.findings.some(f=>f.code==='possible-duplicate'));
    r=runTokens(ua.replace('</style>','@media(max-width:600px){body{font-size:16px}}</style>'));
    assert.equal(r.status,1,'responsive broken binding must still fail');
    assert.ok(r.data.findings.some(f=>f.code==='mutation-no-effect'));
    for (const style of ['padding-inline:16px','margin-block:16px','writing-mode:vertical-rl;direction:rtl;padding-block:16px;padding-inline:16px','--gutter:16px;padding:var(--gutter)']) {
      const logical=runTokens(wrap(theme,styles+`.bar{${style}}`,'<div class="bar">Copied spacing</div>'));
      assert.equal(logical.status,1,style+logical.stdout);
      assert.ok(logical.data.findings.some(f=>f.code==='possible-duplicate'),style);
    }
    for (const value of ['var(--space-2) 16px','calc(var(--space-2) + 8px)']) {
      const mixed=runTokens(wrap(theme.replace('--bg:','--space-2:8px;--bg:'),styles+`.bar{padding:${value}}`,'<div class="bar">Mixed variable and copied literal</div>'));
      assert.equal(mixed.status,1,value+mixed.stdout);
      assert.ok(mixed.data.findings.some(f=>f.code==='possible-duplicate'),value);
    }
    for (const value of ['var(--space-2) 16px','calc(var(--space-2) + 8px)']) {
      const mixedGap=runTokens(wrap(theme.replace('--bg:','--space-2:8px;--bg:'),styles+`.bar{display:flex;gap:${value}}`,'<div class="bar"><span>One</span><span>Two</span></div>'));
      assert.equal(mixedGap.status,1,value+mixedGap.stdout);
      assert.ok(mixedGap.data.findings.some(f=>f.code==='possible-duplicate'),value);
    }
    const mixedAlias=runTokens(wrap(theme.replace('--bg:','--space-2:8px;--bg:'),styles+'.bar{--gutter:calc(var(--space-2) + 8px);padding:var(--gutter)}','<div class="bar">Mixed value behind alias</div>'));
    assert.equal(mixedAlias.status,1,mixedAlias.stdout);
    assert.ok(mixedAlias.data.findings.some(f=>f.code==='possible-duplicate'));
    const semanticAlias=runTokens(wrap(theme.replace('--bg:', '--other-space:16px;--bg:'),styles+'.bar{--gutter:var(--other-space);padding:var(--gutter)}','<div class="bar">Distinct semantic alias</div>'));
    assert.equal(semanticAlias.status,0,semanticAlias.stdout);
    const unsafeAlias=runTokens(wrap(theme.replace('--bg:', '--other-space:var(--gutter);--bg:'),styles+':root{--gutter:16px}.bar{padding:var(--other-space)}','<div class="bar">Alias to copied local value</div>'));
    assert.equal(unsafeAlias.status,1,unsafeAlias.stdout);
    assert.ok(unsafeAlias.data.findings.some(f=>f.code==='possible-duplicate'));
    const plan={visualPath:'direct',reason:'Test fixture',tools:{generation:{status:'unavailable',evidence:'Unit fixture'},viewing:{status:'available',evidence:'Test screenshots'}},capabilities:Object.fromEntries(capabilities.map(c=>[c.id,{choice:'skip',evidence:'Unit fixture'}]))};
    const extra=validatePlan(plan),guide=curriculum(extra),state=join(work,'state.json');
    // Fixture only: no host delivery is claimed; real-client tests use the guard.
    writeFileSync(state,JSON.stringify({schema:1,extra,plan,phase:'ready',edition:guide.edition,acknowledged:guide.pages.length}));
    writeFileSync(html,wrap(theme,styles+'main{min-height:1800px;display:flex;flex-direction:column}#pricing{margin-top:auto}@media(max-width:600px){#pricing{display:none}}','<main><h1>Long page</h1><p>Visible start</p><section id="pricing"><h2>Pricing</h2><p>£24 per month</p></section></main>'));
    const runVerify=(options=[])=>{const result=spawnSync(process.execPath,[join(skill,'scripts/verify.mjs'),html,'--state',state,'--width','1440,390','--wait','0',...options],{encoding:'utf8',timeout:120000});assert.ifError(result.error);assert.ok(result.stdout,result.stderr);return {...result,data:JSON.parse(result.stdout)};};
    const full=runVerify();
    assert.equal(full.status,0,full.stdout+full.stderr);
    assert.equal(full.data.coverage.content,'not checked: compare required facts across every frame');
    assert.equal(full.data.coverage.screenshots,'full documents');
    for(const frame of full.data.frames){
      const png=readFileSync(frame.screenshot);
      assert.equal(png.subarray(1,4).toString(),'PNG');
      assert.equal(png.readUInt32BE(20),frame.capture.documentHeight,'actual PNG covers the whole measured document');
      assert.ok(frame.capture.height>frame.height,'image extends below the viewport');
    }
    const contract=join(work,'expectations.json');
    writeFileSync(contract,JSON.stringify({version:1,checks:[{selector:'#pricing',textIncludes:'£24 per month'}]}));
    const missing=runVerify(['--contract',contract]);
    assert.equal(missing.status,1,missing.stdout);
    assert.equal(missing.data.status,'failed');
    assert.equal(missing.data.counts.checkFailures,0,'missing required content is a finding, not tool failure');
    assert.ok(missing.data.frames.find(f=>f.width===390).errors>0,'required price hidden on mobile fails explicitly');
    assert.equal(missing.data.frames.find(f=>f.width===1440).errors,0);
    writeFileSync(html,wrap(theme,styles+'main{min-height:17000px}','<main><h1>Beyond the capture limit</h1></main>'));
    const limitPng=join(work,'limited.png');
    const limit=spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','390','--full','--strict','--wait','0','--out',limitPng],{encoding:'utf8',timeout:120000});
    assert.ifError(limit.error);assert.equal(limit.status,1,limit.stdout+limit.stderr);
    const limited=JSON.parse(readFileSync(limitPng.replace('.png','.json'),'utf8'));
    assert.equal(limited.capture.limited,true);assert.equal(limited.capture.fullDocument,false);
    assert.equal(readFileSync(limitPng).readUInt32BE(20),limited.capture.height);
    assert.ok(limited.capture.height<limited.capture.documentHeight);
    assert.ok(limited.findings.some(f=>f.code==='capture-truncated'&&f.severity==='error'));
    writeFileSync(html,wrap(theme,styles+'main{min-width:700px;min-height:1200px}','<main><h1>Wider than the capture</h1></main>'));
    const widePng=join(work,'wide.png');
    const wide=spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','390','--full','--strict','--wait','0','--out',widePng],{encoding:'utf8',timeout:120000});
    assert.ifError(wide.error);assert.equal(wide.status,1,wide.stdout+wide.stderr);
    const wideReport=JSON.parse(readFileSync(widePng.replace('.png','.json'),'utf8'));
    assert.equal(wideReport.capture.limited,false);assert.equal(wideReport.capture.fullDocument,false);
    assert.ok(wideReport.capture.documentWidth>wideReport.capture.width);
    assert.ok(wideReport.findings.some(f=>f.code==='horizontal-overflow'));
    writeFileSync(html,wrap(theme,styles+'html,body{height:100%;overflow:hidden;box-sizing:border-box}main{height:100%;overflow:auto}section{min-height:1400px}','<main><section><h1>Internal scroll</h1></section><section>Required footer</section></main>'));
    const nested=runVerify();
    assert.ok(nested.data.frames.every(f=>f.capture.internalScrollRegions>0&&!f.capture.fullDocument));
    assert.match(nested.data.coverage.screenshots,/internal scroll regions/);
    writeFileSync(html,wrap(theme,styles+'html{height:100%;overflow:hidden}body{height:100%;overflow:auto;box-sizing:border-box}section{min-height:1400px}','<section><h1>Body scroll region</h1></section><section>Offscreen footer</section>'));
    const bodyScroll=runVerify();
    assert.ok(bodyScroll.data.frames.every(f=>f.capture.internalScrollRegions>0&&!f.capture.fullDocument));
    assert.match(bodyScroll.data.coverage.screenshots,/internal scroll regions/);




  }
  console.log('Review regression checks passed'+(process.env.CI?' (browser cases skipped in CI)':''));
} finally { rmSync(work,{recursive:true,force:true}); }
