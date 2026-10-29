#!/usr/bin/env node
// Combined evidence for one source revision. Child success alone is insufficient.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { requireReady } from './craft-guide.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const quote = value => "'" + String(value).replaceAll("'", "'\"'\"'") + "'";
const repairs = {
  literal: 'Move the value into the existing theme and bind it with var(); font shorthand needs token-bound weight/size/leading/family, or use longhands. Preserve appearance.',
  'unused-token': 'Remove unused values from your own spec. Preserve a supplied system scale; document a genuine source-contract exception.',
  'undefined-token': 'Declare the intended value in the theme or correct the variable name.',
  'mutation-no-effect': 'Check overrides, scope and responsive visibility. Verify all required widths together; never add a fake visible use merely to satisfy the test.',
  'possible-duplicate': 'Inspect the named properties. Bind accidental copied values to the intended token; do not merge distinct semantic values merely because they coincide.',
  'text-clipped': 'Inspect the named clipping ancestor and reflow the content; do not hide text.',
  'outside-frame': 'Rework the available space and grouping while preserving required content and readable type.',
  'vertical-overflow': 'Rework density and repeated copy; preserve all required facts and do not hide overflow.',
  'horizontal-overflow': 'Inspect the offending width and responsive layout; preserve content.',
};
export function verify(argv, run = spawnSync) {
  const args=[...argv], file=args.shift();
  const i=args.indexOf('--state');
  if(!file || file.startsWith('-') || i<0 || !args[i+1]) throw new Error('verify.mjs FILE --state STATE [inspection options]; local HTML only.');
  const statePath=resolve(args.splice(i,2)[1]),state=requireReady(statePath),source=resolve(file);
  if(!statSync(source).isFile())throw new Error('Expected a local HTML file.');
  if(args.some(a=>a==='--out' || a.startsWith('--out=')))throw new Error('verify owns --out; use inspect.mjs for a custom output path.');
  const widthIndex=args.indexOf('--width'),widths=widthIndex>=0?args[widthIndex+1]:'1440,390';
  if(!/^\d+(,\d+)*$/.test(widths??''))throw new Error('Invalid --width.');
  const widthList=widths.split(',').map(Number);
  if(widthList.some(w=>w<1||w>10000)||new Set(widthList).size!==widthList.length)throw new Error('Widths must be distinct integers from 1 to 10000.');
  if(widthIndex<0)args.push('--width',widths);
  for(let n=args.indexOf('--strict');n>=0;n=args.indexOf('--strict'))args.splice(n,1);
  const directory=mkdtempSync(join(dirname(statePath),'craft-verification-'));
  const before=hash(readFileSync(source)),scriptRoot=dirname(fileURLToPath(import.meta.url));
  const steps=[['tokens',['check',source,'--width',widths,'--strict','--json']],['inspect',[source,...args,'--out',join(directory,'frame.png'),'--strict']]];
  const results=[],diagnostics=[],frames=[];
  let tokenReport=null;
  for(const [name,options] of steps) {
    const result=run(process.execPath,[join(scriptRoot,name+'.mjs'),...options],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:180000});
    const logPath=join(directory,name+'.log');
    writeFileSync(logPath,(result.stdout??'')+(result.stderr??'')+(result.error?'\n'+result.error.message:''));
    const check={name,exitCode:result.status??null,error:result.error?.message??null,signal:result.signal??null,log:logPath};
    results.push(check);
    try {
      if(name==='tokens') {
        tokenReport=JSON.parse(result.stdout);
        if(tokenReport.schemaVersion!==1 || tokenReport.source!==source || tokenReport.sourceSha256!==before || !Array.isArray(tokenReport.findings) || JSON.stringify(tokenReport.widths)!==JSON.stringify(widthList) || typeof tokenReport.browserAvailable!=='boolean')throw new Error('Missing or mismatched token evidence.');
        writeFileSync(join(directory,'tokens.json'),JSON.stringify(tokenReport,null,2)+'\n');
        for(const f of tokenReport.findings)diagnostics.push({...f,check:name,severity:'warning',repair:repairs[f.code]??'Read the linked report and correct the confirmed cause.'});
        if(!tokenReport.browserAvailable)throw new Error('Token browser checks are incomplete.');
      } else {
        for(const width of widthList) {
          const png=join(directory,widthList.length>1?'frame-'+width+'.png':'frame.png');
          const reportPath=png.replace(/\.png$/,'.json'),report=JSON.parse(readFileSync(reportPath,'utf8'));
          if(report.schemaVersion!==1 || report.sourceSha256!==before || report.viewport?.width!==width || report.screenshot!==png || hash(readFileSync(png))!==report.screenshotSha256 || !Array.isArray(report.findings) || report.truncated)throw new Error('Missing, truncated or mismatched render evidence for '+width+'px.');
          frames.push({width,height:report.viewport.height,screenshot:png,report:reportPath,sourceSha256:report.sourceSha256,screenshotSha256:report.screenshotSha256,errors:report.findings.filter(f=>f.severity==='error').length,review:report.findings.filter(f=>f.severity==='review').length});
          for(const f of report.findings)diagnostics.push({...f,check:name,width,repair:repairs[f.code]??'Inspect this finding in the final PNG and correct confirmed defects.'});
        }
      }
    } catch(error) { check.evidenceError=error.message; }
  }
  const unchanged=hash(readFileSync(source))===before;
  const counts={tokenWarnings:tokenReport?.findings?.length??null,renderErrors:frames.reduce((n,f)=>n+f.errors,0),renderReviews:frames.reduce((n,f)=>n+f.review,0),checkFailures:results.filter(r=>r.exitCode!==0||r.error||r.evidenceError).length};
  const passed=unchanged&&counts.checkFailures===0&&counts.tokenWarnings===0&&counts.renderErrors===0&&frames.length===widthList.length;
  const repeat=['node',join(scriptRoot,'verify.mjs'),source,'--state',statePath,...args].map(quote).join(' ');
  const report={schemaVersion:2,source,sourceSha256:before,guideEdition:state.edition,route:state.plan.visualPath,checks:results,sourceUnchanged:unchanged,counts,passed,clean:passed&&counts.renderReviews===0,frames,diagnostics,repeatCommand:repeat,
    next:passed?'View every final PNG, check required facts and any review findings; deliver these exact files.':'Work remains. Read diagnostics and logs, fix confirmed causes without removing required content or weakening checks, then repeat this full command. An environment failure must be reported as incomplete, not passed.',
    visualReview:'Not verified by this command. A technical pass is not evidence of visual quality, correct facts or complete accessibility.'};
  const reportPath=join(directory,'summary.json');
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  // Keep the handoff bounded; the complete current diagnostics remain on disk.
  const compact=[];let budget=0;
  for(const f of diagnostics) { const item={check:f.check,severity:f.severity,code:f.code,width:f.width,line:f.line,selector:f.selector,message:f.message,repair:f.repair}; const bytes=Buffer.byteLength(JSON.stringify(item));if(budget+bytes>6000)break;compact.push(item);budget+=bytes; }
  console.log(JSON.stringify({...report,report:reportPath,diagnostics:compact,remainingDiagnostics:diagnostics.length-compact.length},null,2));
  return passed?0:1;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=verify(process.argv.slice(2));}catch(error){console.error('verify: '+error.message);process.exitCode=2;}
}
