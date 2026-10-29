#!/usr/bin/env node
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {curriculum,splitText,capabilities,requireReady,validatePlan,skillRoot,PAGE_BYTES} from '../skills/craft-design/scripts/craft-guide.mjs';
import {verify} from '../skills/craft-design/scripts/verify.mjs';
import {issueInvocation,consumeInvocation} from '../skills/craft-design/scripts/guide-runtime.mjs';

assert.deepEqual([...new Set(capabilities.flatMap(c=>c.commands))].sort(),readdirSync(join(skillRoot,'scripts')).filter(p=>p.endsWith('.mjs')).sort(),'every script has a capability-map home');
assert.deepEqual([...new Set(['charter.md','charter-craft.md','visual-concepts.md',...capabilities.flatMap(c=>c.details).map(p=>p.slice('references/'.length))])].sort(),readdirSync(join(skillRoot,'references')).filter(p=>p.endsWith('.md')).sort(),'every reference is introduced before route selection');

const dir=mkdtempSync(join(tmpdir(),'craft-guide-test-'));
const script=join(skillRoot,'scripts/craft-guide.mjs');
const otherCwd=join(dir,'nested');mkdirSync(otherCwd);
const proofData=join(dir,'proofs');
const absoluteArgs=['begin','--state',join(otherCwd,'state.json')];
issueInvocation(skillRoot,dir,absoluteArgs,proofData);
assert.doesNotThrow(()=>consumeInvocation(skillRoot,otherCwd,absoluteArgs,proofData),'absolute state works when the host reports session cwd and execution uses a different workdir');
assert.throws(()=>consumeInvocation(skillRoot,otherCwd,absoluteArgs,proofData),/did not observe/,'proof is still single-use');
issueInvocation(skillRoot,dir,['begin','--state','state.json'],proofData);
assert.throws(()=>consumeInvocation(skillRoot,otherCwd,['begin','--state','state.json'],proofData),error=>error.message.includes(join(otherCwd,'state.json')),'relative state in another cwd cannot consume the wrong proof; retry prints the actual absolute path');
issueInvocation(skillRoot,dir,absoluteArgs,proofData);
assert.throws(()=>consumeInvocation(skillRoot,otherCwd,['status',...absoluteArgs.slice(1)],proofData),/did not observe/,'command arguments remain bound');
const planArgs=['decide','--state',absoluteArgs[2],'--plan',join(otherCwd,'plan.json')];
issueInvocation(skillRoot,dir,planArgs,proofData);
assert.doesNotThrow(()=>consumeInvocation(skillRoot,otherCwd,planArgs,proofData),'absolute plan path is independent of session cwd');
issueInvocation(skillRoot,dir,['decide','--state',absoluteArgs[2],'--plan','plan.json'],proofData);
assert.throws(()=>consumeInvocation(skillRoot,otherCwd,['decide','--state',absoluteArgs[2],'--plan','plan.json'],proofData),/did not observe/,'relative plan remains cwd-sensitive');

const run=(...args)=>{issueInvocation(skillRoot,process.cwd(),args);return spawnSync(process.execPath,[script,...args],{encoding:'utf8'});};
const state=join(dir,'state.json');
const text='Пример 🧭\n\n'.repeat(1500)+'x'.repeat(4000);
const chunks=splitText(text);
assert.equal(chunks.join(''),text); assert.ok(chunks.every(x=>Buffer.byteLength(x)<=PAGE_BYTES));
for(const source of new Set(curriculum().pages.map(x=>x.source))) {
 const parts=curriculum().pages.filter(p=>p.source===source);
 if(source!=='capability-map')assert.equal(parts.map(p=>p.body).join(''),readFileSync(join(skillRoot,source),'utf8'));
}
const unobserved=spawnSync(process.execPath,[script,'begin','--state',join(dir,'unguarded.json')],{encoding:'utf8'});
assert.equal(unobserved.status,2,'unobserved CLI cannot claim delivery');
assert.match(unobserved.stderr,/unsupported command form OR an inactive hook/);
assert.ok(unobserved.stderr.includes(script));
assert.match(unobserved.stderr,/Retry once.*SAME working directory/);
let r=run('begin','--state',state);assert.equal(r.status,0,r.stderr);assert.ok(Buffer.byteLength(r.stdout)<5000);
assert.equal(run('begin','--state',state).status,2,'never overwrite an existing task');
assert.throws(()=>requireReady(state),/incomplete/);
const first=readFileSync(state,'utf8');
assert.equal(run('next','--state',state,'--receipt','wrong').status,2);
assert.equal(readFileSync(state,'utf8'),first,'wrong receipt does not advance');
assert.equal(run('status','--state',state).stdout,r.stdout,'interrupted delivery is repeatable');
const plan={visualPath:'direct',reason:'Existing component change',tools:{generation:{status:'unknown',evidence:'Not discovered'},viewing:{status:'available',evidence:'view_image'}},capabilities:Object.fromEntries(capabilities.map(c=>[c.id,{choice:'skip',evidence:'Not required by this fixture'}]))};
const planFile=join(dir,'plan.json');writeFileSync(planFile,JSON.stringify(plan));
assert.equal(run('decide','--state',state,'--plan',planFile).status,2,'cannot decide early');
function finish(){
 while(JSON.parse(readFileSync(state)).phase==='reading'){
  const s=JSON.parse(readFileSync(state));r=run('next','--state',state,'--receipt',s.pending);
  assert.equal(r.status,0,r.stderr);assert.ok(Buffer.byteLength(r.stdout)<5000);
 }
}
finish();assert.equal(JSON.parse(readFileSync(state)).phase,'choose');assert.throws(()=>requireReady(state),/incomplete/);
assert.throws(()=>validatePlan({...plan,visualPath:'generated'}),/both/);
assert.throws(()=>validatePlan({...plan,capabilities:{}}),/every/);
plan.capabilities.inspection.choice='use';
plan.capabilities.library.choice='use';plan.entryId='dashboard';
assert.throws(()=>validatePlan({...plan,entryId:'../../outside'}),/catalog/);
assert.ok(validatePlan(plan).includes('library/craft/state-coverage.md'));
writeFileSync(planFile,JSON.stringify(plan));
assert.equal(run('decide','--state',state,'--plan',planFile).status,0);
assert.equal(JSON.parse(readFileSync(state)).phase,'reading','applicable detail is mandatory');
finish();assert.equal(requireReady(state).phase,'ready');
const good=readFileSync(state,'utf8');const broken=JSON.parse(good);broken.edition='old';writeFileSync(state,JSON.stringify(broken));assert.throws(()=>requireReady(state),/changed/);writeFileSync(state,good);
const html=join(dir,'index.html');writeFileSync(html,'<!doctype html><p>fixture</p>');
const calls=[];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
let latest;
const capture=console.log;console.log=value=>{latest=JSON.parse(value);};
const evidence=(options={})=>(_cmd,args)=>{
 calls.push(args);
 const source=args[0].endsWith('/tokens.mjs')?args[2]:args[1];
 const widths=args[args.indexOf('--width')+1].split(',').map(Number);
 const sourceHash=digest(readFileSync(source));
 if(args[0].endsWith('/tokens.mjs'))return {status:options.tokenExit??0,stdout:JSON.stringify({schemaVersion:1,source,sourceSha256:sourceHash,widths,browserAvailable:options.browser!==false,findings:options.tokenWarnings?[{code:'literal',message:'fixture warning',line:1,selector:'p'}]:[]})};
 const output=args[args.indexOf('--out')+1];
 for(const width of widths){
  const png=widths.length>1?output.replace('.png','-'+width+'.png'):output;
  const bytes=Buffer.from('test-only image evidence');writeFileSync(png,bytes);
  writeFileSync(png.replace('.png','.json'),JSON.stringify({schemaVersion:1,sourceSha256:options.stale?'stale':sourceHash,viewport:{width,height:width<600?844:900},screenshot:png,screenshotSha256:options.badPng?'mismatch':digest(bytes),findings:options.review?[{code:'possible-occlusion',severity:'review',message:'inspect'}]:[]}));
 }
 return {status:options.inspectExit??0,stdout:'captured'};
};
try{
 assert.equal(verify([html,'--state',state,'--width','1440','--fit'],evidence({tokenExit:1,tokenWarnings:true})),1,'warnings cannot pass');
 assert.equal(calls.length,2,'render still runs when tokens fail');
 assert.equal(latest.counts.tokenWarnings,1);assert.equal(latest.counts.renderErrors,0);
 assert.equal(latest.diagnostics[0].code,'literal');assert.ok(latest.diagnostics[0].repair);assert.match(latest.repeatCommand,/--fit/);
 assert.ok(calls.every(a=>a.includes('--strict')));assert.ok(calls[1].includes('--fit'));
 assert.equal(verify([html,'--state',state],evidence({browser:false})),1,'missing browser incomplete even with zero exit');
 assert.equal(verify([html,'--state',state],()=>({status:0,stdout:'pass'})),1,'missing structured reports fail closed');
 assert.equal(verify([html,'--state',state],evidence({tokenWarnings:true})),1,'findings fail even with zero child exit');
 assert.equal(verify([html,'--state',state],evidence({stale:true})),1,'stale source evidence fails');
 assert.equal(verify([html,'--state',state],evidence({badPng:true})),1,'changed PNG evidence fails');
 assert.equal(verify([html,'--state',state],evidence({review:true})),0,'review findings retain their non-error semantics');
 assert.equal(latest.clean,false);assert.equal(latest.counts.renderReviews,2);
 calls.length=0;
 assert.equal(verify([html,'--state',state,'--strict'],evidence()),0);
 assert.equal(latest.clean,true);assert.deepEqual(latest.counts,{tokenWarnings:0,renderErrors:0,renderReviews:0,checkFailures:0});
 assert.ok(calls.every(a=>a.includes('1440,390')),'default viewports match across checks');
 assert.ok(calls.every(a=>a.filter(x=>x==='--strict').length===1),'strict is normalized');
 assert.throws(()=>verify([html,'--state',state,'--out',html]),/owns/,'cannot overwrite input');
 assert.throws(()=>verify([html,'--state',state,'--width','390,390']),/distinct/);
 const runner=evidence();
 assert.equal(verify([html,'--state',state],(cmd,args)=>{const result=runner(cmd,args);writeFileSync(html,'changed');return result;}),1,'mutation invalidates evidence');
}finally{console.log=capture;rmSync(dir,{recursive:true,force:true});}
console.log(`guide: packet completeness, bounded unicode, receipts, recovery, stale editions, route coverage, conditional details and combined-check failures passed (${curriculum().pages.length} base packets)`);
