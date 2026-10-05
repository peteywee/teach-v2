import { createHash } from 'node:crypto';

export const lifecyclePhases = Object.freeze(['intake','authority','preflight','execution','verification','retention','recovery','closure','handoff']);
export const digest = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value);
export function reportDigest(report) { const { report_sha256, ...body } = report; return digest(stable(body)); }
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;

// A successful check is VERIFIED, never CLOSED before an external receipt.
// Only development verification is retryable here; product effects have no
// retry authority and require canonical readback before any later decision.
export function buildWorkflowReport({ definition, context, source, steps, jobStatus, now = new Date().toISOString() }) {
  const errors = [], outcomes = [];
  if (!definition || !Array.isArray(definition.required_steps) || !definition.required_steps.length || new Set(definition.required_steps).size !== definition.required_steps.length) throw new TypeError('complete distinct workflow steps required');
  if (!sha(context?.expected_sha) || !sha(source?.source_sha) || !sha(source?.tree_sha) || source.source_sha !== context.expected_sha) errors.push('exact expected source required');
  if (!positive(context?.run_id) || !positive(context?.attempt) || context?.job_id !== definition.job_id || !['pull_request','push','workflow_dispatch'].includes(context?.event)) errors.push('workflow run/attempt/job/event identity required');
  if (!hash(definition.workflow_sha256) || !definition.workflow_path?.startsWith('.github/workflows/')) errors.push('workflow definition identity required');
  if (!Number.isFinite(Date.parse(now))) throw new TypeError('valid checkpoint time required');
  let failed = false, interrupted = false, incomplete = false, contradictory = false;
  for (const id of definition.required_steps) {
    const observed = steps?.[id];
    const outcome = observed?.outcome, conclusion = observed?.conclusion;
    // Do not retain arbitrary outputs: they may contain secrets or payloads.
    outcomes.push({ id, outcome: outcome ?? 'missing', conclusion: conclusion ?? 'missing' });
    if (outcome === 'failure') failed = true;
    else if (outcome === 'cancelled') interrupted = true;
    else if (outcome !== 'success' || conclusion !== 'success') incomplete = true;
    if (outcome === 'success' && conclusion && conclusion !== 'success') contradictory = true;
  }
  if (jobStatus === 'failure') failed = true;
  else if (jobStatus === 'cancelled') interrupted = true;
  else if (jobStatus !== 'success') incomplete = true;
  if (source?.dirty !== false) incomplete = true;
  if (errors.length) incomplete = true;
  const state = contradictory ? 'CONTRADICTORY' : interrupted ? 'INTERRUPTED' : failed ? 'FAILED' : incomplete ? 'BLOCKED' : 'AWAITING_RECEIPT';
  const report = { version: '0.1.0', kind: 'workflow-lifecycle-checkpoint', workflow_path: definition.workflow_path, workflow_sha256: definition.workflow_sha256, job_id: definition.job_id,
    run_id: context.run_id, attempt: context.attempt, event: context.event, source: {source_sha:source?.source_sha ?? null,tree_sha:source?.tree_sha ?? null,dirty:source?.dirty ?? null},
    created_at: now, state, verification: state === 'AWAITING_RECEIPT' ? 'PROVEN' : state === 'CONTRADICTORY' ? 'CONTRADICTORY' : 'UNKNOWN', outcomes, errors,
    retention: 'AWAITING_EXTERNAL_RECEIPT', closure: 'OPEN', handoff_authorized: false,
    recovery: 'new read-only attempt after diagnosis; never overwrite prior evidence',
    full_runtime_conformance:'UNKNOWN', runtime_activation:'BLOCKED', shared_or_production_execution_authorized:false };
  return { ...report, report_sha256: reportDigest(report) };
}

export function closeWorkflowReport(report, receipt) {
  const errors = [];
  if (!report || report.report_sha256 !== reportDigest(report) || report.state !== 'AWAITING_RECEIPT' || report.verification !== 'PROVEN') errors.push('verified intact checkpoint required');
  if (report?.closure !== 'OPEN' || report?.retention !== 'AWAITING_EXTERNAL_RECEIPT' || report?.handoff_authorized !== false || report?.full_runtime_conformance !== 'UNKNOWN' || report?.runtime_activation !== 'BLOCKED' || report?.shared_or_production_execution_authorized !== false) errors.push('development checkpoint cannot grant product/production authority');
  for (const key of ['run_id','attempt','job_id','workflow_path','workflow_sha256']) if (receipt?.[key] !== report?.[key]) errors.push(`receipt ${key} mismatch`);
  if (!sha(receipt?.source_sha) || receipt.source_sha !== report?.source?.source_sha || !sha(receipt?.tree_sha) || receipt.tree_sha !== report?.source?.tree_sha) errors.push('receipt exact source/tree required');
  if (!positive(receipt?.artifact_id) || !hash(receipt?.artifact_sha256) || receipt?.archive_sha256 !== receipt?.artifact_sha256 || receipt?.artifact_report_sha256 !== report?.report_sha256 || receipt?.artifact_expired !== false || receipt?.upload_outcome !== 'success' || receipt?.run_conclusion !== 'success') errors.push('successful unexpired matching artifact/run receipt required');
  if (receipt?.artifact_name !== `workflow-lifecycle-${report?.run_id}-${report?.attempt}-${report?.job_id}`) errors.push('artifact identity mismatch');
  return { state: errors.length ? 'BLOCKED' : 'CLOSED', errors, checkpoint_sha256: report?.report_sha256 ?? null, receipt: receipt ?? null,
    verification: errors.length ? 'UNKNOWN' : 'PROVEN', retention: errors.length ? 'UNKNOWN' : 'PROVEN', handoff: errors.length ? 'BLOCKED' : 'DEVELOPMENT_EVIDENCE_ONLY',
    full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false };
}

export function planWorkflowRecovery(report, { effect = 'UNKNOWN', diagnosis = null, canonical_readback = 'UNKNOWN' } = {}) {
  if (!report || !['FAILED','BLOCKED','INTERRUPTED','CONTRADICTORY'].includes(report.state)) return {state:'BLOCKED',reason:'only incomplete attempts may enter recovery'};
  if (typeof diagnosis !== 'string' || !diagnosis.trim()) return {state:'BLOCKED',reason:'diagnosis required'};
  if (effect !== 'READ_ONLY_DEVELOPMENT_VERIFICATION') return {state:'BLOCKED',reason:canonical_readback === 'PROVEN' ? 'a separate owner effect/retry policy is required' : 'canonical readback required before any effect retry decision'};
  return {state:'NEW_ATTEMPT_REQUIRED',previous_run_id:report.run_id,previous_attempt:report.attempt,next_attempt:report.attempt+1,preserve_prior_evidence:true,diagnosis,shared_or_production_execution_authorized:false};
}
