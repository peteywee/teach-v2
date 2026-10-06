#!/usr/bin/env node
// PROPOSED validator for governance/proposals/2026-10-05-decision-closure.
// Read-only. Grants no authority. Exit 0 = package consistent with the live repo; exit 1 = errors printed.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { scanContractQuestions } from './owner-decision-inventory.mjs';

export const PKG = 'governance/proposals/2026-10-05-decision-closure';
const CLASSES = new Set(['READY_TO_REGISTER', 'REGISTER_WITH_ARTIFACT', 'REGISTER_AS_DISABLED', 'REGISTER_SPLIT_RESIDUAL', 'RECONCILE_DRAFT', 'CONFIRM_RECOMMENDATION', 'UNKNOWN_OWNER_VALUE']);
const MUST_HAVE_MISSING = new Set(['REGISTER_SPLIT_RESIDUAL', 'UNKNOWN_OWNER_VALUE']);
const MUST_NOT_HAVE_MISSING = new Set(['READY_TO_REGISTER', 'REGISTER_WITH_ARTIFACT', 'REGISTER_AS_DISABLED', 'RECONCILE_DRAFT']);
const CAP = /^[a-z]+\.[a-z]+\.[a-z_]+$/;
const sha = (t) => createHash('sha256').update(t).digest('hex');
const readJson = (root, p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

export const MANIFEST = `${PKG}/package-manifest.json`;
export const MANIFEST_SIDECAR = `${PKG}/package-manifest.sha256`;
export const PACKAGE_SCRIPTS = ['scripts/verification/validate-decision-closure.mjs', 'scripts/tests/validate-decision-closure.test.mjs'];
const fileSha = (root, p) => sha(readFileSync(join(root, p)));
export function loadPackage(root) {
  const missing = [];
  const r = (p) => { try { return readJson(root, p); } catch (e) { if (e.code !== 'ENOENT') throw e; missing.push(p); return null; } };
  return {
    manifest: r(MANIFEST),
    closure: r(`${PKG}/closure-matrix.json`),
    c14: r(`${PKG}/c14-capability-matrix.json`),
    tests: r(`${PKG}/c14-negative-test-matrix.json`),
    api: r(`${PKG}/api-boundary-manifest.json`),
    deferred: r(`${PKG}/deferred-feature-register.json`),
    missing,
  };
}

export function validateDecisionClosure(root, pkg = loadPackage(root)) {
  const errors = [], notes = [];
  if (pkg.missing?.length) {
    for (const p of pkg.missing) errors.push(`manifest: listed artifact missing ${p}`);
    return { errors, notes };   // fail closed: nothing else is checked against a partial package
  }
  const { closure, c14, tests, api, deferred } = pkg;
  const live = scanContractQuestions(root);
  const unresolved = new Map(live.unresolved.map((q) => [q.id, q]));
  const resolved = new Map(live.resolved.map((q) => [q.id, q]));
  const register = readJson(root, closure.derived_from.answer_register);
  const regById = new Map(register.records.map((r, i) => [r.id, { r, i }]));

  // 1. Closure matrix vs live inventory
  if (closure.policy_or_runtime_authority_changed !== false || closure.owner_approval_recorded !== false)
    errors.push('closure: package must not claim authority or approval');
  const rowIds = new Set();
  for (const row of closure.rows) {
    if (rowIds.has(row.id)) errors.push(`closure: duplicate row ${row.id}`);
    rowIds.add(row.id);
    const q = unresolved.get(row.id);
    if (row.live_state === 'RESOLVED' && q) errors.push(`closure: ${row.id} marked RESOLVED but is still unresolved in the live contracts`);
    if (row.live_state === 'UNRESOLVED' && !q) errors.push(`closure: ${row.id} marked UNRESOLVED but is resolved or absent in the live contracts; regenerate`);
    if (row.live_state === 'RESOLVED' && !/^#\d+$/.test(row.registered_by ?? '')) errors.push(`closure: ${row.id} RESOLVED without registered_by`);
    if (!q) {
      if (resolved.has(row.id)) notes.push(`${row.id}: resolved on main (registered by ${row.registered_by ?? 'UNKNOWN'}); kept as history`);
      else errors.push(`closure: ${row.id} is not a question in any active contract`);
      continue;
    }
    if (q.contract !== row.contract) errors.push(`closure: ${row.id} contract ${row.contract} != live ${q.contract}`);
    if (q.contract_version !== row.contract_version_live) errors.push(`closure: ${row.id} stale — ${q.contract} is ${q.contract_version}, matrix says ${row.contract_version_live}; regenerate`);
    if (q.explicitly_blocks_implementation !== row.explicit_blocker) errors.push(`closure: ${row.id} blocker flag mismatch`);
    if (!CLASSES.has(row.closure_class)) errors.push(`closure: ${row.id} unknown class ${row.closure_class}`);
    if (MUST_HAVE_MISSING.has(row.closure_class) && row.missing_owner_values.length === 0) errors.push(`closure: ${row.id} ${row.closure_class} requires a named missing value`);
    if (MUST_NOT_HAVE_MISSING.has(row.closure_class) && row.missing_owner_values.length > 0) errors.push(`closure: ${row.id} ${row.closure_class} cannot carry missing owner values`);
    if (row.repeat_original_question !== false) errors.push(`closure: ${row.id} must not repeat the original question`);
    const hit = regById.get(row.id);
    if (!hit) { errors.push(`closure: ${row.id} absent from answer register`); continue; }
    const { r, i } = hit;
    if (r.capture_state !== 'ANSWER_RECEIVED_UNREGISTERED') errors.push(`closure: ${row.id} register state ${r.capture_state}`);
    if (row.answer_register.record_index !== i) errors.push(`closure: ${row.id} record_index ${row.answer_register.record_index} != ${i}`);
    const pkt = r.original_packet_response ? sha(r.original_packet_response.verbatim_answer) : null;
    const fup = r.follow_up_response ? sha(r.follow_up_response.verbatim_answer) : null;
    if (pkt !== row.answer_register.packet_answer_sha256) errors.push(`closure: ${row.id} packet answer hash mismatch (register text changed or row edited)`);
    if (fup !== row.answer_register.follow_up_sha256) errors.push(`closure: ${row.id} follow-up hash mismatch`);
    const doc = row.controlling_artifact;
    if (!existsSync(join(root, doc))) errors.push(`closure: ${row.id} controlling artifact missing ${doc}`);
    else if (!readFileSync(join(root, doc), 'utf8').includes(row.id)) errors.push(`closure: ${row.id} not mentioned in ${doc}`);
  }
  for (const id of unresolved.keys()) if (!rowIds.has(id)) errors.push(`closure: live unresolved ${id} has no row (unmapped question)`);

  // 1b. Semantic binding: approved value -> governing artifact (finding 3)
  for (const row of closure.rows) {
    if (!Array.isArray(row.semantic_assertions) || row.semantic_assertions.length === 0) { errors.push(`binding: ${row.id} has no semantic assertions`); continue; }
    for (const a of row.semantic_assertions) {
      if (!existsSync(join(root, a.path))) { errors.push(`binding: ${row.id} artifact missing ${a.path}`); continue; }
      const text = readFileSync(join(root, a.path), 'utf8');
      for (const c of a.contains) if (!text.includes(c)) errors.push(`binding: ${row.id} approved value missing from ${a.path}: ${c}`);
      for (const c of a.must_not_contain) if (text.includes(c)) errors.push(`binding: ${row.id} contradicting value present in ${a.path}: ${c}`);
    }
  }
  // 1c. Totals are recomputed, never trusted
  {
    const live = closure.rows.filter((r) => r.live_state === 'UNRESOLVED');
    const byClass = {}, blk = {};
    for (const r of live) { byClass[r.closure_class] = (byClass[r.closure_class] ?? 0) + 1; if (r.explicit_blocker) blk[r.closure_class] = (blk[r.closure_class] ?? 0) + 1; }
    const t = closure.totals, sortObj = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).sort()));
    if (t.rows !== closure.rows.length) errors.push('totals: rows');
    if (t.live_unresolved !== live.length) errors.push('totals: live_unresolved');
    if (t.registered_since_classification !== closure.rows.length - live.length) errors.push('totals: registered_since_classification');
    if (t.explicit_blockers !== live.filter((r) => r.explicit_blocker).length) errors.push('totals: explicit_blockers');
    if (sortObj(t.by_closure_class) !== sortObj(byClass)) errors.push('totals: by_closure_class');
    if (sortObj(t.explicit_blockers_by_closure_class) !== sortObj(blk)) errors.push('totals: explicit_blockers_by_closure_class');
    if (t.rows_with_missing_owner_values !== live.filter((r) => r.missing_owner_values.length).length) errors.push('totals: rows_with_missing_owner_values');
  }

  // 2. C14 matrix
  const commands = readJson(root, 'kernel/commands.json').entries.map((c) => c.id);
  const ops = c14.operations;
  const opIds = new Set(ops.map((o) => o.id));
  const cmdOps = ops.filter((o) => o.kind === 'command').map((o) => o.id);
  for (const c of commands) if (!cmdOps.includes(c)) errors.push(`c14: approved command ${c} missing from matrix`);
  for (const c of cmdOps) if (!commands.includes(c)) errors.push(`c14: ${c} is not an approved C01 command`);
  if (new Set(cmdOps).size !== cmdOps.length) errors.push('c14: duplicate command row');
  const caps = new Map();
  for (const o of ops) {
    if (!CAP.test(o.capability)) errors.push(`c14: ${o.id} capability ${o.capability} violates grammar`);
    if (caps.has(o.capability)) errors.push(`c14: capability ${o.capability} maps to ${caps.get(o.capability)} and ${o.id} (AUTHZ-2)`);
    caps.set(o.capability, o.id);
    if (!c14.scopes[o.scope]) errors.push(`c14: ${o.id} unknown scope ${o.scope}`);
    if (/PLATFORM|CROSS/i.test(o.scope)) errors.push(`c14: ${o.id} cross-tenant scope (AUTHZ-20)`);
    if (['INTERNAL', 'BLOCKED'].includes(o.scope) && o.bundles.length) errors.push(`c14: ${o.id} ${o.scope} op held by a bundle`);
    if (o.grant_state === 'BLOCKED' && o.bundles.length) errors.push(`c14: ${o.id} BLOCKED but granted`);
  }
  // issue #67: every operation names its owner, transaction owner and Application Interface trace
  const appi = readJson(root, 'application-interfaces/authority.json');
  const cmdModule = new Map(appi.command_interfaces.flatMap((x) => x.commands.map((c) => [c, x.module])));
  const kernelOwner = new Map(readJson(root, 'kernel/commands.json').entries.map((c) => [c.id, c.owning_domain]));
  for (const o of ops) {
    if (!o.owning_domain || !o.transaction_owner) errors.push(`c14: ${o.id} missing owner (#67)`);
    if (!o.application_interface) errors.push(`c14: ${o.id} missing Application Interface trace (#67)`);
    if (o.kind === 'command' && (cmdModule.get(o.id) !== o.owning_domain || kernelOwner.get(o.id) !== o.owning_domain)) errors.push(`c14: ${o.id} owner disagrees with Application Interfaces or K00`);
  }
  const regIds = new Set((tests.registry_cases ?? []).map((c) => c.case_id));
  for (const id of ['C14-REG-UNREGISTERED-ROUTE', 'C14-REG-UNKNOWN-OPERATION-REQUEST', 'C14-REG-UNKNOWN-CAPABILITY-IN-BUNDLE', 'C14-REG-UNKNOWN-SCOPE-CLASS', 'C14-REG-DUPLICATE-CAPABILITY', 'C14-REG-MISSING-OWNER', 'C14-REG-MEMBERSHIP-SCOPE-CHANGED'])
    if (!regIds.has(id)) errors.push(`tests: registry case ${id} missing (#67)`);
  if ((c14.cross_tenant_capabilities ?? []).length) errors.push('c14: cross-tenant capabilities must be empty');
  if (c14.legacy_grants_adopted !== false) errors.push('c14: legacy grants must not be adopted');
  for (const [b, v] of Object.entries(c14.bundles)) {
    const expected = ops.filter((o) => o.bundles.includes(b)).map((o) => o.capability).sort();
    if (JSON.stringify(expected) !== JSON.stringify([...v.capabilities].sort())) errors.push(`c14: bundle ${b} capability list disagrees with operations`);
  }
  for (const o of ops) for (const b of o.bundles) if (!c14.bundles[b]) errors.push(`c14: ${o.id} references unknown bundle ${b}`);

  // 3. Test matrix (AUTHZ-18)
  const byOp = new Map();
  for (const t of tests.cases) {
    if (!opIds.has(t.operation)) errors.push(`tests: case ${t.case_id} for unknown operation`);
    if (caps.get(t.capability) !== t.operation) errors.push(`tests: case ${t.case_id} capability mismatch`);
    (byOp.get(t.operation) ?? byOp.set(t.operation, []).get(t.operation)).push(t);
    if ([401, 403, 404].includes(t.expected_status) && !t.assertions.includes('zero_persisted_writes')) errors.push(`tests: ${t.case_id} denial lacks zero_persisted_writes`);
  }
  if (tests.case_count !== tests.cases.length) errors.push('tests: case_count mismatch');
  for (const o of ops) {
    const cs = byOp.get(o.id) ?? [];
    if (!cs.length) errors.push(`tests: ${o.id} has no cases (AUTHZ-18)`);
    if (!['INTERNAL'].includes(o.scope) && !cs.some((c) => c.expected_status === 401 || c.expected_status === 403)) errors.push(`tests: ${o.id} has no denial case`);
    for (const b of Object.keys(c14.bundles)) {
      if (b === 'self' || o.bundles.includes(b) || ['INTERNAL', 'BOOTSTRAP'].includes(o.scope)) continue;
      if (!cs.some((c) => c.scenario === `ACTOR_WITH_ONLY_${b.toUpperCase()}_BUNDLE` && c.expected_status === 403)) errors.push(`tests: ${o.id} lacks 403 case for non-holder bundle ${b}`);
    }
  }

  // 4. API manifest
  const seen = new Set();
  const unrouted = new Set(api.unrouted_operations);
  for (const r of api.routes) {
    const k = `${r.method} ${r.path}`;
    if (seen.has(k)) errors.push(`api: duplicate route ${k}`);
    seen.add(k);
    if (!r.path.startsWith(api.product_prefix + '/') && r.path !== api.product_prefix) errors.push(`api: ${k} outside ${api.product_prefix}`);
    const o = ops.find((x) => x.id === r.operation);
    if (!o) { errors.push(`api: ${k} maps to unknown operation`); continue; }
    if (o.capability !== r.capability) errors.push(`api: ${k} capability disagrees with C14`);
    if (unrouted.has(r.operation) || ['INTERNAL', 'BLOCKED', 'RECORD'].includes(o.scope)) errors.push(`api: ${k} routes unroutable operation ${r.operation}`);
    if (r.mounted !== false || r.implemented !== false) errors.push(`api: ${k} claims mounted/implemented in a proposal`);
    if (!['GET', 'HEAD'].includes(r.method) && r.origin_check !== true) errors.push(`api: ${k} unsafe method without Origin check`);
    if (['GET', 'HEAD'].includes(r.method) && o.kind === 'command') errors.push(`api: ${k} safe method bound to command`);
  }
  for (const o of ops) {
    const routable = !['INTERNAL', 'BLOCKED', 'RECORD'].includes(o.scope);
    const routed = api.routes.some((r) => r.operation === o.id);
    if (routable && !routed) errors.push(`api: routable operation ${o.id} has no route`);
    if (!routable && !unrouted.has(o.id)) errors.push(`api: ${o.id} missing from unrouted_operations`);
  }
  if (api.boundary_exceptions.length !== 3) errors.push('api: exactly three boundary exceptions are proposed');
  for (const x of api.boundary_exceptions) if (x.path.startsWith(api.product_prefix)) errors.push(`api: exception ${x.path} is inside the product prefix`);
  if (api.boundary_exceptions.some((x) => x.mounted !== false)) errors.push('api: exception claims mounted');
  // finding 4: envelope policy is explicit and machine-checked
  for (const x of api.boundary_exceptions) {
    if (!['EXEMPT_MINIMAL_STATUS_BODY', 'STANDARD_ENVELOPE'].includes(x.error_envelope)) errors.push(`api: exception ${x.path} has no envelope policy`);
    const minimal = ['/api/health', '/api/ready'].includes(x.path);
    if (minimal !== (x.error_envelope === 'EXEMPT_MINIMAL_STATUS_BODY')) errors.push(`api: exception ${x.path} envelope policy is wrong`);
    if (x.error_envelope === 'EXEMPT_MINIMAL_STATUS_BODY') {
      const bodies = Object.values(x.exact_bodies ?? {});
      if (!bodies.length || bodies.some((b) => JSON.stringify(Object.keys(b)) !== '["status"]')) errors.push(`api: exception ${x.path} must declare exact minimal status bodies`);
    }
  }

  // 5. Deferred register consistency
  const rowsById = new Map(closure.rows.map((r) => [r.id, r]));
  for (const d of deferred.entries) {
    const row = rowsById.get(d.oq);
    if (!row) { errors.push(`deferred: ${d.oq} not in closure matrix`); continue; }
    if (!row.controlling_artifact.endsWith('08-deferred-feature-policy-register.md')) errors.push(`deferred: ${d.oq} controlled elsewhere (${row.controlling_artifact})`);
    if (!!d.residual_owner_value !== row.missing_owner_values.length > 0) errors.push(`deferred: ${d.oq} residual disagrees with closure matrix`);
  }
  for (const r of closure.rows) if (r.closure_class === 'REGISTER_AS_DISABLED' && !deferred.entries.some((d) => d.oq === r.id)) errors.push(`deferred: ${r.id} REGISTER_AS_DISABLED but absent from register`);

  // 7. Manifest: exact bytes of every package artifact (finding 2) and no extra/missing files
  {
    const m = pkg.manifest;
    const listed = new Map(m.artifacts.map((x) => [x.path, x]));
    const actual = readdirSync(join(root, PKG)).map((f) => `${PKG}/${f}`).filter((p) => p !== MANIFEST && p !== MANIFEST_SIDECAR);
    for (const p of [...actual, ...PACKAGE_SCRIPTS]) if (!listed.has(p)) errors.push(`manifest: unlisted package artifact ${p}`);
    for (const [p, x] of listed) {
      if (!existsSync(join(root, p))) { errors.push(`manifest: listed artifact missing ${p}`); continue; }
      const got = fileSha(root, p);
      if (got !== x.sha256) errors.push(`manifest: sha256 drift ${p}`);
      if (readFileSync(join(root, p)).length !== x.bytes) errors.push(`manifest: byte count drift ${p}`);
    }
    const counts = { markdown: 0, json: 0, script: 0 };
    for (const p of listed.keys()) counts[p.endsWith('.md') ? 'markdown' : p.endsWith('.json') ? 'json' : 'script']++;
    if (JSON.stringify(counts) !== JSON.stringify(m.listed_artifact_counts)) errors.push(`manifest: listed artifact counts ${JSON.stringify(m.listed_artifact_counts)} != actual ${JSON.stringify(counts)}`);
    const archiveInventory = { markdown: 0, json: 0, sidecar: 0, script: 0, total_files: 0 };
    for (const p of actual) {
      if (p.endsWith('.md')) archiveInventory.markdown++;
      else if (p.endsWith('.json')) archiveInventory.json++;
      else if (p.endsWith('.sha256')) archiveInventory.sidecar++;
      else archiveInventory.script++;
      archiveInventory.total_files++;
    }
    for (const p of PACKAGE_SCRIPTS) { archiveInventory.script++; archiveInventory.total_files++; }
    if (JSON.stringify(archiveInventory) !== JSON.stringify(m.archive_inventory)) errors.push(`manifest: archive inventory ${JSON.stringify(m.archive_inventory)} != actual ${JSON.stringify(archiveInventory)}`);
    if (m.baseline_commit !== closure.baseline.commit) errors.push('manifest: baseline differs from closure matrix');
    if (m.registration_issue !== '#75') errors.push('manifest: registration issue must be #75');
    if (m.registration_form?.new_requirement_ids !== 0 || m.registration_form?.new_acceptance_ids !== 0) errors.push('manifest: registration form must add no requirement or acceptance IDs (#75)');
    if (existsSync(join(root, MANIFEST_SIDECAR))) {
      const want = readFileSync(join(root, MANIFEST_SIDECAR), 'utf8').trim().split(/\s+/)[0];
      if (want !== fileSha(root, MANIFEST)) errors.push('manifest: package-manifest.sha256 does not match package-manifest.json');
    } else errors.push('manifest: sidecar package-manifest.sha256 missing');
  }

  // 6. Document metadata of package Markdown
  for (const f of ['00-README.md', '01-closure-matrix.md', '02-c14-authorization-capability-matrix.md', '03-c15-data-lifecycle-privacy-matrix.md', '04-session-transport-security-spec.md', '05-api-boundary-manifest.md', '06-identity-tenancy-manager-registration-packet.md', '07-evidence-release-operations-spec.md', '08-deferred-feature-policy-register.md', '09-governance-content-certification-web-packet.md']) {
    const p = join(root, PKG, f);
    if (!existsSync(p)) { errors.push(`docs: missing ${f}`); continue; }
    const m = readFileSync(p, 'utf8').match(/^<!--tos-doc\n([\s\S]*?)\n-->/);
    if (!m) { errors.push(`docs: ${f} lacks leading tos-doc block`); continue; }
    const meta = JSON.parse(m[1]);
    if (meta.status !== 'proposed') errors.push(`docs: ${f} status must be proposed, is ${meta.status}`);
    // finding 1: registration adds no requirement or acceptance IDs (issue #75)
    const body = readFileSync(p, 'utf8').replace(/^\| [0-9.]+ \| \d{4}-\d{2}-\d{2} \|.*$/gm, '');
    const hit = body.match(/\b[Aa]ppend(?:s|ing)? (?:acceptance cases|requirement|[A-Z]+-\d+)|\b[Nn]ew (?:requirement )?[A-Z]+-\d+\b|\bSES-AC-(?:1[5-9]|2\d)\b/);
    if (hit && f !== '00-README.md') errors.push(`docs: ${f} proposes a new requirement/acceptance ID ("${hit[0]}"), contradicting the #75 registration form`);
  }
  return { errors, notes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(process.cwd());
  const { errors, notes } = validateDecisionClosure(root);
  for (const n of notes) console.log(`note: ${n}`);
  if (errors.length) { for (const e of errors) console.error(`error: ${e}`); process.exit(1); }
  console.log('decision-closure package: consistent with live repository');
}
