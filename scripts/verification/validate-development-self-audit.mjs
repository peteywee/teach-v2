#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inspectConsolidatedVerification } from './consolidated-ci-evidence.mjs';
export function inspectDevelopmentSelfAudit(root) {
  const errors=[],fail=message=>errors.push(`development self-audit: ${message}`);
  const text=path=>{try{return readFileSync(join(root,path),'utf8');}catch {fail(`${path} is required`);return '';}};
  errors.push(...inspectConsolidatedVerification(root));
  const runner=text('scripts/verification/development-self-audit.mjs');
  for(const token of ['shell:false','killSignal:\'SIGKILL\'','timeoutMs>25000','before.stamp===after.stamp','complete live foundation inventory required','pinned CI runtime provenance required','validator shards must cover one complete identical inventory'])if(!runner.includes(token))fail(`bounded provenance protection missing: ${token}`);
  const service=text('src/modules/identity/application/identity-lifecycle-service.ts');
  if(!service.includes('structuredClone(request)')||!(service.indexOf('await context.authorization.requireAuthorization')<service.indexOf('await context.identities.deactivate'))||!service.includes('await context.audit.appendRequired'))fail('Identity authorization, owner mutation and required audit connection required');
  const transaction=text('src/modules/identity/infrastructure/persistence/postgres-identity-command-transaction.ts');
  for(const token of ['IdentityCommandDependenciesUnavailableError','this.db.transaction','bindings.authorization(transaction)','bindings.audit(transaction)','new PostgresIdentityRepository(transaction)'])if(!transaction.includes(token))fail('Identity exact-transaction binding and absent-dependency refusal required');
  const ledger=JSON.parse(text('verification/whole-repository/command-coverage.json')||'{}');
  for(const id of ['DeactivateIdentity','ReactivateIdentity']){
    const row=ledger.commands?.find(x=>x.command===id);
    if(!row?.tests?.includes('tests/integration/identity/identity-command-transaction.test.ts')||row.runtime_conformance!=='UNKNOWN'||row.runtime_activation!=='BLOCKED')fail('connected mechanisms must retain partial runtime scope and PG evidence');
  }
  return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
  const errors=inspectDevelopmentSelfAudit(resolve(process.cwd()));if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log('DEVELOPMENT SELF-AUDIT STRUCTURAL GATE PASS; full runtime UNKNOWN, production BLOCKED');
}
