#!/usr/bin/env node
// Bounded instruction delivery. Receipts confirm a returned packet, not cognition.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, statSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, resolve, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { consumeInvocation } from './guide-runtime.mjs';
const here = dirname(fileURLToPath(import.meta.url));
export const skillRoot = resolve(here, '..');
export const PAGE_BYTES = 3200;
const hash = value => createHash('sha256').update(value).digest('hex');
const read = file => readFileSync(file, 'utf8');
export const capabilities = JSON.parse(read(join(skillRoot, 'references/capabilities.json')));
export function splitText(text, limit = PAGE_BYTES) {
  const parts = []; let part = '';
  for (const paragraph of text.match(/[^]*?(?:\n\n|$)/g).filter(Boolean)) {
    if (Buffer.byteLength(paragraph) <= limit) {
      if (Buffer.byteLength(part + paragraph) > limit) { parts.push(part); part = ''; }
      part += paragraph;
    } else {
      if (part) { parts.push(part); part = ''; }
      // Exceptional oversized paragraphs split at line/word boundaries where possible.
      let rest = paragraph;
      while (Buffer.byteLength(rest) > limit) {
        let prefix = '';
        for (const char of rest) { if (Buffer.byteLength(prefix + char) > limit) break; prefix += char; }
        const boundary = Math.max(prefix.lastIndexOf('\n'), prefix.lastIndexOf(' '));
        const end = boundary > 0 ? boundary + 1 : prefix.length;
        parts.push(rest.slice(0,end)); rest = rest.slice(end);
      }
      part = rest;
    }
  }
  if (part) parts.push(part);
  return parts;
}
function catalog() {
  return read(join(skillRoot,'library/catalog.tsv')).trim().split('\n').slice(1).map(line=>{const [kind,id,mode,platform,scenario,system,craft,path,summary]=line.split('\t');return {kind,id,mode,platform,scenario,craft,path,summary};});
}
const quote=value=>/^[\w@%+=:,./-]+$/.test(String(value))?String(value):"'"+String(value).replaceAll("'", "'\"'\"'")+"'";
const guideCommand=(...args)=>['node',join(skillRoot,'scripts/craft-guide.mjs'),...args].map(quote).join(' ');
// Ranked search: rows covering every meaningful query word come first, then partial
// matches. A deliberately small Russian vocabulary maps common artifact words onto
// the English catalog text; unmapped words are reported rather than guessed.
const STOP=new Set('a an and the for with of to in on by my our new page pages site design ui make create build simple modern и в во на для с со из по или страница страницу страницы сделай сделать создай создать нужен нужна нужно новый новая дизайн макет'.split(' '));
const RU=Object.entries({лендинг:'landing',посадочн:'landing',сайт:'website landing',дашборд:'dashboard',панел:'dashboard admin',админ:'admin',аналитик:'analytics',отчет:'report',онбординг:'onboarding',регистрац:'signup onboarding',авторизац:'login',логин:'login',мобильн:'mobile',приложени:'app',кофе:'coffee cafe',кафе:'cafe coffee',ресторан:'restaurant',меню:'menu',магазин:'ecommerce shop store',оплат:'checkout payment',тариф:'pricing',прайс:'pricing',презентац:'deck slides presentation',слайд:'slides deck',постер:'poster',плакат:'poster',открытк:'card',визитк:'card',карточк:'card',брошюр:'brochure',печат:'print',документ:'document',резюме:'resume',портфолио:'portfolio',блог:'blog',стать:'article',журнал:'magazine editorial',бренд:'brand',логотип:'logo',анкет:'form survey',настройк:'settings',профил:'profile',таблиц:'table',график:'chart',диаграм:'diagram chart',бронирован:'booking',расписан:'schedule calendar',календар:'calendar',письм:'email',рассылк:'newsletter email',видео:'video',анимац:'animation motion',финанс:'finance fintech',банк:'banking fintech',крипт:'crypto',медицин:'medical health',клиник:'clinic health',образован:'education',курс:'course education',путешеств:'travel',мероприят:'event',конференц:'conference event',чат:'chat',темн:'dark',инфограф:'infographic'});
const terms=text=>String(text??'').toLowerCase().replaceAll('ё','е').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const singular=word=>word.length>3&&word.endsWith('s')&&!word.endsWith('ss')?word.slice(0,-1):word;
const matches=(term,word)=>word===term||singular(word)===singular(term)||term.length>=5&&word.startsWith(term);
export function searchCatalog(query) {
  const words=terms(query),groups=[],ignored=[],unknown=[];
  for(const word of words) {
    if(STOP.has(word))ignored.push(word);
    else if(/\p{Script=Cyrillic}/u.test(word)){const hit=RU.find(([stem])=>word.startsWith(stem));if(hit)groups.push(hit[1].split(' '));else unknown.push(word);}
    else groups.push([word]);
  }
  const rows=catalog().map((row,order)=>({row,order,fields:[[4,terms(row.id)],[2,terms([row.kind,row.mode,row.platform,row.scenario].join(' '))],[1,terms(row.summary)]]}));
  const idf=new Map(groups.flat().map(t=>[t,Math.log((rows.length+1)/(rows.filter(r=>r.fields.some(([,f])=>f.some(w=>matches(t,w)))).length+1))+1]));
  const exact=new Set([words.join('-'),words.filter(w=>!STOP.has(w)).join('-')]);
  const ranked=rows.map(r=>{
    let covered=0,score=0;
    for(const group of groups){let best=0;for(const t of group)for(const [weight,f] of r.fields)if(f.some(w=>matches(t,w)))best=Math.max(best,weight*idf.get(t));if(best){covered++;score+=best;}}
    return {...r,covered,score:score+(exact.has(r.row.id)?1000:0)+(words.includes(r.row.id)?100:0)};
  }).filter(r=>r.covered).sort((a,b)=>b.covered-a.covered||b.score-a.score||a.order-b.order);
  return {groups,ignored,unknown,complete:ranked.filter(r=>r.covered===groups.length).length,rows:ranked.slice(0,8).map(r=>r.row)};
}
// Read-only library access through the observed guide CLI: clients whose file
// reads arrive as shell commands can inspect sections, examples and systems.
const READABLE=/\.(md|css|html|json|txt|ya?ml|svg|js|mjs|ts|tsx)$/i;
export function libraryResource(path,{root=join(skillRoot,'library')}={}) {
  const label=String(path??'').replace(/^library\//,'');
  if(!label.trim() || isAbsolute(label) || label.split(/[\\/]/).includes('..'))throw new Error('read --path takes a path inside library/, such as skills/ID/ or design-systems/ID/DESIGN.md.');
  const base=realpathSync(root);let real;
  try{real=realpathSync(join(base,label));}catch{throw new Error('No such library path: '+label);}
  if(real===base)throw new Error('Search with catalog --query instead of listing the whole library.');
  if(!real.startsWith(base+sep))throw new Error('Library path resolves outside library/: '+label);
  if(statSync(real).isDirectory()) {
    const files=[],seen=new Set();
    const walk=dir=>{
      if(seen.has(dir))return;seen.add(dir);
      for(const name of readdirSync(dir).sort()) {
        let target;try{target=realpathSync(join(dir,name));}catch{continue;}
        if(!target.startsWith(base+sep))continue;
        if(statSync(target).isDirectory())walk(target);else if(READABLE.test(name))files.push(relative(base,join(dir,name))+' ('+statSync(target).size+' bytes)');
      }
    };
    walk(real);
    return {label,pages:splitText(`Directory ${label}: ${files.length} readable file(s). Read one with read --path FILE --page N.\n`+files.join('\n')+'\n')};
  }
  if(real===join(base,'catalog.tsv'))throw new Error('Search the catalog with catalog --query WORDS.');
  if(!READABLE.test(real))throw new Error('Not a readable text resource: '+label);
  const pages=splitText(read(real));
  return {label,pages:pages.length?pages:['']};
}
function entry(id) {
  const row=catalog().find(r=>r.kind==='skill' && r.id===id);
  if(!row)throw new Error('Select a skill entry id from the catalog, not a guessed path.');
  return row;
}
export function curriculum(extra = []) {
  const map = '# All craft-design capabilities\n\nKnowing this map is mandatory; using every method is not. Decide from the brief and actual session tools.\n\n' + capabilities.map(c => `## ${c.id}\nWhen: ${c.when}\nRecommendation: ${c.recommendation}\nTools: ${c.commands.join(', ') || 'host tools and library resources'}\nDetails: ${c.details.join(', ') || 'charter and selected library entry'}\n`).join('\n');
  const sources = [ ['capability-map', map], ...['references/charter.md', 'references/charter-craft.md', 'references/visual-concepts.md', ...extra].filter((s,i,a)=>a.indexOf(s)===i).map(p=>[p,read(join(skillRoot,p))]) ];
  return { edition: hash(JSON.stringify([read(join(skillRoot, 'SKILL.md')), sources])), pages: sources.flatMap(([source,text])=>splitText(text).map((body,i,a)=>({source,part:i+1,total:a.length,body}))) };
}
export function loadState(path) {
  const state = JSON.parse(read(path));
  if (state.schema !== 1 || !Array.isArray(state.extra) || JSON.stringify(state.extra)!==JSON.stringify(state.plan?validatePlan(state.plan):[])) throw new Error('Invalid guide state. Start a new state file.');
  const guide = curriculum(state.extra);
  if (state.edition !== guide.edition) throw new Error('Instructions changed. Start a new state file and reconsider the route; old receipts are not valid.');
  if (!Number.isInteger(state.acknowledged) || state.acknowledged < 0 || state.acknowledged > guide.pages.length) throw new Error('Invalid guide position.');
  return {state,guide};
}
function save(path,state,initial=false) {
  state.updatedAt = new Date().toISOString();
  state.events ??= [];
  state.events.push({at:state.updatedAt,phase:state.phase,acknowledged:state.acknowledged});
  mkdirSync(dirname(path),{recursive:true});
  if (initial) writeFileSync(path,JSON.stringify(state,null,2)+'\n',{flag:'wx'});
  else { const tmp=path+'.'+randomUUID()+'.tmp'; writeFileSync(tmp,JSON.stringify(state,null,2)+'\n',{flag:'wx'}); renameSync(tmp,path); }
}
export function validatePlan(plan) {
  if (!plan || !['direct','reference','generated'].includes(plan.visualPath)) throw new Error('visualPath must be direct, reference or generated.');
  for(const kind of ['generation','viewing']) {
    const v=plan.tools?.[kind];
    if(!v || !['available','unavailable','unknown'].includes(v.status) || typeof v.evidence!=='string' || !v.evidence.trim()) throw new Error(`tools.${kind} needs status and observed evidence; unknown is allowed but not a claim of absence.`);
  }
  if (plan.visualPath==='generated' && ['generation','viewing'].some(k=>plan.tools[k].status!=='available')) throw new Error('Generated proposals require both generation and visual inspection.');
  if (plan.visualPath==='reference' && plan.tools.viewing.status!=='available') throw new Error('Visual reference transfer requires visual inspection.');
  if (JSON.stringify(Object.keys(plan.capabilities??{}).sort())!==JSON.stringify(capabilities.map(c=>c.id).sort())) throw new Error('Assess every capability exactly once; use the ids from the capability map.');
  for(const c of capabilities) {
    const v=plan.capabilities[c.id];
    if(!['use','skip','unavailable'].includes(v?.choice) || typeof v.evidence!=='string' || !v.evidence.trim()) throw new Error(`Capability ${c.id} needs choice (use/skip/unavailable) and a task-specific reason.`);
  }
  if(typeof plan.reason!=='string' || !plan.reason.trim()) throw new Error('Explain the selected visual path in reason.');
  const extra=capabilities.filter(c=>plan.capabilities[c.id].choice==='use').flatMap(c=>c.details);
  if(plan.capabilities.library.choice==='use') {
    const row=entry(plan.entryId);
    extra.push(row.path,...(row.craft||'typography,color,anti-ai-slop').split(',').map(name=>'library/craft/'+name+'.md'));
  }
  return [...new Set(extra)];
}
export function requireReady(path) {
  const {state,guide}=loadState(path);
  if(state.phase!=='ready' || state.acknowledged!==guide.pages.length || !state.plan) throw new Error('Guide incomplete: receive and acknowledge every packet, then decide and read applicable details before implementation/verification.');
  validatePlan(state.plan);
  return state;
}
export function main(argv) {
  const args=[...argv], command=args.shift();
  const take=flag=>{const i=args.indexOf(flag); if(i<0)return null; if(!args[i+1] || args[i+1].startsWith('--'))throw new Error(`Missing ${flag} value`);return args.splice(i,2)[1];};
  if(command==='--help' || !command) return console.log('craft-guide.mjs begin|next|status|decide --state FILE [--receipt TOKEN] [--plan PLAN.json]\ncraft-guide.mjs catalog --query WORDS | entry --id ID [--page N] | read --path LIBRARY_PATH [--page N]\nRead one returned packet per tool call; keep its ending receipt visible. Do not loop, batch, pipe, truncate or automate acknowledgements. status repeats the pending packet. decide requires all base packets and a plan assessing every capability. Applicable detail packets follow. READY confirms delivery and declared decisions, not understanding or host-enforced write protection.');
  if(command==='catalog') {
    const query=take('--query');
    if(!query?.trim() || args.length)throw new Error("catalog --query 'WORDS': English catalog words or an id; common Russian artifact words are mapped.");
    const result=searchCatalog(query);
    if(!result.groups.length)throw new Error('No searchable word in the query'+(result.unknown.length?' (unmapped: '+result.unknown.join(', ')+')':'')+'. Use English catalog words such as landing, dashboard, mobile, deck, poster, report, or an id.');
    const note=[result.ignored.length?'ignored: '+result.ignored.join(', '):'',result.unknown.length?'unmapped: '+result.unknown.join(', '):''].filter(Boolean).join('; ');
    console.log(`Catalog matches for ${result.groups.map(g=>g.join('/')).join(' + ')}${note?' ('+note+')':''}. ${result.complete?Math.min(result.complete,8)+' shown match every word.':'No entry matches every word; partial matches, best first.'}\n`+(result.rows.map(r=>`${r.kind} ${r.id} ${[r.mode,r.platform,r.scenario].filter(Boolean).join('/')}: ${r.summary.slice(0,180)}`).join('\n')||'No matching entry.')+`\nPreview a skill: ${guideCommand('entry','--id','ID')}. List an entry's or system's files: ${guideCommand('read','--path','skills/ID/')} or design-systems/ID/.`);return;
  }
  if(command==='entry') {
    const id=take('--id'),number=Number(take('--page')||1),row=entry(id),pages=splitText(read(join(skillRoot,row.path)));
    if(args.length || !Number.isInteger(number) || number<1 || number>pages.length)throw new Error('entry --id ID --page N');
    const folder=dirname(row.path).replace(/^library\//,'')+'/',split=existsSync(join(skillRoot,dirname(row.path),'sections'));
    console.log(`${row.path} ${number}/${pages.length}\n${pages[number-1]}\nCandidate preview. decide delivers only this ENTRY.md and its catalog craft files.${split?' This ENTRY.md is an index; its content is in sections/.':''} Sections, references, templates, examples and design-system files are not delivered automatically: read those the task needs. ${guideCommand('read','--path',folder)} lists them.`);return;
  }
  if(command==='read') {
    const target=take('--path'),number=Number(take('--page')||1);
    if(!target || args.length)throw new Error('read --path LIBRARY_PATH [--page N]');
    const {label,pages}=libraryResource(target);
    if(!Number.isInteger(number) || number<1 || number>pages.length)throw new Error(`read --path ${label} --page 1..${pages.length}`);
    console.log(`LIBRARY ${label} ${number}/${pages.length}\n${pages[number-1]}\nEND PAGE ${number}/${pages.length}. ${number<pages.length?'Next page: '+guideCommand('read','--path',label,'--page',number+1):'End of resource.'}`);return;
  }
  const stateArg=take('--state'),receipt=take('--receipt'),planFile=take('--plan'),inlinePlan=take('--json'),cancelReason=take('--reason');
  if(!stateArg || args.length || !['begin','next','status','decide','cancel'].includes(command))throw new Error('Use --help; a state file is required.');
  const path=resolve(stateArg); let state,guide;
  if(command==='begin') {
    guide=curriculum(); state={schema:1,edition:guide.edition,extra:[],acknowledged:0,phase:'reading',pending:randomUUID(),plan:null}; save(path,state,true);
  } else {
    try{({state,guide}=loadState(path));}catch(error){
      if(command==='cancel' && cancelReason?.trim()){console.log('CANCELLED. Host guard released; unreadable or absent state left unchanged. No readiness claim.');return;}
      throw error;
    }
    if(command==='cancel') {
      if(!cancelReason?.trim())throw new Error('cancel needs --reason documenting an explicit task cancellation.');
      state.phase='cancelled';state.pending=null;state.cancelReason=cancelReason;save(path,state);
    } else if(command==='next') {
      if(state.phase!=='reading' || !receipt || receipt!==state.pending)throw new Error('Missing/wrong receipt. Read the complete pending packet with status; no progress recorded.');
      state.acknowledged++; state.pending=state.acknowledged<guide.pages.length?randomUUID():null;
      if(!state.pending)state.phase=state.plan?'ready':'choose';
      save(path,state);
    } else if(command==='decide') {
      if(state.phase!=='choose' || state.acknowledged!==guide.pages.length)throw new Error('Finish base instructions before choosing the route.');
      if(!!planFile===!!inlinePlan)throw new Error('Provide either --plan FILE or --json JSON with visualPath, reason, tools, capabilities and entryId when using the library.');
      const plan=JSON.parse(inlinePlan??read(resolve(planFile))); const extra=validatePlan(plan);
      state.plan=plan; state.extra=extra; guide=curriculum(extra); state.edition=guide.edition;
      state.pending=state.acknowledged<guide.pages.length?randomUUID():null;
      state.phase=state.pending?'reading':'ready'; save(path,state);
    }
  }
  if(state.phase==='reading') {
    const p=guide.pages[state.acknowledged];
    console.log(`CRAFT GUIDE ${state.acknowledged+1}/${guide.pages.length} | ${p.source} ${p.part}/${p.total}\n${p.body}\nEND PACKET. Receipt: ${state.pending}\nNext: ${guideCommand('next','--state',path,'--receipt',state.pending)}\nOne packet per tool call; retain the whole output (at least 1800 output tokens).`);
  } else if(state.phase==='choose') {
    console.log('BASE COMPLETE. Before authoring: inspect actual tools and select the route. Save plan JSON: {"visualPath":"direct|reference|generated","reason":"why for this task","tools":{"generation":{"status":"available|unavailable|unknown","evidence":"observed tool or discovery result"},"viewing":{"status":"available|unavailable|unknown","evidence":"observed viewer"}},"entryId":"catalog id when using library","capabilities":{"<each id>":{"choice":"use|skip|unavailable","evidence":"task-specific reason"}}}.\nIds: '+capabilities.map(c=>c.id).join(', ')+'\nSelect with '+guideCommand('catalog','--query','WORDS')+' (ranked), '+guideCommand('entry','--id','ID')+' and '+guideCommand('read','--path','skills/ID/')+' (or design-systems/ID/) to list files; read --path FILE --page N pages any listed text file. Then craft-guide.mjs decide --state FILE --plan PLAN.json (or --json JSON). Read its applicable detail packets before authoring.');
  } else if(state.phase==='cancelled')console.log('CANCELLED. No readiness claim; checks requiring READY remain unavailable.');
  else {
    const row=state.plan?.capabilities?.library?.choice==='use'?entry(state.plan.entryId):null,folder=row&&dirname(row.path).replace(/^library\//,'')+'/';
    console.log('READY. Delivered and acknowledged: capability map, both charter parts, visual concepts and the detail packets of capabilities marked use'+(row?`, plus ${row.path} and its catalog craft files`:'')+'. Route recorded. This is not proof of understanding or a security boundary. Not delivered automatically: '+(row?`the other files of ${folder} (sections, references, templates, examples), `:'')+'design-system and brand files. Read those the task needs before authoring'+(row?'; '+guideCommand('read','--path',folder)+' lists the entry files':'')+'. Build within scope, then use verify.mjs with this state.');
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{if(process.argv[2] && process.argv[2]!=='--help')consumeInvocation(skillRoot,process.cwd(),process.argv.slice(2));main(process.argv.slice(2));}catch(error){console.error('guide: '+error.message);process.exitCode=2;}
}
