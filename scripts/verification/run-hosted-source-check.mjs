import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { runBounded, sourceIdentity } from './development-self-audit.mjs';

// Additional source-only lane. The canonical 48 Node20 stages stay unchanged.
// Explicit inventory, no shell or caller-supplied command. Successor PostgreSQL
// checks use only the existing disposable-loopback guards, never hosted databases.
export const hostedSourceChecks = Object.freeze({
  schema: ['--import','tsx','--test','scripts/tests/validate-isolated-schema-lineage.test.mjs','scripts/tests/validate-demo-schema-isolation-registration.mjs','scripts/tests/validate-demo-schema-isolation-engineering.mjs','tests/demo/database-target.test.ts','scripts/tests/validate-hosted-ci.mjs'],
  hosted: ['--import','tsx','--test','tests/demo-hosted/admission.test.ts','tests/demo-hosted/http-application.test.ts','tests/demo-hosted/node-adapter.test.ts','tests/demo-hosted/runtime-policy.test.ts','tests/demo-hosted/transport.test.ts'],
  package: ['--test','scripts/tests/demo-vercel-package.mjs'],
  successor: ['--import','tsx','--test','tests/demo-successor/preparation.test.ts','tests/demo-successor/accepting.test.ts','scripts/db/manual-apply/probe-safety.test.mjs'],
  successor_package: ['scripts/tests/successor-package-proof.mjs'],
  accepting_package: ['scripts/tests/accepting-package-proof.mjs'],
  accepting_postgres: ['scripts/tests/accepting-postgres-proof.mjs'],
  successor_model: ['scripts/db/verify-isolated-model-equivalence.mjs'],
  successor_postgres: ['--import','tsx','scripts/db/run-successor-local-proof.ts'],
});
export function evaluateHostedSourceCheck(report) {
  const errors=[];
  if(!Object.hasOwn(hostedSourceChecks,report?.check))return ['unknown check'];
  if(JSON.stringify(report.command)!==JSON.stringify(['node',...hostedSourceChecks[report.check]]))errors.push('exact command required');
  if(report.node!=='v24.19.0'||report.platform!=='linux')errors.push('pinned Node24 Linux runtime required');
  if(report.source?.dirty!==false||report.source?.source_sha!==report.expected_sha||!/^[a-f0-9]{40}$/.test(report.expected_sha??'')||report.source_unchanged!==true)errors.push('clean exact unchanged source required');
  if(report.exit_code!==0||report.timed_out!==false||report.execution_error!==null||!Number.isFinite(report.duration_ms)||report.duration_ms>27000||report.duration_ms<0)errors.push('bounded successful operation required');
  if(!/^[a-f0-9]{40}$/.test(report.source?.tree_sha??'')||!['stamp','working_digest'].every(key=>/^[a-f0-9]{64}$/.test(report.source?.[key]??''))||!['stdout_sha256','stderr_sha256'].every(key=>/^[a-f0-9]{64}$/.test(report[key]??'')))errors.push('complete source and output digest identity required');
  const started=Date.parse(report.started_at),finished=Date.parse(report.finished_at);
  if(report.kind!=='hosted-source-check'||!Number.isFinite(started)||!Number.isFinite(finished)||finished<started||Math.abs(finished-started-report.duration_ms)>1000)errors.push('complete timing and report identity required');
  if(report.timeout_ms!==25000||report.runtime_activation!=='BLOCKED'||report.shared_or_production_execution_authorized!==false)errors.push('bounded source-only scope required');
  return errors;
}
export function runHostedSourceCheck(root,check,expectedSha=process.env.AUDIT_EXPECTED_SHA){
  if(!Object.hasOwn(hostedSourceChecks,check))throw Error('unknown hosted source check');
  const before=sourceIdentity(root),args=hostedSourceChecks[check];
  const env=['successor_model','successor_postgres','accepting_postgres'].includes(check)?{...process.env,TEACH_DB_SCHEMA:'teach_v2_demo'}:process.env;
  const result=runBounded(process.execPath,args,{root,timeoutMs:25000,env});
  const after=sourceIdentity(root),hash=value=>createHash('sha256').update(value).digest('hex');
  const report={kind:'hosted-source-check',check,command:['node',...args],node:process.version,platform:process.platform,expected_sha:expectedSha,source:before,source_unchanged:before.stamp===after.stamp,timeout_ms:25000,...Object.fromEntries(Object.entries(result).filter(([key])=>!['stdout','stderr'].includes(key))),stdout_sha256:hash(result.stdout),stderr_sha256:hash(result.stderr),runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
  report.errors=evaluateHostedSourceCheck(report);report.state=report.errors.length?'BLOCKED':'PROVEN';
  const output=join(root,'verification/generated/hosted-source');mkdirSync(output,{recursive:true});
  writeFileSync(join(output,check+'.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(output,check+'.stdout.log'),result.stdout);writeFileSync(join(output,check+'.stderr.log'),result.stderr);
  return {report,...result};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
  const {report,stdout,stderr}=runHostedSourceCheck(process.cwd(),process.argv[2]);
  process.stdout.write(stdout);process.stderr.write(stderr);console.log(JSON.stringify(report));if(report.state!=='PROVEN')process.exitCode=1;
}
