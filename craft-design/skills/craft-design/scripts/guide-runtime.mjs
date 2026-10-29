// Host-observed invocation evidence. Cooperative guardrail, not a secret credential.
import {mkdirSync,writeFileSync,readFileSync,unlinkSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
export const guardDirectory=()=>join(tmpdir(),'craft-guide-guards-'+(process.getuid?.()??'user'));
function proofPath(root,cwd,args,data) {
  return join(data,'invocation-'+createHash('sha256').update(JSON.stringify([realpathSync(root),realpathSync(cwd),args])).digest('hex')+'.json');
}
export function issueInvocation(root,cwd,args,data=guardDirectory()) {
  mkdirSync(data,{recursive:true,mode:0o700});
  writeFileSync(proofPath(root,cwd,args,data),JSON.stringify({at:Date.now()}),{mode:0o600});
}
export function consumeInvocation(root,cwd,args,data=guardDirectory()) {
  const path=proofPath(root,cwd,args,data);
  let proof;
  try{proof=JSON.parse(readFileSync(path,'utf8'));unlinkSync(path);}catch{throw new Error('The craft-design host guard did not observe this invocation. Enable/review the bundled hook in this client before authoring; a plain skill cannot enforce full delivery. Do not bypass this check or claim READY.');}
  if(typeof proof.at!=='number'||Date.now()-proof.at>30000||proof.at>Date.now()+1000)throw new Error('Expired host invocation. Run the plain guide command again.');
}
