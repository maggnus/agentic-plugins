#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateScenario,applyScenario} from '../skills/craft-design/scripts/scenario.mjs';
const script=join(dirname(fileURLToPath(import.meta.url)),'../skills/craft-design/scripts/inspect.mjs');
const work=mkdtempSync(join(tmpdir(),'craft-scenario-test-'));
const html=code=>`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:20px;font:16px/1.5 Arial;color:#111;background:white}button{font:inherit;min-width:96px;min-height:48px}</style><main>Default</main><script>${code}</script>`;
const fixture={version:1,apply:'preview.render',input:{count:3}};
const contract={version:1,checks:[{selector:'main',textIncludes:'Applied 3 once'}],noRuntimeErrors:true};
function run(name,source,scenario=fixture,checks=contract,extra=[]){
 const file=join(work,name+'.html'),scenarioFile=join(work,name+'-scenario.json'),contractFile=join(work,name+'-contract.json'),out=join(work,name+'.png');
 writeFileSync(file,source);writeFileSync(scenarioFile,JSON.stringify(scenario));writeFileSync(contractFile,JSON.stringify(checks));
 const result=spawnSync(process.execPath,[script,file,...(extra.includes('--width')?[]:['--width','720']),'--height','640','--wait','0','--strict','--scenario',scenarioFile,'--contract',contractFile,'--out',out,...extra],{encoding:'utf8',timeout:60000});
 return {...result,file,scenarioFile,out,report:existsSync(join(work,name+'.json'))?JSON.parse(readFileSync(join(work,name+'.json'))):null};
}
try{
 for(const bad of [null,[],{}, {version:2,apply:'render',input:{}},{version:1,apply:'render'}, {...fixture,apply:'preview.render()'},{...fixture,apply:'constructor.call'},{...fixture,apply:'a.__proto__.x'},{...fixture,timeoutMs:0},{...fixture,timeoutMs:15001},{...fixture,inpt:{}}])assert.throws(()=>validateScenario(bad));
 assert.equal(validateScenario({...fixture,input:null}).input,null);
 await assert.rejects(()=>applyScenario(()=>new Promise(()=>{}),{...fixture,timeoutMs:10}),/timed out/);
 await assert.rejects(()=>applyScenario(async()=>({exceptionDetails:{text:'fixture rejected'}}),fixture),/fixture rejected/);
 await assert.rejects(()=>applyScenario(async()=>({result:{value:{}}}),fixture),/did not complete/);
 // A timer whose event-loop callback is delayed must not accept a late response.
 await assert.rejects(()=>applyScenario(async()=>{const end=Date.now()+30;while(Date.now()<end){}return {result:{value:{applied:true}}};},{...fixture,timeoutMs:5}),/exceeded/);
 const source=html(`window.preview={calls:0,async render(input){await new Promise(r=>setTimeout(r,20));this.calls++;document.querySelector('main').textContent='Applied '+input.count+' '+(this.calls===1?'once':'twice');input.count++;}};`);
 const collision=join(work,'protected.json'),alias=join(work,'alias.png');writeFileSync(collision,JSON.stringify(fixture));linkSync(collision,alias);
 const sourceFile=join(work,'collision.html');writeFileSync(sourceFile,source);
 const coll=spawnSync(process.execPath,[script,pathToFileURL(sourceFile).href,'--scenario',collision,'--out',alias],{encoding:'utf8',timeout:60000});
 assert.equal(coll.status,2,coll.stdout+coll.stderr);assert.deepEqual(JSON.parse(readFileSync(collision)),fixture);
 const reportColl=spawnSync(process.execPath,[script,sourceFile,'--scenario',collision,'--out',join(work,'protected.png')],{encoding:'utf8',timeout:60000});assert.equal(reportColl.status,2);
 const healthy=process.env.CI?{status:3}:run('healthy',source);
 if(healthy.status===3){console.log('scenario browser fixtures skipped (not a pass): '+(process.env.CI?'CI browser sandbox not assumed':'no browser'));}
 else{
  assert.equal(healthy.status,0,healthy.stdout+healthy.stderr);
  assert.equal(healthy.report.state.scenario.applied,true);assert.equal(healthy.report.state.scenario.apply,'preview.render');
  assert.equal(healthy.report.state.scenario.sha256,createHash('sha256').update(readFileSync(healthy.scenarioFile)).digest('hex'));
  assert.equal(readFileSync(healthy.file,'utf8'),source);assert.deepEqual(JSON.parse(readFileSync(healthy.scenarioFile)),fixture);
  const multi=run('fresh-widths',source,fixture,contract,['--width','720,390']);assert.equal(multi.status,0,multi.stdout+multi.stderr);
  for(const width of [720,390])assert.equal(JSON.parse(readFileSync(join(work,`fresh-widths-${width}.json`))).contract.checks[0].pass,true);
  const missing=run('missing',html(''));assert.equal(missing.status,1);assert.match(missing.stderr,/scenario adapter/);assert.equal(existsSync(missing.out),false);
  const getter=run('getter',html(`Object.defineProperty(window,'preview',{get(){throw Error('getter executed')}})`));assert.equal(getter.status,1);assert.match(getter.stderr,/namespace is unavailable/);assert.doesNotMatch(getter.stderr,/getter executed/);
  const throwing=run('throwing',html(`window.preview={render(){throw Error('fixture-throw')}}`));assert.equal(throwing.status,1);assert.match(throwing.stderr,/fixture-throw/);
  const timeout=run('timeout',html('window.preview={render(){return new Promise(()=>{})}}'),{...fixture,timeoutMs:80});assert.equal(timeout.status,1);assert.match(timeout.stderr,/timed out/);assert.equal(existsSync(timeout.out),false);
  const rejected=run('rejected',html(`window.preview={async render(){throw Error('fixture-rejection')}}`));assert.equal(rejected.status,1);assert.match(rejected.stderr,/fixture-rejection/);
  const special=JSON.parse('{"version":1,"apply":"preview.render","input":{"__proto__":{"flag":true},"text":"quote \\\" and </script>"}}');
  const data=run('json-data',html(`window.preview={render(input){document.querySelector('main').textContent=Object.hasOwn(input,'__proto__')&&!input.flag&&input.text.includes('</'+'script>')?'Data preserved':'Bad data'}}`),special,{version:1,checks:[{selector:'main',textIncludes:'Data preserved'}]});assert.equal(data.status,0,data.stdout+data.stderr);
  const clicked=run('after-apply',html(`window.preview={render(input){document.querySelector('main').innerHTML='<button id="next">Next</button>';document.querySelector('button').onclick=()=>document.querySelector('main').textContent='After '+input.count;}}`),fixture,{version:1,checks:[{selector:'main',textIncludes:'After 3'}]},['--click','#next']);assert.equal(clicked.status,0,clicked.stdout+clicked.stderr);
  for (const apply of ['eval','Function']) {
   const native=run('native-'+apply,html(''),{version:1,apply,input:"document.querySelector('main').textContent='Executed'"});
   assert.equal(native.status,1,native.stdout+native.stderr);assert.match(native.stderr,/artifact-defined/);assert.equal(existsSync(native.out),false);
  }
  const aliasNative=run('alias-native',html('window.preview={render:eval};'),{...fixture,input:"document.querySelector('main').textContent='Executed'"});assert.equal(aliasNative.status,1);assert.match(aliasNative.stderr,/artifact-defined/);
  const plainOut=join(work,'plain.png');
  const plain=spawnSync(process.execPath,[join(dirname(script),'shot.mjs'),healthy.file,'--scenario',healthy.scenarioFile,'--wait','0','--width','720','--height','640','--out',plainOut],{encoding:'utf8',timeout:60000});
  assert.equal(plain.status,0,plain.stdout+plain.stderr);const plainReport=JSON.parse(readFileSync(join(work,'plain.json')));assert.equal(plainReport.kind,'capture-evidence');assert.equal(plainReport.inspected,false);assert.equal(plainReport.state.scenario.applied,true);assert.equal(plainReport.state.scenario.sha256,healthy.report.state.scenario.sha256);assert.equal(plainReport.screenshotSha256,createHash('sha256').update(readFileSync(plainOut)).digest('hex'));
  const plainCollision=spawnSync(process.execPath,[join(dirname(script),'shot.mjs'),healthy.file,'--scenario',healthy.scenarioFile,'--out',healthy.scenarioFile.replace(/\.json$/,'.png')],{encoding:'utf8',timeout:60000});assert.equal(plainCollision.status,2);assert.deepEqual(JSON.parse(readFileSync(healthy.scenarioFile)),fixture);
  const wrong=run('wrong-state',source,fixture,{version:1,checks:[{selector:'main',textIncludes:'Applied 4'}]});assert.equal(wrong.status,1,'application is not acceptance of the rendered meaning');
  console.log('scenario fixtures passed: asynchronous adapter, fresh inputs/viewports, this binding, JSON data, click ordering, explicit expectation failure, deadlines, missing/rejected adapters and input protection');
 }
}finally{rmSync(work,{recursive:true,force:true});}
