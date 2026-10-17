import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sha = /^[a-f0-9]{40}$/;
const hash = value => createHash('sha256').update(value).digest('hex');
const keys = ['version','event_name','source_sha','base_sha','base_policy','event_sha256','repository','run_id','run_attempt'];
export function localDocumentGovernanceContext(sourceSha, base = '') {
  if (typeof base !== 'string' || (base && !sha.test(base))) throw new Error('document governance: base must be an exact SHA');
  return { version: '0.1.0', event_name: 'local', source_sha: sourceSha,
    base_sha: base && base !== '0'.repeat(40) ? base : null,
    base_policy: !base ? 'NO_EVENT_BASE' : base === '0'.repeat(40) ? 'ZERO_BASE' : 'EXACT_BASE',
    event_sha256: null, repository: null, run_id: null, run_attempt: null };
}
export function inspectDocumentGovernanceContext(context, sourceSha) {
  const fail = () => ['document governance: exact source/event/base context required'];
  if (!context || JSON.stringify(Object.keys(context)) !== JSON.stringify(keys) || context.version !== '0.1.0' ||
      !sha.test(sourceSha || '') || context.source_sha !== sourceSha ||
      !['local','pull_request','push','workflow_dispatch'].includes(context.event_name)) return fail();
  if (context.base_policy === 'EXACT_BASE') {
    if (!sha.test(context.base_sha || '') || context.base_sha === '0'.repeat(40)) return fail();
  } else if (!['NO_EVENT_BASE','ZERO_BASE'].includes(context.base_policy) || context.base_sha !== null) return fail();
  if (context.event_name === 'local') {
    if ([context.event_sha256,context.repository,context.run_id,context.run_attempt].some(value => value !== null)) return fail();
  } else if (!/^[a-f0-9]{64}$/.test(context.event_sha256 || '') || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(context.repository || '') ||
      !/^[1-9][0-9]*$/.test(context.run_id || '') || !/^[1-9][0-9]*$/.test(context.run_attempt || '')) return fail();
  if (context.event_name === 'pull_request' && context.base_policy !== 'EXACT_BASE') return fail();
  if (context.event_name === 'push' && context.base_policy === 'NO_EVENT_BASE') return fail();
  if (context.event_name === 'workflow_dispatch' && context.base_policy !== 'NO_EVENT_BASE') return fail();
  return [];
}
export function resolveDocumentGovernanceContext(root, { env = process.env } = {}) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 2000, stdio: ['ignore','pipe','pipe'] }).trim();
  const source = git(['rev-parse','HEAD']);
  let context;
  if (!env.GITHUB_ACTIONS && !env.GITHUB_EVENT_NAME && !env.GITHUB_EVENT_PATH && !env.GITHUB_RUN_ID) {
    context = localDocumentGovernanceContext(source, env.AUDIT_DOCUMENT_BASE_SHA || '');
  } else {
    const eventName = env.GITHUB_EVENT_NAME;
    if (!['pull_request','push','workflow_dispatch'].includes(eventName)) throw new Error('document governance: unsupported event');
    if (!env.GITHUB_EVENT_PATH || env.AUDIT_DOCUMENT_BASE_SHA) throw new Error('document governance: authoritative event required; local base override forbidden in CI');
    const eventText = readFileSync(env.GITHUB_EVENT_PATH, 'utf8');
    const event = JSON.parse(eventText);
    if (event.repository?.full_name !== env.GITHUB_REPOSITORY) throw new Error('document governance: event repository mismatch');
    const eventSource = eventName === 'pull_request' ? event.pull_request?.head?.sha : eventName === 'push' ? event.after : env.GITHUB_SHA;
    if (eventSource !== source || env.AUDIT_EXPECTED_SHA !== source || (eventName !== 'pull_request' && env.GITHUB_SHA !== source)) throw new Error('document governance: event source mismatch');
    const base = eventName === 'pull_request' ? event.pull_request?.base?.sha : eventName === 'push' ? event.before : '';
    if (eventName !== 'workflow_dispatch' && (typeof base !== 'string' || !base || (eventName === 'pull_request' && base === '0'.repeat(40)))) throw new Error('document governance: event base missing');
    context = { ...localDocumentGovernanceContext(source, base ?? ''), event_name: eventName,
      event_sha256: hash(eventText), repository: env.GITHUB_REPOSITORY, run_id: env.GITHUB_RUN_ID, run_attempt: env.GITHUB_RUN_ATTEMPT };
  }
  const errors = inspectDocumentGovernanceContext(context, source);
  if (errors.length) throw new Error(errors.join('; '));
  if (context.base_sha) {
    // Never fall back to a no-base pass if checkout history is incomplete.
    if (git(['rev-parse','--verify',`${context.base_sha}^{commit}`]) !== context.base_sha) throw new Error('document governance: base commit unavailable');
    git(['merge-base',context.base_sha,source]);
  }
  return context;
}
export function documentGovernanceArgs(context) {
  const errors = inspectDocumentGovernanceContext(context, context?.source_sha);
  if (errors.length) throw new Error(errors.join('; '));
  return ['scripts/docs/validate-document-metadata.mjs', ...(context.base_sha ? ['--base',context.base_sha] : [])];
}
