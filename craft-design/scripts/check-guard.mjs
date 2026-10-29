import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {guard,words,attemptsGuide} from '../hooks/guard.mjs';
import {skillRoot,curriculum,capabilities,main} from '../skills/craft-design/scripts/craft-guide.mjs';
const dir=mkdtempSync(join(tmpdir(),'craft-guard-test-')),data=join(dir,'registry'),statePath=join(dir,'state.json');
const script=join(skillRoot,'scripts/craft-guide.mjs');
const event=command=>({session_id:'unit',cwd:dir,tool_name:'Bash',tool_input:{command}});
const options={root:skillRoot,data};
const blocked=result=>result.hookSpecificOutput?.permissionDecision==='deny';
try {
 assert.deepEqual(words("node 'a b.mjs' decide --json '{\"reason\":\"a | b\"}'"),['node','a b.mjs','decide','--json','{"reason":"a | b"}']);
 for(const c of ['node a | tail -8','node a > file','node a; date','node a && b','node $X','node `x`','node $(x)','node a\ncat b'])assert.throws(()=>words(c));
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
 state.phase='choose';state.acknowledged=base.pages.length;writeFileSync(statePath,JSON.stringify(state));
 assert.ok(!blocked(guard({...event(''),tool_name:'ToolSearch'},options)));
 assert.ok(blocked(guard(event('echo premature > index.html'),options)),'choosing is not authoring');
 const plan={visualPath:'direct',reason:'test',tools:{generation:{status:'unknown',evidence:'not checked'},viewing:{status:'unknown',evidence:'not checked'}},capabilities:Object.fromEntries(capabilities.map(c=>[c.id,{choice:'skip',evidence:'fixture'}]))};
 state.plan=plan;state.phase='ready';writeFileSync(statePath,JSON.stringify(state));
 assert.ok(!blocked(guard(event('cat x | tail -1; echo y > index.html'),options)),'ready authoring unaffected');
 assert.ok(!blocked(guard({...event(''),tool_name:'Write',tool_input:{file_path:'index.html'}},options)));
 const b=guard({...event(`node ${script} begin --state ${statePath}`),session_id:'other'},options);assert.ok(!blocked(b),'session isolation');
 console.log('guard: pipelines, redirection, wrappers, premature writes, receipt reads, route selection, unrelated work and session isolation passed');
}finally{rmSync(dir,{recursive:true,force:true});}
