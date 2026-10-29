#!/usr/bin/env node
// Cooperative workflow guard, not a sandbox. Active only after guide begin.
import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {skillRoot,loadState} from '../skills/craft-design/scripts/craft-guide.mjs';
import {guardDirectory,issueInvocation} from '../skills/craft-design/scripts/guide-runtime.mjs';

// Deliberately narrow: exactly one literal command, never shell expansion/code.
export function words(command) {
  if(typeof command!=='string')throw new Error('Expected a literal shell command.');
  const result=[];let word='',quote=null,started=false;
  for(let i=0;i<command.length;i++) {
    const c=command[i];
    if(quote) {
      if(c===quote){quote=null;continue;}
      if(quote==='"' && /[$`\\]/.test(c))throw new Error('No shell expansion or escapes in double quotes; use literal single quotes.');
      word+=c;continue;
    }
    if(c==='"'||c==="'"){quote=c;started=true;continue;}
    if(/[|;&<>\n\r$`\\(){}*?]/.test(c))throw new Error('No pipeline, redirection, chaining, expansion or wrapper around guide.');
    if(/\s/.test(c)){if(started){result.push(word);word='';started=false;}}else{word+=c;started=true;}
  }
  if(quote)throw new Error('Unclosed quote.');
  if(started)result.push(word);
  return result;
}
const deny=reason=>({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'craft-design: '+reason}});
// Recognize literal command positions, not examples embedded in printf/grep or
// heredoc bodies. This is intentionally not a shell interpreter. The CLI also
// refuses any invocation the host cannot recognize and observe.
export function attemptsGuide(command,cwd,root,depth=0) {
  if(typeof command!=='string' || depth>2)return false;
  const segments=[];let segment='',quote=null;
  for(let i=0;i<command.length;i++) {
    const c=command[i];
    if(quote){segment+=c;if(c===quote)quote=null;else if(c==='\\' && quote==='"')segment+=command[++i]??'';continue;}
    if(c==='"'||c==="'"){quote=c;segment+=c;continue;}
    if(c==='\\'){segment+=c+(command[++i]??'');continue;}
    if(c==='#' && (!segment || /\s$/.test(segment))){while(i<command.length && command[i]!=='\n')i++;segments.push(segment);segment='';continue;}
    if(c==='<' && command[i+1]==='<'){segments.push(segment);segment='';break;}
    if(c==='<' || c==='>') {
      segment=segment.replace(/(^|\s)\d+$/,'$1');
      if(command[i+1]===c)i++;
      if(command[i+1]==='&')i++;
      while(/\s/.test(command[i+1]??'') && !/[\n\r]/.test(command[i+1]))i++;
      let targetQuote=null;
      while(i+1<command.length) {
        const next=command[i+1];
        if(targetQuote){i++;if(next===targetQuote)targetQuote=null;else if(next==='\\' && targetQuote==='"')i++;continue;}
        if(next==='"'||next==="'"){targetQuote=next;i++;continue;}
        if(next==='\\'){i+=2;continue;}
        if(/[\s;&|<>]/.test(next))break;
        i++;
      }
      segment+=' ';continue;
    }
    if(/[;&|\n\r]/.test(c)){segments.push(segment);segment='';continue;}
    segment+=c;
  }
  if(segment)segments.push(segment);
  let directory=cwd;
  for(const piece of segments) {
    let args;try{args=words(piece);}catch{continue;}
    if(args[0]==='cd' && args.length===2){directory=resolve(directory,args[1]);continue;}
    if(basename(args[0]??'')==='node' && resolve(directory,args[1]??'')===join(root,'scripts/craft-guide.mjs') && ['begin','next','status','decide','cancel'].includes(args[2]))return true;
    if(['sh','bash','zsh'].includes(basename(args[0]??'')) && ['-c','-lc'].includes(args[1]) && args.length===3 && attemptsGuide(args[2],directory,root,depth+1))return true;
  }
  return false;
}
export function guard(event,{root=skillRoot,data=guardDirectory()}={}) {
  const input=event.tool_input??{},command=input.command??input.cmd;
  const session=event.session_id;
  if(typeof session!=='string'||!session)return typeof command==='string'&&command.includes('craft-guide.mjs')?deny('No session id; guarded delivery is unavailable.'):{};
  const registry=join(data,'guide-'+createHash('sha256').update(session).digest('hex')+'.json');
  let active=null;
  if(existsSync(registry))active=JSON.parse(readFileSync(registry,'utf8'));
  const cwd=resolve(event.cwd??process.cwd(),input.cwd??input.workdir??'.');
  // A malformed first invocation still signals an active preparation attempt.
  // Do not let a failed compound start silently turn into unprepared authoring.
  const attempted=attemptsGuide(command,cwd,root);
  if(!active && attempted) {
    mkdirSync(data,{recursive:true,mode:0o700});
    active={pendingStart:true,root};writeFileSync(registry,JSON.stringify(active),{mode:0o600});
  }
  if(active) {
    try { if(active.state && ['ready','cancelled'].includes(loadState(active.state).state.phase))active=null; } catch {}
  }
  let argv=null;
  if(typeof command==='string' && (command.includes('craft-guide.mjs') || active)) {
    try{argv=words(command);}catch(error){
      const prefix=command.match(/(?:^|[;&]\s*)\s*['"]?[^\s'"]*node['"]?\s+['"]?([^\s'"]*guide\.mjs)/);
      const targetsGuide=prefix && resolve(cwd,prefix[1])===join(root,'scripts/craft-guide.mjs');
      if(active || targetsGuide)return deny(error.message+' Run the printed guide command alone.');
      return {};
    }
  }
  const isGuide=argv && basename(argv[0]??'')==='node' && resolve(cwd,argv[1]??'')===join(root,'scripts/craft-guide.mjs');
  if(isGuide) {
    const verb=argv[2],i=argv.indexOf('--state'),state=i>=0&&argv[i+1]?resolve(cwd,argv[i+1]):null;
    if(!['begin','next','status','decide','catalog','entry','cancel','--help'].includes(verb))return deny('Unsupported guide command.');
    if(verb==='cancel') {
      const rest=argv.slice(3),values={};
      for(let n=0;n<rest.length;n+=2) {
        const flag=rest[n],value=rest[n+1];
        if(!['--state','--reason'].includes(flag) || flag in values || !value?.trim() || value.startsWith('--'))return deny('Cancellation requires exactly --state FILE --reason TEXT.');
        values[flag]=value;
      }
      if(!values['--state'] || !values['--reason'])return deny('Cancellation requires exactly --state FILE --reason TEXT.');
      if(existsSync(registry))unlinkSync(registry);
      issueInvocation(root,cwd,argv.slice(2),data);return {};
    }
    if(verb==='begin') {
      if(!state)return deny('begin requires --state.');
      mkdirSync(data,{recursive:true,mode:0o700});writeFileSync(registry,JSON.stringify({state,root}),{mode:0o600});
      issueInvocation(root,cwd,argv.slice(2),data);return {};
    }
    if(active?.pendingStart && verb!=='--help')return deny('Start preparation with a standalone node '+join(root,'scripts/craft-guide.mjs')+' begin --state FILE.');
    if(active && !['catalog','entry','cancel','--help'].includes(verb) && state!==active.state)return deny('Use the active state: '+active.state);
    issueInvocation(root,cwd,argv.slice(2),data);return {};
  }
  if(!active)return {};
  if(active.pendingStart)return deny('Preparation has not started successfully. Run the standalone craft-guide.mjs begin command; cancel --state FILE --reason TEXT releases this task if it was explicitly cancelled.');
  if(!existsSync(active.state))return deny('Guide start did not finish. Retry the plain guide begin command with --state '+active.state);
  let state;
  try{state=loadState(active.state).state;}catch(error){return deny(error.message);}
  if(state.phase==='ready')return {};
  // During route selection the author may inspect entries and discover tools.
  // Shell writes and arbitrary execution stay blocked; use decide --json.
  if(state.phase==='choose' && /^(Read|Glob|Grep|ToolSearch|tool_search|list_tools|search_tools)$/.test(event.tool_name??''))return {};
  return deny(`Instructions are incomplete (${state.phase}). Run node ${join(root,'scripts/craft-guide.mjs')} status --state ${active.state} alone, then its next command. At BASE COMPLETE use catalog/entry and decide --json. Do not shorten output or start authoring.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{console.log(JSON.stringify(guard(JSON.parse(readFileSync(0,'utf8')))));}
  catch(error){console.log(JSON.stringify(deny('Workflow guard failed: '+error.message+'. No readiness claim can be made.')));}
}
