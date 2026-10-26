import {VALIDATOR_PARTITION_COUNT,validatorPartitionOrdinals,validatorPartitionForOrdinal,assertValidatorInventory,WHOLE_REPOSITORY_CONTROLS,REGISTRATION_TEST_NAMES,REGISTRATION_ENTRY_PATTERN,REGISTRATION_REMAINDER_PATTERN} from '../verification/validator-partitions.mjs';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { expectedPlan, inspectAuditPlan } from '../verification/self-audit-catalog.mjs';
import { discoverFoundationTests, evaluateAuditReports, runAuditStage, sourceIdentity } from '../verification/development-self-audit.mjs';
import { localDocumentGovernanceContext, resolveDocumentGovernanceContext, inspectDocumentGovernanceContext, documentGovernanceArgs } from '../verification/document-governance-context.mjs';
import { inspectDevelopmentSelfAudit } from '../verification/validate-development-self-audit.mjs';
import { inspectConsolidatedVerification, inspectConsolidationCoverage, preservedProofBytes, reconstructHistoricalReplay, preservedRegistrationTestBytes } from '../verification/consolidated-ci-evidence.mjs';
import { deriveWorkflowInventory, inspectClosureObserverText, inspectWorkflowText, closureObserverPath, closureObserverName } from '../verification/workflow-lifecycle-inventory.mjs';
import { inspectProducerWorkflowWiring, inspectWorkflowLifecycles } from '../verification/validate-workflow-lifecycle.mjs';
import { buildWorkflowReport, closeWorkflowReport, reportDigest, planWorkflowRecovery } from '../verification/workflow-lifecycle.mjs';
import { inspectKitchenEngineering } from '../verification/demo-kitchen-engineering.mjs';
import { discoverAuthorityValidators, runAuthorityValidators } from '../architecture/validate-whole-repository.mjs';
import { STORAGE_TEST_NAMES, STORAGE_OWNER_PATTERN, STORAGE_INTEGRATION_PATTERN, assertStoragePartitionInventory } from '../verification/demo-storage-partitions.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const PRODUCER = '.github/workflows/development-self-audit.yml';
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFileSync(join(ROOT, path), 'utf8');
// Historical assertions retain their frozen bytes. A current source/independent
// review check must succeed before these exact four predecessor inputs escape.
function kitchenPredecessor(path) {
  assert.ok(['verification/whole-repository/self-audit-plan.json','tests/integration/demo/application-runtime.test.ts','tests/integration/demo/recipe-content-guard.test.ts','scripts/architecture/validate-whole-repository.mjs'].includes(path));
  const verified=inspectKitchenEngineering(ROOT);
  assert.equal(verified.present,true);assert.deepEqual(verified.errors,[]);
  assert.ok(Object.hasOwn(verified.predecessorFiles,path));
  return verified.predecessorFiles[path];
}
// Independently frozen from main fdb71287845ed024dabb83fb67b5a803fd55153d,
// tree 3cfaa3d8f0ed2d778ec8e18bd75dc52fb45846c3. These are semantic identities,
// not a total-case-count proxy. Deliberate future coverage changes need review.
const BASELINE_STAGES = [
  {"id": "authority", "command": "node", "args": ["scripts/architecture/validate-whole-repository.mjs"], "timeout_ms": 25000},
  {"id": "pins", "command": "node", "args": ["scripts/packaging/validate-apply-guards.mjs", "pins"], "timeout_ms": 25000},
  {"id": "target-snapshots", "command": "node", "args": ["--test", "scripts/tests/validate-isolated-database-target.mjs", "scripts/tests/validate-persistence-input-snapshots.mjs"], "timeout_ms": 25000},
  {"id": "production-denials", "command": "node", "args": ["scripts/tests/validate-production-proof.mjs"], "timeout_ms": 25000},
  {"id": "migration-guards", "command": "node", "args": ["scripts/tests/validate-migration-history-guards.mjs"], "timeout_ms": 25000},
  {"id": "apply-regressions", "command": "node", "args": ["scripts/tests/validate-apply-guard-regressions.mjs"], "timeout_ms": 25000},
  {"id": "validator-shard-1", "command": "node", "args": ["scripts/tests/validate-validators.mjs", "--shard=1/3"], "timeout_ms": 25000},
  {"id": "validator-shard-2", "command": "node", "args": ["scripts/tests/validate-validators.mjs", "--shard=2/3"], "timeout_ms": 25000},
  {"id": "validator-shard-3", "command": "node", "args": ["scripts/tests/validate-validators.mjs", "--shard=3/3"], "timeout_ms": 25000},
  {"id": "audit-regressions", "command": "node", "args": ["--test", "scripts/tests/validate-development-self-audit.test.mjs"], "timeout_ms": 25000},
  {"id": "recovery-regressions", "command": "node", "args": ["--test", "scripts/tests/validate-owner-decision-inventory.test.mjs"], "timeout_ms": 25000},
  {"id": "lifecycle-regressions", "command": "node", "args": ["--test", "scripts/tests/validate-workflow-lifecycle.test.mjs", "scripts/tests/validate-workflow-lifecycle-wiring.test.mjs", "scripts/tests/validate-workflow-lifecycle-readback.test.mjs"], "timeout_ms": 25000},
  {"id": "typecheck", "command": "pnpm", "args": ["typecheck"], "timeout_ms": 25000},
  {"id": "foundation", "command": "pnpm", "args": ["exec", "node", "--import", "tsx", "--test"], "timeout_ms": 25000, "discover_tests": "src/modules"},
  {"id": "generation", "command": "pnpm", "args": ["db:verify-p05-generation"], "timeout_ms": 25000},
  {"id": "replay", "command": "pnpm", "args": ["db:verify-p05-replay"], "timeout_ms": 25000},
  {"id": "migrate-isolated", "command": "pnpm", "args": ["db:migrate"], "timeout_ms": 25000},
  {"id": "postgres-p01", "command": "pnpm", "args": ["test:integration"], "timeout_ms": 25000},
  {"id": "postgres-p02", "command": "pnpm", "args": ["test:p02:integration"], "timeout_ms": 25000},
  {"id": "postgres-identity-commands", "command": "pnpm", "args": ["test:identity:commands:integration"], "timeout_ms": 25000},
  {"id": "postgres-session-commands", "command": "pnpm", "args": ["test:session:commands:integration"], "timeout_ms": 25000},
  {"id": "postgres-p03", "command": "pnpm", "args": ["test:p03:integration"], "timeout_ms": 25000},
  {"id": "postgres-p04", "command": "pnpm", "args": ["test:p04:integration"], "timeout_ms": 25000},
  {"id": "postgres-p05", "command": "pnpm", "args": ["test:p05:integration"], "timeout_ms": 25000},
];
const BASELINE_CASES = [
  {"name": "sem36: approved command depending on candidate fails", "script": "scripts/kernel/validate-semantic-kernel.mjs", "positive": false, "pattern": "SEM-36"},
  {"name": "sem36: approved event with null evidence fails", "script": "scripts/kernel/validate-semantic-kernel.mjs", "positive": false, "pattern": "sem35_evidence"},
  {"name": "kernel: command missing definition fails", "script": "scripts/kernel/validate-semantic-kernel.mjs", "positive": false, "pattern": "missing definition"},
  {"name": "kernel: duplicate command id fails", "script": "scripts/kernel/validate-semantic-kernel.mjs", "positive": false, "pattern": "duplicate id"},
  {"name": "kernel: invalid status fails", "script": "scripts/kernel/validate-semantic-kernel.mjs", "positive": false, "pattern": "invalid status"},
  {"name": "kernel: wrong manifest version fails", "script": "scripts/kernel/validate-semantic-kernel.mjs", "positive": false, "pattern": "version must be"},
  {"name": "kernel: clean repo passes (positive control)", "script": "scripts/kernel/validate-semantic-kernel.mjs", "positive": true},
  {"name": "pins: stale K00 pin fails", "script": "scripts/packaging/validate-apply-guards.mjs", "positive": false, "pattern": "stale K00 manifest version pin"},
  {"name": "pins: clean repo passes (positive control)", "script": "scripts/packaging/validate-apply-guards.mjs pins", "positive": true},
  {"name": "docs: missing tos-doc block fails", "script": "scripts/docs/validate-document-metadata.mjs", "positive": false, "pattern": "missing leading tos-doc"},
  {"name": "docs: clean repo passes (positive control)", "script": "scripts/docs/validate-document-metadata.mjs", "positive": true},
  {"name": "ownership: K00 concept missing from map fails", "script": "scripts/domains/validate-domain-ownership.mjs", "positive": false, "pattern": "missing current K00 concept"},
  {"name": "ownership: bad owner domain fails", "script": "scripts/domains/validate-domain-ownership.mjs", "positive": false, "pattern": "not a registered domain"},
  {"name": "invariant discovery: wrong proposal id fails", "script": "scripts/domains/validate-invariant-discovery.mjs", "positive": false, "pattern": "wrong id"},
  {"name": "decision-table discovery: wrong proposal id fails", "script": "scripts/domains/validate-decision-table-discovery.mjs", "positive": false, "pattern": "wrong id"},
  {"name": "command-event discovery: stale live pin fails", "script": "scripts/domains/validate-command-event-discovery.mjs", "positive": false, "pattern": "expected K00"},
  {"name": "state discovery: wrong proposal id fails", "script": "scripts/domains/validate-state-discovery.mjs", "positive": false, "pattern": "wrong id"},
  {"name": "relationship discovery: wrong proposal id fails", "script": "scripts/domains/validate-relationships.mjs", "positive": false, "pattern": "wrong id"},
  {"name": "dependency concepts: wrong lifecycle version fails", "script": "scripts/domains/validate-dependency-concepts.mjs", "positive": false, "pattern": "version must be"},
  {"name": "dependency lifecycle: wrong command closure count fails", "script": "scripts/domains/validate-dependency-lifecycle-discovery.mjs", "positive": false, "pattern": "command closure"},
  {"name": "ownership: clean repo passes (positive control)", "script": "scripts/domains/validate-domain-ownership.mjs", "positive": true},
  {"name": "invariant discovery: clean repo passes (positive control)", "script": "scripts/domains/validate-invariant-discovery.mjs", "positive": true},
  {"name": "decision-table discovery: clean repo passes (positive control)", "script": "scripts/domains/validate-decision-table-discovery.mjs", "positive": true},
  {"name": "command-event discovery: clean repo passes (positive control)", "script": "scripts/domains/validate-command-event-discovery.mjs", "positive": true},
  {"name": "state discovery: clean repo passes (positive control)", "script": "scripts/domains/validate-state-discovery.mjs", "positive": true},
  {"name": "relationship discovery: clean repo passes (positive control)", "script": "scripts/domains/validate-relationships.mjs", "positive": true},
  {"name": "dependency concepts: clean repo passes (positive control)", "script": "scripts/domains/validate-dependency-concepts.mjs", "positive": true},
  {"name": "dependency lifecycle: clean repo passes (positive control)", "script": "scripts/domains/validate-dependency-lifecycle-discovery.mjs", "positive": true},
  {"name": "slice-p01 implementation: unauthorized admission fails", "script": "scripts/persistence/validate-slice-p01-implementation-boundary.mjs", "positive": false, "pattern": "active ADMIT authority missing"},
  {"name": "slice-p01 implementation: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p01-implementation-boundary.mjs", "positive": true},
  {"name": "slice-p02 decisions: wrong verifier selection fails", "script": "scripts/persistence/validate-slice-p02-owner-decisions.mjs", "positive": false, "pattern": "P02-D01 must be SESSION_VERIFIER_V1_SHA256_256BIT"},
  {"name": "slice-p02 decisions: cross-Identity authorization flag false fails", "script": "scripts/persistence/validate-slice-p02-owner-decisions.mjs", "positive": false, "pattern": "ownership\\/scope decision drifted"},
  {"name": "slice-p02 decisions: missing cross-Identity authorization flag fails", "script": "scripts/persistence/validate-slice-p02-owner-decisions.mjs", "positive": false, "pattern": "ownership\\/scope decision drifted"},
  {"name": "slice-p02 decisions: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p02-owner-decisions.mjs", "positive": true},
  {"name": "slice-p02 admission: blocked decision fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "ADMIT authorization mismatch"},
  {"name": "slice-p02 admission: optional session owner fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "exact owner-approved ownership\\/scope decision required"},
  {"name": "slice-p02 admission: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": true},
  {"name": "slice-p02 implementation: unauthorized admission fails", "script": "scripts/persistence/validate-slice-p02-implementation-boundary.mjs", "positive": false, "pattern": "active ADMIT authority missing"},
  {"name": "slice-p02 implementation: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p02-implementation-boundary.mjs", "positive": true},
  {"name": "slice-p03 admission: blocked decision fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "ADMIT authorization mismatch"},
  {"name": "slice-p03 admission: optional owner fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "exact #40 scope rules required"},
  {"name": "slice-p03 admission: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": true},
  {"name": "slice-p03 implementation: unauthorized admission fails", "script": "scripts/persistence/validate-slice-p03-implementation-boundary.mjs", "positive": false, "pattern": "active ADMIT authority missing"},
  {"name": "slice-p03 implementation: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p03-implementation-boundary.mjs", "positive": true},
  {"name": "slice-p04 admission: blocked decision fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "ADMIT authorization mismatch"},
  {"name": "slice-p04 admission: UNKNOWN criterion fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "all eight Persistence Model criteria must be PROVEN"},
  {"name": "slice-p04 admission: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": true},
  {"name": "slice-p04 implementation: stale identities FK fails", "script": "scripts/persistence/validate-slice-p04-implementation-boundary.mjs", "positive": false, "pattern": "Credential FK must target public\\.identity_identities"},
  {"name": "slice-p04 implementation: missing journal entry fails", "script": "scripts/persistence/validate-slice-p04-implementation-boundary.mjs", "positive": false, "pattern": "authoritative Drizzle journal must include idx 3"},
  {"name": "slice-p04 implementation: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p04-implementation-boundary.mjs", "positive": true},
  {"name": "slice-p05 decisions: optional Assignment reference fails", "script": "scripts/persistence/validate-slice-p05-owner-decisions.mjs", "positive": false, "pattern": "P05-D01 must be REQUIRED_ONE_ASSIGNMENT"},
  {"name": "slice-p05 decisions: registration cannot authorize implementation directly", "script": "scripts/persistence/validate-slice-p05-owner-decisions.mjs", "positive": false, "pattern": "registration must authorize admission rerun only"},
  {"name": "slice-p05 decisions: clean repo passes (positive control)", "script": "scripts/persistence/validate-slice-p05-owner-decisions.mjs", "positive": true},
  {"name": "slice-p05 admission: blocked decision fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "ADMIT authorization mismatch"},
  {"name": "slice-p05 admission: nullable Assignment reference fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "exact REQUIRED_ONE_ASSIGNMENT owner decision required"},
  {"name": "slice-p05 admission: UNKNOWN criterion cannot pass", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "all eight Persistence Model criteria must be PROVEN"},
  {"name": "slice-p05 admission: clean admitted repo passes (positive control)", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": true},
  {"name": "slice-p01 admission: empty criteria fails", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": false, "pattern": "exactly eight distinct"},
  {"name": "slice-p01 admission: duplicate criteria fails", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": false, "pattern": "duplicate criterion"},
  {"name": "slice-p01 admission: missing criterion fails", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": false, "pattern": "missing criterion"},
  {"name": "slice-p01 admission: unknown criterion fails", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": false, "pattern": "unknown criterion"},
  {"name": "slice-p01 admission: blank evidence fails", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p01 admission: missing evidence fails", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p01 admission: malformed criterion fails", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": false, "pattern": "criterion must be an object"},
  {"name": "slice-p01 admission: reordered complete criteria pass", "script": "scripts/persistence/validate-slice-p01-schema-admission.mjs", "positive": true},
  {"name": "slice-p02 admission: empty criteria fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "exactly eight distinct"},
  {"name": "slice-p02 admission: duplicate criteria fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "duplicate criterion"},
  {"name": "slice-p02 admission: missing criterion fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "missing criterion"},
  {"name": "slice-p02 admission: unknown criterion fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "unknown criterion"},
  {"name": "slice-p02 admission: blank evidence fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p02 admission: missing evidence fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p02 admission: malformed criterion fails", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": false, "pattern": "criterion must be an object"},
  {"name": "slice-p02 admission: reordered complete criteria pass", "script": "scripts/persistence/validate-slice-p02-schema-admission.mjs", "positive": true},
  {"name": "slice-p03 admission: empty criteria fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "exactly eight distinct"},
  {"name": "slice-p03 admission: duplicate criteria fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "duplicate criterion"},
  {"name": "slice-p03 admission: missing criterion fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "missing criterion"},
  {"name": "slice-p03 admission: unknown criterion fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "unknown criterion"},
  {"name": "slice-p03 admission: blank evidence fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p03 admission: missing evidence fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p03 admission: malformed criterion fails", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": false, "pattern": "criterion must be an object"},
  {"name": "slice-p03 admission: reordered complete criteria pass", "script": "scripts/persistence/validate-slice-p03-schema-admission.mjs", "positive": true},
  {"name": "slice-p04 admission: empty criteria fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "exactly eight distinct"},
  {"name": "slice-p04 admission: duplicate criteria fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "duplicate criterion"},
  {"name": "slice-p04 admission: missing criterion fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "missing criterion"},
  {"name": "slice-p04 admission: unknown criterion fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "unknown criterion"},
  {"name": "slice-p04 admission: blank evidence fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p04 admission: missing evidence fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p04 admission: malformed criterion fails", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": false, "pattern": "criterion must be an object"},
  {"name": "slice-p04 admission: reordered complete criteria pass", "script": "scripts/persistence/validate-slice-p04-schema-admission.mjs", "positive": true},
  {"name": "slice-p05 admission: empty criteria fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "exactly eight distinct"},
  {"name": "slice-p05 admission: duplicate criteria fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "duplicate criterion"},
  {"name": "slice-p05 admission: missing criterion fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "missing criterion"},
  {"name": "slice-p05 admission: unknown criterion fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "unknown criterion"},
  {"name": "slice-p05 admission: blank evidence fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p05 admission: missing evidence fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "non-blank evidence"},
  {"name": "slice-p05 admission: malformed criterion fails", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "criterion must be an object"},
  {"name": "slice-p05 admission: reordered complete criteria pass", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": true},
  {"name": "admission: authority criterion omission fails closed", "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs", "positive": false, "pattern": "Persistence Model must define the exact eight distinct"},
  {"name": "pins: duplicate admission criterion fails", "script": "scripts/packaging/validate-apply-guards.mjs pins", "positive": false, "pattern": "duplicate criterion"},
  {"name": "foundation: runtime activation fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "runtime activation must remain BLOCKED"},
  {"name": "foundation: physical persistence proof fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "physical_persistence must remain PENDING"},
  {"name": "foundation: Assignment adapter proof fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "authoritative_assignment_authorization_adapter must remain UNKNOWN"},
  {"name": "foundation: atomic insert proof fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "atomic_authorization_and_insert must remain PENDING"},
  {"name": "foundation: concurrent completion proof fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "postgresql_concurrent_completion must remain PENDING"},
  {"name": "foundation: production authorization fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "shared\\/production migration execution must remain unauthorized"},
  {"name": "foundation: table totals fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "tables totals must match actual artifacts"},
  {"name": "foundation: migration totals fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "migration_files totals must match actual artifacts"},
  {"name": "foundation: repository totals fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "repositories totals must match actual artifacts"},
  {"name": "foundation: slice totals fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "implemented physical slice count"},
  {"name": "foundation: wrong owner decision fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "Assignment owner decision mismatch"},
  {"name": "foundation: missing verification source fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "exact baseline and verification source"},
  {"name": "foundation: missing admission reference fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "separate ADMIT admission"},
  {"name": "foundation: clean recorded checkpoint passes", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": true},
  {"name": "foundation: missing checkpoint fails closed", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "foundation.json:.*ENOENT"},
  {"name": "foundation: physical Learning implementation requires separate evidence", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "physical Learning implementation cannot be covered"},
  {"name": "foundation: contradictory P05 readiness fails", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "P05 readiness must remain admitted"},
  {"name": "foundation: matching invented repository counts still fail actual artifacts", "script": "scripts/persistence/validate-slice-p05-foundation.mjs", "positive": false, "pattern": "repositories totals must match actual artifacts"},
  {"name": "pins: forged foundation authorization fails", "script": "scripts/packaging/validate-apply-guards.mjs pins", "positive": false, "pattern": "runtime activation must remain BLOCKED"},
  {"name": "p05 physical evidence: runtime activation fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "runtime activation must remain BLOCKED"},
  {"name": "p05 physical evidence: production execution fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "shared\\/production migration execution must remain blocked"},
  {"name": "p05 physical evidence: invented Assignment existence fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "must not claim existence"},
  {"name": "p05 physical evidence: nullable Assignment reference fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "must not claim existence"},
  {"name": "p05 physical evidence: invented Assignment authorization fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "explicit runtime blockers"},
  {"name": "p05 physical evidence: invented atomic authorization fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "explicit runtime blockers"},
  {"name": "p05 physical evidence: repository total drift fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "totals must match actual artifacts"},
  {"name": "p05 physical evidence: inconsistent verification state fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "all physical verification fields"},
  {"name": "p05 implementation: clean checkpoint passes", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": true},
  {"name": "p05 implementation: no ADMIT means no authoring", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "active ADMIT authority required"},
  {"name": "p05 implementation: foreign module import fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "foreign module imports Learning persistence"},
  {"name": "p05 implementation: wrong Identity FK target fails", "script": "scripts/persistence/validate-slice-p05-implementation-boundary.mjs", "positive": false, "pattern": "FK must reference canonical Identity"},
  {"name": "P01 decision packet: current readiness passes", "script": "scripts/persistence/validate-transactioncontrol-first-slice-decision-packet.mjs", "positive": true},
  {"name": "P01 decision packet: missing preserved implementation fails", "script": "scripts/persistence/validate-transactioncontrol-first-slice-decision-packet.mjs", "positive": false, "pattern": "readiness must preserve SLICE-P01"},
  {"name": "closure: preserved historical exclusions and later approvals pass", "script": "scripts/persistence/validate-persistence-semantic-closure-registration.mjs", "positive": true},
  {"name": "closure: later approval without provenance fails", "script": "scripts/persistence/validate-persistence-semantic-closure-registration.mjs", "positive": false, "pattern": "later AssignmentId approval requires issue #46"},
  {"name": "closure: historical promotion set drift fails", "script": "scripts/persistence/validate-persistence-semantic-closure-registration.mjs", "positive": false, "pattern": "exact historical identifiers promotion set"},
  {"name": "closure: excluded capability cannot become approved", "script": "scripts/persistence/validate-persistence-semantic-closure-registration.mjs", "positive": false, "pattern": "excluded CapabilityId must remain candidate"},
  {"name": "integration: clean complete source/authority inventory passes", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": true},
  {"name": "integration: Application cannot import Infrastructure", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "Application imports Infrastructure"},
  {"name": "integration: Domain cannot import database driver", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "Domain imports a non-Domain"},
  {"name": "integration: foreign Infrastructure import fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "foreign Infrastructure import forbidden"},
  {"name": "integration: repository port cannot move to Infrastructure", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "repository port must be Application-owned"},
  {"name": "integration: missing repository input snapshot fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "capture every mutable repository input before await"},
  {"name": "integration: queue READY without admission fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "queue must preserve admission BLOCK"},
  {"name": "integration: invented relationship count fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "queue relationship set must match"},
  {"name": "integration: unguarded migration entry point fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "isolated target guard must run before any Pool"},
  {"name": "integration: runtime activation in build-time composition fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "build-time schema composition cannot activate runtime"},
  {"name": "P06: complete BLOCK evidence evaluation passes", "script": "scripts/persistence/validate-slice-p06-schema-admission.mjs", "positive": true},
  {"name": "P06: premature ADMIT fails", "script": "scripts/persistence/validate-slice-p06-schema-admission.mjs", "positive": false, "pattern": "current P06 decision must be BLOCK"},
  {"name": "P06: unknown criteria cannot become PROVEN", "script": "scripts/persistence/validate-slice-p06-schema-admission.mjs", "positive": false, "pattern": "four PROVEN and four UNKNOWN"},
  {"name": "P06: authoring while BLOCKED fails", "script": "scripts/persistence/validate-slice-p06-schema-admission.mjs", "positive": false, "pattern": "implementation_authorized must remain false"},
  {"name": "P06: incomplete acceptance evidence fails", "script": "scripts/persistence/validate-slice-p06-schema-admission.mjs", "positive": false, "pattern": "complete migration\\/version\\/scope\\/audit\\/atomicity evidence"},
  {"name": "whole audit: every standalone gate passes", "script": "scripts/architecture/validate-whole-repository.mjs", "positive": true},
  {"name": "whole audit: an otherwise untriggered historical validator fails", "script": "scripts/architecture/validate-whole-repository.mjs", "positive": false, "pattern": "validate-persistence-semantic-closure-registration"},
  {"name": "p07: complete BLOCK evaluation passes", "script": "scripts/persistence/validate-slice-p07-schema-admission.mjs", "positive": true},
  {"name": "p07: premature ADMIT fails", "script": "scripts/persistence/validate-slice-p07-schema-admission.mjs", "positive": false, "pattern": "current admission decision must be BLOCK"},
  {"name": "p07: invented lifecycle fails", "script": "scripts/persistence/validate-slice-p07-schema-admission.mjs", "positive": false, "pattern": "lifecycle_decision remains UNKNOWN"},
  {"name": "p07: unknown criteria cannot be PROVEN", "script": "scripts/persistence/validate-slice-p07-schema-admission.mjs", "positive": false, "pattern": "four PROVEN and four UNKNOWN"},
  {"name": "p07: migration authoring forbidden while blocked", "script": "scripts/persistence/validate-slice-p07-schema-admission.mjs", "positive": false, "pattern": "migration_authoring_authorized must remain false"},
  {"name": "p07: required evidence cannot be omitted", "script": "scripts/persistence/validate-slice-p07-schema-admission.mjs", "positive": false, "pattern": "complete replay, scope, version, audit and contention"},
  {"name": "p07: exact logical relationships required", "script": "scripts/persistence/validate-slice-p07-schema-admission.mjs", "positive": false, "pattern": "exact approved relationship inventory"},
  {"name": "p08: complete BLOCK evaluation passes", "script": "scripts/persistence/validate-slice-p08-schema-admission.mjs", "positive": true},
  {"name": "p08: premature ADMIT fails", "script": "scripts/persistence/validate-slice-p08-schema-admission.mjs", "positive": false, "pattern": "current admission decision must be BLOCK"},
  {"name": "p08: invented lifecycle fails", "script": "scripts/persistence/validate-slice-p08-schema-admission.mjs", "positive": false, "pattern": "lifecycle_decision remains UNKNOWN"},
  {"name": "p08: unknown criteria cannot be PROVEN", "script": "scripts/persistence/validate-slice-p08-schema-admission.mjs", "positive": false, "pattern": "four PROVEN and four UNKNOWN"},
  {"name": "p08: migration authoring forbidden while blocked", "script": "scripts/persistence/validate-slice-p08-schema-admission.mjs", "positive": false, "pattern": "migration_authoring_authorized must remain false"},
  {"name": "p08: required evidence cannot be omitted", "script": "scripts/persistence/validate-slice-p08-schema-admission.mjs", "positive": false, "pattern": "complete replay, scope, version, audit and contention"},
  {"name": "p08: exact logical relationships required", "script": "scripts/persistence/validate-slice-p08-schema-admission.mjs", "positive": false, "pattern": "exact approved relationship inventory"},
  {"name": "coverage: exact complete ledger passes", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": true},
  {"name": "coverage: omitted command fails", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": false, "pattern": "exact approved command inventory"},
  {"name": "coverage: wrong command owner fails", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": false, "pattern": "owner\\/authority drift"},
  {"name": "coverage: partial foundation cannot claim runtime conformance", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": false, "pattern": "full runtime conformance cannot be claimed"},
  {"name": "coverage: missing source symbol fails", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": false, "pattern": "source symbol missing"},
  {"name": "coverage: missing test reference fails", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": false, "pattern": "referenced test missing"},
  {"name": "coverage: unresolved obligations cannot disappear", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": false, "pattern": "missing obligations must remain explicit"},
  {"name": "coverage: duplicate row cannot conceal missing command", "script": "scripts/architecture/validate-command-coverage.mjs", "positive": false, "pattern": "exact approved command inventory"},
  {"name": "integration: future table cannot hide in existing module", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "future physical table has no ADMIT authority"},
  {"name": "integration: future table cannot enter existing migration", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "future migration table has no ADMIT authority"},
  {"name": "integration: future snapshot table cannot precede admission", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "future snapshot table has no ADMIT authority"},
  {"name": "integration: path-filtered physical proof workflow fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "physical proofs must run on every PR and main tree"},
  {"name": "integration: missing future evidence plan fails", "script": "scripts/architecture/validate-repository-integration.mjs", "positive": false, "pattern": "evidence plan is required"},
  {"name": "self-audit: bounded complete automatic workflow passes", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": true},
  {"name": "self-audit: production permission cannot be inferred", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "exact bounded"},
  {"name": "self-audit: unbounded command plan fails", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "exact bounded"},
  {"name": "self-audit: omitted CI checkpoint fails", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "complete ordered"},
  {"name": "self-audit: stale checkout cannot claim candidate proof", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "exact candidate"},
  {"name": "self-audit: filtered automation fails", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "every PR"},
  {"name": "self-audit: missing failure finalizer fails", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "finalize and be retained"},
  {"name": "self-audit: missing command PG evidence fails", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "atomic Identity integration"},
  {"name": "self-audit: missing transaction-bound audit connection fails", "script": "scripts/verification/validate-development-self-audit.mjs", "positive": false, "pattern": "exact-transaction binding"},
  {"name": "recovery: complete pinned proposal inventory passes", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": true},
  {"name": "recovery: omitted owner question fails", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "live owner inventory drift"},
  {"name": "recovery: newly added question cannot escape projection", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "live owner inventory drift"},
  {"name": "recovery: recommendation cannot record approval", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "recommendations cannot grant authority"},
  {"name": "recovery: missing recommendation fails", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "exact complete recommendation"},
  {"name": "recovery: unresolved certification approver cannot be review ready", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "detailed owner values"},
  {"name": "recovery: legacy cannot authorize V2", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "legacy evidence cannot grant"},
  {"name": "recovery: wrong pinned head fails", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "exact pinned source"},
  {"name": "recovery: altered reference excerpt fails", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "excerpt source and digest"},
  {"name": "recovery: global audit transaction binding fails", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "same transaction binding"},
  {"name": "recovery: missing session PG CI evidence fails", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "session transaction PG automation"},
  {"name": "decision closure: registered policy and 24 denial regressions pass", "script": "scripts/tests/validate-decision-closure.test.mjs", "positive": true},
  {"name": "owner policy: exact selected policies and unresolved drafts pass", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": true},
  {"name": "owner policy: invented PIN attempt limit fails", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "exact selected OQ-IDN-6"},
  {"name": "owner policy: shortened rollback compatibility fails", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "exact selected OQ-REL-4"},
  {"name": "owner policy: privacy draft cannot become approved", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "unselected OQ-PRIV-1"},
  {"name": "owner policy: draft exemption cannot be approved", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "approve exemptions"},
  {"name": "owner policy: retention cannot extend credential validity", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "extend authentication validity"},
  {"name": "owner policy: new matrix direction cannot import V1 grants", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "new matrix direction"},
  {"name": "owner policy: provider recommendation cannot activate analytics", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "recommended providers cannot approve"},
  {"name": "owner policy: one-year audit duration cannot authorize deletion", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "policy effects must preserve"},
  {"name": "owner policy: selected duration cannot claim retention enforcement", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "retention policy is not enforcement evidence"},
  {"name": "owner policy: rewritten superseded contract fails", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "historical contract body cannot be rewritten"},
  {"name": "owner policy: existing audit deletion guard cannot weaken", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "existing requirement meaning"},
  {"name": "owner policy: new route source invalidates empty scan", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "route scan must cover exact current src inventory"},
  {"name": "recovery: generated owner view cannot misstate a recommendation", "script": "scripts/verification/validate-legacy-foundation-recovery.mjs", "positive": false, "pattern": "exact generated decision view"},
  {"name": "owner policy: malformed revision change-log header fails", "script": "scripts/verification/validate-owner-policy-registration.mjs", "positive": false, "pattern": "complete revision change-log table"},
];
const BASELINE_VALIDATORS = [
  "scripts/application-interfaces/audit-architecture-application.mjs",
  "scripts/application-interfaces/validate-application-interface-authority.mjs",
  "scripts/application-interfaces/validate-application-interface-discovery.mjs",
  "scripts/application-interfaces/validate-application-interface-proposal.mjs",
  "scripts/architecture/validate-architecture-authority.mjs",
  "scripts/architecture/validate-architecture-discovery.mjs",
  "scripts/architecture/validate-architecture-proposal.mjs",
  "scripts/architecture/validate-command-coverage.mjs",
  "scripts/architecture/validate-repository-integration.mjs",
  "scripts/docs/validate-document-metadata.mjs",
  "scripts/domains/validate-command-event-discovery.mjs",
  "scripts/domains/validate-decision-table-discovery.mjs",
  "scripts/domains/validate-dependency-concepts.mjs",
  "scripts/domains/validate-dependency-lifecycle-discovery.mjs",
  "scripts/domains/validate-domain-ownership.mjs",
  "scripts/domains/validate-invariant-discovery.mjs",
  "scripts/domains/validate-relationships.mjs",
  "scripts/domains/validate-state-discovery.mjs",
  "scripts/governance/validate-strict-nine-ratification.mjs",
  "scripts/kernel/validate-semantic-kernel.mjs",
  "scripts/persistence/audit-architecture-application-persistence.mjs",
  "scripts/persistence/audit-first-physical-slice-readiness.mjs",
  "scripts/persistence/validate-first-physical-slice-readiness.mjs",
  "scripts/persistence/validate-persistence-authority.mjs",
  "scripts/persistence/validate-persistence-discovery.mjs",
  "scripts/persistence/validate-persistence-proposal.mjs",
  "scripts/persistence/validate-persistence-semantic-closure-discovery.mjs",
  "scripts/persistence/validate-persistence-semantic-closure-proposal.mjs",
  "scripts/persistence/validate-persistence-semantic-closure-registration.mjs",
  "scripts/persistence/validate-slice-p01-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p01-relationship-promotion.mjs",
  "scripts/persistence/validate-slice-p01-schema-admission.mjs",
  "scripts/persistence/validate-slice-p02-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p02-owner-decisions.mjs",
  "scripts/persistence/validate-slice-p02-schema-admission.mjs",
  "scripts/persistence/validate-slice-p03-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p03-schema-admission.mjs",
  "scripts/persistence/validate-slice-p04-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p04-schema-admission.mjs",
  "scripts/persistence/validate-slice-p05-foundation.mjs",
  "scripts/persistence/validate-slice-p05-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p05-owner-decisions.mjs",
  "scripts/persistence/validate-slice-p05-schema-admission.mjs",
  "scripts/persistence/validate-slice-p06-schema-admission.mjs",
  "scripts/persistence/validate-slice-p07-schema-admission.mjs",
  "scripts/persistence/validate-slice-p08-schema-admission.mjs",
  "scripts/persistence/validate-transactioncontrol-first-slice-decision-packet.mjs",
  "scripts/persistence/validate-transactioncontrol-first-slice-decision-registration.mjs",
  "scripts/verification/validate-decision-closure.mjs",
  "scripts/verification/validate-development-self-audit.mjs",
  "scripts/verification/validate-legacy-foundation-recovery.mjs",
  "scripts/verification/validate-owner-policy-registration.mjs",
  "scripts/verification/validate-workflow-lifecycle.mjs",
];
const BASELINE_COMMANDS = {
  "test:integration": "node --import tsx --test tests/integration/transaction-control/reconciliation-record-repository.test.ts",
  "test:p02:integration": "node --import tsx --test tests/integration/identity/identity-session-repository.test.ts",
  "test:identity:commands:integration": "node --import tsx --test tests/integration/identity/identity-command-transaction.test.ts",
  "test:session:commands:integration": "node --import tsx --test tests/integration/identity/session-command-transaction.test.ts",
  "test:p03:integration": "node --import tsx --test tests/integration/identity/identity-token-repository.test.ts",
  "test:p04:integration": "node --import tsx --test tests/integration/identity/credential-repository.test.ts",
  "test:p05:integration": "node --import tsx --test tests/integration/learning/learning-session-repository.test.ts",
  "db:verify-replay": "node --import tsx scripts/db/verify-migration-replay.ts",
  "db:verify-p02-replay": "node --import tsx scripts/db/verify-slice-p02-migration-replay.ts",
  "db:verify-p03-replay": "node --import tsx scripts/db/verify-slice-p03-migration-replay.ts",
  "db:verify-p04-replay": "node --import tsx scripts/db/verify-slice-p04-migration-replay.ts",
  "db:verify-p05-replay": "node --import tsx scripts/db/verify-slice-p05-migration-replay.ts",
  "db:verify-p05-generation": "node scripts/db/verify-slice-p05-generation.mjs"
};
const UNCHANGED_PROOF_FILES = {
  "scripts/db/verify-migration-replay.ts": "4c2698fd9da53776d7cd58e727d82d2d841fe46b3d670eb980ee3ef89887b764",
  "scripts/db/verify-slice-p02-migration-replay.ts": "badcb82c5a95022df54a5484a24f848c1aa59d48946e52e00e33fa272de914aa",
  "scripts/db/verify-slice-p03-migration-replay.ts": "75e4823b61f054fdbaf0edc187fdf65eb021b9da7f69ae3669ebd427903e0def",
  "scripts/db/verify-slice-p04-migration-replay.ts": "e2506bc0a0d4be4a16f345ddd91a9aec2f2a9573f4e346f79a9db739374f8daf",
  "scripts/db/verify-slice-p05-generation.mjs": "49869bd439098981b2df581dbae1d505e46af5a3c4dd07a1d1b780e034de32ce",
  "scripts/db/verify-slice-p05-migration-replay.ts": "d52b8fe273aec6b881d087de6f22a4f48fc09da8cc6bcd0e31e027d4a37ef9be",
  "src/modules/identity/application/identity-lifecycle-service.test.ts": "9f2cc704641b199fb287143c9fcc573e64660c7d771ae04d2b75b8c5dfe93850",
  "src/modules/identity/application/identity-token-service.test.ts": "d58d404a30f52d00fcd988aba2d7cab4dee027a20d4cf7b7d6213d2e9f4c1af6",
  "src/modules/identity/application/session-revocation-service.test.ts": "6ef2edea5f332a58c5fb23df18e9f6be6c34dd97e4d3482976ea897b3922ea6d",
  "src/modules/identity/application/session-service.test.ts": "2905ca0162e306ae40e534ffd6ffdb1f037d61c7c6799b78b77e0ab143b077a3",
  "src/modules/identity/domain/application-session.test.ts": "1c4a112d07c716c585ec825668e7f5b14635d1c76957fb68d30c89d49f490416",
  "src/modules/identity/domain/credential.test.ts": "ef73725aaee2cd786919f2aba4ec20bfd113c85ed0cbf272fd99a670e291feae",
  "src/modules/identity/domain/identity.test.ts": "d33c74bfb8bdd77cc9736f266b67d790927cfd147df81c40497e3b02de448c26",
  "src/modules/identity/domain/single-use-secret.test.ts": "7c1d46baf42a0e0bfdebecedbc2a36098ebfb0cb80577b215e72244affc53857",
  "src/modules/identity/infrastructure/persistence/postgres-application-session-repository.test.ts": "6ec84961af63afe9539b87c6d962129e908c1b2a0e4e4c49b60ab14822c04e22",
  "src/modules/learning/application/learning-session-service.test.ts": "60ccd129a3effd80d3f167978d45ee9d0eb257d09c5503a79644b6948694d8e2",
  "src/modules/learning/domain/learning-session.test.ts": "8f268c729660fe48bd469a14dedddb894ecfb9bcfcfd81c681e1d259518cad4a",
  "src/modules/transaction-control/application/reconciliation-service.test.ts": "1cbe9324be2ae6ee790080b4ae7f76ce8643f4a33d88aa23ac200c957f94a213",
  "src/modules/transaction-control/domain/reconciliation-record.test.ts": "dfe139aa4436e7f145e24413b1a20a9920abcf6642f79fe82be48ed2e7851add",
  "tests/integration/identity/credential-repository.test.ts": "b37359a4d09aba4481a0d1b054a0192e4d74b6b6e3a699938f9c891c1a67a8c0",
  "tests/integration/identity/identity-command-transaction.test.ts": "6799e1b2bf4a554740a6dee07e06e664586196594e94626c1fd9d61aa716b6b0",
  "tests/integration/identity/identity-session-repository.test.ts": "139de8b004cbf407c6ac8b66171875fbac6be0e64e6f05204a829ebd0dffa812",
  "tests/integration/identity/identity-token-repository.test.ts": "9142ddded1e704065f1fcc48bacd2efc88e9aa18722bbf319aad19f9c9d5e892",
  "tests/integration/identity/session-command-transaction.test.ts": "25bcbda4b272586c6a4a07189f3da6688b8880089af0cad2d4defba21984108e",
  "tests/integration/learning/learning-session-repository.test.ts": "f8c215ac4b2b7eacab0bc6b4db223ee1a12781c6e3394ebc27a619ae13f4ec5e",
  "tests/integration/transaction-control/reconciliation-record-repository.test.ts": "efe6914b7ed237bb07f24994ba785c2652e57e51d0beeb34ad4529045f64ac0b"
};

const additions = [
  ['validator-shard-13', 'node', ['scripts/tests/validate-validators.mjs', '--shard=13/14']],
  ['validator-shard-14', 'node', ['scripts/tests/validate-validators.mjs', '--shard=14/14']],
  ['demo-registration-entry-regressions', 'node', ['--test', '--test-name-pattern='+REGISTRATION_ENTRY_PATTERN, 'scripts/tests/validate-demo-runtime-registration.mjs']],
  ['validator-shard-7', 'node', ['scripts/tests/validate-validators.mjs', '--shard=7/14']],
  ['validator-shard-8', 'node', ['scripts/tests/validate-validators.mjs', '--shard=8/14']],
  ['validator-shard-9', 'node', ['scripts/tests/validate-validators.mjs', '--shard=9/14']],
  ['validator-shard-10', 'node', ['scripts/tests/validate-validators.mjs', '--shard=10/14']],
  ['validator-shard-11', 'node', ['scripts/tests/validate-validators.mjs', '--shard=11/14']],
  ['validator-shard-12', 'node', ['scripts/tests/validate-validators.mjs', '--shard=12/14']],

  ['validator-shard-4', 'node', ['scripts/tests/validate-validators.mjs', '--shard=4/14']],
  ['validator-shard-5', 'node', ['scripts/tests/validate-validators.mjs', '--shard=5/14']],
  ['validator-shard-6', 'node', ['scripts/tests/validate-validators.mjs', '--shard=6/14']],

  ['demo-source-tests', 'node', ['--import', 'tsx', '--test', 'tests/demo/activation.test.ts', 'tests/demo/application.test.ts', 'tests/demo/content.test.ts', 'tests/demo/cookie.test.ts', 'tests/demo/http-application.test.ts', 'tests/demo/transport.test.ts', 'tests/demo-web/api.test.mjs', 'tests/demo-web/controller.test.mjs', 'tests/demo-web/views.test.mjs', 'scripts/tests/demo-route-inventory.mjs', 'scripts/tests/demo-storage-evidence.mjs', 'scripts/tests/demo-validator-predecessor.mjs', 'tests/demo/recipe-content.test.ts', 'tests/demo-web/recipe-api.test.mjs', 'tests/demo-web/recipes.test.mjs', 'scripts/tests/validate-demo-recipes-registration.mjs', 'scripts/tests/validate-demo-recipes-physical-successor.mjs']],
  ['demo-generation', 'node', ['scripts/db/verify-demo-generation.mjs']],
  ['demo-postgres', 'node', ['--import', 'tsx', 'scripts/db/run-demo-integration.ts']],
  ['demo-recipe-postgres', 'node', ['--import', 'tsx', 'scripts/db/run-demo-recipe-integration.ts']],
  ['demo-registration-regressions', 'node', ['--test', '--test-name-pattern='+REGISTRATION_REMAINDER_PATTERN, 'scripts/tests/validate-demo-runtime-registration.mjs']],
  ['document-governance', 'node', ['scripts/docs/validate-document-metadata.mjs']],
  ['production-contract-decisions', 'node', ['scripts/release/validate-production-proof-contract-decisions.mjs']],
  ['drizzle-history', 'pnpm', ['exec', 'drizzle-kit', 'check']],
  ['replay-p01', 'pnpm', ['db:verify-replay']],
  ['replay-p02', 'pnpm', ['db:verify-p02-replay']],
  ['replay-p03', 'pnpm', ['db:verify-p03-replay']],
  ['replay-p04', 'pnpm', ['db:verify-p04-replay']],
];
const KITCHEN_SOURCE_TESTS = ['tests/demo/kitchen-content.test.ts','scripts/tests/validate-demo-kitchen-registration.mjs','scripts/tests/validate-demo-kitchen-engineering.mjs','tests/demo-web/stations.test.mjs','tests/demo-web/station-api.test.mjs'];
const KITCHEN_STAGES = [
  ['demo-kitchen-registration','node',['scripts/kernel/validate-demo-kitchen-registration.mjs']],
  ['demo-kitchen-postgres','node',['--import','tsx','scripts/db/run-demo-kitchen-integration.ts']],
];
const STORAGE_STAGES = [
  ['demo-storage-owner-regressions','node',['--test','--test-name-pattern='+STORAGE_OWNER_PATTERN,'scripts/tests/demo-storage-evidence.mjs']],
  ['demo-storage-integration-regressions','node',['--test','--test-name-pattern='+STORAGE_INTEGRATION_PATTERN,'scripts/tests/demo-storage-evidence.mjs']],
];
const currentAdditions = [...additions.map(([id,command,args])=>[id,command,id==='demo-source-tests'?args.filter(arg=>arg!=='scripts/tests/demo-storage-evidence.mjs').flatMap(arg=>arg==='tests/demo/recipe-content.test.ts'?[arg,...KITCHEN_SOURCE_TESTS]:[arg]):args]),...KITCHEN_STAGES,...STORAGE_STAGES];
const CURRENT_VALIDATORS = [...BASELINE_VALIDATORS,'scripts/kernel/validate-capability-admission.mjs','scripts/kernel/validate-demo-runtime-registration.mjs','scripts/persistence/validate-demo-physical-admission.mjs','scripts/kernel/validate-demo-recipes-registration.mjs','scripts/persistence/validate-demo-recipes-physical-admission.mjs','scripts/kernel/validate-demo-kitchen-registration.mjs'];
const AUDIT_RUNNER_TEST = 'scripts/tests/validate-whole-audit-runner.test.mjs';
test('all 24 baseline obligations retain their identities, argv, discovery and bounds', () => {
  const predecessor=JSON.parse(kitchenPredecessor('verification/whole-repository/self-audit-plan.json'));
  for (const old of BASELINE_STAGES) {
    const stage = expectedPlan.stages.find(x => x.id === old.id);
    assert.ok(stage, old.id);
    const expected = structuredClone(old);
    if (old.id === 'audit-regressions') expected.args.push('scripts/tests/validate-ci-consolidation.test.mjs', 'scripts/tests/validate-demo-physical-successor.mjs', 'scripts/tests/validate-replay-database-cleanup.test.mjs');
    if(old.id.startsWith('validator-shard-'))expected.args[1]=expected.args[1].replace('/3','/14');
    assert.deepEqual(predecessor.stages.find(x=>x.id===old.id),expected,`preserved ${old.id}`);
    if(old.id==='audit-regressions')expected.args.push(AUDIT_RUNNER_TEST);
    assert.deepEqual(stage, expected, old.id);
  }
  assert.equal(predecessor.stages.length, 48);
  assert.equal(new Set(predecessor.stages.map(x => x.id)).size, 48);
  assert.equal(expectedPlan.stages.length, 52);
  assert.equal(new Set(expectedPlan.stages.map(x => x.id)).size, 52);
  assert.deepEqual(expectedPlan.stages.map(x=>x.id).sort(),[...predecessor.stages.map(x=>x.id),...KITCHEN_STAGES.map(([id])=>id),...STORAGE_STAGES.map(([id])=>id)].sort());
  assert.deepEqual(JSON.parse(read('verification/whole-repository/self-audit-plan.json')), expectedPlan);
  assert.equal(expectedPlan.shell_execution, false);
  assert.equal(expectedPlan.max_operation_ms, 25000);
});
for (const [id, command, args] of currentAdditions) test(`unique obligation ${id} has its own bounded executable stage`, () => {
  const stage = expectedPlan.stages.find(x => x.id === id);
  assert.ok(stage, id);
  assert.equal(stage.command, command);
  assert.deepEqual(stage.args, args);
  assert.equal(stage.timeout_ms, 25000);
  if(id==='demo-source-tests')assert.deepEqual(JSON.parse(kitchenPredecessor('verification/whole-repository/self-audit-plan.json')).stages.find(x=>x.id===id).args,additions.find(([name])=>name===id)[2]);
  if (id === 'document-governance') assert.equal(stage.dynamic_input, 'source-bound-event-document-base');
});
function enumerateCases(source) {
  const start = source.indexOf('// Semantic kernel:');
  const end = source.indexOf('// Report', start);
  assert.ok(start > 0 && end > start, 'known declaration-only inventory boundaries');
  const cases = [];
  // Register names/expectations only. Never invoke a fixture mutator or validator.
  runInNewContext(source.slice(start, end), {
    test: (name, script, _mutate, expect) => cases.push({ name, script, positive: expect.pass === true, ...(expect.pattern ? { pattern: expect.pattern.source } : {}) }),
  }, { timeout: 2000 });
  return cases;
}
// Frozen original capability registration a94f7a05dcdf72d8623525ea73725ed76a1edbb9
// replaces one historical candidate-only denial with exact-package provenance
// denial. The old BASELINE_CASES record remains unchanged as historical evidence.
// No other original expected outcome is relaxed; four reviewed cases are added.
const admittedCaseTransition = {
  before: { name: 'closure: excluded capability cannot become approved', script: 'scripts/persistence/validate-persistence-semantic-closure-registration.mjs', positive: false, pattern: 'excluded CapabilityId must remain candidate' },
  after: { name: 'closure: later capability approval requires precise provenance', script: 'scripts/persistence/validate-persistence-semantic-closure-registration.mjs', positive: false, pattern: 'later CapabilityId requires exact name\\/type admission' },
};
const admittedCases = [
  { name: 'sem36: all-registry in-memory closure regressions pass', script: 'scripts/tests/validate-semantic-dependency-closure.mjs', positive: true },
  { name: 'capability admission: exact owner-approved package and adversarial cases pass', script: 'scripts/tests/validate-capability-admission.mjs', positive: true },
  { name: 'capability admission: forged owner approval fails', script: 'scripts/kernel/validate-capability-admission.mjs', positive: false, pattern: 'exact recorded owner approval' },
  { name: 'capability admission: unrelated promotion fails', script: 'scripts/kernel/validate-capability-admission.mjs', positive: false, pattern: 'exact approved overlay' },
];
// Exact finite successor diagnostics: a changed approved artifact is rejected
// by its source-bound hash before the historical semantic checker is reached.
// Original baseline declarations and all220case identities remain preserved.
const demoCaseTransitions = [
  {
    "name": "sem36: approved event with null evidence fails",
    "script": "scripts/kernel/validate-semantic-kernel.mjs",
    "positive": false,
    "pattern": "sem35_evidence|demo registration: exact approved overlay \\/ unrelated entries changed: kernel\\/events\\.json"
  },
  {
    "name": "kernel: command missing definition fails",
    "script": "scripts/kernel/validate-semantic-kernel.mjs",
    "positive": false,
    "pattern": "missing definition|demo registration: exact approved overlay \\/ unrelated entries changed: kernel\\/commands\\.json"
  },
  {
    "name": "kernel: duplicate command id fails",
    "script": "scripts/kernel/validate-semantic-kernel.mjs",
    "positive": false,
    "pattern": "duplicate id|demo registration: exact approved overlay \\/ unrelated entries changed: kernel\\/commands\\.json"
  },
  {
    "name": "kernel: invalid status fails",
    "script": "scripts/kernel/validate-semantic-kernel.mjs",
    "positive": false,
    "pattern": "invalid status|demo registration: exact approved overlay \\/ unrelated entries changed: kernel\\/events\\.json"
  },
  {
    "name": "kernel: wrong manifest version fails",
    "script": "scripts/kernel/validate-semantic-kernel.mjs",
    "positive": false,
    "pattern": "version must be|demo registration: exact metadata ancestry differs: kernel\\/manifest\\.json"
  },
  {
    "name": "ownership: K00 concept missing from map fails",
    "script": "scripts/domains/validate-domain-ownership.mjs",
    "positive": false,
    "pattern": "missing current K00 concept|demo registration: exact approved overlay \\/ unrelated entries changed: kernel\\/commands\\.json"
  },
  {
    "name": "ownership: bad owner domain fails",
    "script": "scripts/domains/validate-domain-ownership.mjs",
    "positive": false,
    "pattern": "not a registered domain|demo registration: exact metadata ancestry differs: domains\\/ownership-map\\.json"
  },
  {
    "name": "command-event discovery: stale live pin fails",
    "script": "scripts/domains/validate-command-event-discovery.mjs",
    "positive": false,
    "pattern": "expected K00|demo registration: exact metadata ancestry differs: kernel\\/manifest\\.json"
  },
  {
    "name": "admission: authority criterion omission fails closed",
    "script": "scripts/persistence/validate-slice-p05-schema-admission.mjs",
    "positive": false,
    "pattern": "Persistence Model must define the exact eight distinct|demo registration: registered authority file differs: persistence\\/authority\\.json"
  },
  {
    "name": "closure: later approval without provenance fails",
    "script": "scripts/persistence/validate-persistence-semantic-closure-registration.mjs",
    "positive": false,
    "pattern": "later AssignmentId approval requires issue #46|demo registration: exact approved overlay \\/ unrelated entries changed: kernel\\/identifiers\\.json"
  },
  {
    "name": "closure: later capability approval requires precise provenance",
    "script": "scripts/persistence/validate-persistence-semantic-closure-registration.mjs",
    "positive": false,
    "pattern": "later CapabilityId requires exact name\\/type admission|demo registration: exact approved overlay \\/ unrelated entries changed: kernel\\/identifiers\\.json"
  },
  {
    "name": "owner policy: existing audit deletion guard cannot weaken",
    "script": "scripts/verification/validate-owner-policy-registration.mjs",
    "positive": false,
    "pattern": "existing requirement meaning|demo registration: registered authority file differs: contracts\\/c23-audit-lifecycle-events-contract\\.md"
  },
  {
    "name": "owner policy: malformed revision change-log header fails",
    "script": "scripts/verification/validate-owner-policy-registration.mjs",
    "positive": false,
    "pattern": "complete revision change-log table|demo registration: registered authority file differs: contracts\\/c23-audit-lifecycle-events-contract\\.md"
  },
  {
    "name": "capability admission: forged owner approval fails",
    "script": "scripts/kernel/validate-capability-admission.mjs",
    "positive": false,
    "pattern": "exact recorded owner approval|demo registration: unchanged preceding source drift: domains\\/capabilities\\/owner-approval\\.json"
  }
];
const withDemoDiagnostic = row => demoCaseTransitions.find(item=>item.name===row.name) ?? row;
test('all baseline case guarantees retain exact finite successor diagnostics', () => {
  const cases = enumerateCases(read('scripts/tests/validate-validators.mjs'));
  assert.equal(new Set(cases.map(x => x.name)).size, cases.length, 'no duplicate case names');
  assert.deepEqual(BASELINE_CASES.find(x => x.name === admittedCaseTransition.before.name), admittedCaseTransition.before, 'historical denial remains frozen');
  for (const baseline of BASELINE_CASES) {
    const expected = withDemoDiagnostic(baseline.name === admittedCaseTransition.before.name ? admittedCaseTransition.after : baseline);
    assert.deepEqual(cases.find(x => x.name === expected.name), expected, expected.name);
  }
});
test('complete 220-case catalog includes exactly the four approved checker and admission additions', () => {
  const cases = enumerateCases(read('scripts/tests/validate-validators.mjs'));
  const expected = [...BASELINE_CASES.map(row => row.name === admittedCaseTransition.before.name ? admittedCaseTransition.after : row), ...admittedCases].map(withDemoDiagnostic);
  assert.equal(demoCaseTransitions.length,14);
  assert.equal(new Set(demoCaseTransitions.map(row=>row.name)).size,14);
  for(const row of demoCaseTransitions)assert.equal(row.positive,false);
  const byName = (a, b) => a.name.localeCompare(b.name);
  assert.equal(expected.length, 220);
  assert.deepEqual(cases.sort(byName), expected.sort(byName));
});
test('all 53 baseline validators remain in the live umbrella discovery domain', () => {
  const live = [];
  for (const dir of readdirSync(join(ROOT, 'scripts'), { withFileTypes: true })) {
    if (!dir.isDirectory() || ['tests', 'packaging', 'release'].includes(dir.name)) continue;
    for (const file of readdirSync(join(ROOT, 'scripts', dir.name))) {
      const path = `scripts/${dir.name}/${file}`;
      if (/^(?:validate|audit)-.*\.mjs$/.test(file) && path !== 'scripts/architecture/validate-whole-repository.mjs') live.push(path);
    }
  }
  assert.equal(BASELINE_VALIDATORS.length, 53);
  for (const path of BASELINE_VALIDATORS) assert.ok(live.includes(path), path);
  assert.equal(CURRENT_VALIDATORS.length,59);
  assert.deepEqual(live.sort(), CURRENT_VALIDATORS.slice().sort());
});
test('all 13 foundation files and seven PostgreSQL suite bodies retain actual assertions', () => {
  const foundation = Object.keys(UNCHANGED_PROOF_FILES).filter(path => path.startsWith('src/modules/'));
  assert.equal(foundation.length, 13);
  for (const path of foundation) assert.ok(discoverFoundationTests(ROOT).includes(path), path);
  for (const [path, digest] of Object.entries(UNCHANGED_PROOF_FILES)) assert.equal(hash(preservedProofBytes(ROOT, path)), digest, path);
  const scripts = JSON.parse(read('package.json')).scripts;
  for (const [name, command] of Object.entries(BASELINE_COMMANDS)) assert.equal(name==='test:p05:integration'&&scripts[name]==='node --import tsx scripts/db/run-p05-prefix-integration.ts'?'node --import tsx --test tests/integration/learning/learning-session-repository.test.ts':scripts[name], command, name);
});

function auditEvidence() {
  const source = { source_sha: 'a'.repeat(40), tree_sha: 'b'.repeat(40), working_digest: hash(''), stamp: hash('source'), dirty: false };
  const context = localDocumentGovernanceContext(source.source_sha, 'c'.repeat(40));
  const tests = ['src/modules/example/domain/a.test.ts'];
  const planHash = hash('plan');
  const reports = expectedPlan.stages.map(stage => ({
    kind: 'development-stage-evidence', stage: stage.id, state: 'PROVEN', source: structuredClone(source), source_unchanged: true, plan_sha256: planHash,
    command: [stage.command, ...(stage.dynamic_input ? documentGovernanceArgs(context) : stage.args), ...(stage.discover_tests ? tests : [])],
    ...(stage.dynamic_input ? { input_context: structuredClone(context), input_context_error: null } : {}),
    runtime: { node: 'v20.20.2', platform: 'linux' }, started_at: '2026-10-17T12:00:00.000Z', finished_at: '2026-10-17T12:00:00.010Z', duration_ms: 10,
    exit_code: 0, timed_out: false, execution_error: null, stdout_sha256: hash('out'), stderr_sha256: hash(''),
    ...(stage.id.startsWith('validator-shard-') ? { validator_shard: { inventory: 220, index: Number(stage.id.split('-').at(-1)), total: 14, selected: validatorPartitionOrdinals(Number(stage.id.split('-').at(-1))).length, digest: '36faf791bb97dd1a99c2c985316d2ee1f123c00be3c1b525db4a040876a2a923' } } : {}),
    full_runtime_conformance: 'UNKNOWN', runtime_activation: 'BLOCKED', shared_or_production_execution_authorized: false,
  }));
  return { source, context, tests, planHash, reports };
}
const evaluate = f => evaluateAuditReports(expectedPlan, f.reports, f.source, f.planHash, f.tests, f.context);
test('complete 52-stage source-bound evidence reconciles', () => assert.deepEqual(evaluate(auditEvidence()), []));
for (const [id] of currentAdditions) {
  for (const state of ['missing', 'BLOCKED', 'UNKNOWN', 'SKIPPED']) test(`${id} ${state} cannot disappear into a green aggregate`, () => {
    const f = auditEvidence();
    if (state === 'missing') f.reports = f.reports.filter(x => x.stage !== id);
    else f.reports.find(x => x.stage === id).state = state;
    assert.ok(evaluate(f).length);
  });
}
for (const [label, mutate] of [
  ['retained context error contradicts success', f => { f.reports.find(x => x.stage === 'document-governance').input_context_error = 'event JSON was deleted'; }],
  ['absent expected document context', f => { f.context = undefined; }],
  ['absent captured document context', f => { delete f.reports.find(x => x.stage === 'document-governance').input_context; }],
  ['different document base at reconciliation', f => { f.context.base_sha = 'd'.repeat(40); }],
  ['document base argv tampering', f => { f.reports.find(x => x.stage === 'document-governance').command[3] = 'd'.repeat(40); }],
  ['omitted document comparison argv', f => { f.reports.find(x => x.stage === 'document-governance').command.length = 2; }],
  ['extra shell payload', f => { f.reports.find(x => x.stage === 'document-governance').command.push('; touch injected'); }],
  ['different source SHA', f => { f.reports[0].source.source_sha = 'e'.repeat(40); }],
  ['different tree', f => { f.reports[0].source.tree_sha = 'e'.repeat(40); }],
  ['different source stamp', f => { f.reports[0].source.stamp = hash('old'); }],
  ['different plan', f => { f.reports[0].plan_sha256 = hash('old'); }],
  ['duplicate stage', f => { f.reports[0] = structuredClone(f.reports[1]); }],
  ['failed unique replay', f => { f.reports.find(x => x.stage === 'replay-p01').exit_code = 1; }],
  ['timed out unique replay', f => { f.reports.find(x => x.stage === 'replay-p02').timed_out = true; }],
  ['truncated foundation inventory', f => { f.reports.find(x => x.stage === 'foundation').command.pop(); }],
  ['missing validator case', f => { f.reports.find(x => x.stage === 'validator-shard-3').validator_shard.selected--; }],
  ['different validator inventory', f => { f.reports.find(x => x.stage === 'validator-shard-2').validator_shard.digest = hash('drift'); }],
]) test(`reconciliation rejects ${label}`, () => { const f = auditEvidence(); mutate(f); assert.ok(evaluate(f).length); });
for (const id of expectedPlan.stages.map(x => x.id)) test(`plan cannot erase ${id}`, () => {
  const altered = structuredClone(expectedPlan); altered.stages = altered.stages.filter(x => x.id !== id); assert.ok(inspectAuditPlan(altered).length);
});

function gitFixture({ realValidator = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'teach-ci-consolidation-'));
  const write = (path, text) => { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), text); };
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  write('.gitignore', 'verification/generated/\n');
  write('verification/whole-repository/self-audit-plan.json', JSON.stringify(expectedPlan, null, 2) + '\n');
  write('src/modules/example/domain/a.test.ts', '// fixture inventory\n');
  if (realValidator) for (const path of ['scripts/kernel/demo-kitchen-registration.mjs','scripts/verification/demo-kitchen-engineering.mjs','scripts/kernel/demo-recovery-registration.mjs','scripts/kernel/demo-schema-isolation-registration.mjs','scripts/kernel/demo-recipes-registration.mjs','scripts/kernel/demo-runtime-registration.mjs','scripts/kernel/semantic-dependency-closure.mjs','scripts/kernel/demo-physical-successor.mjs','scripts/persistence/demo-admission-evidence.mjs','scripts/persistence/admission-criteria.mjs']) write(path, read(path));
  write('scripts/docs/validate-document-metadata.mjs', realValidator ? read('scripts/docs/validate-document-metadata.mjs') : `import {readFileSync,writeFileSync,existsSync} from 'node:fs';\nconst p='verification/generated/control.json';const c=existsSync(p)?JSON.parse(readFileSync(p)):{};writeFileSync('verification/generated/argv.json',JSON.stringify({argv:process.argv.slice(2),legacyBase:process.env.DOC_GOV_BASE_REF??null}));if(c.corrupt_event)writeFileSync(c.corrupt_event,'{invalid');process.exit(c.exit??0);\n`);
  const metadata = { doc_id: 'FIXTURE-001', class: 'governance-policy', version: '1.0.0', status: 'draft', owner: 'VerificationEvidence', created_on: '2026-10-01', updated_on: '2026-10-10' };
  const document = (meta = metadata, body = 'original') => '<!--tos-doc\n' + JSON.stringify(meta) + '\n-->\n' + body + '\n';
  write('governance/fixture.md', document());
  git(['init']); git(['config', 'user.name', 'Consolidation Regression']); git(['config', 'user.email', 'fixture@example.invalid']); git(['add', '.']); git(['commit', '-m', 'base']);
  const base = git(['rev-parse', 'HEAD']);
  write('marker', 'candidate\n'); git(['add', '.']); git(['commit', '-m', 'candidate']);
  const source = git(['rev-parse', 'HEAD']);
  mkdirSync(join(root, 'verification/generated'), { recursive: true });
  return { root, write, git, base, source, metadata, document, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
const history = gitFixture();
after(() => history.cleanup());
function eventEnv(eventName = 'pull_request', change = () => {}) {
  const event = { repository: { full_name: 'peteywee/teach-v2' }, pull_request: { base: { sha: history.base }, head: { sha: history.source } }, before: history.base, after: history.source };
  change(event);
  const path = join(history.root, 'verification/generated/event.json');
  writeFileSync(path, JSON.stringify(event));
  return { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: eventName, GITHUB_EVENT_PATH: path, GITHUB_REPOSITORY: 'peteywee/teach-v2', GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '2', GITHUB_SHA: history.source, AUDIT_EXPECTED_SHA: history.source };
}
for (const eventName of ['pull_request', 'push', 'workflow_dispatch']) test(`actual ${eventName} event binds source, raw payload, run and comparison base`, () => {
  const env = eventEnv(eventName), context = resolveDocumentGovernanceContext(history.root, { env });
  assert.equal(context.event_name, eventName); assert.equal(context.source_sha, history.source); assert.equal(context.event_sha256, hash(readFileSync(env.GITHUB_EVENT_PATH)));
  assert.equal(context.run_id, '100'); assert.equal(context.run_attempt, '2'); assert.equal(context.repository, 'peteywee/teach-v2');
  assert.equal(context.base_sha, eventName === 'workflow_dispatch' ? null : history.base);
  assert.deepEqual(documentGovernanceArgs(context), ['scripts/docs/validate-document-metadata.mjs', ...(context.base_sha ? ['--base', history.base] : [])]);
});
for (const [name, eventName, change, changeEnv] of [
  ['missing PR base', 'pull_request', e => { delete e.pull_request.base; }],
  ['zero PR base', 'pull_request', e => { e.pull_request.base.sha = '0'.repeat(40); }],
  ['missing push before', 'push', e => { delete e.before; }],
  ['wrong PR source', 'pull_request', e => { e.pull_request.head.sha = history.base; }],
  ['wrong push source', 'push', e => { e.after = history.base; }],
  ['wrong repository', 'push', e => { e.repository.full_name = 'attacker/other'; }],
  ['missing event path', 'push', () => {}, e => { delete e.GITHUB_EVENT_PATH; }],
  ['unreadable event path', 'push', () => {}, e => { e.GITHUB_EVENT_PATH += '.absent'; }],
  ['local override in CI', 'push', () => {}, e => { e.AUDIT_DOCUMENT_BASE_SHA = history.base; }],
  ['wrong expected source', 'push', () => {}, e => { e.AUDIT_EXPECTED_SHA = history.base; }],
  ['wrong action source', 'push', () => {}, e => { e.GITHUB_SHA = history.base; }],
  ['missing run ID', 'push', () => {}, e => { delete e.GITHUB_RUN_ID; }],
  ['non-numeric attempt', 'push', () => {}, e => { e.GITHUB_RUN_ATTEMPT = '2;exit 0'; }],
  ['unsupported privileged event', 'pull_request_target', () => {}],
  ['unavailable base object', 'push', e => { e.before = 'f'.repeat(40); }],
  ['shell-looking base', 'push', e => { e.before = `${history.base}; touch injected`; }],
  ['abbreviated base', 'push', e => { e.before = history.base.slice(0, 7); }],
  ['uppercase base', 'push', e => { e.before = history.base.toUpperCase(); }],
]) test(`document resolver fails closed for ${name}`, () => {
  const env = eventEnv(eventName, change); changeEnv?.(env); assert.throws(() => resolveDocumentGovernanceContext(history.root, { env }));
});
test('initial push uses an explicit ZERO_BASE fallback, not a hidden comparison', () => {
  const env = eventEnv('push', e => { e.before = '0'.repeat(40); });
  const context = resolveDocumentGovernanceContext(history.root, { env });
  assert.equal(context.base_policy, 'ZERO_BASE'); assert.equal(context.base_sha, null); assert.equal(documentGovernanceArgs(context).length, 1);
});
test('no-event local context explicitly binds HEAD and optional exact base', () => {
  assert.deepEqual(resolveDocumentGovernanceContext(history.root, { env: {} }), localDocumentGovernanceContext(history.source));
  assert.deepEqual(resolveDocumentGovernanceContext(history.root, { env: { AUDIT_DOCUMENT_BASE_SHA: history.base } }), localDocumentGovernanceContext(history.source, history.base));
});
for (const [label, mutate] of [
  ['omitted context field', c => { delete c.event_sha256; }],
  ['unexpected context authority', c => { c.runtime_activation = 'ENABLED'; }],
  ['wrong source binding', c => { c.source_sha = history.base; }],
  ['no-base PR downgrade', c => { c.base_policy = 'NO_EVENT_BASE'; c.base_sha = null; }],
  ['zero-base PR downgrade', c => { c.base_policy = 'ZERO_BASE'; c.base_sha = null; }],
  ['invalid event digest', c => { c.event_sha256 = 'unknown'; }],
  ['missing run provenance', c => { c.run_id = null; }],
]) test(`context validator rejects ${label}`, () => {
  const c = resolveDocumentGovernanceContext(history.root, { env: eventEnv() }); mutate(c); assert.ok(inspectDocumentGovernanceContext(c, history.source).length);
});
test('real bounded document child retains exact argv and source-bound event evidence', () => {
  history.write('verification/generated/control.json', '{}');
  const env = eventEnv(), expected = resolveDocumentGovernanceContext(history.root, { env });
  const { report } = runAuditStage(history.root, 'document-governance', { expectedSha: history.source, env });
  assert.equal(report.state, 'PROVEN'); assert.deepEqual(report.input_context, expected);
  assert.deepEqual(JSON.parse(readFileSync(join(history.root, 'verification/generated/argv.json'))).argv, ['--base', history.base]);
  assert.deepEqual(sourceIdentity(history.root).source_sha, history.source);
});
test('legacy document-base environment cannot silently change a no-base dispatch command', () => {
  const original = process.env.DOC_GOV_BASE_REF; process.env.DOC_GOV_BASE_REF = history.base;
  try {
    const { report } = runAuditStage(history.root, 'document-governance', { expectedSha: history.source, env: eventEnv('workflow_dispatch') });
    assert.equal(report.state, 'PROVEN');
    assert.ok([null, ''].includes(JSON.parse(readFileSync(join(history.root, 'verification/generated/argv.json'))).legacyBase));
  } finally { if (original === undefined) delete process.env.DOC_GOV_BASE_REF; else process.env.DOC_GOV_BASE_REF = original; }
});
test('real failed document child retains a blocked checkpoint', () => {
  history.write('verification/generated/control.json', JSON.stringify({ exit: 42 }));
  try {
    const { report } = runAuditStage(history.root, 'document-governance', { expectedSha: history.source, env: eventEnv() });
    assert.equal(report.state, 'BLOCKED'); assert.equal(report.exit_code, 42);
    assert.equal(JSON.parse(readFileSync(join(history.root, 'verification/generated/self-audit/document-governance.json'))).exit_code, 42);
  } finally { history.write('verification/generated/control.json', '{}'); }
});
test('post-execution event corruption retains failure evidence instead of dropping the attempt', () => {
  const env = eventEnv(); history.write('verification/generated/control.json', JSON.stringify({ corrupt_event: env.GITHUB_EVENT_PATH }));
  try {
    const { report } = runAuditStage(history.root, 'document-governance', { expectedSha: history.source, env });
    assert.equal(report.state, 'BLOCKED'); assert.equal(report.source_unchanged, false);
    assert.equal(JSON.parse(readFileSync(join(history.root, 'verification/generated/self-audit/document-governance.json'))).state, 'BLOCKED');
  } finally { history.write('verification/generated/control.json', '{}'); }
});
for (const [label, mutate, pattern] of [
  ['changed body without a version increase', m => m, /changed without version increase/],
  ['changed stable document ID', m => ({ ...m, version: '1.0.1', doc_id: 'OTHER-001' }), /doc_id changed/],
  ['changed creation date', m => ({ ...m, version: '1.0.1', created_on: '2026-10-02' }), /created_on changed/],
  ['backward update date', m => ({ ...m, version: '1.0.1', updated_on: '2026-10-09' }), /updated_on moved backward/],
]) test(`real document comparison rejects ${label}`, () => {
  const f = gitFixture({ realValidator: true });
  try {
    f.write('governance/fixture.md', f.document(mutate(f.metadata), 'changed'));
    f.git(['add', '.']); f.git(['commit', '-m', 'changed governed document']);
    const { report, stderr } = runAuditStage(f.root, 'document-governance', { expectedSha: f.git(['rev-parse', 'HEAD']), env: { AUDIT_DOCUMENT_BASE_SHA: f.base } });
    assert.equal(report.state, 'BLOCKED'); assert.match(stderr, pattern);
  } finally { f.cleanup(); }
});
test('real document comparison accepts an increased version with stable identity and dates', () => {
  const f = gitFixture({ realValidator: true });
  try {
    f.write('governance/fixture.md', f.document({ ...f.metadata, version: '1.0.1', updated_on: '2026-10-11' }, 'changed'));
    f.git(['add', '.']); f.git(['commit', '-m', 'versioned change']);
    assert.equal(runAuditStage(f.root, 'document-governance', { expectedSha: f.git(['rev-parse', 'HEAD']), env: { AUDIT_DOCUMENT_BASE_SHA: f.base } }).report.state, 'PROVEN');
  } finally { f.cleanup(); }
});

const structuralRoot = mkdtempSync(join(tmpdir(), 'teach-consolidation-wiring-'));
cpSync(ROOT, structuralRoot, { recursive: true, filter: src => !/(^|\/)\.git(?:\/|$)/.test(src) && !/(^|\/)node_modules(?:\/|$)/.test(src) && !src.includes('/verification/generated/') });
after(() => rmSync(structuralRoot, { recursive: true, force: true }));
function mutatedWorkflow(path, change, check) {
  const file = join(structuralRoot, path), original = readFileSync(file, 'utf8');
  const inventoryPath = join(structuralRoot, 'verification/workflow-lifecycle/inventory.json');
  const inventoryText = readFileSync(inventoryPath, 'utf8');
  const changed = change(original); assert.notEqual(changed, original, 'mutation must actually modify the fixture');
  try {
    writeFileSync(file, changed);
    try { writeFileSync(inventoryPath, JSON.stringify(deriveWorkflowInventory(structuralRoot), null, 2) + '\n'); } catch { /* Rejected syntax cannot be blessed by a generated inventory. */ }
    check(changed);
  } finally { writeFileSync(file, original); writeFileSync(inventoryPath, inventoryText); }
}
test('live two-workflow inventory matches regenerated files, with exactly one independent observer', () => {
  const live = deriveWorkflowInventory(ROOT);
  assert.deepEqual(live, JSON.parse(read('verification/workflow-lifecycle/inventory.json')));
  assert.equal(live.ci_workflows, 2); assert.equal(live.ci_jobs, 2);
  assert.deepEqual(live.ci.filter(x => x.kind === 'VERIFICATION_PRODUCER').map(x => x.workflow_path), [PRODUCER]);
  assert.deepEqual(live.closure_observer.observed_workflows, ['Development Self Audit']);
  assert.equal(live.closure_observer.recursive_observation, false);
  const observer = live.ci.find(x => x.workflow_path === closureObserverPath);
  assert.equal(observer.kind, 'CLOSURE_OBSERVER'); assert.equal(observer.source_policy, 'TRUSTED_DEFAULT_BRANCH_SHA');
  assert.equal(observer.closure_mode, 'INDEPENDENT_TERMINAL_READBACK_REQUIRED');
  assert.equal(observer.shared_or_production_execution_authorized, false);
  assert.deepEqual(inspectClosureObserverText(read(closureObserverPath), ['Development Self Audit']), []);
  assert.deepEqual(inspectConsolidatedVerification(ROOT), []);
  assert.deepEqual(inspectDevelopmentSelfAudit(ROOT), []);
  assert.deepEqual(inspectWorkflowLifecycles(ROOT), []);
});
const producerMutations = {
  'unique stage runtime environment override': t => t.replace('        id: audit_replay_p01\n', '        id: audit_replay_p01\n        env:\n          NODE_OPTIONS: --require /tmp/skip-verification.cjs\n'),
  'unique stage document context override': t => t.replace('        id: audit_document_governance\n', '        id: audit_document_governance\n        env:\n          GITHUB_ACTIONS: false\n          GITHUB_EVENT_NAME: local\n'),
  'no-op shell on unique replay': t => t.replace('        id: audit_replay_p01\n', '        id: audit_replay_p01\n        shell: true {0}\n'),
  'no-op shell on finalizer': t => t.replace('        id: audit_finalize\n', '        id: audit_finalize\n        shell: true {0}\n'),
  'workflow default no-op shell': t => t.replace('jobs:\n', 'defaults:\n  run:\n    shell: true {0}\njobs:\n'),
  'job default no-op shell': t => t.replace('    runs-on:', '    defaults:\n      run:\n        shell: true {0}\n    runs-on:'),
  'unique stage directory override': t => t.replace('        id: audit_replay_p01\n', '        id: audit_replay_p01\n        working-directory: /tmp/other\n'),
  'workflow default directory override': t => t.replace('jobs:\n', 'defaults:\n  run:\n    working-directory: /tmp/other\njobs:\n'),
  'job default directory override': t => t.replace('    runs-on:', '    defaults:\n      run:\n        working-directory: /tmp/other\n    runs-on:'),
  'PR main-only branch narrowing': t => t.replace('  pull_request:\n', '  pull_request:\n    branches: [main]\n'),
  'PR path filter': t => t.replace('  pull_request:\n', "  pull_request:\n    paths: ['src/**']\n"),
  'PR ignored-path filter': t => t.replace('  pull_request:\n', "  pull_request:\n    paths-ignore: ['governance/**']\n"),
  'missing manual dispatch': t => t.replace('  workflow_dispatch:\n', ''),
  'missing main push': t => t.replace('  push:\n    branches: [main]\n', ''),
  'privileged PR-target event': t => t.replace('  pull_request:\n', '  pull_request_target:\n'),
  'extra schedule event': t => t.replace('  workflow_dispatch:\n', "  workflow_dispatch:\n  schedule:\n    - cron: '* * * * *'\n"),
  'duplicate trigger block': t => t + 'on: workflow_dispatch\n',
  'shallow document history': t => t.replace('fetch-depth: 0', 'fetch-depth: 1'),
  'absent full-history declaration': t => t.replace('          fetch-depth: 0\n', ''),
  'duplicate history override': t => t.replace('fetch-depth: 0', 'fetch-depth: 0\n          fetch-depth: 1'),
  'skipped required job': t => t.replace('    runs-on:', '    if: false\n    runs-on:'),
  'skipped unique document stage': t => t.replace('        id: audit_document_governance\n', '        id: audit_document_governance\n        if: false\n'),
  'silently tolerated replay failure': t => t.replace('        id: audit_replay_p01\n', '        id: audit_replay_p01\n        continue-on-error: true\n'),
  'masked unique replay exit': t => t.replace('--stage replay-p02\n', '--stage replay-p02 || true\n'),
  'omitted unique release check': t => t.replace('--stage production-contract-decisions\n', '--stage pins\n'),
  'wrong stage order': t => t.replace('--stage replay-p03\n', '--stage replay-TEMP\n').replace('--stage replay-p04\n', '--stage replay-p03\n').replace('--stage replay-TEMP\n', '--stage replay-p04\n'),
  'matrix without supported model': t => t.replace('    runs-on:', '    strategy:\n      matrix:\n        node: [20]\n    runs-on:'),
  'reusable workflow trigger': t => t.replace('  workflow_dispatch:\n', '  workflow_dispatch:\n  workflow_call:\n'),
  'top-level write permissions': t => t.replace('  contents: read', '  contents: write'),
  'actions permission expansion': t => t.replace('  contents: read', '  contents: read\n  actions: write'),
  'job-level permission override': t => t.replace('    runs-on:', '    permissions: write-all\n    runs-on:'),
  'OIDC permission expansion': t => t.replace('  contents: read', '  contents: read\n  id-token: write'),
  'persisted checkout credentials': t => t.replace('persist-credentials: false', 'persist-credentials: true'),
  'alternate repository checkout': t => t.replace('          persist-credentials:', '          repository: attacker/other\n          persist-credentials:'),
  'mutable source checkout': t => t.replace('ref: ${{ github.event.pull_request.head.sha || github.sha }}', 'ref: main'),
  'success-only audit finalization': t => t.replace('id: audit_finalize\n        if: always()', 'id: audit_finalize\n        if: success()'),
  'success-only audit artifact': t => t.replace('id: audit_upload\n        if: always()', 'id: audit_upload\n        if: success()'),
  'silent missing audit bundle': t => t.replace('path: verification/generated/self-audit/\n          if-no-files-found: error', 'path: verification/generated/self-audit/\n          if-no-files-found: ignore'),
  'success-only lifecycle checkpoint': t => t.replace('id: lifecycle_record\n        if: always()', 'id: lifecycle_record\n        if: success()'),
  'success-only lifecycle artifact': t => t.replace('id: lifecycle_upload\n        if: always()', 'id: lifecycle_upload\n        if: success()'),
  'silent missing lifecycle artifact': t => t.replace('path: verification/generated/workflow-lifecycle/report.json\n          if-no-files-found: error', 'path: verification/generated/workflow-lifecycle/report.json\n          if-no-files-found: ignore'),
  'unbounded job': t => t.replace('timeout-minutes: 15', 'timeout-minutes: 360'),
  'substring-spoofed job deadline': t => t.replace('timeout-minutes: 15', 'timeout-minutes: 150'),
};
for (const [name, mutation] of Object.entries(producerMutations)) test(`structural validator rejects ${name} even after inventory regeneration`, () => {
  mutatedWorkflow(PRODUCER, mutation, () => assert.ok(inspectConsolidatedVerification(structuralRoot).length, name));
});
const observerMutations = {
  'untrusted producer source checkout': t => t.replace('ref: ${{ github.sha }}', 'ref: ${{ github.event.workflow_run.head_sha }}'),
  'mutable observer checkout': t => t.replace('ref: ${{ github.sha }}', 'ref: main'),
  'producer list removal': t => t.replace('      - "Development Self Audit"\n', ''),
  'duplicate producer list': t => t.replace('      - "Development Self Audit"\n', '      - "Development Self Audit"\n      - "Development Self Audit"\n'),
  'self-observation recursion': t => t.replace('    types: [completed]', `      - "${closureObserverName}"\n    types: [completed]`),
  'success-only producer observation': t => t.replace("    if: ${{ github.event.workflow_run.head_branch == 'main' }}", "    if: ${{ github.event.workflow_run.conclusion == 'success' }}"),
  'write actions permission': t => t.replace('  actions: read', '  actions: write'),
  'persisted credential': t => t.replace('persist-credentials: false', 'persist-credentials: true'),
  'unbounded readback': t => t.replace('timeout --signal=TERM --kill-after=2s 25s ', ''),
  'unquoted readback identifier': t => t.replace('"$LIFECYCLE_RUN_ID"', '$LIFECYCLE_RUN_ID'),
  'success-only failure evidence': t => t.replace('if: always()', 'if: success()'),
  'ignored missing terminal evidence': t => t.replaceAll('if-no-files-found: error', 'if-no-files-found: ignore'),
};
for (const [name, mutation] of Object.entries(observerMutations)) test(`independent observer rejects ${name} after inventory regeneration`, () => {
  mutatedWorkflow(closureObserverPath, mutation, changed => {
    assert.ok(inspectClosureObserverText(changed, ['Development Self Audit']).length);
    assert.ok(inspectWorkflowLifecycles(structuralRoot).length);
  });
});

function lifecycleFixture() {
  const definition = inspectWorkflowText(PRODUCER, read(PRODUCER))[0];
  const source = { source_sha: 'a'.repeat(40), tree_sha: 'b'.repeat(40), dirty: false };
  const context = { repository: 'peteywee/teach-v2', run_id: 100, attempt: 1, event: 'push', job_id: definition.job_id, expected_sha: source.source_sha, workflow_source_sha: source.source_sha };
  const steps = Object.fromEntries(definition.required_steps.map(id => [id, { outcome: 'success', conclusion: 'success' }]));
  const input = { definition, context, source, steps, jobStatus: 'success', now: '2026-10-17T12:00:00.000Z' };
  const report = buildWorkflowReport(input);
  const receipt = { repository: context.repository, run_id: 100, attempt: 1, job_id: definition.job_id, event: 'push', workflow_path: PRODUCER, workflow_sha256: definition.workflow_sha256,
    workflow_source_sha: source.source_sha, workflow_source_verified: true, source_sha: source.source_sha, tree_sha: source.tree_sha,
    artifact_id: 200, artifact_sha256: hash('archive'), archive_sha256: hash('archive'), artifact_report_sha256: report.report_sha256, artifact_expired: false,
    upload_outcome: 'success', job_conclusion: 'success', run_conclusion: 'success', artifact_name: `workflow-lifecycle-100-1-${definition.job_id}`,
    observed_at: '2026-10-17T12:01:00.000Z', artifact_expires_at: '2026-11-17T12:01:00.000Z' };
  return { definition, input, report, receipt };
}
const close = f => closeWorkflowReport(f.report, f.receipt, { definition: f.definition });
test('real consolidated workflow cannot self-close without an independent valid receipt', () => {
  const f = lifecycleFixture(); assert.equal(f.report.state, 'AWAITING_RECEIPT');
  assert.equal(closeWorkflowReport(f.report, undefined, { definition: f.definition }).state, 'BLOCKED');
  assert.equal(close(f).state, 'CLOSED'); assert.equal(close(f).runtime_activation, 'BLOCKED');
});
for (const [field, value] of Object.entries({ source_sha: 'c'.repeat(40), tree_sha: 'c'.repeat(40), workflow_sha256: hash('wrong'), workflow_source_sha: 'c'.repeat(40), workflow_source_verified: false, run_id: 101, attempt: 2, job_id: 'other', artifact_id: 0, artifact_sha256: hash('wrong'), archive_sha256: hash('wrong'), artifact_report_sha256: hash('wrong'), artifact_expired: true, upload_outcome: 'failure', job_conclusion: 'failure', run_conclusion: 'failure', artifact_name: 'other', event: 'pull_request_target' })) test(`consolidated receipt rejects wrong ${field}`, () => {
  const f = lifecycleFixture(); f.receipt[field] = value; assert.equal(close(f).state, 'BLOCKED');
});
for (const [name, change] of [
  ['omitted unique stage outcome', r => { r.outcomes = r.outcomes.filter(x => x.id !== 'audit_replay_p01'); }],
  ['failed unique check rehashed to success', r => { r.outcomes.find(x => x.id === 'audit_document_governance').outcome = 'failure'; }],
  ['wrong captured job', r => { r.job_id = 'attacker'; }],
  ['changed stage order', r => { r.outcomes.reverse(); }],
  ['omitted stage from both inventories', r => { r.required_steps = r.required_steps.filter(x => x !== 'audit_replay_p04'); r.outcomes = r.outcomes.filter(x => x.id !== 'audit_replay_p04'); }],
]) test(`even rehashed consolidated checkpoint rejects ${name}`, () => {
  const f = lifecycleFixture(); change(f.report); f.report.report_sha256 = reportDigest(f.report); f.receipt.artifact_report_sha256 = f.report.report_sha256; assert.equal(close(f).state, 'BLOCKED');
});
for (const outcome of ['failure', 'cancelled', 'skipped']) test(`a ${outcome} attempt remains retained and requires a separate diagnosed recovery attempt`, () => {
  const f = lifecycleFixture(); f.input.steps.audit_document_governance = { outcome, conclusion: outcome }; f.report = buildWorkflowReport(f.input);
  assert.equal(close(f).state, 'BLOCKED');
  const next = planWorkflowRecovery(f.report, { definition: f.definition, effect: 'READ_ONLY_DEVELOPMENT_VERIFICATION', diagnosis: 'Retain evidence and repair cause before a new attempt.' });
  assert.equal(next.state, 'NEW_ATTEMPT_REQUIRED'); assert.equal(next.preserve_prior_evidence, true); assert.equal(next.next_attempt, 2); assert.equal(next.checkpoint_sha256, f.report.report_sha256);
});

for (const [field, value] of Object.entries({ event_name: 'push', source_sha: 'e'.repeat(40), base_policy: 'NO_EVENT_BASE', event_sha256: hash('different event'), repository: 'other/repo', run_id: '101', run_attempt: '3' })) test(`document report cannot reuse a receipt with different ${field}`, () => {
  const f = auditEvidence(); f.reports.find(x => x.stage === 'document-governance').input_context[field] = value; assert.ok(evaluate(f).length);
});
const COVERAGE = 'verification/whole-repository/ci-consolidation-coverage.json';
test('coverage manifest preserves all 44 original producer identities and 131 literal command steps', () => {
  const manifest = JSON.parse(read(COVERAGE));
  assert.equal(manifest.baseline.main_sha, 'fdb71287845ed024dabb83fb67b5a803fd55153d');
  assert.equal(manifest.baseline.tree, '3cfaa3d8f0ed2d778ec8e18bd75dc52fb45846c3');
  const baseline = manifest.producer_command_mapping.map(w => ({ workflow: w.workflow, name: w.name, steps: w.steps.map(s => ({ baseline_step_id: s.baseline_step_id, baseline_run: s.baseline_run })) }));
  assert.equal(hash(JSON.stringify(baseline)), '8406a3de9e42f7a72315acd0ca94b0369e0028c1e0f2f005b51b48b7313d94be', 'immutable baseline command/step coverage, not count alone');
  assert.deepEqual(manifest.retained_stage_ids, BASELINE_STAGES.map(x => x.id));
  assert.deepEqual(manifest.added_stage_ids, additions.filter(x=>!['demo-registration-entry-regressions','demo-registration-regressions','validator-shard-13','validator-shard-14','demo-source-tests','demo-generation','demo-postgres','demo-recipe-postgres','validator-shard-4','validator-shard-5','validator-shard-6','validator-shard-7','validator-shard-8','validator-shard-9','validator-shard-10','validator-shard-11','validator-shard-12'].includes(x[0])).map(x => x[0]));
  assert.deepEqual(manifest.baseline_umbrella_validators, BASELINE_VALIDATORS);
  for (const row of manifest.preserved_test_and_replay_files) assert.equal(hash(preservedProofBytes(ROOT, row.path)), row.sha256, row.path);
});
test('every old command has a real executable stage, validator, setup or complete test-inventory destination', () => {
  const manifest = JSON.parse(read(COVERAGE));
  const workflow = read(PRODUCER), parsed = inspectWorkflowText(PRODUCER, workflow)[0];
  const stages = new Map(expectedPlan.stages.map(stage => [stage.id, stage]));
  for (const wrapper of manifest.producer_command_mapping) for (const step of wrapper.steps) {
    assert.ok(step.coverage.length > 0, `${wrapper.workflow}/${step.baseline_step_id}`);
    for (const entry of step.coverage) {
      for (const id of entry.stages || []) assert.ok(stages.has(id), id);
      if (entry.kind === 'bounded_stage') {
        assert.equal(entry.stages.length, 1); const stage = stages.get(entry.stages[0]);
        const direct = [stage.command, ...stage.args].join(' '), wrapper = `node scripts/verification/run-self-audit.mjs --stage ${stage.id}`;
        const groupedNodeTest = entry.command.startsWith('node --test ') && stage.command === 'node' && stage.args[0] === '--test' && entry.command.slice(12).split(' ').every(path => stage.args.includes(path));
        assert.ok(entry.command === direct || entry.command === wrapper || groupedNodeTest, entry.command);
      } else if (entry.kind === 'umbrella_validator') {
        assert.deepEqual(entry.stages, ['authority']); assert.ok(BASELINE_VALIDATORS.includes(entry.validator)); assert.equal(entry.command.startsWith('pnpm ') ? JSON.parse(read('package.json')).scripts[entry.command.slice(5)] : entry.command, `node ${entry.validator}`); assert.ok(existsSync(join(ROOT, entry.validator)));
      } else if (entry.kind === 'shared_runner_setup' || entry.kind === 'always_run_finalizer') {
        assert.ok(parsed.required_steps.includes(entry.step), entry.step); assert.ok(workflow.includes(entry.command), entry.command);
      } else if (entry.kind === 'source_event_bound_argv') {
        assert.deepEqual(entry.stages, ['document-governance']); assert.ok(stages.get('document-governance').dynamic_input);
      } else if (entry.kind === 'live_foundation_inventory') {
        assert.deepEqual(entry.stages, ['foundation']); assert.ok(entry.test_files.length > 0); for (const path of entry.test_files) assert.ok(discoverFoundationTests(ROOT).includes(path), path);
      } else if (entry.kind === 'complete_sharded_inventory') {
        assert.deepEqual(entry.stages, ['validator-shard-1', 'validator-shard-2', 'validator-shard-3']);
      } else assert.fail(`Unsupported coverage destination ${entry.kind}`);
    }
  }
});
for (const [name, mutate] of [
  ['wrong baseline commit', m => { m.baseline.main_sha = 'e'.repeat(40); }],
  ['wrong baseline tree', m => { m.baseline.tree = 'e'.repeat(40); }],
  ['omitted old wrapper', m => { m.producer_command_mapping.pop(); }],
  ['duplicate wrapper hiding another', m => { m.producer_command_mapping[1] = structuredClone(m.producer_command_mapping[0]); }],
  ['omitted old command', m => { m.producer_command_mapping[0].steps.pop(); }],
  ['rewritten old command', m => { m.producer_command_mapping[0].steps[0].baseline_run = 'true'; }],
  ['unknown stage destination', m => { m.producer_command_mapping[0].steps[0].coverage[0].stages = ['nonexistent']; }],
  ['incorrect known stage destination', m => { m.producer_command_mapping[0].steps[0].coverage[0].stages = ['pins']; }],
  ['unsupported destination kind', m => { m.producer_command_mapping[0].steps[0].coverage[0].kind = 'assumed_duplicate'; }],
  ['missing proof destination', m => { m.producer_command_mapping[0].steps[0].coverage = []; }],
  ['omitted baseline validator', m => { m.baseline_umbrella_validators.pop(); }],
  ['omitted preserved proof file', m => { m.preserved_test_and_replay_files.pop(); }],
  ['changed replay digest', m => { m.preserved_test_and_replay_files[0].sha256 = hash('not the replay'); }],
  ['omitted retained stage', m => { m.retained_stage_ids.pop(); }],
  ['omitted added stage', m => { m.added_stage_ids.pop(); }],
]) test(`coverage validator rejects ${name}`, () => {
  const path = join(structuralRoot, COVERAGE), original = readFileSync(path, 'utf8');
  try { const manifest = JSON.parse(original); mutate(manifest); writeFileSync(path, JSON.stringify(manifest)); assert.ok(inspectConsolidatedVerification(structuralRoot).length, name); }
  finally { writeFileSync(path, original); }
});

function mutateFixtureFile(path, mutate, inspect = inspectConsolidationCoverage) {
  const file = join(structuralRoot, path), original = readFileSync(file);
  try { mutate(file, original); assert.ok(inspect(structuralRoot).length, path); }
  finally { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, original); }
}
for (const alias of Object.keys(BASELINE_COMMANDS)) test(`live coverage rejects a no-op ${alias} package alias despite preserved old proof files`, () => {
  mutateFixtureFile('package.json', (file, original) => { const p = JSON.parse(original); p.scripts[alias] = 'node -e "process.exit(0)"'; writeFileSync(file, JSON.stringify(p)); });
});
for (const path of ['scripts/db/verify-migration-replay.ts', 'tests/integration/identity/session-command-transaction.test.ts', 'src/modules/identity/domain/credential.test.ts']) test(`live coverage rejects removed or altered assertion body ${path}`, () => {
  mutateFixtureFile(path, file => writeFileSync(file, '// omitted all assertions\n'));
  mutateFixtureFile(path, file => rmSync(file));
});
test('live coverage rejects a deleted historical validator even if manifest counts stay unchanged', () => {
  mutateFixtureFile(BASELINE_VALIDATORS[0], file => rmSync(file));
});

test('live coverage requires the newly admitted capability validator, not just the historical 53', () => {
  mutateFixtureFile('scripts/kernel/validate-capability-admission.mjs', file => rmSync(file));
});
test('live coverage rejects an unreviewed extra standalone validator', () => {
  const path = join(structuralRoot, 'scripts/kernel/validate-unreviewed-admission.mjs');
  try {
    writeFileSync(path, '// Unreviewed inventory addition.\n');
    assert.match(inspectConsolidationCoverage(structuralRoot).join('\n'), /complete baseline plus exact admitted standalone validator inventory/);
  } finally { rmSync(path); }
});

test('live coverage requires the exact demo registration validator and bounded mutation stage', () => {
  mutateFixtureFile('scripts/kernel/validate-demo-runtime-registration.mjs', file => rmSync(file));
  mutateFixtureFile('verification/whole-repository/self-audit-plan.json', (file, original) => { const plan=JSON.parse(original); plan.stages=plan.stages.filter(stage=>stage.id!=='demo-registration-regressions'); writeFileSync(file,JSON.stringify(plan)); }, inspectConsolidatedVerification);
});

// Exercise the real worker collector/merger without running or weakening cases.
const workerHarnessSource=read('scripts/tests/validate-validators.mjs');
const workerHelperStart=workerHarnessSource.indexOf('function awaitValidatorWorker(');
const workerHelperEnd=workerHarnessSource.indexOf('if (isMainThread && shardTotal <= 16)',workerHelperStart);
assert.ok(workerHelperStart>0&&workerHelperEnd>workerHelperStart);
const workerHelpers=runInNewContext(`${workerHarnessSource.slice(workerHelperStart,workerHelperEnd)}; ({awaitValidatorWorker,mergeValidatorWorkers});`,{createHash});
const workerNames=enumerateCases(workerHarnessSource).map(row=>row.name);
const workerReports=()=>[1,4].map(index=>({inventoryNames:[...workerNames],inventoryCount:workerNames.length,results:workerNames.flatMap((name,ordinal)=>ordinal%6===index-1?[{name,ordinal,ok:true,detail:'fixture outcome'}]:[])}));
test('two isolated worker partitions preserve exact catalog and ordered shard outcomes',()=>{
  const reports=workerReports();reports[1].results[0].ok=false;
  const result=workerHelpers.mergeValidatorWorkers(reports,1,3);
  assert.equal(result.results.length,74);assert.equal(result.results.filter(row=>!row.ok).length,1);
  assert.deepEqual(Array.from(result.results,row=>row.ordinal),workerNames.flatMap((_,ordinal)=>ordinal%3===0?[ordinal]:[]));
  assert.match(workerHarnessSource,/Promise\.allSettled\(pending\)/);
});
for(const [label,mutate] of [
  ['missing report',reports=>reports.pop()],
  ['extra report',reports=>reports.push(reports[0])],
  ['both catalogs omit a case',reports=>{for(const report of reports){report.inventoryNames.pop();report.inventoryCount--;}}],
  ['catalog mismatch',reports=>reports[1].inventoryNames.reverse()],
  ['omitted result',reports=>reports[0].results.pop()],
  ['duplicated result',reports=>reports[0].results.push(reports[0].results[0])],
  ['wrong worker partition',reports=>{const first=reports[0].results[0];reports[0].results[0]=reports[1].results[0];reports[1].results[0]=first;}],
  ['changed case name',reports=>reports[0].results[0].name='invented case'],
  ['nonboolean pass',reports=>reports[0].results[0].ok='true'],
  ['missing diagnostic',reports=>delete reports[0].results[0].detail],
])test(`validator worker merger rejects ${label}`,()=>{const reports=workerReports();mutate(reports);assert.throws(()=>workerHelpers.mergeValidatorWorkers(reports,1,3),/worker/);});
test('worker result cannot pass before ordinary exit and retains failing case outcomes',async()=>{
  const worker=new EventEmitter();let completed=false;
  const report={results:[{ok:false}]};const promise=workerHelpers.awaitValidatorWorker(worker,1).then(value=>{completed=true;return value;});
  worker.emit('message',report);await Promise.resolve();assert.equal(completed,false);
  worker.emit('exit',0);assert.equal(await promise,report);
});
for(const [label,emit] of [
  ['no report',worker=>worker.emit('exit',0)],
  ['nonzero exit',worker=>{worker.emit('message',{});worker.emit('exit',1);}],
  ['worker error after report',worker=>{worker.emit('message',{});worker.emit('error',new Error('worker launch/runtime failure'));worker.emit('exit',0);}],
  ['duplicate report',worker=>{worker.emit('message',{});worker.emit('message',{});worker.emit('exit',0);}],
])test(`validator worker collector rejects ${label}`,async()=>{const worker=new EventEmitter();const promise=workerHelpers.awaitValidatorWorker(worker,1);emit(worker);await assert.rejects(promise,/worker/);});
test('live coverage requires physical validator slot 56 and its bounded mutation invocation', () => {
  mutateFixtureFile('scripts/persistence/validate-demo-physical-admission.mjs', file => rmSync(file));
  mutateFixtureFile('scripts/tests/validate-demo-physical-successor.mjs', file => rmSync(file), inspectConsolidatedVerification);
  // Name the obligations instead of popping whichever successor was appended
  // last. Retain the former cleanup omission and directly test physical proof.
  for(const omitted of ['scripts/tests/validate-demo-physical-successor.mjs','scripts/tests/validate-replay-database-cleanup.test.mjs'])mutateFixtureFile('verification/whole-repository/self-audit-plan.json', (file, original) => {
    const plan=JSON.parse(original),stage=plan.stages.find(stage=>stage.id==='audit-regressions');
    assert.ok(stage.args.includes(omitted));stage.args=stage.args.filter(path=>path!==omitted);writeFileSync(file,JSON.stringify(plan));
  }, inspectConsolidatedVerification);
});

test('authenticated predecessor authority umbrella retains five-second physical failure propagation', () => {
  // Keep the real original sequential assertion as a historical source proof.
  // The current bounded two-child runner has its own mandatory executable suite.
  const source=kitchenPredecessor('scripts/architecture/validate-whole-repository.mjs').replace(/^#!.*\n/,'').replace(/^import .*;\n/gm,'');
  const calls=[], output=[];
  assert.throws(()=>runInNewContext(source, {
    readdirSync, join, resolve, inspectRepositoryIntegration:()=>[],
    spawnSync:(command,args,options)=>{calls.push({command,args,options});return args[0]==='scripts/persistence/validate-demo-physical-admission.mjs'?{status:1,stderr:'physical-negative-control'}:{status:0};},
    process:{cwd:()=>ROOT,execPath:process.execPath,exit:code=>{throw new Error(`expected umbrella exit ${code}`);}},
    console:{error:message=>output.push(message),log:message=>output.push(message)},
  },{timeout:2000}),/expected umbrella exit 1/);
  assert.equal(calls.length,59);
  assert.deepEqual(Array.from(calls,call=>call.args[0]).sort(),CURRENT_VALIDATORS.slice().sort());
  const physical=calls.find(call=>call.args[0]==='scripts/persistence/validate-demo-physical-admission.mjs');
  assert.equal(physical.command,process.execPath); assert.equal(physical.options.timeout,5000);
  assert.match(output.join('\n'),/physical-negative-control/);
});
test('current two-child authority runner regression suite is required in the exact bounded catalog',()=>{
  const prior=JSON.parse(kitchenPredecessor('verification/whole-repository/self-audit-plan.json')).stages.find(x=>x.id==='audit-regressions');
  const current=expectedPlan.stages.find(x=>x.id==='audit-regressions');
  assert.deepEqual(current,{...prior,args:[...prior.args,AUDIT_RUNNER_TEST]});
  assert.ok(existsSync(join(ROOT,AUDIT_RUNNER_TEST)));
  mutateFixtureFile('verification/whole-repository/self-audit-plan.json',(file,original)=>{
    const plan=JSON.parse(original),stage=plan.stages.find(x=>x.id==='audit-regressions');
    stage.args=stage.args.filter(path=>path!==AUDIT_RUNNER_TEST);writeFileSync(file,JSON.stringify(plan));
  },inspectConsolidatedVerification);
});
test('current authority runner executes all 59 exact slots and retains ordered physical failure evidence',async()=>{
  const paths=discoverAuthorityValidators(ROOT),calls=[],physical='scripts/persistence/validate-demo-physical-admission.mjs';
  assert.deepEqual(paths,CURRENT_VALIDATORS.slice().sort());assert.equal(paths.length,59);
  let active=0,maxActive=0;
  const spawnImpl=(command,args,options)=>{
    calls.push({command,args,options});active++;maxActive=Math.max(maxActive,active);
    const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};
    setTimeout(()=>{
      if(args[0]===physical)child.stderr.end('physical-negative-control');else child.stdout.end(args[0]);
      active--;child.emit('close',args[0]===physical?1:0,null);
    },args[0]===paths[0]?10:0);
    return child;
  };
  const results=await runAuthorityValidators(ROOT,paths,{spawnImpl});
  assert.equal(calls.length,59);assert.equal(maxActive,2);assert.equal(active,0);
  assert.deepEqual(calls.map(call=>call.args[0]),paths);assert.deepEqual(results.map(result=>result.path),paths);
  for(const call of calls){
    assert.equal(call.command,process.execPath);assert.equal(call.args.length,1);assert.equal(call.options.cwd,ROOT);
    assert.equal(call.options.shell,false);assert.equal(call.options.detached,false);assert.deepEqual(call.options.stdio,['ignore','pipe','pipe']);
  }
  for(const result of results)assert.deepEqual(result,{path:result.path,status:result.path===physical?1:0,signal:null,stdout:result.path===physical?'':result.path,stderr:result.path===physical?'physical-negative-control':'',error:null});
  assert.match(read('scripts/architecture/validate-whole-repository.mjs'),/timeoutMs=5000,spawnImpl=spawn/);
});

for(const id of ['demo-source-tests','demo-generation','demo-postgres','demo-recipe-postgres'])test(`live CI requires exact bounded ${id} proof`,()=>{
 mutateFixtureFile('verification/whole-repository/self-audit-plan.json',(file,original)=>{const plan=JSON.parse(original);plan.stages=plan.stages.filter(stage=>stage.id!==id);writeFileSync(file,JSON.stringify(plan));},inspectConsolidatedVerification);
});
for(const path of ['scripts/db/run-demo-integration.ts','scripts/db/run-demo-recipe-integration.ts','scripts/db/run-p05-prefix-integration.ts'])test(`live CI rejects weakened disposable integration wrapper ${path}`,()=>{
 mutateFixtureFile(path,file=>writeFileSync(file,'// omitted suite or prefix isolation\n'),inspectConsolidatedVerification);
});

test('historical generator setup successor preserves original proof bytes and every assertion',()=>{
 const path='scripts/db/verify-slice-p05-generation.mjs';
 const old=preservedProofBytes(ROOT,path),current=read(path);
 assert.equal(hash(old),'49869bd439098981b2df581dbae1d505e46af5a3c4dd07a1d1b780e034de32ce');
 assert.equal(hash(current),'d701f495b486a2d23be21228865db2b87b69ff23d8d3e04ff188bf4521a66da1');
 assert.equal(current.slice(current.indexOf('  const sql =')),old.slice(old.indexOf('  const sql =')));
 mutateFixtureFile(path,file=>writeFileSync(file,current.replace('assert.equal(','console.log(')));
 mutateFixtureFile('drizzle.p05.config.ts',file=>writeFileSync(file,'export default {};\n'));
});

test('live coverage rejects a weakened or deleted bounded replay cleanup helper', () => {
  mutateFixtureFile('scripts/db/replay-database-cleanup.mjs', file => writeFileSync(file, 'export async function dropReplayDatabase() {}\n'));
  mutateFixtureFile('scripts/db/replay-database-cleanup.mjs', file => rmSync(file));
});
test('live coverage rejects restoring forced backend termination', () => {
  mutateFixtureFile('scripts/db/verify-migration-replay.ts', (file, original) => {
    writeFileSync(file, reconstructHistoricalReplay('scripts/db/verify-migration-replay.ts', original));
  });
});

test('fourteen bounded partitions isolate both whole-audit controls and retain every original ordinal exactly once',()=>{
 const all=Array.from({length:220},(_,i)=>i), partitions=Array.from({length:14},(_,i)=>validatorPartitionOrdinals(i+1));
 assert.deepEqual(partitions.flat().sort((a,b)=>a-b),all);
 assert.equal(new Set(partitions.flat()).size,220);
 assert.deepEqual(partitions[12],[152]);assert.deepEqual(partitions[13],[153]);
 for(let i=0;i<12;i++)assert.deepEqual(partitions[i],all.filter(n=>n%12===i&&n!==152&&n!==153));
 const stages=expectedPlan.stages.filter(s=>s.id.startsWith('validator-shard-'));
 assert.deepEqual(stages.map(s=>s.args[1]),Array.from({length:14},(_,i)=>`--shard=${i+1}/14`));
 for(const ordinal of [-1,220,NaN,1.5,'152'])assert.throws(()=>validatorPartitionForOrdinal(ordinal),/exact validator ordinal/);
 for(const index of [0,15,NaN,1.5,'13'])assert.throws(()=>validatorPartitionOrdinals(index),/exact validator partition/);
});
test('dedicated controls cannot be renamed, moved, omitted or duplicated behind the catalog digest',()=>{
 const names=[...workerNames];assert.doesNotThrow(()=>assertValidatorInventory(names));
 for(const mutate of [a=>a.pop(),a=>a.push(a[0]),a=>[a[152],a[153]]=[a[153],a[152]],a=>a[152]='unreviewed control']){
  const changed=[...names];mutate(changed);assert.throws(()=>assertValidatorInventory(changed),/exact original/);
 }
 assert.deepEqual(WHOLE_REPOSITORY_CONTROLS.map(row=>[row.ordinal,row.name,row.partition]),[[152,'whole audit: every standalone gate passes',13],[153,'whole audit: an otherwise untriggered historical validator fails',14]]);
});
test('registration split executes exactly one plus sixteen unchanged test declarations',()=>{
 const source=preservedRegistrationTestBytes(ROOT);
 assert.equal(hash(source),'0aec40789483d97aafbeaa69846037de42b7f2f8a71c34979cd74aac8ce5a639');
 const names=[...source.matchAll(/^test\('([^']+)'/gm)].map(match=>match[1]);assert.equal(names.length,17);assert.deepEqual(names,REGISTRATION_TEST_NAMES);
 const stages=expectedPlan.stages.filter(stage=>['demo-registration-entry-regressions','demo-registration-regressions'].includes(stage.id));
 const selected=stages.map(stage=>names.filter(name=>new RegExp(stage.args[1].slice('--test-name-pattern='.length)).test(name)));
 assert.deepEqual(selected.map(rows=>rows.length),[1,16]);
 assert.deepEqual([...selected.flat()].sort(),[...names].sort());assert.equal(new Set(selected.flat()).size,17);
});

test('actual fourteen-partition harness selection executes each declared ordinal in its exact one stage',()=>{
 const start=workerHarnessSource.indexOf('function test(name, script, mutate, expect)'),end=workerHarnessSource.indexOf('// ---------------------------------------------------------------------------\n// Semantic kernel:',start);
 assert.ok(start>0&&end>start);
 assert.match(workerHarnessSource,/if \(shardTotal !== VALIDATOR_PARTITION_COUNT\) \{/);
 for(let index=1;index<=14;index++){
  const results=[],context={inventoryNames:[],inventoryCount:0,shardTotal:14,shardIndex:index,VALIDATOR_PARTITION_COUNT,validatorPartitionForOrdinal,predecessorCases:[],kitchenValidatorTransition:()=>null,kitchenFinalizerTransition:()=>null,scratch:()=>'/unused-pure-fixture',rmSync:()=>{},results,runValidator:()=>({exit:0,output:'',ordinaryProcessExit:true}),validatorResultMatches:()=>true};
  const execute=runInNewContext(workerHarnessSource.slice(start,end)+'; test;',context);
  for(const name of workerNames)execute(name,'unused-script',()=>{},{pass:true});
  assert.deepEqual(results.map(row=>row.ordinal),validatorPartitionOrdinals(index));
  assert.deepEqual(results.map(row=>row.name),validatorPartitionOrdinals(index).map(ordinal=>workerNames[ordinal]));
  assert.equal(context.inventoryCount,220);
 }
});

test('storage partitions retain every original declaration exactly once and reject inventory drift',()=>{
 const names=[...read('scripts/tests/demo-storage-evidence.mjs').matchAll(/^test\('([^']+)'/gm)].map(match=>match[1]);
 assert.equal(names.length,30);assert.deepEqual(names,STORAGE_TEST_NAMES);assert.doesNotThrow(()=>assertStoragePartitionInventory(names));
 for(const mutate of [values=>values.pop(),values=>values.push(values[0]),values=>values[0]='unknown storage test',values=>[values[0],values[1]]=[values[1],values[0]]]){
  const changed=[...names];mutate(changed);assert.throws(()=>assertStoragePartitionInventory(changed),/exact original thirty/);
 }
 const selected=[STORAGE_OWNER_PATTERN,STORAGE_INTEGRATION_PATTERN].map(pattern=>names.filter(name=>new RegExp(pattern).test(name)));
 assert.deepEqual(selected.map(part=>part.length),[21,9]);assert.equal(new Set(selected.flat()).size,30);assert.deepEqual(selected.flat().sort(),names.slice().sort());
 assert.ok(!expectedPlan.stages.find(stage=>stage.id==='demo-source-tests').args.includes('scripts/tests/demo-storage-evidence.mjs'));
});
test('pinned Node test runner executes exact storage partitions without parent-suite leakage',()=>{
 const dir=mkdtempSync(join(tmpdir(),'storage-selector-')),file=join(dir,'selectors.test.mjs');
 try{
  writeFileSync(file,"import {test} from 'node:test';\n"+STORAGE_TEST_NAMES.map(name=>`test(${JSON.stringify(name)},()=>console.log('EXECUTED:'+${JSON.stringify(JSON.stringify(name))}));`).join('\n')+'\n');
  const {NODE_TEST_CONTEXT:parentTestContext,...childEnvironment}=process.env;
  const run=pattern=>{const out=execFileSync(process.execPath,['--test','--test-reporter=tap','--test-name-pattern='+pattern,file],{env:childEnvironment,encoding:'utf8',timeout:5000});return [...out.matchAll(/^# EXECUTED:(.+)$/gm)].map(match=>JSON.parse(match[1]));};
  assert.deepEqual(run(STORAGE_OWNER_PATTERN),STORAGE_TEST_NAMES.filter(name=>!name.startsWith('repository integration ')));
  assert.deepEqual(run(STORAGE_INTEGRATION_PATTERN),STORAGE_TEST_NAMES.filter(name=>name.startsWith('repository integration ')));
  assert.equal(run('^(?!repository integration )').length,30);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('pinned Node test runner executes exact registration partitions without parent-suite leakage',()=>{
 const dir=mkdtempSync(join(tmpdir(),'registration-selector-')),file=join(dir,'selectors.test.mjs');
 try{
  writeFileSync(file,"import {test} from 'node:test';\n"+REGISTRATION_TEST_NAMES.map(name=>`test(${JSON.stringify(name)},()=>console.log('EXECUTED:'+${JSON.stringify(JSON.stringify(name))}));`).join('\n')+'\n');
  const {NODE_TEST_CONTEXT:parentTestContext,...childEnvironment}=process.env;
  const run=pattern=>{const out=execFileSync(process.execPath,['--test','--test-reporter=tap','--test-name-pattern='+pattern,file],{env:childEnvironment,encoding:'utf8',timeout:5000});return [...out.matchAll(/^# EXECUTED:(.+)$/gm)].map(match=>JSON.parse(match[1]));};
  assert.deepEqual(run(REGISTRATION_ENTRY_PATTERN),[REGISTRATION_TEST_NAMES[1]]);
  assert.deepEqual(run(REGISTRATION_REMAINDER_PATTERN),REGISTRATION_TEST_NAMES.filter((_,index)=>index!==1));
  // The former tempting negative-lookahead selector matches the parent suite.
  // This executable control is why pure RegExp.test(name) is not sufficient.
  assert.equal(run('^(?!all 131 exact registered entries reject partial approval and deletion$)').length,17);
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('recipe CI extension keeps both exact successor gates in the unchanged authority umbrella', () => {
  for (const path of ['scripts/kernel/validate-demo-recipes-registration.mjs', 'scripts/persistence/validate-demo-recipes-physical-admission.mjs']) mutateFixtureFile(path, file => rmSync(file));
});
for (const path of ['tests/demo/recipe-content.test.ts', 'tests/demo-web/recipe-api.test.mjs', 'tests/demo-web/recipes.test.mjs', 'scripts/tests/validate-demo-recipes-registration.mjs', 'scripts/tests/validate-demo-recipes-physical-successor.mjs']) test(`recipe CI cannot omit existing-stage regression ${path}`, () => {
  mutateFixtureFile('verification/whole-repository/self-audit-plan.json', (file, original) => {
    const plan=JSON.parse(original); const stage=plan.stages.find(row=>row.id==='demo-source-tests'); stage.args=stage.args.filter(arg=>arg!==path); writeFileSync(file,JSON.stringify(plan));
  }, inspectConsolidatedVerification);
});
test('recipe CI cannot omit or substitute the separate disposable PostgreSQL suite', () => {
  mutateFixtureFile('scripts/db/run-demo-recipe-integration.ts', (file, original) => writeFileSync(file, original.toString().replace("'tests/integration/demo/recipe-content-guard.test.ts'", '')), inspectConsolidatedVerification);
  mutateFixtureFile('scripts/db/run-demo-recipe-integration.ts', (file, original) => writeFileSync(file, original.toString().replace("'tests/integration/demo/recipe-content-guard.test.ts'", "'tests/integration/demo/application-runtime.test.ts'")), inspectConsolidatedVerification);
});

test('recipe scheduling split preserves all 43 historical PostgreSQL declarations and both operation bounds', () => {
  const original=read('scripts/db/run-demo-integration.ts');
  const recipe=read('scripts/db/run-demo-recipe-integration.ts');
  assert.equal(hash(original),'575b41278b354e0cfeb32a51f4b56f7719169772d19f4cdea5b83f2303222a62');
  assert.equal(hash(recipe),'0ae8978b1762054b7bf0f8a94a2754492e29220e6e4297bf2fa6a85c8464b9f9');
  const suites=source=>[...source.matchAll(/'((?:tests\/integration\/demo\/)[^']+\.test\.ts)'/g)].map(match=>match[1]);
  assert.deepEqual(suites(original),['tests/integration/demo/migration-replay.test.ts','tests/integration/demo/postgres-owner-storage.test.ts','tests/integration/demo/application-runtime.test.ts']);
  assert.deepEqual(suites(recipe),['tests/integration/demo/recipe-content-guard.test.ts']);
  const sources=[
    ['migration-replay',3,'ece39f11246877d9f4287cb035f09639cb5c767e44a1481e61b189b949278eaf'],
    ['postgres-owner-storage',17,'9bfaae6387614501f8493dbd9adedfc2d14072e480a44a60e1ef6eb148cfbbd7'],
    ['application-runtime',14,'8c3f3cf8a7ef98bffe1ea58c36b9b2371965dd57ada13247ed0f6da87d284f2c'],
    ['recipe-content-guard',9,'327af6cf10cec3901f412852c744b6abb33b56898c13828ca85725afd50f984a'],
  ];
  for(const [name,count,digest] of sources){
    const path=`tests/integration/demo/${name}.test.ts`,current=read(path);
    const source=['application-runtime','recipe-content-guard'].includes(name)?kitchenPredecessor(path):current;
    assert.equal(hash(source),digest);assert.equal([...source.matchAll(/^test\(/gm)].length,count);
    // New content-version assertions and an explicit old migration prefix are
    // independently source-bound; no original PostgreSQL case may disappear.
    const declarations=text=>[...text.matchAll(/^test\(([^\n]+)/gm)].map(match=>match[1]);
    assert.deepEqual(declarations(current),declarations(source));
  }
  assert.equal(sources.reduce((sum,[,count])=>sum+count,0),43);
  for(const id of ['demo-postgres','demo-recipe-postgres'])assert.equal(expectedPlan.stages.find(stage=>stage.id===id).timeout_ms,25000);
  for(const source of [original,recipe])assert.match(source,/stdio:'inherit',timeout:20000/);
  assert.match(recipe,/teach_v2_demo_recipe_ci_/);
});

for(const id of ['demo-postgres','demo-recipe-postgres'])test(`split PostgreSQL stage ${id} cannot raise its operation ceiling`,()=>{
  mutateFixtureFile('verification/whole-repository/self-audit-plan.json',(file,original)=>{const plan=JSON.parse(original);plan.stages.find(stage=>stage.id===id).timeout_ms=30000;writeFileSync(file,JSON.stringify(plan));},inspectConsolidatedVerification);
});
