#!/usr/bin/env node
// Negative-path tests for the teach-v2 validators.
//
// TESTING STANDARD (owner-directed 2026-10-04): every validator must have both
// a positive case (clean repo passes) and at least one negative case (mutated
// repo fails with the expected error). A new validator without both is
// incomplete and must not be merged.
//
// Each case mutates a scratch copy of the repo, runs the target validator,
// and asserts the outcome. A validator that cannot fail is a validator that
// cannot be trusted; a validator that cannot pass is broken.
//
// Usage: node scripts/tests/validate-validators.mjs
// Exit 0 = all tests pass. Exit 1 = at least one test failed.

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "../..");
const results = [];

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "negtest-"));
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) => !src.includes("/.git"),
  });
  return dir;
}

function readJson(dir, rel) {
  return JSON.parse(readFileSync(join(dir, rel), "utf8"));
}
function writeJson(dir, rel, obj) {
  writeFileSync(join(dir, rel), JSON.stringify(obj, null, 2) + "\n");
}

function runValidator(dir, script) {
  const [file, ...args] = script.split(" ");
  try {
    const out = execFileSync("node", [join(dir, file), ...args], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exit: 0, output: out };
  } catch (e) {
    return { exit: e.status ?? 1, output: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

function test(name, script, mutate, expect) {
  const dir = scratch();
  try {
    mutate(dir);
    const r = runValidator(dir, script);
    let ok, detail;
    if (expect.pass) {
      ok = r.exit === 0;
      detail = ok ? "passed as expected" : `expected pass, got exit ${r.exit}: ${r.output.slice(0, 200)}`;
    } else {
      const matched = expect.pattern.test(r.output);
      ok = r.exit !== 0 && matched;
      detail = ok
        ? `failed as expected (${expect.pattern})`
        : `expected failure matching ${expect.pattern}, got exit ${r.exit}: ${r.output.slice(0, 300)}`;
    }
    results.push({ name, ok, detail });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Semantic kernel: SEM-36 and per-kind schema
// ---------------------------------------------------------------------------

test(
  "sem36: approved command depending on candidate fails",
  "scripts/kernel/validate-semantic-kernel.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/commands.json");
    for (const e of d.entries) {
      if (e.id === "CreateIdentity") e.requires = ["Identity", "Credential", "FakeCandidate"];
    }
    writeJson(dir, "kernel/commands.json", d);
    const ed = readJson(dir, "kernel/entities.json");
    ed.entries.push({
      id: "FakeCandidate", kind: "entity", status: "candidate",
      definition: "Negative-test fixture.", identifier: "FakeId", owning_domain: "Identity",
    });
    const idd = readJson(dir, "kernel/identifiers.json");
    idd.entries.push({
      id: "FakeId", kind: "identifier", status: "candidate",
      value_type: "string", represents: "test", owning_domain: "Identity",
    });
    writeJson(dir, "kernel/entities.json", ed);
    writeJson(dir, "kernel/identifiers.json", idd);
  },
  { pattern: /SEM-36/ }
);

test(
  "sem36: approved event with null evidence fails",
  "scripts/kernel/validate-semantic-kernel.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/events.json");
    for (const e of d.entries) {
      if (e.id === "IdentityDeactivated") e.sem35_evidence = null;
    }
    writeJson(dir, "kernel/events.json", d);
  },
  { pattern: /sem35_evidence/ }
);

test(
  "kernel: command missing definition fails",
  "scripts/kernel/validate-semantic-kernel.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/commands.json");
    delete d.entries[0].definition;
    writeJson(dir, "kernel/commands.json", d);
  },
  { pattern: /missing definition/ }
);

test(
  "kernel: duplicate command id fails",
  "scripts/kernel/validate-semantic-kernel.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/commands.json");
    d.entries.push({ ...d.entries[0] });
    writeJson(dir, "kernel/commands.json", d);
  },
  { pattern: /duplicate id/ }
);

test(
  "kernel: invalid status fails",
  "scripts/kernel/validate-semantic-kernel.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/events.json");
    d.entries[0].status = "bogus";
    writeJson(dir, "kernel/events.json", d);
  },
  { pattern: /invalid status/ }
);

test(
  "kernel: wrong manifest version fails",
  "scripts/kernel/validate-semantic-kernel.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/manifest.json");
    d.version = "0.0.0";
    writeJson(dir, "kernel/manifest.json", d);
  },
  { pattern: /version must be/ }
);

test(
  "kernel: clean repo passes (positive control)",
  "scripts/kernel/validate-semantic-kernel.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// Pins guard
// ---------------------------------------------------------------------------

test(
  "pins: stale K00 pin fails",
  "scripts/packaging/validate-apply-guards.mjs",
  (dir) => {
    const p = join(dir, "scripts/domains/validate-invariant-discovery.mjs");
    let t = readFileSync(p, "utf8");
    t = t.replace("0.16.0", "0.15.0");
    writeFileSync(p, t);
  },
  { pattern: /stale K00 manifest version pin/ }
);

test(
  "pins: clean repo passes (positive control)",
  "scripts/packaging/validate-apply-guards.mjs pins",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// Document governance
// ---------------------------------------------------------------------------

test(
  "docs: missing tos-doc block fails",
  "scripts/docs/validate-document-metadata.mjs",
  (dir) => {
    const p = join(dir, "contracts/c11-identity-credentials-contract.md");
    let t = readFileSync(p, "utf8");
    t = t.replace(/^<!--tos-doc[\s\S]*?-->\n/, "");
    writeFileSync(p, t);
  },
  { pattern: /missing leading tos-doc/ }
);

test(
  "docs: clean repo passes (positive control)",
  "scripts/docs/validate-document-metadata.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// Domain ownership
// ---------------------------------------------------------------------------

test(
  "ownership: K00 concept missing from map fails",
  "scripts/domains/validate-domain-ownership.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/commands.json");
    d.entries.push({
      id: "FakeCommand", kind: "command", status: "candidate",
      owning_domain: "Identity", definition: "Fixture.", authority: "None.", requires: [],
    });
    writeJson(dir, "kernel/commands.json", d);
  },
  { pattern: /missing current K00 concept/ }
);

test(
  "ownership: bad owner domain fails",
  "scripts/domains/validate-domain-ownership.mjs",
  (dir) => {
    const d = readJson(dir, "domains/ownership-map.json");
    d.entries[0].proposed_owner = "NonexistentDomain";
    writeJson(dir, "domains/ownership-map.json", d);
  },
  { pattern: /not a registered domain/ }
);

// ---------------------------------------------------------------------------
// Discovery validators (one negative case each)
// ---------------------------------------------------------------------------

test(
  "invariant discovery: wrong proposal id fails",
  "scripts/domains/validate-invariant-discovery.mjs",
  (dir) => {
    const d = readJson(dir, "domains/invariants/proposed.json");
    d.invariant_discovery_id = "WRONG";
    writeJson(dir, "domains/invariants/proposed.json", d);
  },
  { pattern: /wrong id/ }
);

test(
  "decision-table discovery: wrong proposal id fails",
  "scripts/domains/validate-decision-table-discovery.mjs",
  (dir) => {
    const d = readJson(dir, "domains/decisions/proposed.json");
    d.decision_table_discovery_id = "WRONG";
    writeJson(dir, "domains/decisions/proposed.json", d);
  },
  { pattern: /wrong id/ }
);

test(
  "command-event discovery: stale live pin fails",
  "scripts/domains/validate-command-event-discovery.mjs",
  (dir) => {
    const d = readJson(dir, "kernel/manifest.json");
    d.version = "0.0.0";
    writeJson(dir, "kernel/manifest.json", d);
  },
  { pattern: /expected K00/ }
);

test(
  "state discovery: wrong proposal id fails",
  "scripts/domains/validate-state-discovery.mjs",
  (dir) => {
    const d = readJson(dir, "domains/states/proposed.json");
    d.state_discovery_id = "WRONG";
    writeJson(dir, "domains/states/proposed.json", d);
  },
  { pattern: /wrong id/ }
);

test(
  "relationship discovery: wrong proposal id fails",
  "scripts/domains/validate-relationships.mjs",
  (dir) => {
    const d = readJson(dir, "domains/relationships/proposed.json");
    d.relationship_discovery_id = "WRONG";
    writeJson(dir, "domains/relationships/proposed.json", d);
  },
  { pattern: /wrong id/ }
);

test(
  "dependency concepts: wrong lifecycle version fails",
  "scripts/domains/validate-dependency-concepts.mjs",
  (dir) => {
    const d = readJson(dir, "domains/dependencies/lifecycle-registration.json");
    d.version = "9.9.9";
    writeJson(dir, "domains/dependencies/lifecycle-registration.json", d);
  },
  { pattern: /version must be/ }
);

test(
  "dependency lifecycle: wrong command closure count fails",
  "scripts/domains/validate-dependency-lifecycle-discovery.mjs",
  (dir) => {
    const d = readJson(dir, "domains/dependencies/lifecycle-registration.json");
    d.total_approved_commands = 0;
    writeJson(dir, "domains/dependencies/lifecycle-registration.json", d);
  },
  { pattern: /command closure/ }
);


// ---------------------------------------------------------------------------
// Positive controls: every validator must also pass on the clean repo.
// Standard: every validator gets at least one negative case (above) and one
// positive case (below). A new validator without both is incomplete.
// ---------------------------------------------------------------------------

test(
  "ownership: clean repo passes (positive control)",
  "scripts/domains/validate-domain-ownership.mjs",
  () => {},
  { pass: true }
);

test(
  "invariant discovery: clean repo passes (positive control)",
  "scripts/domains/validate-invariant-discovery.mjs",
  () => {},
  { pass: true }
);

test(
  "decision-table discovery: clean repo passes (positive control)",
  "scripts/domains/validate-decision-table-discovery.mjs",
  () => {},
  { pass: true }
);

test(
  "command-event discovery: clean repo passes (positive control)",
  "scripts/domains/validate-command-event-discovery.mjs",
  () => {},
  { pass: true }
);

test(
  "state discovery: clean repo passes (positive control)",
  "scripts/domains/validate-state-discovery.mjs",
  () => {},
  { pass: true }
);

test(
  "relationship discovery: clean repo passes (positive control)",
  "scripts/domains/validate-relationships.mjs",
  () => {},
  { pass: true }
);

test(
  "dependency concepts: clean repo passes (positive control)",
  "scripts/domains/validate-dependency-concepts.mjs",
  () => {},
  { pass: true }
);

test(
  "dependency lifecycle: clean repo passes (positive control)",
  "scripts/domains/validate-dependency-lifecycle-discovery.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P01 implementation boundary
// ---------------------------------------------------------------------------

test(
  "slice-p01 implementation: unauthorized admission fails",
  "scripts/persistence/validate-slice-p01-implementation-boundary.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/transaction-control/admission.json",
    );
    d.decision = "BLOCK";
    writeJson(
      dir,
      "persistence/physical-slices/transaction-control/admission.json",
      d,
    );
  },
  { pattern: /active ADMIT authority missing/ }
);

test(
  "slice-p01 implementation: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p01-implementation-boundary.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P02 owner decision registration
// ---------------------------------------------------------------------------

test(
  "slice-p02 decisions: wrong verifier selection fails",
  "scripts/persistence/validate-slice-p02-owner-decisions.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
    );
    d.decisions.find((entry) => entry.id === "P02-D01").selection = "WRONG";
    writeJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
      d,
    );
  },
  { pattern: /P02-D01 must be SESSION_VERIFIER_V1_SHA256_256BIT/ }
);

test(
  "slice-p02 decisions: cross-Identity authorization flag false fails",
  "scripts/persistence/validate-slice-p02-owner-decisions.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
    );
    d.ownership_scope_decision.cross_identity_admin_access_requires_external_authorization = false;
    writeJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
      d,
    );
  },
  { pattern: /ownership\/scope decision drifted/ }
);

test(
  "slice-p02 decisions: missing cross-Identity authorization flag fails",
  "scripts/persistence/validate-slice-p02-owner-decisions.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
    );
    delete d.ownership_scope_decision.cross_identity_admin_access_requires_external_authorization;
    writeJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
      d,
    );
  },
  { pattern: /ownership\/scope decision drifted/ }
);

test(
  "slice-p02 decisions: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p02-owner-decisions.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P02 schema admission
// ---------------------------------------------------------------------------

test(
  "slice-p02 admission: blocked decision fails",
  "scripts/persistence/validate-slice-p02-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-session/admission.json",
    );
    d.decision = "BLOCK";
    writeJson(
      dir,
      "persistence/physical-slices/identity-session/admission.json",
      d,
    );
  },
  { pattern: /ADMIT authorization mismatch/ }
);

test(
  "slice-p02 admission: optional session owner fails",
  "scripts/persistence/validate-slice-p02-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
    );
    d.ownership_scope_decision.application_session_identity_fk_required = false;
    writeJson(
      dir,
      "persistence/physical-slices/identity-session/registration.json",
      d,
    );
  },
  { pattern: /exact owner-approved ownership\/scope decision required/ }
);

test(
  "slice-p02 admission: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p02-schema-admission.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P02 implementation boundary
// ---------------------------------------------------------------------------

test(
  "slice-p02 implementation: unauthorized admission fails",
  "scripts/persistence/validate-slice-p02-implementation-boundary.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-session/admission.json",
    );
    d.decision = "BLOCK";
    writeJson(
      dir,
      "persistence/physical-slices/identity-session/admission.json",
      d,
    );
  },
  { pattern: /active ADMIT authority missing/ }
);

test(
  "slice-p02 implementation: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p02-implementation-boundary.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P03 schema admission
// ---------------------------------------------------------------------------

test(
  "slice-p03 admission: blocked decision fails",
  "scripts/persistence/validate-slice-p03-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-tokens/admission.json",
    );
    d.decision = "BLOCK";
    writeJson(
      dir,
      "persistence/physical-slices/identity-tokens/admission.json",
      d,
    );
  },
  { pattern: /ADMIT authorization mismatch/ }
);

test(
  "slice-p03 admission: optional owner fails",
  "scripts/persistence/validate-slice-p03-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-tokens/registration.json",
    );
    d.scope_rules.invitation_owner_identity_required = false;
    writeJson(
      dir,
      "persistence/physical-slices/identity-tokens/registration.json",
      d,
    );
  },
  { pattern: /exact #40 scope rules required/ }
);

test(
  "slice-p03 admission: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p03-schema-admission.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P03 implementation boundary
// ---------------------------------------------------------------------------

test(
  "slice-p03 implementation: unauthorized admission fails",
  "scripts/persistence/validate-slice-p03-implementation-boundary.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-tokens/admission.json",
    );
    d.decision = "BLOCK";
    writeJson(
      dir,
      "persistence/physical-slices/identity-tokens/admission.json",
      d,
    );
  },
  { pattern: /active ADMIT authority missing/ }
);

test(
  "slice-p03 implementation: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p03-implementation-boundary.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P04 schema admission
// ---------------------------------------------------------------------------

test(
  "slice-p04 admission: blocked decision fails",
  "scripts/persistence/validate-slice-p04-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-credentials/admission.json",
    );
    d.decision = "BLOCK";
    writeJson(
      dir,
      "persistence/physical-slices/identity-credentials/admission.json",
      d,
    );
  },
  { pattern: /ADMIT authorization mismatch/ }
);

test(
  "slice-p04 admission: UNKNOWN criterion fails",
  "scripts/persistence/validate-slice-p04-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/identity-credentials/admission.json",
    );
    d.criteria[3].state = "UNKNOWN";
    writeJson(
      dir,
      "persistence/physical-slices/identity-credentials/admission.json",
      d,
    );
  },
  { pattern: /all eight Persistence Model criteria must be PROVEN/ }
);

test(
  "slice-p04 admission: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p04-schema-admission.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P04 implementation boundary
// ---------------------------------------------------------------------------

test(
  "slice-p04 implementation: stale identities FK fails",
  "scripts/persistence/validate-slice-p04-implementation-boundary.mjs",
  (dir) => {
    const p = join(dir, "drizzle/0003_slice_p04_credential.sql");
    let t = readFileSync(p, "utf8");
    t = t.replace(
      'REFERENCES "public"."identity_identities"("id")',
      'REFERENCES "identities"("id")',
    );
    writeFileSync(p, t);
  },
  { pattern: /Credential FK must target public\.identity_identities/ }
);

test(
  "slice-p04 implementation: missing journal entry fails",
  "scripts/persistence/validate-slice-p04-implementation-boundary.mjs",
  (dir) => {
    const d = readJson(dir, "drizzle/meta/_journal.json");
    d.entries = d.entries.filter((entry) => entry.idx !== 3);
    writeJson(dir, "drizzle/meta/_journal.json", d);
  },
  { pattern: /authoritative Drizzle journal must include idx 3/ }
);

test(
  "slice-p04 implementation: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p04-implementation-boundary.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P05 owner decision registration
// ---------------------------------------------------------------------------

test(
  "slice-p05 decisions: optional Assignment reference fails",
  "scripts/persistence/validate-slice-p05-owner-decisions.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/learning-session/registration.json",
    );
    d.decisions[0].selection = "OPTIONAL_ONE_ASSIGNMENT";
    d.decisions[0].physical_reference_required = false;
    d.decisions[0].physical_reference_nullable = true;
    writeJson(
      dir,
      "persistence/physical-slices/learning-session/registration.json",
      d,
    );
  },
  { pattern: /P05-D01 must be REQUIRED_ONE_ASSIGNMENT/ }
);

test(
  "slice-p05 decisions: registration cannot authorize implementation directly",
  "scripts/persistence/validate-slice-p05-owner-decisions.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/learning-session/registration.json",
    );
    d.effects.implementation_authorized = true;
    writeJson(
      dir,
      "persistence/physical-slices/learning-session/registration.json",
      d,
    );
  },
  { pattern: /registration must authorize admission rerun only/ }
);

test(
  "slice-p05 decisions: clean repo passes (positive control)",
  "scripts/persistence/validate-slice-p05-owner-decisions.mjs",
  () => {},
  { pass: true }
);

// ---------------------------------------------------------------------------
// SLICE-P05 schema admission
// ---------------------------------------------------------------------------

test(
  "slice-p05 admission: blocked decision fails",
  "scripts/persistence/validate-slice-p05-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/learning-session/admission.json",
    );
    d.decision = "BLOCK";
    writeJson(
      dir,
      "persistence/physical-slices/learning-session/admission.json",
      d,
    );
  },
  { pattern: /ADMIT authorization mismatch/ }
);

test(
  "slice-p05 admission: nullable Assignment reference fails",
  "scripts/persistence/validate-slice-p05-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/learning-session/registration.json",
    );
    d.decisions[0].physical_reference_required = false;
    d.decisions[0].physical_reference_nullable = true;
    writeJson(
      dir,
      "persistence/physical-slices/learning-session/registration.json",
      d,
    );
  },
  { pattern: /exact REQUIRED_ONE_ASSIGNMENT owner decision required/ }
);

test(
  "slice-p05 admission: UNKNOWN criterion cannot pass",
  "scripts/persistence/validate-slice-p05-schema-admission.mjs",
  (dir) => {
    const d = readJson(
      dir,
      "persistence/physical-slices/learning-session/admission.json",
    );
    d.criteria[3].state = "UNKNOWN";
    writeJson(
      dir,
      "persistence/physical-slices/learning-session/admission.json",
      d,
    );
  },
  { pattern: /all eight Persistence Model criteria must be PROVEN/ }
);

test(
  "slice-p05 admission: clean admitted repo passes (positive control)",
  "scripts/persistence/validate-slice-p05-schema-admission.mjs",
  () => {},
  { pass: true }
);

// Exact criterion coverage: one copy of a proof cannot stand in for another.
const admissionLanes = ['transaction-control', 'identity-session', 'identity-tokens', 'identity-credentials', 'learning-session'];
const criterionMutations = [
  ['empty criteria', (d) => { d.criteria = []; }, /exactly eight distinct/],
  ['duplicate criteria', (d) => { d.criteria = Array.from({ length: 8 }, () => ({ ...d.criteria[0] })); }, /duplicate criterion/],
  ['missing criterion', (d) => { d.criteria.pop(); }, /missing criterion/],
  ['unknown criterion', (d) => { d.criteria[0].criterion = 'invented criterion'; }, /unknown criterion/],
  ['blank evidence', (d) => { d.criteria[0].evidence = '  '; }, /non-blank evidence/],
  ['missing evidence', (d) => { delete d.criteria[0].evidence; }, /non-blank evidence/],
  ['malformed criterion', (d) => { d.criteria[0] = null; }, /criterion must be an object/],
];
for (const [index, lane] of admissionLanes.entries()) {
  const script = `scripts/persistence/validate-slice-p0${index + 1}-schema-admission.mjs`;
  const path = `persistence/physical-slices/${lane}/admission.json`;
  for (const [name, mutate, pattern] of criterionMutations) {
    test(`slice-p0${index + 1} admission: ${name} fails`, script, (dir) => {
      const value = readJson(dir, path); mutate(value); writeJson(dir, path, value);
    }, { pattern });
  }
  test(`slice-p0${index + 1} admission: reordered complete criteria pass`, script, (dir) => {
    const value = readJson(dir, path); value.criteria.reverse(); writeJson(dir, path, value);
  }, { pass: true });
}
test('admission: authority criterion omission fails closed', 'scripts/persistence/validate-slice-p05-schema-admission.mjs', (dir) => {
  const path = 'persistence/authority.json'; const value = readJson(dir, path);
  value.schema_admission_gate.criteria.pop(); writeJson(dir, path, value);
}, { pattern: /Persistence Model must define the exact eight distinct/ });
test('pins: duplicate admission criterion fails', 'scripts/packaging/validate-apply-guards.mjs pins', (dir) => {
  const path = 'persistence/physical-slices/learning-session/admission.json'; const value = readJson(dir, path);
  value.criteria[7] = { ...value.criteria[0] }; writeJson(dir, path, value);
}, { pattern: /duplicate criterion/ });

const foundationPath = 'persistence/physical-slices/learning-session/foundation.json';
const foundationScript = 'scripts/persistence/validate-slice-p05-foundation.mjs';
const foundationMutations = [
  ['runtime activation', (d) => { d.runtime_activation = 'ACTIVE'; }, /runtime activation must remain BLOCKED/],
  ['physical persistence proof', (d) => { d.verification.physical_persistence = 'PROVEN'; }, /physical_persistence must remain PENDING/],
  ['Assignment adapter proof', (d) => { d.verification.authoritative_assignment_authorization_adapter = 'PROVEN'; }, /authoritative_assignment_authorization_adapter must remain UNKNOWN/],
  ['atomic insert proof', (d) => { d.verification.atomic_authorization_and_insert = 'PROVEN'; }, /atomic_authorization_and_insert must remain PENDING/],
  ['concurrent completion proof', (d) => { d.verification.postgresql_concurrent_completion = 'PROVEN'; }, /postgresql_concurrent_completion must remain PENDING/],
  ['production authorization', (d) => { d.shared_or_production_migration_execution_authorized = true; }, /shared\/production migration execution must remain unauthorized/],
  ['table totals', (d) => { d.physical_artifact_totals.tables = 999; }, /tables totals must match actual artifacts/],
  ['migration totals', (d) => { d.physical_artifact_totals.migration_files = 999; }, /migration_files totals must match actual artifacts/],
  ['repository totals', (d) => { d.physical_artifact_totals.repositories = 999; }, /repositories totals must match actual artifacts/],
  ['slice totals', (d) => { d.implemented_physical_slices = 999; }, /implemented physical slice count/],
  ['wrong owner decision', (d) => { d.owner_decision = 'OPTIONAL_ONE_ASSIGNMENT'; }, /Assignment owner decision mismatch/],
  ['missing verification source', (d) => { delete d.verification_source_commit; }, /exact baseline and verification source/],
  ['missing admission reference', (d) => { delete d.admission; }, /separate ADMIT admission/],
];
for (const [name, mutate, pattern] of foundationMutations) {
  test(`foundation: ${name} fails`, foundationScript, (dir) => {
    const value = readJson(dir, foundationPath); mutate(value); writeJson(dir, foundationPath, value);
  }, { pattern });
}
test('foundation: clean recorded checkpoint passes', foundationScript, () => {}, { pass: true });
test('foundation: missing checkpoint fails closed', foundationScript, (dir) => {
  rmSync(join(dir, foundationPath));
}, { pattern: /foundation.json:.*ENOENT/ });
test('foundation: physical Learning implementation requires separate evidence', foundationScript, (dir) => {
  writeFileSync(join(dir, 'src/modules/learning/domain/premature-table.ts'), "import { pgTable } from 'drizzle-orm/pg-core';\n");
}, { pattern: /physical Learning implementation cannot be covered/ });
test('foundation: contradictory P05 readiness fails', foundationScript, (dir) => {
  const path = 'persistence/physical-slices/readiness.json'; const value = readJson(dir, path);
  value.current_physical_slice_admissions.find((item) => item.id === 'SLICE-P05').implementation_state = 'PROVEN';
  writeJson(dir, path, value);
}, { pattern: /P05 readiness must remain admitted/ });
test('foundation: matching invented repository counts still fail actual artifacts', foundationScript, (dir) => {
  const value = readJson(dir, foundationPath); value.physical_artifact_totals.repositories = 999;
  writeJson(dir, foundationPath, value);
  const path = 'persistence/physical-slices/readiness.json'; const readiness = readJson(dir, path);
  readiness.implementation_guard.repositories_generated = 999; writeJson(dir, path, readiness);
}, { pattern: /repositories totals must match actual artifacts/ });
test('pins: forged foundation authorization fails', 'scripts/packaging/validate-apply-guards.mjs pins', (dir) => {
  const value = readJson(dir, foundationPath); value.runtime_activation = 'ACTIVE';
  value.shared_or_production_migration_execution_authorized = true; value.physical_artifact_totals.tables = 999;
  writeJson(dir, foundationPath, value);
}, { pattern: /runtime activation must remain BLOCKED/ });

const implementationPath = 'persistence/physical-slices/learning-session/implementation.json';
const implementationScript = 'scripts/persistence/validate-slice-p05-implementation-boundary.mjs';
const implementationMutations = [
  ['runtime activation', (d) => { d.runtime_activation = 'ACTIVE'; }, /runtime activation must remain BLOCKED/],
  ['production execution', (d) => { d.shared_or_production_migration_execution_authorized = true; }, /shared\/production migration execution must remain blocked/],
  ['invented Assignment existence', (d) => { d.assignment_reference.existence_proven = true; }, /must not claim existence/],
  ['nullable Assignment reference', (d) => { d.assignment_reference.nullable = true; }, /must not claim existence/],
  ['invented Assignment authorization', (d) => { d.authoritative_assignment_authorization_adapter = 'PROVEN'; }, /explicit runtime blockers/],
  ['invented atomic authorization', (d) => { d.atomic_authorization_and_insert = 'PROVEN'; }, /explicit runtime blockers/],
  ['repository total drift', (d) => { d.physical_artifact_totals.repositories = 999; }, /totals must match actual artifacts/],
  ['inconsistent verification state', (d) => { d.verification.exact_head_ci = 'UNKNOWN'; }, /all physical verification fields/],
];
for (const [name, mutate, pattern] of implementationMutations) {
  test(`p05 physical evidence: ${name} fails`, implementationScript, (dir) => {
    const value = readJson(dir, implementationPath); mutate(value); writeJson(dir, implementationPath, value);
  }, { pattern });
}
test('p05 implementation: clean checkpoint passes', implementationScript, () => {}, { pass: true });
test('p05 implementation: no ADMIT means no authoring', implementationScript, (dir) => {
  const path = 'persistence/physical-slices/learning-session/admission.json'; const value = readJson(dir, path);
  value.decision = 'BLOCK'; writeJson(dir, path, value);
}, { pattern: /active ADMIT authority required/ });
test('p05 implementation: foreign module import fails', implementationScript, (dir) => {
  writeFileSync(join(dir, 'src/modules/identity/domain/foreign-learning.ts'), "import '../../../learning/infrastructure/persistence/schema.js';\n");
}, { pattern: /foreign module imports Learning persistence/ });
test('p05 implementation: wrong Identity FK target fails', implementationScript, (dir) => {
  const path = 'drizzle/meta/0004_snapshot.json'; const value = readJson(dir, path);
  Object.values(value.tables['public.learning_sessions'].foreignKeys)[0].tableTo = 'identities';
  writeJson(dir, path, value);
}, { pattern: /FK must reference canonical Identity/ });

test('P01 decision packet: current readiness passes', 'scripts/persistence/validate-transactioncontrol-first-slice-decision-packet.mjs', () => {}, { pass: true });
test('P01 decision packet: missing preserved implementation fails', 'scripts/persistence/validate-transactioncontrol-first-slice-decision-packet.mjs', (dir) => {
  const path = 'persistence/physical-slices/readiness.json'; const value = readJson(dir, path);
  value.current_physical_slice_admissions.find((item) => item.id === 'SLICE-P01').implementation_state = 'PENDING';
  writeJson(dir, path, value);
}, { pattern: /readiness must preserve SLICE-P01/ });

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
  if (!r.ok) {
    failed++;
    console.log(`      ${r.detail}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} negative-path tests passed.`);
process.exit(failed ? 1 : 0);
