import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {guard,words,attemptsGuide} from '../hooks/guard.mjs';
import {skillRoot,curriculum,capabilities,main} from '../skills/craft-design/scripts/craft-guide.mjs';
// The registry doubles as the CLI's guard directory when a child runs with TMPDIR=dir.
const dir=mkdtempSync(join(tmpdir(),'craft-guard-test-')),data=join(dir,'craft-guide-guards-'+(process.getuid?.()??'user')),statePath=join(dir,'state.json');
const script=join(skillRoot,'scripts/craft-guide.mjs');
const event=command=>({session_id:'unit',cwd:dir,tool_name:'Bash',tool_input:{command}});
const options={root:skillRoot,data};
const blocked=result=>result.hookSpecificOutput?.permissionDecision==='deny';
try {
 assert.deepEqual(words("node 'a b.mjs' decide --json '{\"reason\":\"a | b\"}'"),['node','a b.mjs','decide','--json','{"reason":"a | b"}']);
 assert.deepEqual(words('node "a b.mjs" decide --json "{\\"reason\\":\\"User\'s café\\\\bar\\"}"'),['node','a b.mjs','decide','--json','{"reason":"User\'s café\\bar"}']);
 for(const c of ['node a | tail -8','node a > file','node a; date','node a && b','node $X','node `x`','node $(x)','node a\ncat b','node "$X"','node "`x`"','node "a\\nb"'])assert.throws(()=>words(c));
 assert.ok(attemptsGuide(`cd '${skillRoot}'; mkdir -p output; node scripts/craft-guide.mjs begin --state state.json`,dir,skillRoot),'literal cd is resolved before a compound start');
 assert.ok(attemptsGuide(`zsh -lc 'node ${script} begin --state state.json'`,dir,skillRoot),'literal shell wrapper still counts as an attempt');
 assert.ok(attemptsGuide(`node > out ${script} begin --state state.json`,dir,skillRoot),'redirection targets are not arguments or commands');
 assert.ok(!blocked(guard(event('printf unrelated > file'),options)),'inactive work unaffected');
 assert.ok(!blocked(guard(event('cat unrelated | grep craft-guide.mjs'),options)),'unrelated guide mention unaffected');
 for(const command of [
  `printf '%s' 'node ${script} begin --state example.json'`,
  'node /other/scripts/craft-guide.mjs begin --state example.json',
  `printf '%s' > node ${script} begin --state example.json`,
  `printf '%s' 2> node ${script} begin --state example.json`,
  `printf '%s' >> 'node ${script} begin --state example.json'`,
  `cat <<'EOF'\nnode ${script} begin --state example.json\nEOF`,
  `# node ${script} begin --state example.json\ncat README.md`
 ]) {
  assert.ok(!blocked(guard(event(command),options)),'examples and other scripts do not activate preparation');
  assert.ok(!blocked(guard(event('cat README.md'),options)),'unrelated session stays inactive');
 }
 assert.ok(blocked(guard(event(`node ${script} begin --state ${statePath} | tail -8`),options)),'shortened first packet blocked');
 assert.ok(blocked(guard(event('printf fallback > index.html'),options)),'malformed start cannot silently fall back to authoring');
 for(const args of [`--state ${statePath} --reason cancelled --unexpected`,'--reason cancelled',`--state ${statePath}`,`--state ${statePath} --reason x --reason y`]) {
  assert.ok(blocked(guard(event(`node ${script} cancel ${args}`),options)),'invalid cancellation is rejected before changing the registry');
  assert.ok(blocked(guard(event('cat README.md'),options)),'invalid cancellation leaves preparation active');
 }
 assert.ok(!blocked(guard(event(`node ${script} cancel --state ${statePath} --reason 'Test cancelled'`),options)),'cancel works even before a state exists');
 assert.ok(!blocked(guard(event('printf unrelated > file'),options)),'cancellation restores unrelated work');
 const occupied=join(dir,'unrelated.json');writeFileSync(occupied,'{"unrelated":true}');
 assert.ok(!blocked(guard(event(`node ${script} begin --state ${occupied}`),options)));
 assert.throws(()=>main(['begin','--state',occupied]),/EEXIST/);
 assert.ok(blocked(guard(event('printf fallback > index.html'),options)),'failed start remains explicit, not a silent bypass');
 assert.ok(!blocked(guard(event(`node ${script} cancel --state ${occupied} --reason 'Task cancelled'`),options)));
 main(['cancel','--state',occupied,'--reason','Task cancelled']);
 assert.equal(readFileSync(occupied,'utf8'),'{"unrelated":true}','recovery preserves the unrelated file');
 assert.ok(!blocked(guard(event('printf unrelated > file'),options)),'failed begin can be cancelled without editing the registry');
 assert.ok(!blocked(guard(event(`node ${script} begin --state ${statePath}`),options)));
 const base=curriculum();const state={schema:1,edition:base.edition,extra:[],acknowledged:0,phase:'reading',pending:'receipt',plan:null};
 writeFileSync(statePath,JSON.stringify(state));
 assert.ok(blocked(guard(event('printf premature > index.html'),options)));
 assert.ok(blocked(guard({...event(''),tool_name:'Write',tool_input:{file_path:'index.html',content:'x'}},options)));
 assert.ok(blocked(guard({...event(''),tool_name:'Read',tool_input:{file_path:statePath}},options)),'no reading receipts from state during delivery');
 assert.ok(blocked(guard(event(`node ${script} next --state ${statePath} --receipt receipt | head -1`),options)));
 assert.ok(blocked(guard(event(`python3 -c "print('craft-guide.mjs')"`),options)));
 assert.ok(!blocked(guard(event(`node ${script} status --state ${statePath}`),options)));
 // The printed Next works from another cwd in the Codex form (session cwd, command only).
 const status=spawnSync(process.execPath,[script,'status','--state',statePath],{cwd:dir,encoding:'utf8',env:{...process.env,TMPDIR:dir}});
 assert.equal(status.status,0,status.stderr);
 const next=status.stdout.match(/^Next: (.+)$/m)[1],elsewhere=join(dir,'elsewhere');mkdirSync(elsewhere);
 assert.ok(!blocked(guard({session_id:'unit',hook_event_name:'PreToolUse',cwd:dir,tool_name:'Bash',tool_input:{command:next}},options)),'printed Next is a recognized guide command');
 const advanced=spawnSync(process.execPath,words(next).slice(1),{cwd:elsewhere,encoding:'utf8',env:{...process.env,TMPDIR:dir}});
 assert.equal(advanced.status,0,advanced.stderr);assert.equal(JSON.parse(readFileSync(statePath,'utf8')).acknowledged,1,'printed Next advances delivery');
 state.phase='choose';state.acknowledged=base.pages.length;writeFileSync(statePath,JSON.stringify(state));
 assert.ok(!blocked(guard({...event(''),tool_name:'ToolSearch'},options)));
 // Real client forms while choosing: Claude Code reports the execution cwd; Codex
 // reported the session directory and only the command (host-probe/events.jsonl).
 const work=join(dir,'work');mkdirSync(work);
 const forms={claude:command=>({...event(command),cwd:work,tool_input:{command,description:'Read library file'}}),codex:command=>({session_id:'unit',hook_event_name:'PreToolUse',cwd:dir,tool_name:'Bash',tool_input:{command}})};
 const resource='skills/dashboard/ENTRY.md',child=()=>spawnSync(process.execPath,[script,'read','--path',resource],{cwd:work,encoding:'utf8',env:{...process.env,TMPDIR:dir}});
 for(const [client,form] of Object.entries(forms)) {
  assert.ok(blocked(guard(form(`cat ${join(skillRoot,'library',resource)}`),options)),client+': shell reading stays blocked while choosing');
  assert.ok(blocked(guard(form(`node ${script} read --path ${resource} | head -5`),options)),client+': shortened guide read is blocked');
  assert.ok(!blocked(guard(form(`node ${script} read --path ${resource}`),options)),client+': guide read is allowed while choosing');
  const out=child();assert.equal(out.status,0,client+': '+out.stderr);assert.ok(out.stdout.startsWith(`LIBRARY ${resource} 1/`),client+': observed read returns the page');
  assert.equal(child().status,2,client+': the observed proof is single-use');
 }
 assert.ok(!blocked(guard({...event(''),tool_name:'Read',tool_input:{file_path:join(skillRoot,'library',resource)}},options)),'a client read tool also works while choosing');
 assert.ok(blocked(guard(event('echo premature > index.html'),options)),'choosing is not authoring');
 const plan={visualPath:'direct',reason:'test',tools:{generation:{status:'unknown',evidence:'not checked'},viewing:{status:'unknown',evidence:'not checked'}},visualContract:{source:'project-brand',brandSource:'brand/tokens.css fixture'},capabilities:Object.fromEntries(capabilities.map(c=>[c.id,{choice:'skip',evidence:'fixture'}]))};
 state.plan=plan;state.phase='ready';writeFileSync(statePath,JSON.stringify(state));
 assert.ok(!blocked(guard(event('cat x | tail -1; echo y > index.html'),options)),'ready authoring unaffected');
 assert.ok(!blocked(guard({...event(''),tool_name:'Write',tool_input:{file_path:'index.html'}},options)));
 const b=guard({...event(`node ${script} begin --state ${statePath}`),session_id:'other'},options);assert.ok(!blocked(b),'session isolation');
 // Antigravity PreToolUse event shape (toolCall + conversationId, decision: allow/deny)
 const agyDir=mkdtempSync(join(dir,'agy-')),agyState=join(agyDir,'state.json');
 const agyCmd=CommandLine=>({conversationId:'agy-conv-1',cwd:agyDir,hookEventName:'PreToolUse',toolCall:{id:'tc1',name:'run_command',args:{CommandLine}}});
 const agyBlocked=result=>result.decision==='deny';
 const agyAllowed=result=>result.decision==='allow';
 assert.ok(agyBlocked(guard(agyCmd(`node ${script} begin --no-guard --state ${agyState}`),options)),'antigravity: --no-guard rejected when host guard is active');
 assert.ok(agyAllowed(guard(agyCmd(`node ${script} begin --state ${agyState}`),options)),'antigravity: begin allowed and observed');
 writeFileSync(agyState,JSON.stringify({...state,phase:'reading',acknowledged:0,pending:'receipt',plan:null}));
 assert.ok(agyBlocked(guard({conversationId:'agy-conv-1',cwd:agyDir,hookEventName:'PreToolUse',toolCall:{id:'tc2',name:'write_to_file',args:{TargetFile:'index.html'}}},options)),'antigravity: premature write_to_file blocked');
 writeFileSync(agyState,JSON.stringify({...state,phase:'choose',acknowledged:base.pages.length,pending:null,plan:null}));
 assert.ok(agyAllowed(guard({conversationId:'agy-conv-1',cwd:agyDir,hookEventName:'PreToolUse',toolCall:{id:'tc3',name:'read_file',args:{Path:join(skillRoot,'library',resource)}}},options)),'antigravity: read_file allowed while choosing');
 assert.ok(agyAllowed(guard(agyCmd(`node ${script} read --path ${resource}`),options)),'antigravity: guide read allowed while choosing');
 const agyRead=spawnSync(process.execPath,[script,'read','--path',resource],{cwd:agyDir,encoding:'utf8',env:{...process.env,TMPDIR:dir}});
 assert.equal(agyRead.status,0,agyRead.stderr);
 assert.ok(agyRead.stdout.startsWith(`LIBRARY ${resource} 1/`),'antigravity: observed read returns the page');
 // Generic --no-guard mode works without host guard proof
 const noGuardState=join(agyDir,'no-guard-state.json');
 const noGuardBegin=spawnSync(process.execPath,[script,'begin','--no-guard','--state',noGuardState],{cwd:agyDir,encoding:'utf8',env:{...process.env,TMPDIR:dir}});
 assert.equal(noGuardBegin.status,0,noGuardBegin.stderr);
 assert.ok(noGuardBegin.stdout.includes('--no-guard'),'no-guard mode propagates --no-guard in Next command');
 const noGuardCancel=spawnSync(process.execPath,[script,'cancel','--no-guard','--state',noGuardState,'--reason','test'],{cwd:agyDir,encoding:'utf8',env:{...process.env,TMPDIR:dir}});
 assert.equal(noGuardCancel.status,0,noGuardCancel.stderr);
 console.log('guard: pipelines, redirection, wrappers, premature writes, receipt reads, route selection, printed Next and library reading in client event forms (Claude, Codex, Antigravity), --no-guard generic mode, unrelated work and session isolation passed');
}finally{rmSync(dir,{recursive:true,force:true});}
