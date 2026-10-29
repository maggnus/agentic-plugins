#!/usr/bin/env node
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {curriculum,splitText,capabilities,requireReady,validatePlan,skillRoot,PAGE_BYTES} from '../skills/craft-design/scripts/craft-guide.mjs';
import {verify} from '../skills/craft-design/scripts/verify.mjs';
import {issueInvocation} from '../skills/craft-design/scripts/guide-runtime.mjs';

assert.deepEqual([...new Set(capabilities.flatMap(c=>c.commands))].sort(),readdirSync(join(skillRoot,'scripts')).filter(p=>p.endsWith('.mjs')).sort(),'every script has a capability-map home');
assert.deepEqual([...new Set(['charter.md','charter-craft.md','visual-concepts.md',...capabilities.flatMap(c=>c.details).map(p=>p.slice('references/'.length))])].sort(),readdirSync(join(skillRoot,'references')).filter(p=>p.endsWith('.md')).sort(),'every reference is introduced before route selection');

const dir=mkdtempSync(join(tmpdir(),'craft-guide-test-'));
const script=join(skillRoot,'scripts/craft-guide.mjs');
const run=(...args)=>{issueInvocation(skillRoot,process.cwd(),args);return spawnSync(process.execPath,[script,...args],{encoding:'utf8'});};
const state=join(dir,'state.json');
const text='Пример 🧭\n\n'.repeat(1500)+'x'.repeat(4000);
const chunks=splitText(text);
assert.equal(chunks.join(''),text); assert.ok(chunks.every(x=>Buffer.byteLength(x)<=PAGE_BYTES));
for(const source of new Set(curriculum().pages.map(x=>x.source))) {
 const parts=curriculum().pages.filter(p=>p.source===source);
 if(source!=='capability-map')assert.equal(parts.map(p=>p.body).join(''),readFileSync(join(skillRoot,source),'utf8'));
}
assert.equal(spawnSync(process.execPath,[script,'begin','--state',join(dir,'unguarded.json')],{encoding:'utf8'}).status,2,'unobserved CLI cannot claim delivery');
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
const capture=console.log;console.log=()=>{};
try{
 assert.equal(verify([html,'--state',state,'--width','1440','--fit'],(cmd,args)=>{calls.push(args);return {status:calls.length===1?1:0,stdout:'check',stderr:''};}),1,'warnings cannot pass');
 assert.equal(calls.length,2,'render still runs when tokens fail');
 assert.ok(calls.every(a=>a.includes('--strict')));assert.ok(calls[1].includes('--fit'));
 assert.equal(verify([html,'--state',state],()=>({status:3,stdout:'no browser'})),1,'missing browser incomplete');
 const defaults=[];
 assert.equal(verify([html,'--state',state,'--strict'],(_cmd,args)=>{defaults.push(args);return {status:0,stdout:'pass'};}),0);
 assert.ok(defaults.every(a=>a.includes('1440,390')),'default viewports match across checks');
 assert.ok(defaults.every(a=>a.filter(x=>x==='--strict').length===1),'strict is normalized');
 assert.throws(()=>verify([html,'--state',state,'--out',html]),/owns/,'cannot overwrite input');
 assert.equal(verify([html,'--state',state],()=>{writeFileSync(html,'changed');return {status:0};}),1,'mutation invalidates evidence');
}finally{console.log=capture;rmSync(dir,{recursive:true,force:true});}
console.log(`guide: packet completeness, bounded unicode, receipts, recovery, stale editions, route coverage, conditional details and combined-check failures passed (${curriculum().pages.length} base packets)`);
