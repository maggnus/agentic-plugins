#!/usr/bin/env node
// Unified checks; no self-report can replace the actual child command results.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { requireReady } from './craft-guide.mjs';
export function verify(argv, run = spawnSync) {
  const args=[...argv], file=args.shift();
  const i=args.indexOf('--state');
  if(!file || file.startsWith('-') || i<0 || !args[i+1]) throw new Error('verify.mjs FILE --state STATE [inspection options]; local HTML only.');
  const statePath=resolve(args.splice(i,2)[1]),state=requireReady(statePath),source=resolve(file);
  if(!statSync(source).isFile())throw new Error('Expected a local HTML file.');
  // Own output names prevent overwriting the source, state, or unrelated reports.
  if(args.some(a=>a==='--out' || a.startsWith('--out=')))throw new Error('verify owns --out; use inspect.mjs for a custom output path.');
  const widthIndex=args.indexOf('--width'),widths=widthIndex>=0?args[widthIndex+1]:'1440,390';
  if(!/^\d+(,\d+)*$/.test(widths??''))throw new Error('Invalid --width.');
  if(widthIndex<0)args.push('--width',widths);
  for(let n=args.indexOf('--strict');n>=0;n=args.indexOf('--strict'))args.splice(n,1);
  const directory=mkdtempSync(join(dirname(statePath),'craft-verification-'));
  const sha=()=>createHash('sha256').update(readFileSync(source)).digest('hex');
  const before=sha(),scriptRoot=dirname(fileURLToPath(import.meta.url));
  const steps=[['tokens',['check',source,'--width',widths,'--strict']],['inspect',[source,...args,'--out',join(directory,'frame.png'),'--strict']]];
  const results=[];
  for(const [name,options] of steps) {
    const result=run(process.execPath,[join(scriptRoot,name+'.mjs'),...options],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:180000});
    writeFileSync(join(directory,name+'.log'),(result.stdout??'')+(result.stderr??'')+(result.error?'\n'+result.error.message:''));
    results.push({name,exitCode:result.status??null,error:result.error?.message??null,signal:result.signal??null});
  }
  const unchanged=sha()===before;
  const report={source,sourceSha256:before,guideEdition:state.edition,route:state.plan.visualPath,checks:results,sourceUnchanged:unchanged,passed:unchanged&&results.every(r=>r.exitCode===0&&!r.error),visualReview:'Not verified by this command. View every PNG and assess content and review findings.'};
  writeFileSync(join(directory,'summary.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({report:join(directory,'summary.json'),...report},null,2));
  return report.passed?0:1;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=verify(process.argv.slice(2));}catch(error){console.error('verify: '+error.message);process.exitCode=2;}
}
