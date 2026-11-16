#!/usr/bin/env node
// Regression cases from the independent review: supplied scales, browser defaults,
// long-page evidence and explicit required content across responsive widths.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
    const plan={visualPath:'direct',reason:'Test fixture',tools:{generation:{status:'unavailable',evidence:'Unit fixture'},viewing:{status:'available',evidence:'Test screenshots'}},visualContract:{source:'project-brand',brandSource:'fixture/brand.css'},capabilities:Object.fromEntries(capabilities.map(c=>[c.id,{choice:'skip',evidence:'Unit fixture'}]))};
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

    // 1. Arbitrary CSS variable names in tokens.mjs check (clean pass + broken binding detection).
    const customTheme=':root{--bg-canvas:#fafafa;--ink-primary:#18181b;--surface-alt:#ffffff;--f-ui:sans-serif;--fs-hero:36px;--pad-box:20px;--round-panel:10px}';
    const customStyles='body{background:var(--bg-canvas);color:var(--ink-primary);font-family:var(--f-ui)}.card{background:var(--surface-alt);padding:var(--pad-box);border-radius:var(--round-panel)}h1{font-size:var(--fs-hero)}';
    const customOk=runTokens(wrap(customTheme,customStyles,'<main class="card"><h1>Custom tokens</h1></main>'));
    assert.equal(customOk.status,0,'arbitrary token names pass cleanly: '+customOk.stdout);
    const customBroken=runTokens(wrap(':root{--bg-canvas:#fafafa;--ink-primary:#18181b;--f-ui:sans-serif;--pad-box:20px;--unused-custom:12px}',
      'body{background:var(--bg-canvas);color:var(--ink-primary);font-family:var(--f-ui)}.card{padding:20px}','<main class="card"><h1>Broken</h1></main>'));
    assert.equal(customBroken.status,1,'arbitrary token literal/unused failure caught');
    assert.ok(customBroken.data.findings.some(f=>f.code==='literal'||f.code==='unused-token'));

    // 2. Auto-check of [data-theme="dark"] and inactive [role="tab"] in verify.mjs (pass + fail).
    const themedTabsTheme=':root{--bg:#f8fafc;--surface:#ffffff;--fg:#0f172a;--border:#cbd5e1;--accent:#1d4ed8;--accent-on:#ffffff;--font-body:system-ui,sans-serif}[data-theme="dark"]{--bg:#0f172a;--surface:#1e293b;--fg:#f1f5f9;--border:#334155;--accent:#60a5fa;--accent-on:#0f172a}';
    const themedTabsCss='body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);padding:24px}.tabs{display:flex;gap:8px;margin-bottom:16px}[role="tab"]{min-height:44px;min-width:88px;padding:10px 16px;border:1px solid var(--border);background:var(--surface);color:var(--fg)}[role="tab"][aria-selected="true"]{background:var(--accent);color:var(--accent-on)}.panel{padding:20px;background:var(--surface);border:1px solid var(--border)}[hidden]{display:none}';
    const themedTabsBody=`<main><div role="tablist" class="tabs"><button role="tab" id="t1" aria-selected="true" aria-controls="p1">Overview</button><button role="tab" id="t2" aria-selected="false" aria-controls="p2">Details</button></div><section id="p1" class="panel"><h1>Overview</h1><p>Primary panel content with readable contrast.</p></section><section id="p2" class="panel" hidden><h2>Details</h2><p>Secondary tab panel content.</p></section></main><script>for(const b of document.querySelectorAll('[role=tab]'))b.onclick=()=>{for(const x of document.querySelectorAll('[role=tab]')){const on=x===b;x.setAttribute('aria-selected',String(on));document.getElementById(x.getAttribute('aria-controls')).hidden=!on;}};</script>`;
    writeFileSync(html,wrap(themedTabsTheme,themedTabsCss,themedTabsBody));
    const goodStates=runVerify();
    assert.equal(goodStates.status,0,'page with valid dark theme and 2 tabs passes: '+goodStates.stdout);
    assert.equal(goodStates.data.stateCoverage.darkTheme.declared,true);
    assert.equal(goodStates.data.stateCoverage.darkTheme.checked,true);
    assert.equal(goodStates.data.stateCoverage.tabs.total,2);
    assert.equal(goodStates.data.stateCoverage.tabs.checked,2,'inactive tabs checked on both 1440 and 390');
    assert.ok(goodStates.data.stateCoverage.tabs.frames.some(f=>f.width===1440&&f.screenshot.endsWith('state-tab-1-1440.png')));
    assert.ok(goodStates.data.stateCoverage.tabs.frames.some(f=>f.width===390&&f.screenshot.endsWith('state-tab-1-390.png')));

    // Bad dark theme contrast should fail verify.
    const badDarkTheme=themedTabsTheme.replace('--fg:#f1f5f9','--fg:#1e293b');
    writeFileSync(html,wrap(badDarkTheme,themedTabsCss,themedTabsBody));
    const badDark=runVerify();
    assert.equal(badDark.status,1,'low contrast in dark theme fails verify');
    assert.ok(badDark.data.diagnostics.some(d=>d.code==='text-contrast'&&d.state==='dark-theme'));

    // Runtime error on 2nd tab should fail verify.
    const errTabBody=themedTabsBody.replace('document.getElementById(x.getAttribute(\'aria-controls\')).hidden=!on;','if(b.id==="t2")throw new Error("tab2 boom");document.getElementById(x.getAttribute("aria-controls")).hidden=!on;');
    writeFileSync(html,wrap(themedTabsTheme,themedTabsCss,errTabBody));
    const badTab=runVerify();
    assert.equal(badTab.status,1,'runtime error on 2nd tab fails verify');
    assert.ok(badTab.data.diagnostics.some(d=>d.code==='runtime-error'&&d.state==='tab-1'));

    // 3. Geometric --click reachability in shot.mjs & smart possible-occlusion in inspect.mjs.
    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111}',
      'body{margin:0;background:var(--bg);color:var(--fg);font-family:sans-serif}.overlay{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,0.2)}#target{margin:40px;padding:12px 20px}',
      '<div class="overlay"></div><button id="target">Covered button</button>'));
    const occludedClick=spawnSync(process.execPath,[join(skill,'scripts/shot.mjs'),html,'--width','1440','--wait','0','--click','#target','--out',join(work,'occl.png')],{encoding:'utf8',timeout:60000});
    assert.notEqual(occludedClick.status,0,'shot.mjs rejects --click on occluded target');
    assert.match(occludedClick.stderr,/occluded by/i);

    // Long scroll under fixed header: unobstructed when scrolled -> NO possible-occlusion; trapped under bottom fixed bar -> possible-occlusion.
    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111;--bar:#e2e8f0}',
      'body{margin:0;background:var(--bg);color:var(--fg);font-family:sans-serif}header{position:fixed;top:0;left:0;right:0;height:60px;background:var(--bar);z-index:10}main{padding-top:80px}section{min-height:1100px}.bottom-bar{position:fixed;bottom:0;left:0;right:0;height:64px;background:var(--bar);z-index:10}#trapped-btn{min-height:44px;padding:10px 16px}',
      '<header>Top bar</header><main><section><h1>Scrollable feed</h1><p>Normal copy below fixed header.</p></section><button id="trapped-btn">Trapped at bottom</button></main><div class="bottom-bar">Bottom nav</div>'));
    const smartOcclPng=join(work,'smart-occl.png');
    const smartOccl=spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','1440','--full','--wait','0','--out',smartOcclPng],{encoding:'utf8',timeout:60000});
    assert.equal(smartOccl.status,0,smartOccl.stderr);
    const smartReport=JSON.parse(readFileSync(smartOcclPng.replace('.png','.json'),'utf8'));
    assert.ok(smartReport.findings.some(f=>f.code==='possible-occlusion'&&f.selector==='#trapped-btn'),'trapped bottom button triggers possible-occlusion');
    assert.ok(!smartReport.findings.some(f=>f.code==='possible-occlusion'&&f.selector!=='#trapped-btn'),'normal flow under fixed header does not false-positive');

    // 4. Extended primitive-svg (box-only rect diagram + tiny <9.5px text).
    const boxSvg=`<svg width="320" height="180" viewBox="0 0 320 180"><rect x="10" y="10" width="300" height="160" fill="#eee"/><rect x="20" y="20" width="80" height="40" fill="#ccc"/><rect x="120" y="20" width="80" height="40" fill="#ccc"/><rect x="220" y="20" width="80" height="40" fill="#ccc"/><rect x="20" y="70" width="80" height="40" fill="#ccc"/><rect x="120" y="70" width="80" height="40" fill="#ccc"/><rect x="220" y="70" width="80" height="40" fill="#ccc"/><rect x="20" y="120" width="80" height="40" fill="#ccc"/><rect x="120" y="120" width="80" height="40" fill="#ccc"/><rect x="220" y="120" width="80" height="40" fill="#ccc"/><rect x="30" y="30" width="20" height="20" fill="#999"/><rect x="130" y="30" width="20" height="20" fill="#999"/></svg>`;
    const tinyTextSvg=`<svg width="320" height="180" viewBox="0 0 640 360"><path d="M10 10 L600 10" stroke="#333"/><path d="M10 60 L600 60" stroke="#333"/><path d="M10 110 L600 110" stroke="#333"/><path d="M10 160 L600 160" stroke="#333"/><path d="M10 210 L600 210" stroke="#333"/><path d="M10 260 L600 260" stroke="#333"/><circle cx="100" cy="100" r="10" fill="#333"/><circle cx="200" cy="120" r="10" fill="#333"/><circle cx="300" cy="140" r="10" fill="#333"/><circle cx="400" cy="160" r="10" fill="#333"/><circle cx="500" cy="180" r="10" fill="#333"/><text x="20" y="30" font-size="12">Too small at 0.5x scale (6px)</text></svg>`;
    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111}','body{background:var(--bg);color:var(--fg);font-family:sans-serif}','<main><section>'+boxSvg+'</section><section>'+tinyTextSvg+'</section><section></section><section></section></main>'));
    const svgPng=join(work,'svg.png');
    spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','1440','--wait','0','--out',svgPng],{encoding:'utf8',timeout:60000});
    const svgReport=JSON.parse(readFileSync(svgPng.replace('.png','.json'),'utf8'));
    const svgFindings=svgReport.findings.filter(f=>f.code==='primitive-svg');
    assert.equal(svgFindings.length,2,'both box-only and tiny-text SVGs flagged as primitive-svg');

    // 5. Regression test for a calm restrained light interface (0 errors, 0 review findings).
    writeFileSync(html,wrap(':root{--bg:#f8f9fa;--surface:#ffffff;--fg:#111827;--muted:#4b5563;--border:#d1d5db;--accent:#1d4ed8;--accent-on:#ffffff;--font-body:system-ui,sans-serif;--text-hero:34px;--text-body:16px}',
      '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);line-height:1.5;padding:32px 20px}main{max-width:760px;margin:0 auto;background:var(--surface);border:1px solid var(--border);padding:32px}h1{font-size:var(--text-hero);margin:0 0 12px}p{font-size:var(--text-body);color:var(--muted);margin:0 0 24px}button{min-height:44px;min-width:140px;padding:12px 20px;background:var(--accent);color:var(--accent-on);border:1px solid var(--accent);font-size:var(--text-body);cursor:pointer}button:hover{background:var(--fg);border-color:var(--fg)}',
      '<main data-craft-id="hero"><h1>Calm Studio Brief</h1><p>Restrained light layout with clear contrast and a single primary action.</p><button type="button">Request proposal</button></main>'));
    const calmVerify=runVerify();
    assert.equal(calmVerify.status,0,'calm restrained UI passes verify cleanly: '+calmVerify.stdout);
    assert.equal(calmVerify.data.passed,true);
    assert.equal(calmVerify.data.clean,true);
    assert.equal(calmVerify.data.counts.renderErrors,0);
    assert.equal(calmVerify.data.counts.renderReviews,0);

    // 6. Non-color property categories (--weight, --tracking, --opacity, --z-modal) in tokens.mjs.
    const propKindsTheme=':root{--bg:#ffffff;--fg:#111111;--font-body:sans-serif;--weight:600;--tracking:0.04em;--fade:0.85;--z-modal:40}';
    const propKindsStyles='body{background:var(--bg);color:var(--fg);font-family:var(--font-body)}h1{font-weight:var(--weight);letter-spacing:var(--tracking);opacity:var(--fade);position:relative;z-index:var(--z-modal)}';
    const propKindsOk=runTokens(wrap(propKindsTheme,propKindsStyles,'<main><h1>Typed tokens</h1></main>'));
    assert.equal(propKindsOk.status,0,'weight/tracking/opacity/z-index pass without false mutation-no-effect: '+propKindsOk.stdout);
    const zRow=propKindsOk.data.frames[0].results.find(x=>x.token==='--z-modal');
    assert.equal(zRow.skipped,true,'z-index token is skipped cleanly instead of falling back to color');
    const brokenWeight=runTokens(wrap(':root{--bg:#ffffff;--fg:#111111;--font-body:sans-serif;--weight:600}','body{background:var(--bg);color:var(--fg);font-family:var(--font-body)}@media(min-width:1px){h1{font-weight:600}}','<main><h1>Broken weight</h1></main>'));
    assert.equal(brokenWeight.status,1,'unused/unbound weight token is caught');

    // 7. Invalid/stale --resolutions fails closed even with 0 review findings.
    const badResFile=join(work,'bad-resolutions.json');
    writeFileSync(badResFile,JSON.stringify({version:1,sourceSha256:'0000000000000000',items:[]}));
    const staleZeroReview=runVerify(['--resolutions',badResFile]);
    assert.equal(staleZeroReview.status,1,'stale --resolutions fails even when 0 review findings exist');
    assert.equal(staleZeroReview.data.passed,false);
    assert.equal(staleZeroReview.data.technicalPassed,false);

    // 8. State-scoped resolutions (default vs dark-theme) & 768px small-target threshold.
    const darkReviewTheme=':root{--bg:#ffffff;--fg:#111111;--font-body:sans-serif;--text-body:16px}[data-theme="dark"]{--bg:#111111;--fg:#222222}';
    const darkReviewCss='body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);font-size:var(--text-body);padding:20px}button{min-height:44px;min-width:88px}';
    writeFileSync(html,wrap(darkReviewTheme,darkReviewCss,'<main><h1>Dark contrast</h1><p>Low contrast in dark theme only.</p></main>'));
    const darkReviewFail=runVerify();
    assert.equal(darkReviewFail.status,1);
    assert.equal(darkReviewFail.data.status,'needs-review');
    const htmlHash=createHash('sha256').update(readFileSync(html)).digest('hex');
    const defaultOnlyRes=join(work,'default-only-res.json');
    writeFileSync(defaultOnlyRes,JSON.stringify({version:1,sourceSha256:htmlHash,items:[{code:'text-contrast',resolution:'source-exception',rationale:'Default theme check rationale with enough length.',evidence:'Checked default frame PNGs carefully'}]}));
    const stillNeedsReview=runVerify(['--resolutions',defaultOnlyRes]);
    assert.equal(stillNeedsReview.status,1,'default resolution must not silence dark-theme finding');
    assert.equal(stillNeedsReview.data.status,'needs-review');
    const darkRes=join(work,'dark-res.json');
    writeFileSync(darkRes,JSON.stringify({version:1,sourceSha256:htmlHash,items:[{code:'text-contrast',state:'dark-theme',resolution:'source-exception',rationale:'Dark theme contrast exception documented explicitly.',evidence:'frame-dark-1440.png inspected'}]}));
    const darkResolved=runVerify(['--resolutions',darkRes]);
    assert.equal(darkResolved.status,0,'explicit state:dark-theme resolution closes dark-theme finding: '+darkResolved.stdout);

    // 768px small-target detection & false-positive rejection.
    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111;--font-body:sans-serif;--text-body:16px}','body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);font-size:var(--text-body);padding:20px}button{width:36px;height:36px;padding:0}','<main><button type="button">OK</button></main>'));
    const res768=spawnSync(process.execPath,[join(skill,'scripts/verify.mjs'),html,'--state',state,'--width','768','--wait','0'],{encoding:'utf8',timeout:120000});
    const data768=JSON.parse(res768.stdout);
    assert.equal(res768.status,1);
    assert.ok(data768.diagnostics.some(d=>d.code==='small-target'&&d.width===768),'768px enforces >= 44px touch target');
    const fp768=join(work,'fp-768.json');
    writeFileSync(fp768,JSON.stringify({version:1,sourceSha256:createHash('sha256').update(readFileSync(html)).digest('hex'),items:[{code:'small-target',width:768,resolution:'false-positive',rationale:'Trying to waive 36px button at 768px as false-positive.',evidence:'Measured 36x36 in inspector'}]}));
    const fp768Res=spawnSync(process.execPath,[join(skill,'scripts/verify.mjs'),html,'--state',state,'--width','768','--wait','0','--resolutions',fp768],{encoding:'utf8',timeout:120000});
    assert.equal(fp768Res.status,1,'false-positive for small-target at 768px is rejected');

    // 9. internal-horizontal-scroll at 390px (and clean on 1440px, and vertical scroll unaffected).
    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111;--border:#cbd5e1}',
      'body{margin:0;background:var(--bg);color:var(--fg);font-family:sans-serif;padding:16px}.tbl-wrap{overflow-x:auto;max-width:100%;border:1px solid var(--border)}table{min-width:680px;width:100%;border-collapse:collapse}th,td{padding:8px 12px;border-bottom:1px solid var(--border)}.vscroll{height:60px;overflow-y:auto}',
      '<main><h1>Schedule</h1><div class="tbl-wrap"><table><thead><tr><th>Stage</th><th>Metric</th><th>Target</th><th>Notes</th></tr></thead><tbody><tr><td>Build</td><td>120ms</td><td>150ms</td><td>Optimal</td></tr></tbody></table></div><div class="vscroll"><p>Row 1</p><p>Row 2</p><p>Row 3</p><p>Row 4</p></div></main>'));
    const hScrollRes=runVerify();
    assert.equal(hScrollRes.status,1,'internal-horizontal-scroll at 390px triggers needs-review');
    assert.ok(hScrollRes.data.diagnostics.some(d=>d.code==='internal-horizontal-scroll'&&d.width===390));
    assert.ok(!hScrollRes.data.diagnostics.some(d=>d.code==='internal-horizontal-scroll'&&d.width===1440),'1440px fits 680px table without scroll');
    assert.ok(!hScrollRes.data.diagnostics.some(d=>d.code==='internal-horizontal-scroll'&&/vscroll/.test(d.selector??'')),'pure vertical scroll does not trigger internal-horizontal-scroll');

    // 10. Compressed SVG 300x100 (height < 130) with viewBox 0 0 600 200: tiny text flagged, readable text clean.
    const compressedTinySvg=`<svg width="300" height="100" viewBox="0 0 600 200"><rect x="10" y="10" width="580" height="180" fill="#f8fafc" stroke="#cbd5e1"/><text x="30" y="60" font-size="14">7px on screen</text></svg>`;
    const compressedOkSvg=`<svg width="300" height="100" viewBox="0 0 600 200"><rect x="10" y="10" width="580" height="180" fill="#f8fafc" stroke="#cbd5e1"/><text x="30" y="80" font-size="22">11px on screen</text></svg>`;
    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111}','body{background:var(--bg);color:var(--fg);font-family:sans-serif}',`<main><section>${compressedTinySvg}</section><section>${compressedOkSvg}</section></main>`));
    const compSvgPng=join(work,'comp-svg.png');
    spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','1440','--wait','0','--out',compSvgPng],{encoding:'utf8',timeout:60000});
    const compSvgRep=JSON.parse(readFileSync(compSvgPng.replace('.png','.json'),'utf8'));
    const compPrim=compSvgRep.findings.filter(f=>f.code==='primitive-svg');
    assert.equal(compPrim.length,1,'only compressed SVG with <9.5px text is flagged');
    assert.ok(compPrim[0].evidence.text.includes('7px'));

    // 11. svg-label-overlap & svg-label-collision (horizontal/vertical walls, DOM order, translucent pills).
    const overlapSvg=`<svg id="ov" width="280" height="120" viewBox="0 0 280 120"><text x="40" y="60" font-size="14">Alpha Label</text><text x="60" y="64" font-size="14">Beta Label</text></svg>`;
    const wallCollisionSvg=`<svg id="wc" width="280" height="120" viewBox="0 0 280 120"><rect x="80" y="20" width="120" height="80" fill="none" stroke="#111" stroke-width="2"/><text x="40" y="65" font-size="14">Crosses Wall</text></svg>`;
    const topWallSvg=`<svg id="tw" width="280" height="120" viewBox="0 0 280 120"><rect x="40" y="40" width="200" height="60" fill="none" stroke="#111" stroke-width="2"/><text x="90" y="44" font-size="14">Top Wall</text></svg>`;
    const bottomWallSvg=`<svg id="bw" width="280" height="120" viewBox="0 0 280 120"><rect x="40" y="20" width="200" height="60" fill="none" stroke="#111" stroke-width="2"/><text x="90" y="84" font-size="14">Bottom Wall</text></svg>`;
    const rightWallSvg=`<svg id="rw" width="280" height="120" viewBox="0 0 280 120"><rect x="40" y="20" width="120" height="80" fill="none" stroke="#111" stroke-width="2"/><text x="120" y="65" font-size="14">Right Wall</text></svg>`;
    const lineCollisionSvg=`<svg id="lc" width="280" height="120" viewBox="0 0 280 120"><line x1="20" y1="60" x2="260" y2="60" stroke="#111" stroke-width="2"/><text x="80" y="64" font-size="14">Crosses Line</text></svg>`;
    const pillBeforeLineSvg=`<svg id="pbl" width="280" height="120" viewBox="0 0 280 120"><rect x="75" y="45" width="120" height="26" fill="#ffffff"/><line x1="20" y1="60" x2="260" y2="60" stroke="#111" stroke-width="2"/><text x="80" y="64" font-size="14">Pill Under Line</text></svg>`;
    const faintPillSvg=`<svg id="fp" width="280" height="120" viewBox="0 0 280 120"><line x1="20" y1="60" x2="260" y2="60" stroke="#111" stroke-width="2"/><rect x="75" y="45" width="120" height="26" fill="#ffffff" fill-opacity="0.1"/><text x="80" y="64" font-size="14">Faint Pill</text></svg>`;
    const opacityPillSvg=`<svg id="op" width="280" height="120" viewBox="0 0 280 120"><line x1="20" y1="60" x2="260" y2="60" stroke="#111" stroke-width="2"/><g opacity="0.2"><rect x="75" y="45" width="120" height="26" fill="#ffffff"/></g><text x="80" y="64" font-size="14">Opacity Pill</text></svg>`;
    const cleanDiagramSvg=`<svg id="okd" width="280" height="120" viewBox="0 0 280 120"><rect x="20" y="20" width="140" height="80" fill="none" stroke="#111" stroke-width="2"/><text x="36" y="65" font-size="14">Inside Box</text><line x1="20" y1="105" x2="260" y2="105" stroke="#111" stroke-width="2"/><rect x="175" y="90" width="76" height="24" fill="#ffffff"/><text x="180" y="107" font-size="14">With Pill</text><line x1="160" y1="40" x2="195" y2="40" stroke="#111" stroke-width="1.5"/><text x="200" y="45" font-size="14">Callout</text></svg>`;
    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111}','body{background:var(--bg);color:var(--fg);font-family:sans-serif}',`<main>${overlapSvg}${wallCollisionSvg}${topWallSvg}${lineCollisionSvg}${cleanDiagramSvg}</main>`));
    const colPng=join(work,'svg-col.png');
    spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','1440','--wait','0','--out',colPng],{encoding:'utf8',timeout:60000});
    const colRep=JSON.parse(readFileSync(colPng.replace('.png','.json'),'utf8'));
    assert.deepEqual(colRep.findings.filter(f=>f.code==='svg-label-overlap').map(f=>f.selector),['#ov'],'overlap detected only on #ov');
    assert.deepEqual(colRep.findings.filter(f=>f.code==='svg-label-collision').map(f=>f.selector).sort(),['#lc','#tw','#wc'],'collision detected on vertical/top walls and line, not #okd');

    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111}','body{background:var(--bg);color:var(--fg);font-family:sans-serif}',`<main>${pillBeforeLineSvg}${faintPillSvg}${opacityPillSvg}</main>`));
    const colPng2=join(work,'svg-col2.png');
    spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','1440','--wait','0','--out',colPng2],{encoding:'utf8',timeout:60000});
    const colRep2=JSON.parse(readFileSync(colPng2.replace('.png','.json'),'utf8'));
    assert.deepEqual(colRep2.findings.filter(f=>f.code==='svg-label-collision').map(f=>f.selector).sort(),['#fp','#op','#pbl'],'pill-before-line, fill-opacity and element/ancestor opacity pills do not shield line collisions');

    writeFileSync(html,wrap(':root{--bg:#ffffff;--fg:#111111}','body{background:var(--bg);color:var(--fg);font-family:sans-serif}',`<main>${bottomWallSvg}${rightWallSvg}</main>`));
    const colPng3=join(work,'svg-col3.png');
    spawnSync(process.execPath,[join(skill,'scripts/inspect.mjs'),html,'--width','1440','--wait','0','--out',colPng3],{encoding:'utf8',timeout:60000});
    const colRep3=JSON.parse(readFileSync(colPng3.replace('.png','.json'),'utf8'));
    assert.deepEqual(colRep3.findings.filter(f=>f.code==='svg-label-collision').map(f=>f.selector).sort(),['#bw','#rw'],'bottom and right rect borders trigger svg-label-collision');

    // 12. broken-theme-toggle vs clicked theme toggle & priority over "Open theme settings".
    const toggleThemeCss=':root{--bg:#ffffff;--fg:#111111}[data-theme="dark"]{--bg:#0f172a;--fg:#f8fafc}body{background:var(--bg);color:var(--fg);font-family:sans-serif;padding:24px}button{min-height:44px;min-width:120px}';
    writeFileSync(html,wrap('',toggleThemeCss,'<main><button id="open-settings" aria-label="Open theme settings">Settings</button><button data-theme-toggle aria-label="Toggle dark theme">Dark mode</button><h1>Broken toggle</h1></main>'));
    const brokenTogPng=join(work,'broken-toggle.png');
    spawnSync(process.execPath,[join(skill,'scripts/shot.mjs'),html,'--width','1440','--theme','dark','--inspect','--wait','0','--out',brokenTogPng],{encoding:'utf8',timeout:60000});
    const brokenTogRep=JSON.parse(readFileSync(brokenTogPng.replace('.png','.json'),'utf8'));
    assert.equal(brokenTogRep.state.themeSwitch,'broken-toggle-fallback');
    assert.ok(brokenTogRep.findings.some(f=>f.code==='broken-theme-toggle'&&f.severity==='review'&&!/open-settings/.test(f.selector??'')));

    writeFileSync(html,wrap('',toggleThemeCss,'<main><button id="open-settings" aria-label="Open theme settings">Settings</button><button data-theme-toggle aria-label="Toggle dark theme">Dark mode</button><h1>Working toggle</h1></main><script>document.querySelector("#open-settings").onclick=()=>{document.body.setAttribute("data-opened-settings","1");};document.querySelector("[data-theme-toggle]").onclick=()=>{document.documentElement.setAttribute("data-theme","dark");};</script>'));
    const okTogPng=join(work,'ok-toggle.png');
    spawnSync(process.execPath,[join(skill,'scripts/shot.mjs'),html,'--width','1440','--theme','dark','--inspect','--wait','0','--out',okTogPng],{encoding:'utf8',timeout:60000});
    const okTogRep=JSON.parse(readFileSync(okTogPng.replace('.png','.json'),'utf8'));
    assert.equal(okTogRep.state.themeSwitch,'clicked');
    assert.ok(!okTogRep.findings.some(f=>f.code==='broken-theme-toggle'));

    writeFileSync(html,wrap('',toggleThemeCss,'<main><button id="open-settings" aria-label="Open theme settings" aria-haspopup="dialog">Theme settings</button><h1>Only settings</h1></main>'));
    const settingsOnlyPng=join(work,'settings-only.png');
    spawnSync(process.execPath,[join(skill,'scripts/shot.mjs'),html,'--width','1440','--theme','dark','--inspect','--wait','0','--out',settingsOnlyPng],{encoding:'utf8',timeout:60000});
    const settingsOnlyRep=JSON.parse(readFileSync(settingsOnlyPng.replace('.png','.json'),'utf8'));
    assert.equal(settingsOnlyRep.state.themeSwitch,'attribute-fallback','dialog/settings opener is not mistaken for a dark theme toggle');

    // 13. Verify inspects tabs on both 1440 and 390.
    const multiTabHtml=wrap(':root{--bg:#ffffff;--fg:#111111;--border:#cbd5e1;--font-body:sans-serif}',
      'body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);padding:24px}[role="tablist"]{display:flex;gap:8px}[role="tab"]{min-height:44px;min-width:88px;border:1px solid var(--border);background:transparent}[hidden]{display:none}',
      '<main><div role="tablist"><button role="tab" aria-selected="true" aria-controls="tp1" id="t1">Tab 1</button><button role="tab" aria-selected="false" aria-controls="tp2" id="t2">Tab 2</button></div><section id="tp1" role="tabpanel">Panel 1</section><section id="tp2" role="tabpanel" hidden>Panel 2</section></main><script>document.querySelectorAll("[role=tab]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[role=tab]").forEach(b=>b.setAttribute("aria-selected",String(b===btn)));document.querySelectorAll("[role=tabpanel]").forEach(p=>p.hidden=p.id!==btn.getAttribute("aria-controls"));});</script>');
    writeFileSync(html,multiTabHtml);
    const multiTabRes=runVerify();
    assert.equal(multiTabRes.status,0,'tabs pass on both 1440 and 390: '+multiTabRes.stdout);
    assert.ok(multiTabRes.data.stateFrames.some(f=>f.state==='tab-1'&&f.width===1440));
    assert.ok(multiTabRes.data.stateFrames.some(f=>f.state==='tab-1'&&f.width===390));
    assert.equal(multiTabRes.data.stateCoverage.tabs.totalChecks,2);
    assert.equal(multiTabRes.data.stateCoverage.tabs.checked,2);
    assert.deepEqual(multiTabRes.data.stateCoverage.tabs.perWidth,[{width:1440,total:2,inactive:1,checked:1},{width:390,total:2,inactive:1,checked:1}]);
  }

  // Non-browser: validatePlan rejects tools.*.status='unavailable' when evidence only says "not needed" / "не нужна" (including MCP/browser phrasing).
  for (const badEv of ['не нужна','не требуется','MCP не нужна','browser not needed','not needed','unnecessary']) {
    assert.throws(()=>validatePlan({
      visualPath:'direct',reason:'Direct HTML build',
      tools:{generation:{status:'unavailable',evidence:badEv},viewing:{status:'available',evidence:'Browser screenshots'}},
      visualContract:{source:'project-brand',brandSource:'brand.css'},
      use:['inspection']
    }),/cannot be "unavailable"/i,`rejects unavailable with "${badEv}"`);
  }
  assert.doesNotThrow(()=>validatePlan({
    visualPath:'direct',reason:'Direct HTML build',
    tools:{generation:{status:'unavailable',evidence:'Image generation MCP tool not available in environment'},viewing:{status:'available',evidence:'Browser screenshots'}},
    visualContract:{source:'project-brand',brandSource:'brand.css'},
    use:['inspection']
  }),'accepts unavailable with factual absence evidence');
  console.log('Review regression checks passed'+(process.env.CI?' (browser cases skipped in CI)':''));
} finally { rmSync(work,{recursive:true,force:true}); }
