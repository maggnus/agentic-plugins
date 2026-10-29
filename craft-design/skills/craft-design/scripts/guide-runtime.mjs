// Host-observed invocation evidence. Cooperative guardrail, not a secret credential.
import {mkdirSync,writeFileSync,readFileSync,unlinkSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
export const guardDirectory=()=>join(tmpdir(),'craft-guide-guards-'+(process.getuid?.()??'user'));
function absoluteArguments(cwd,args) {
  return args.map((value,i)=>i>0&&['--state','--plan'].includes(args[i-1])?resolve(cwd,value):value);
}
function proofPath(root,cwd,args,data) {
  // Codex may report the session directory to hooks while exec_command runs in
  // another workdir. Bind the exact arguments and absolute data paths, not the
  // unrelated session cwd. Relative paths in different directories still differ.
  return join(data,'invocation-'+createHash('sha256').update(JSON.stringify([realpathSync(root),absoluteArguments(cwd,args)])).digest('hex')+'.json');
}
export function issueInvocation(root,cwd,args,data=guardDirectory()) {
  mkdirSync(data,{recursive:true,mode:0o700});
  writeFileSync(proofPath(root,cwd,args,data),JSON.stringify({at:Date.now()}),{mode:0o600});
}
export function consumeInvocation(root,cwd,args,data=guardDirectory()) {
  const path=proofPath(root,cwd,args,data);
  let proof;
  try{proof=JSON.parse(readFileSync(path,'utf8'));unlinkSync(path);}catch{
    const quote=value=>"'"+String(value).replaceAll("'", "'\"'\"'")+"'";
    const retry=['node',join(root,'scripts/craft-guide.mjs'),...absoluteArguments(cwd,args)].map(quote).join(' ');
    throw new Error('The craft-design host guard did not observe this invocation. This can mean an unsupported command form OR an inactive hook. Retry once in the SAME working directory as a standalone literal command (no variable, cd, chain, wrapper, pipe or redirection):\n'+retry+'\nIf that literal retry also fails, stop preparation and report hook activation as unverified. Do not bypass the guard, forge receipts or claim READY.');
  }
  if(typeof proof.at!=='number'||Date.now()-proof.at>30000||proof.at>Date.now()+1000)throw new Error('Expired host invocation. Run the plain guide command again.');
}
