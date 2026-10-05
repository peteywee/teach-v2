#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inspectAuditPlan } from './self-audit-catalog.mjs';
export function inspectDevelopmentSelfAudit(root) {
  const errors=[],fail=message=>errors.push(`development self-audit: ${message}`);
  const text=path=>{try{return readFileSync(join(root,path),'utf8');}catch {fail(`${path} is required`);return '';}};
  let plan;try{plan=JSON.parse(text('verification/whole-repository/self-audit-plan.json'));}catch{fail('valid plan JSON required');}
  errors.push(...inspectAuditPlan(plan));
  const workflow=text('.github/workflows/development-self-audit.yml');
  if(/\bpaths(?:-ignore)?:/.test(workflow)||!workflow.includes('pull_request:\n    branches: [main]')||!workflow.includes('push:\n    branches: [main]'))fail('automatic audit required on every PR and main tree');
  const expected='${{ github.event.pull_request.head.sha || github.sha }}';
  if(!workflow.includes(`ref: ${expected}`)||!workflow.includes(`AUDIT_EXPECTED_SHA: ${expected}`))fail('exact candidate checkout and expected SHA required');
  if(!workflow.includes('permissions:\n  contents: read')||/\b(?:contents|issues|pull-requests|id-token): write/.test(workflow))fail('audit must have read-only permissions');
  if(!workflow.includes("node-version: '20'")||!workflow.includes('pnpm@12.8.1')||!workflow.includes('pnpm install --frozen-lockfile')||!workflow.includes('image: postgres:17-alpine')||!workflow.includes("TEACH_ISOLATED_DB: '1'"))fail('pinned runtime and isolated PostgreSQL required');
  const stages=[...workflow.matchAll(/run: node scripts\/verification\/run-self-audit\.mjs --stage ([a-z0-9-]+)/g)].map(x=>x[1]);
  if(JSON.stringify(stages)!==JSON.stringify(plan?.stages?.map(x=>x.id)))fail('complete ordered checkpoint workflow required');
  if(!workflow.includes('if: always()\n        run: node scripts/verification/run-self-audit.mjs --finish')||!workflow.includes('if: always()\n        uses: actions/upload-artifact@v4')||!workflow.includes('if-no-files-found: error'))fail('failed or missing audit evidence must finalize and be retained');
  const runner=text('scripts/verification/development-self-audit.mjs');
  for(const token of ['shell:false','killSignal:\'SIGKILL\'','timeoutMs>25000','before.stamp===after.stamp','complete live foundation inventory required','pinned CI runtime provenance required','validator shards must cover one complete identical inventory'])if(!runner.includes(token))fail(`bounded provenance protection missing: ${token}`);
  const service=text('src/modules/identity/application/identity-lifecycle-service.ts');
  if(!service.includes('structuredClone(request)')||!(service.indexOf('await context.authorization.requireAuthorization')<service.indexOf('await context.identities.deactivate'))||!service.includes('await context.audit.appendRequired'))fail('Identity authorization, owner mutation and required audit connection required');
  const transaction=text('src/modules/identity/infrastructure/persistence/postgres-identity-command-transaction.ts');
  for(const token of ['IdentityCommandDependenciesUnavailableError','this.db.transaction','bindings.authorization(transaction)','bindings.audit(transaction)','new PostgresIdentityRepository(transaction)'])if(!transaction.includes(token))fail('Identity exact-transaction binding and absent-dependency refusal required');
  const p02=text('.github/workflows/slice-p02-implementation.yml');if(!p02.includes('run: pnpm test:identity:commands:integration'))fail('atomic Identity integration evidence must run in P02 CI');
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
