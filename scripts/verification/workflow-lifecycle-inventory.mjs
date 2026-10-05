import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { lifecyclePhases, digest } from './workflow-lifecycle.mjs';

// This parser intentionally accepts the repository's explicit jobs/steps form.
// Reusable/matrix/dynamic jobs require a reviewed inventory extension first.
export function inspectWorkflowText(path, text) {
  if (!/^jobs:\s*$/m.test(text) || /\b(?:strategy|matrix|workflow_call):/.test(text)) throw new Error(`${path}: explicit jobs/steps required`);
  const starts = [...text.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)].filter(m => m.index > text.indexOf('\njobs:'));
  if (!starts.length) throw new Error(`${path}: workflow jobs missing`);
  return starts.map((match,i) => {
    const body = text.slice(match.index, starts[i+1]?.index ?? text.length);
    const parts = body.split(/^      - /m).slice(1);
    if (!parts.length) throw new Error(`${path}: explicit steps required`);
    const steps = parts.map(part => ({id:part.match(/^        id: ([a-zA-Z0-9_-]+)\s*$/m)?.[1],body:part}));
    if (steps.some(x=>!x.id) || new Set(steps.map(x=>x.id)).size !== steps.length) throw new Error(`${path}: every step needs a distinct id`);
    const required = steps.filter(x=>!['lifecycle_record','lifecycle_upload'].includes(x.id));
    if (!required.length) throw new Error(`${path}: verification steps missing`);
    return {workflow_path:path,workflow_sha256:digest(text),job_id:match[1],required_steps:required.map(x=>x.id),
      lifecycle_steps:steps.filter(x=>x.id.startsWith('lifecycle_')).map(x=>({id:x.id,body:x.body})),
      phases:[...lifecyclePhases], owner:'VerificationEvidence',verification_scope:'DEVELOPMENT_ONLY',
      effect:'READ_ONLY_DEVELOPMENT_VERIFICATION',failure_policy:'retain failed attempt; diagnose; start a separate attempt',
      closure_policy:'exact-source outcomes plus independently observed successful unexpired artifact receipt',
      cleanup:'runner-managed isolated job/service teardown; no shared database cleanup',
      hard_interruption:'missing report or receipt is incomplete; rerun creates a separate attempt',
      full_runtime_conformance:'UNKNOWN',shared_or_production_execution_authorized:false};
  });
}
export function deriveWorkflowInventory(root) {
  const paths=readdirSync(join(root,'.github/workflows')).filter(p=>/\.ya?ml$/.test(p)).sort();
  const ci=paths.flatMap(p=>{const path=`.github/workflows/${p}`;return inspectWorkflowText(path,readFileSync(join(root,path),'utf8'));}).map(({lifecycle_steps,...row})=>row);
  const ledgerText=readFileSync(join(root,'verification/whole-repository/command-coverage.json'),'utf8');
  const ledger=JSON.parse(ledgerText);
  const product=ledger.commands.map(row=>({id:row.command,owner:row.owner,phases:[...lifecyclePhases],authority_requirements:row.authority_requirements,
    foundation_state:row.state,artifacts:row.artifacts,tests:row.tests,missing_obligations:row.missing_obligations,
    ingress:'UNKNOWN',authorization:'UNKNOWN',execution:row.state,verification:'FOUNDATION_EVIDENCE_ONLY',retention:'UNKNOWN',
    recovery:'canonical readback before retry; operation-specific policy remains required',closure:'BLOCKED',handoff:'BLOCKED',
    full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false}));
  return {version:'0.1.0',scope:'complete workflow lifecycle inventory; definitions and development evidence are separate from product implementation',
    adopted_by:'owner instruction, 2026-10-04 America/Chicago; issue #70',phases:[...lifecyclePhases],ci_workflows:paths.length,ci_jobs:ci.length,
    product_command_ledger_sha256:digest(ledgerText),ci,product,full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
}
