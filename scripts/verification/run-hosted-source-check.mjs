import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { runBounded, sourceIdentity } from './development-self-audit.mjs';

// Additional source-only lane. The canonical Node20 audit stages stay unchanged.
// Explicit inventory, no shell or caller-supplied command. Successor PostgreSQL
// checks use only the existing disposable-loopback guards, never hosted databases.
// These two required receipts partition the same 49 assertions, not proof scope.
// Recovery was already imported by registration; the support command runs that
// dependency explicitly while registration selects only its eight own cases.
export const hostedSchemaFiles = Object.freeze([
  "scripts/tests/validate-isolated-schema-lineage.test.mjs",
  "scripts/tests/validate-demo-schema-isolation-registration.mjs",
  "scripts/tests/validate-demo-schema-isolation-engineering.mjs",
  "tests/demo/database-target.test.ts",
  "scripts/tests/validate-hosted-ci.mjs",
  "scripts/tests/hosted-loopback-postgres.test.mjs",
  "scripts/tests/recovery-rehearsal-target.test.mjs"
]);
export const hostedSchemaRecoveryFile = 'scripts/tests/validate-demo-recovery-registration.mjs';
export const hostedSchemaCaseNames = Object.freeze({
  schema_registration: Object.freeze([
  "exact bounded decision verifies current sources before exposing four predecessors and six additions",
  "all six current authority files and all four evidence records reject byte drift without predecessor access",
  "activation, credential, spending, execution and fabricated review cannot expand local-only approval",
  "wrong predecessor snapshots, commits, paths and self-rehashed authority cannot become a new trust root",
  "evidence inventory, symlinks and missing or orphan records fail closed",
  "unregistered authority remains rejected outside the exact six successor additions",
  "historical reader cannot accept a caller-forged snapshot or hide current drift without physical envelope",
  "complete predecessor-only checkout remains valid when the entire successor layer is absent"
]),
  schema_support: Object.freeze([
  "finite cached image, no mounts/public binds and only loopback listener",
  "success launches owned resource, explicit cleanup verifies absence",
  "port and existing-container collisions never create or remove another resource",
  "uncertain create, failed start, failed address readback and startup timeout clean owned resource without retry",
  "foreign ownership and failed cleanup are blocking, never reported clean",
  "readback rejects bridged, remote, wrong-port/version/database/cluster targets",
  "actual local occupied socket refuses acquisition without terminating listener",
  "kitchen scope is current-run-only and cannot collide with later Node24 fixture state",
  "kitchen wrapper delegates unchanged owned lifecycle and restores only the exact preceding service URL",
  "kitchen start refuses an unexpected preceding URL or action before invoking the fixture",
  "kitchen always-stop still restores the preceding target after failed start or cleanup without claiming success",
  "local passwordless and exact owned hosted target only",
  "server identity rejects forwarding and wrong cluster before synthetic DDL",
  "owned fixture state is current-run exact and inspect-only before target selection",
  "unsealed review fails closed; genuine sealed source review exposes only exact finite predecessors",
  "every exact current source is verified before any predecessor source is exposed",
  "altered predecessors, injected paths, rebound hashes and review authority escalation deny",
  "a rehashed current source and manifest cannot replace the independently sealed review",
  "missing review, orphan manifest, extra engineering evidence and symlinks never expose predecessors",
  "prior independent physical reviews remain byte-exact and cannot be replaced by this source review",
  "unsealed adoption fails closed; sealed adoption exposes only finite predecessor bytes",
  "every current authority and source byte and every adoption evidence record is sealed",
  "caller rehashed authority, injected paths, wrong target and live authority do not expand adoption",
  "missing review, missing registration, symlink evidence and source ancestors fail closed",
  "workflow drift blocks the new seal and still exercises specific checkpoint-order control",
  "workflow route omitted checkpoint retains seal denial and specific control",
  "workflow route missing finalizer retains seal denial and specific control",
  "workflow route missing Identity PG retains seal denial and specific control",
  "workflow route missing session PG retains seal denial and specific control",
  "workflow route path-filtered PR retains seal denial and specific control",
  "Node24 lane cannot reuse legacy runtime, dirty source, failure, timeout or activation",
  "same producer retains legacy stage inventory and includes every new bounded check in lifecycle evidence",
  "committed isolated lineage is deterministic and historical migrations are pinned",
  "token qualification preserves comments and string payloads, visits function bodies and %ROWTYPE",
  "all known app references are explicitly qualified, including nested function bodies",
  "compiler rejects historical drift and verifier rejects generated drift or extra SQL",
  "migration runner rejects missing opt-in and remote/ambiguous targets before connection",
  "schema target is finite, defaults to existing public mode, and rejects injection",
  "all Drizzle models and foreign-key targets use public",
  "all Drizzle models and foreign-key targets use teach_v2_demo",
  "raw owner SQL has source-level explicit qualification, without runtime rewrite or search_path"
]),
});
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const hostedSchemaRegistrationPattern = '^(?:' + hostedSchemaCaseNames.schema_registration.map(escapePattern).join('|') + ')$';
const exactNames = (actual, expected) => Array.isArray(actual) && actual.length === expected.length && new Set(actual).size === actual.length && actual.slice().sort().every((name, index) => name === expected.slice().sort()[index]);
export function parseHostedSchemaCases(check, stdout) {
  const errors = [], expected = hostedSchemaCaseNames[check];
  if (!Object.hasOwn(hostedSchemaCaseNames, check) || typeof stdout !== 'string') return { names: [], errors: ['exact schema partition output required'] };
  const resultLines = stdout.split('\n').filter(line => /^[ \t]*(?:ok\b|not ok\b|Bail out!)/.test(line));
  const results = resultLines.map(line => /^ok ([1-9][0-9]*) - (.+)$/.exec(line));
  if (results.some((row, index) => !row || Number(row[1]) !== index + 1)) errors.push('exact ordinary flat TAP result ordinals required');
  const names = results.filter(Boolean).map(row => row[2]);
  if (!exactNames(names, expected)) errors.push('exact complete schema partition case names required');
  const one = (pattern, value) => { const matches = [...stdout.matchAll(pattern)]; return matches.length === 1 && matches[0][1] === String(value); };
  if (!one(/^TAP version (\d+)$/gm, 13) || !one(/^1\.\.(\d+)$/gm, expected.length)) errors.push('one complete flat TAP partition required');
  for (const [label, count] of Object.entries({ tests: expected.length, suites: 0, pass: expected.length, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    if (!one(new RegExp('^# ' + label + ' ([0-9]+)$', 'gm'), count)) errors.push('exact schema partition ' + label + ' count required');
  }
  if (/^(?:not ok|Bail out!|[ \t]+ok |[ \t]+not ok )/m.test(stdout)) errors.push('failed, nested or aborted schema partition forbidden');
  return { names, errors };
}

export const hostedSourceChecks = Object.freeze({
  recovery: ['scripts/db/verify-demo-recovery-rehearsal.mjs'],
  schema_registration: ['--import','tsx','--test','--test-reporter=tap','--test-name-pattern='+hostedSchemaRegistrationPattern,hostedSchemaFiles[1]],
  schema_support: ['--import','tsx','--test','--test-reporter=tap',...hostedSchemaFiles.filter(file=>file!==hostedSchemaFiles[1]),hostedSchemaRecoveryFile],
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
  if(Object.hasOwn(hostedSchemaCaseNames,report.check)&&(!exactNames(report.schema_cases?.names,hostedSchemaCaseNames[report.check])||!Array.isArray(report.schema_cases?.errors)||report.schema_cases.errors.length!==0))errors.push('complete successful schema partition evidence required');
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
  const env=['successor_model','successor_postgres','accepting_postgres','recovery'].includes(check)?{...process.env,TEACH_DB_SCHEMA:'teach_v2_demo'}:process.env;
  const result=runBounded(process.execPath,args,{root,timeoutMs:25000,env});
  const after=sourceIdentity(root),hash=value=>createHash('sha256').update(value).digest('hex');
  const report={kind:'hosted-source-check',check,command:['node',...args],node:process.version,platform:process.platform,expected_sha:expectedSha,source:before,source_unchanged:before.stamp===after.stamp,timeout_ms:25000,...Object.fromEntries(Object.entries(result).filter(([key])=>!['stdout','stderr'].includes(key))),stdout_sha256:hash(result.stdout),stderr_sha256:hash(result.stderr),runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
  if(Object.hasOwn(hostedSchemaCaseNames,check))report.schema_cases=parseHostedSchemaCases(check,result.stdout);
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
