import { createHash } from 'node:crypto';

export const lifecyclePhases = Object.freeze(['intake','authority','preflight','execution','verification','retention','recovery','closure','handoff']);
export const digest = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export function reportDigest(report) { const { report_sha256, ...body } = report; return digest(stable(body)); }
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
const repository = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(value);
const workflowPath = value => typeof value === 'string' && /^\.github\/workflows\/[A-Za-z0-9_-]+\.ya?ml$/.test(value);
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && [new Date(value).toISOString(), new Date(value).toISOString().replace('.000Z', 'Z')].includes(value);
const same = (a, b) => stable(a) === stable(b);
const keys = (value, expected) => object(value) && same(Object.keys(value).sort(), [...expected].sort());
const statuses = ['success', 'failure', 'cancelled', 'skipped', 'missing'];
const events = ['pull_request', 'push', 'workflow_dispatch', 'workflow_run'];
const recoveryPolicy = 'new read-only attempt after diagnosis; never overwrite prior evidence';
const reportKeys = ['version','kind','repository','workflow_path','workflow_sha256','workflow_source_sha','job_id','run_id','attempt','event','expected_source_sha','source','created_at','job_status','required_steps','state','verification','outcomes','errors','retention','closure','handoff_authorized','recovery','full_runtime_conformance','runtime_activation','shared_or_production_execution_authorized','report_sha256'];

function validRequiredSteps(steps) {
  return Array.isArray(steps) && steps.length > 0 && steps.every(id) && new Set(steps).size === steps.length && !steps.some(step => ['lifecycle_record','lifecycle_upload'].includes(step));
}

// Derived independently at capture, closure and recovery. A digest detects changed
// bytes; it cannot make a caller's rehashed assertion into verification evidence.
function facts(report) {
  const errors = [];
  if (!sha(report.expected_source_sha) || !sha(report.source?.source_sha) || !sha(report.source?.tree_sha) || report.source.source_sha !== report.expected_source_sha) errors.push('exact expected source required');
  if (!positive(report.run_id) || !positive(report.attempt) || !id(report.job_id) || !events.includes(report.event) || !repository(report.repository)) errors.push('workflow repository/run/attempt/job/event identity required');
  if (!hash(report.workflow_sha256) || !sha(report.workflow_source_sha) || !workflowPath(report.workflow_path)) errors.push('workflow definition identity required');
  if (!validRequiredSteps(report.required_steps)) errors.push('complete distinct workflow steps required');
  const outcomes = Array.isArray(report.outcomes) ? report.outcomes : [];
  if (!Array.isArray(report.outcomes) || !same(outcomes.map(row => row?.id), report.required_steps) || outcomes.some(row => !keys(row, ['id','outcome','conclusion']) || !id(row.id) || !statuses.includes(row.outcome) || !statuses.includes(row.conclusion))) errors.push('exact registered step outcomes required');
  let failed = false, interrupted = false, incomplete = false, contradictory = false;
  for (const observed of outcomes) {
    const outcome = observed?.outcome, conclusion = observed?.conclusion;
    if (outcome === 'failure') failed = true;
    else if (outcome === 'cancelled') interrupted = true;
    else if (outcome !== 'success' || conclusion !== 'success') incomplete = true;
    // failure/success is legitimate continue-on-error, but remains FAILED.
    if (statuses.includes(outcome) && statuses.includes(conclusion) && outcome !== conclusion && outcome !== 'missing' && conclusion !== 'missing' && !(outcome === 'failure' && conclusion === 'success')) contradictory = true;
  }
  if (report.job_status === 'failure') failed = true;
  else if (report.job_status === 'cancelled') interrupted = true;
  else if (report.job_status !== 'success') incomplete = true;
  if (report.source?.dirty !== false || errors.length) incomplete = true;
  const state = contradictory ? 'CONTRADICTORY' : interrupted ? 'INTERRUPTED' : failed ? 'FAILED' : incomplete ? 'BLOCKED' : 'AWAITING_RECEIPT';
  return { errors, state, verification: state === 'AWAITING_RECEIPT' ? 'PROVEN' : state === 'CONTRADICTORY' ? 'CONTRADICTORY' : 'UNKNOWN' };
}

export function validateWorkflowReport(report, { definition } = {}) {
  if (!object(report)) return ['checkpoint object required'];
  const errors = [];
  if (!keys(report, reportKeys) || report.version !== '0.2.0' || report.kind !== 'workflow-lifecycle-checkpoint') errors.push('supported complete checkpoint shape required');
  if (!hash(report.report_sha256) || report.report_sha256 !== reportDigest(report)) errors.push('intact checkpoint digest required');
  if (!timestamp(report.created_at) || !keys(report.source, ['source_sha','tree_sha','dirty']) || typeof report.source?.dirty !== 'boolean' || !['success','failure','cancelled','skipped','missing'].includes(report.job_status)) errors.push('checkpoint source/time/job shape required');
  const derived = facts(report);
  errors.push(...derived.errors);
  if (report.state !== derived.state || report.verification !== derived.verification || !same(report.errors, derived.errors)) errors.push('checkpoint state must match captured facts');
  if (report.closure !== 'OPEN' || report.retention !== 'AWAITING_EXTERNAL_RECEIPT' || report.handoff_authorized !== false || report.recovery !== recoveryPolicy || report.full_runtime_conformance !== 'UNKNOWN' || report.runtime_activation !== 'BLOCKED' || report.shared_or_production_execution_authorized !== false) errors.push('development checkpoint cannot grant product/production authority');
  if (definition !== undefined) {
    if (!object(definition) || definition.effect !== 'READ_ONLY_DEVELOPMENT_VERIFICATION' || definition.verification_scope !== 'DEVELOPMENT_ONLY' || definition.shared_or_production_execution_authorized !== false || !validRequiredSteps(definition.required_steps) || !same(report.required_steps, definition.required_steps) || ['workflow_path','workflow_sha256','job_id'].some(key => report[key] !== definition?.[key])) errors.push('checkpoint must match authoritative workflow definition');
  }
  return errors;
}

// A successful check is VERIFIED, never CLOSED before an external receipt.
// Only development verification is retryable here; product effects have no
// retry authority and require canonical readback before any later decision.
export function buildWorkflowReport({ definition, context, source, steps, jobStatus, now = new Date().toISOString() }) {
  if (!object(definition) || !validRequiredSteps(definition.required_steps)) throw new TypeError('complete distinct workflow steps required');
  if (!timestamp(now)) throw new TypeError('valid ISO checkpoint time required');
  const stepIds = [...definition.required_steps];
  if (object(steps)) stepIds.push(...Object.keys(steps).filter(step => !stepIds.includes(step)));
  const outcomes = stepIds.map(step => ({id:step, outcome:steps?.[step]?.outcome ?? 'missing', conclusion:steps?.[step]?.conclusion ?? 'missing'}));
  const report = { version:'0.2.0', kind:'workflow-lifecycle-checkpoint', repository:context?.repository ?? null,
    workflow_path:definition.workflow_path, workflow_sha256:definition.workflow_sha256, workflow_source_sha:context?.workflow_source_sha ?? null, job_id:context?.job_id ?? null,
    run_id:context?.run_id ?? null, attempt:context?.attempt ?? null, event:context?.event ?? null, expected_source_sha:context?.expected_sha ?? null,
    source:{source_sha:source?.source_sha ?? null,tree_sha:source?.tree_sha ?? null,dirty:source?.dirty ?? null},
    created_at:now, job_status:jobStatus ?? 'missing', required_steps:[...definition.required_steps], outcomes,
    retention:'AWAITING_EXTERNAL_RECEIPT', closure:'OPEN', handoff_authorized:false, recovery:recoveryPolicy,
    full_runtime_conformance:'UNKNOWN', runtime_activation:'BLOCKED', shared_or_production_execution_authorized:false };
  const derived = facts(report);
  if (report.job_id !== definition.job_id) {
    derived.errors.push('captured job must match workflow definition');
    if (derived.state === 'AWAITING_RECEIPT') { derived.state = 'BLOCKED'; derived.verification = 'UNKNOWN'; }
  }
  Object.assign(report, derived);
  return { ...report, report_sha256:reportDigest(report) };
}

export function closeWorkflowReport(report, receipt, { definition } = {}) {
  const errors = validateWorkflowReport(report, { definition });
  if (!definition) errors.push('authoritative workflow definition required for closure');
  if (report?.state !== 'AWAITING_RECEIPT' || report?.verification !== 'PROVEN') errors.push('verified checkpoint required');
  for (const key of ['repository','run_id','attempt','job_id','event','workflow_path','workflow_sha256','workflow_source_sha']) if (receipt?.[key] !== report?.[key]) errors.push(`receipt ${key} mismatch`);
  if (!sha(receipt?.source_sha) || receipt.source_sha !== report?.source?.source_sha || !sha(receipt?.tree_sha) || receipt.tree_sha !== report?.source?.tree_sha) errors.push('receipt exact source/tree required');
  if (receipt?.workflow_source_verified !== true || receipt?.workflow_source_sha !== receipt?.source_sha) errors.push('canonical actual workflow source proof required; merge-ref provenance remains unproven');
  if (!positive(receipt?.artifact_id) || !hash(receipt?.artifact_sha256) || receipt?.archive_sha256 !== receipt?.artifact_sha256 || receipt?.artifact_report_sha256 !== report?.report_sha256 || receipt?.artifact_expired !== false || receipt?.upload_outcome !== 'success' || receipt?.job_conclusion !== 'success' || receipt?.run_conclusion !== 'success') errors.push('successful unexpired matching artifact/job/run receipt required');
  if (!timestamp(receipt?.observed_at) || !timestamp(receipt?.artifact_expires_at) || Date.parse(receipt.observed_at) < Date.parse(report?.created_at) || Date.parse(receipt.artifact_expires_at) <= Date.parse(receipt.observed_at)) errors.push('current observed unexpired artifact timestamps required');
  if (receipt?.artifact_name !== `workflow-lifecycle-${report?.run_id}-${report?.attempt}-${report?.job_id}`) errors.push('artifact identity mismatch');
  return { state:errors.length ? 'BLOCKED' : 'CLOSED', errors, checkpoint_sha256:report?.report_sha256 ?? null, receipt:receipt ? structuredClone(receipt) : null,
    verification:errors.length ? 'UNKNOWN' : 'PROVEN', retention:errors.length ? 'UNKNOWN' : 'PROVEN', retention_scope:'ARTIFACT_READBACK_AT_OBSERVED_TIME', durable_retention_policy:'UNPROVEN', handoff:errors.length ? 'BLOCKED' : 'DEVELOPMENT_EVIDENCE_ONLY',
    full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false };
}

export function planWorkflowRecovery(report, { definition, effect = 'UNKNOWN', diagnosis = null, canonical_readback = 'UNKNOWN' } = {}) {
  const errors = validateWorkflowReport(report, { definition });
  if (errors.length || !['FAILED','BLOCKED','INTERRUPTED','CONTRADICTORY'].includes(report?.state)) return {state:'BLOCKED',reason:'only intact incomplete attempts may enter recovery',errors};
  if (typeof diagnosis !== 'string' || !diagnosis.trim()) return {state:'BLOCKED',reason:'diagnosis required'};
  if (effect !== 'READ_ONLY_DEVELOPMENT_VERIFICATION') return {state:'BLOCKED',reason:canonical_readback === 'PROVEN' ? 'a separate owner effect/retry policy is required' : 'canonical readback required before any effect retry decision'};
  if (!definition || definition.effect !== 'READ_ONLY_DEVELOPMENT_VERIFICATION' || definition.verification_scope !== 'DEVELOPMENT_ONLY' || definition.shared_or_production_execution_authorized !== false) return {state:'BLOCKED',reason:'authoritative development-only recovery definition required'};
  if (!positive(report.attempt + 1)) return {state:'BLOCKED',reason:'safe next attempt required'};
  return {state:'NEW_ATTEMPT_REQUIRED',repository:report.repository,source_sha:report.source.source_sha,checkpoint_sha256:report.report_sha256,previous_run_id:report.run_id,previous_attempt:report.attempt,next_attempt:report.attempt+1,preserve_prior_evidence:true,diagnosis,shared_or_production_execution_authorized:false};
}
