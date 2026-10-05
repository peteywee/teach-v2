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

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "../..");
const results = [];
const shardArg = process.argv.slice(2);
if (shardArg.length > 1 || shardArg.length === 1 && !/^--shard=[1-9][0-9]*\/[1-9][0-9]*$/.test(shardArg[0])) throw new Error('only --shard=index/total is supported');
const [shardIndex, shardTotal] = shardArg.length ? shardArg[0].slice(8).split('/').map(Number) : [1,1];
if (shardIndex > shardTotal || shardTotal > 32) throw new Error('invalid validator shard');
let inventoryCount=0;
const inventoryNames=[];

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "negtest-"));
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) => !/(^|\/)\.git(?:\/|$)/.test(src) && !/(^|\/)node_modules(?:\/|$)/.test(src) && !src.includes("/verification/generated/"),
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
      timeout: 5000,
    });
    return { exit: 0, output: out };
  } catch (e) {
    return { exit: e.status ?? 1, output: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

function test(name, script, mutate, expect) {
  inventoryNames.push(name);
  const ordinal=inventoryCount++;
  if(ordinal % shardTotal !== shardIndex-1) return;
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
    t = t.replace("0.16.0", "0.17.0");
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
// Repository-wide integration regressions; full runner exercises every gate.
const closureScript='scripts/persistence/validate-persistence-semantic-closure-registration.mjs';
test('closure: preserved historical exclusions and later approvals pass',closureScript,()=>{},{pass:true});
test('closure: later approval without provenance fails',closureScript,(dir)=>{
  const path='kernel/identifiers.json';const value=readJson(dir,path);
  delete value.entries.find(x=>x.id==='AssignmentId').promotion_issue;writeJson(dir,path,value);
},{pattern:/later AssignmentId approval requires issue #46/});
test('closure: historical promotion set drift fails',closureScript,(dir)=>{
  const path='persistence/semantic-closure/registration.json';const value=readJson(dir,path);
  value.promotions.identifiers[0].id='AssignmentId';writeJson(dir,path,value);
},{pattern:/exact historical identifiers promotion set/});
test('closure: excluded capability cannot become approved',closureScript,(dir)=>{
  const path='kernel/identifiers.json';const value=readJson(dir,path);
  value.entries.find(x=>x.id==='CapabilityId').status='approved';writeJson(dir,path,value);
},{pattern:/excluded CapabilityId must remain candidate/});

const integrationScript='scripts/architecture/validate-repository-integration.mjs';
test('integration: clean complete source/authority inventory passes',integrationScript,()=>{},{pass:true});
test('integration: Application cannot import Infrastructure',integrationScript,(dir)=>{
  writeFileSync(join(dir,'src/modules/identity/application/foreign-dependency.ts'),"import '../infrastructure/persistence/schema.js';\n");
},{pattern:/Application imports Infrastructure/});
test('integration: Domain cannot import database driver',integrationScript,(dir)=>{
  writeFileSync(join(dir,'src/modules/identity/domain/database-dependency.ts'),"import { sql } from 'drizzle-orm';\n");
},{pattern:/Domain imports a non-Domain/});
test('integration: foreign Infrastructure import fails',integrationScript,(dir)=>{
  writeFileSync(join(dir,'src/modules/learning/application/foreign-dependency.ts'),"import '../../identity/infrastructure/persistence/schema.js';\n");
},{pattern:/foreign Infrastructure import forbidden/});
test('integration: repository port cannot move to Infrastructure',integrationScript,(dir)=>{
  const path='src/modules/identity/infrastructure/persistence/postgres-credential-repository.ts';
  writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8')+'\nexport interface MisplacedRepository {}\n');
},{pattern:/repository port must be Application-owned/});
test('integration: missing repository input snapshot fails',integrationScript,(dir)=>{
  const path='src/modules/identity/infrastructure/persistence/postgres-credential-repository.ts';
  writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8').replace('input = snapshotPersistenceInput(input);',''));
},{pattern:/capture every mutable repository input before await/});
test('integration: queue READY without admission fails',integrationScript,(dir)=>{
  const path='persistence/physical-slices/queue-post-p05.json';const value=readJson(dir,path);
  value.slices[0].status='READY';value.slices[0].blockers=[];writeJson(dir,path,value);
},{pattern:/queue must preserve admission BLOCK/});
test('integration: invented relationship count fails',integrationScript,(dir)=>{
  const path='persistence/physical-slices/queue-post-p05.json';const value=readJson(dir,path);
  value.slices[0].relationships.push('LearningSessionUsesAssignment');writeJson(dir,path,value);
},{pattern:/queue relationship set must match/});
test('integration: unguarded migration entry point fails',integrationScript,(dir)=>{
  const path='scripts/db/migrate.ts';writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8').replace('assertIsolatedDatabaseTarget(process.env.DATABASE_URL)','process.env.DATABASE_URL'));
},{pattern:/isolated target guard must run before any Pool/});
test('integration: runtime activation in build-time composition fails',integrationScript,(dir)=>{
  const path='src/bootstrap/learning-persistence-schema.ts';writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8')+'\ndb.insert(table);\n');
},{pattern:/build-time schema composition cannot activate runtime/});

const p06Script='scripts/persistence/validate-slice-p06-schema-admission.mjs';
test('P06: complete BLOCK evidence evaluation passes',p06Script,()=>{},{pass:true});
test('P06: premature ADMIT fails',p06Script,(dir)=>{
  const path='persistence/physical-slices/assignment/admission.json';const value=readJson(dir,path);
  value.decision='ADMIT';writeJson(dir,path,value);
},{pattern:/current P06 decision must be BLOCK/});
test('P06: unknown criteria cannot become PROVEN',p06Script,(dir)=>{
  const path='persistence/physical-slices/assignment/admission.json';const value=readJson(dir,path);
  for(const item of value.criteria)item.state='PROVEN';writeJson(dir,path,value);
},{pattern:/four PROVEN and four UNKNOWN/});
test('P06: authoring while BLOCKED fails',p06Script,(dir)=>{
  const path='persistence/physical-slices/assignment/admission-evidence-plan.json';const value=readJson(dir,path);
  value.implementation_authorized=true;writeJson(dir,path,value);
},{pattern:/implementation_authorized must remain false/});
test('P06: incomplete acceptance evidence fails',p06Script,(dir)=>{
  const path='persistence/physical-slices/assignment/admission-evidence-plan.json';const value=readJson(dir,path);
  value.required_evidence=[];writeJson(dir,path,value);
},{pattern:/complete migration\/version\/scope\/audit\/atomicity evidence/});
test('whole audit: every standalone gate passes', 'scripts/architecture/validate-whole-repository.mjs',()=>{},{pass:true});
test('whole audit: an otherwise untriggered historical validator fails', 'scripts/architecture/validate-whole-repository.mjs',(dir)=>{
  const path='scripts/persistence/validate-persistence-semantic-closure-registration.mjs';
  writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8')+'\nprocess.exit(1);\n');
},{pattern:/validate-persistence-semantic-closure-registration/});

// Super-batch coverage and future admission negative proofs.
for(const [slice,lane] of [['p07','certification'],['p08','progress-event']]) {
  const script=`scripts/persistence/validate-slice-${slice}-schema-admission.mjs`;
  test(`${slice}: complete BLOCK evaluation passes`,script,()=>{},{pass:true});
  test(`${slice}: premature ADMIT fails`,script,(dir)=>{const path=`persistence/physical-slices/${lane}/admission.json`;const d=readJson(dir,path);d.decision='ADMIT';writeJson(dir,path,d);},{pattern:/current admission decision must be BLOCK/});
  test(`${slice}: invented lifecycle fails`,script,(dir)=>{const path=`persistence/physical-slices/${lane}/admission-evidence-plan.json`;const d=readJson(dir,path);d.lifecycle_decision='ACTIVE_REVOKED';writeJson(dir,path,d);},{pattern:/lifecycle_decision remains UNKNOWN/});
  test(`${slice}: unknown criteria cannot be PROVEN`,script,(dir)=>{const path=`persistence/physical-slices/${lane}/admission.json`;const d=readJson(dir,path);d.criteria.forEach(x=>x.state='PROVEN');writeJson(dir,path,d);},{pattern:/four PROVEN and four UNKNOWN/});
  test(`${slice}: migration authoring forbidden while blocked`,script,(dir)=>{const path=`persistence/physical-slices/${lane}/admission-evidence-plan.json`;const d=readJson(dir,path);d.migration_authoring_authorized=true;writeJson(dir,path,d);},{pattern:/migration_authoring_authorized must remain false/});
  test(`${slice}: required evidence cannot be omitted`,script,(dir)=>{const path=`persistence/physical-slices/${lane}/admission-evidence-plan.json`;const d=readJson(dir,path);d.required_evidence=[];writeJson(dir,path,d);},{pattern:/complete replay, scope, version, audit and contention/});
  test(`${slice}: exact logical relationships required`,script,(dir)=>{const path=`persistence/physical-slices/${lane}/admission-evidence-plan.json`;const d=readJson(dir,path);d.registered_relationships=[];writeJson(dir,path,d);},{pattern:/exact approved relationship inventory/});
}
const coverageScript='scripts/architecture/validate-command-coverage.mjs';
const coveragePath='verification/whole-repository/command-coverage.json';
test('coverage: exact complete ledger passes',coverageScript,()=>{},{pass:true});
test('coverage: omitted command fails',coverageScript,(dir)=>{const d=readJson(dir,coveragePath);d.commands.pop();writeJson(dir,coveragePath,d);},{pattern:/exact approved command inventory/});
test('coverage: wrong command owner fails',coverageScript,(dir)=>{const d=readJson(dir,coveragePath);d.commands[0].owner='Learning';writeJson(dir,coveragePath,d);},{pattern:/owner\/authority drift/});
test('coverage: partial foundation cannot claim runtime conformance',coverageScript,(dir)=>{const d=readJson(dir,coveragePath);d.commands[0].runtime_conformance='PROVEN';writeJson(dir,coveragePath,d);},{pattern:/full runtime conformance cannot be claimed/});
test('coverage: missing source symbol fails',coverageScript,(dir)=>{const d=readJson(dir,coveragePath);d.commands[0].artifacts[0].symbol='inventedCommand';writeJson(dir,coveragePath,d);},{pattern:/source symbol missing/});
test('coverage: missing test reference fails',coverageScript,(dir)=>{const d=readJson(dir,coveragePath);d.commands[0].tests[0]='src/missing.test.ts';writeJson(dir,coveragePath,d);},{pattern:/referenced test missing/});
test('coverage: unresolved obligations cannot disappear',coverageScript,(dir)=>{const d=readJson(dir,coveragePath);d.commands[0].missing_obligations=[];writeJson(dir,coveragePath,d);},{pattern:/missing obligations must remain explicit/});
test('coverage: duplicate row cannot conceal missing command',coverageScript,(dir)=>{const d=readJson(dir,coveragePath);d.commands[1]=d.commands[0];writeJson(dir,coveragePath,d);},{pattern:/exact approved command inventory/});
test('integration: future table cannot hide in existing module',integrationScript,(dir)=>{const path='src/modules/identity/infrastructure/persistence/schema.ts';writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8')+'\nexport const futureTable = pgTable("learning_assignments", {});\n');},{pattern:/future physical table has no ADMIT authority/});
test('integration: future table cannot enter existing migration',integrationScript,(dir)=>{const path='drizzle/0004_slice_p05_learning_session.sql';writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8')+'\nCREATE TABLE "certifications" (id text);\n');},{pattern:/future migration table has no ADMIT authority/});
test('integration: future snapshot table cannot precede admission',integrationScript,(dir)=>{const path='drizzle/meta/0004_snapshot.json';const d=readJson(dir,path);d.tables['public.progress_events']={};writeJson(dir,path,d);},{pattern:/future snapshot table has no ADMIT authority/});
test('integration: path-filtered physical proof workflow fails',integrationScript,(dir)=>{const path='.github/workflows/slice-p01-implementation.yml';writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8').replace('pull_request:',"pull_request:\n    paths: ['src/**']"));},{pattern:/physical proofs must run on every PR and main tree/});
test('integration: missing future evidence plan fails',integrationScript,(dir)=>{const path='persistence/physical-slices/queue-post-p05.json';const d=readJson(dir,path);d.slices[1].evidence_plan=null;writeJson(dir,path,d);},{pattern:/evidence plan is required/});

// Development automation stays distinct from runtime authorization.
const selfAuditScript='scripts/verification/validate-development-self-audit.mjs';
const selfAuditWorkflow='.github/workflows/development-self-audit.yml';
const mutateText=(dir,path,from,to)=>writeFileSync(join(dir,path),readFileSync(join(dir,path),'utf8').replace(from,to));
test('self-audit: bounded complete automatic workflow passes',selfAuditScript,()=>{},{pass:true});
test('self-audit: production permission cannot be inferred',selfAuditScript,(dir)=>{const path='verification/whole-repository/self-audit-plan.json';const d=readJson(dir,path);d.shared_or_production_execution_authorized=true;writeJson(dir,path,d);},{pattern:/exact bounded/});
test('self-audit: unbounded command plan fails',selfAuditScript,(dir)=>{const path='verification/whole-repository/self-audit-plan.json';const d=readJson(dir,path);d.stages[0].timeout_ms=60000;writeJson(dir,path,d);},{pattern:/exact bounded/});
test('self-audit: omitted CI checkpoint fails',selfAuditScript,(dir)=>mutateText(dir,selfAuditWorkflow,'--stage typecheck','--stage invented'),{pattern:/complete ordered/});
test('self-audit: stale checkout cannot claim candidate proof',selfAuditScript,(dir)=>mutateText(dir,selfAuditWorkflow,'ref: ${{ github.event.pull_request.head.sha || github.sha }}','ref: main'),{pattern:/exact candidate/});
test('self-audit: filtered automation fails',selfAuditScript,(dir)=>mutateText(dir,selfAuditWorkflow,'pull_request:',"pull_request:\n    paths: ['src/**']"),{pattern:/every PR/});
test('self-audit: missing failure finalizer fails',selfAuditScript,(dir)=>mutateText(dir,selfAuditWorkflow,'if: always()','if: success()'),{pattern:/finalize and be retained/});
test('self-audit: missing command PG evidence fails',selfAuditScript,(dir)=>mutateText(dir,'.github/workflows/slice-p02-implementation.yml','run: pnpm test:identity:commands:integration','run: echo skipped'),{pattern:/atomic Identity integration/});
test('self-audit: missing transaction-bound audit connection fails',selfAuditScript,(dir)=>mutateText(dir,'src/modules/identity/infrastructure/persistence/postgres-identity-command-transaction.ts','bindings.audit(transaction)','bindings.audit(this.db)'),{pattern:/exact-transaction binding/});

// Recovery proposals and legacy evidence remain separate from owner authority.
const recoveryScript='scripts/verification/validate-legacy-foundation-recovery.mjs', recoveryBase='verification/legacy-recovery/';
test('recovery: complete pinned proposal inventory passes',recoveryScript,()=>{},{pass:true});
test('recovery: omitted owner question fails',recoveryScript,dir=>{const p=recoveryBase+'owner-decisions.json',d=readJson(dir,p);d.unresolved_contract_questions.pop();writeJson(dir,p,d);},{pattern:/live owner inventory drift/});
test('recovery: newly added question cannot escape projection',recoveryScript,dir=>mutateText(dir,'contracts/c00-system-authority-contract.md','## 7.','| OQ-SYS-99 | Additional owner choice | Yes | SYS-4 |\n\n## 7.'),{pattern:/live owner inventory drift/});
test('recovery: recommendation cannot record approval',recoveryScript,dir=>{const p=recoveryBase+'decision-packet.json',d=readJson(dir,p);d.owner_approval_recorded=true;writeJson(dir,p,d);},{pattern:/recommendations cannot grant authority/});
test('recovery: missing recommendation fails',recoveryScript,dir=>{const p=recoveryBase+'decision-packet.json',d=readJson(dir,p);d.recommendations.pop();writeJson(dir,p,d);},{pattern:/exact complete recommendation/});
test('recovery: incomplete capability bundle cannot be review ready',recoveryScript,dir=>{const p=recoveryBase+'decision-packet.json',d=readJson(dir,p);d.review_ready_selection_ids.push('OQ-AUTHZ-1');writeJson(dir,p,d);},{pattern:/detailed owner values/});
test('recovery: legacy cannot authorize V2',recoveryScript,dir=>{const p=recoveryBase+'legacy-sources.json',d=readJson(dir,p);d.legacy_authority_for_v2=true;writeJson(dir,p,d);},{pattern:/legacy evidence cannot grant/});
test('recovery: wrong pinned head fails',recoveryScript,dir=>{const p=recoveryBase+'legacy-sources.json',d=readJson(dir,p);d.sources[0].head_sha='0'.repeat(40);writeJson(dir,p,d);},{pattern:/exact pinned source/});
test('recovery: altered reference excerpt fails',recoveryScript,dir=>{const p=recoveryBase+'legacy-excerpts.json',d=readJson(dir,p);d.excerpts[0].text+='invented';writeJson(dir,p,d);},{pattern:/excerpt source and digest/});
test('recovery: global audit transaction binding fails',recoveryScript,dir=>mutateText(dir,'src/modules/identity/infrastructure/persistence/postgres-session-command-transaction.ts','auditFactory(transaction)','auditFactory(this.db)'),{pattern:/same transaction binding/});
test('recovery: missing session PG CI evidence fails',recoveryScript,dir=>mutateText(dir,'.github/workflows/slice-p02-implementation.yml','run: pnpm test:session:commands:integration','run: echo skipped'),{pattern:/session transaction PG automation/});

// Explicit owner choices never authorize the accompanying draft recommendations.
const ownerPolicyScript='scripts/verification/validate-owner-policy-registration.mjs', ownerPolicyBase='verification/owner-decisions/2026-10-04/';
const mutateOwnerRecord=(dir,id,change)=>{const p=ownerPolicyBase+'registration.json',d=readJson(dir,p);change(d.records.find(x=>x.id===id));writeJson(dir,p,d);};
test('owner policy: exact selected policies and unresolved drafts pass',ownerPolicyScript,()=>{},{pass:true});
test('owner policy: invented PIN attempt limit fails',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-IDN-6',r=>{r.value.attempts=6;}),{pattern:/exact selected OQ-IDN-6/});
test('owner policy: shortened rollback compatibility fails',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-REL-4',r=>{r.value.migration_backward_compatibility_hours=12;}),{pattern:/exact selected OQ-REL-4/});
test('owner policy: privacy draft cannot become approved',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-PRIV-1',r=>{r.state='CONFIRMED';r.owner_selection_recorded=true;}),{pattern:/unselected OQ-PRIV-1/});
test('owner policy: draft exemption cannot be approved',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-PRIV-3',r=>{r.exemption_basis_approved=true;}),{pattern:/approve exemptions/});
test('owner policy: retention cannot extend credential validity',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-PRIV-2',r=>{r.credential_validity_extension_authorized=true;}),{pattern:/extend authentication validity/});
test('owner policy: new matrix direction cannot import V1 grants',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-AUTHZ-1',r=>{r.value.legacy_grants_adopted=true;}),{pattern:/new matrix direction/});
test('owner policy: provider recommendation cannot activate analytics',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-OBS-1',r=>{r.analytics_activation_authorized=true;}),{pattern:/recommended providers cannot approve/});
test('owner policy: one-year audit duration cannot authorize deletion',ownerPolicyScript,dir=>{const p=ownerPolicyBase+'registration.json',d=readJson(dir,p);d.effects.audit_deletion_authorized=true;writeJson(dir,p,d);},{pattern:/policy effects must preserve/});
test('owner policy: selected duration cannot claim retention enforcement',ownerPolicyScript,dir=>mutateOwnerRecord(dir,'OQ-OBS-3',r=>{r.retention_conformance='PROVEN';}),{pattern:/retention policy is not enforcement evidence/});
test('owner policy: rewritten superseded contract fails',ownerPolicyScript,dir=>mutateText(dir,'contracts/superseded/c11-identity-credentials-contract-1.3.0.md','**IDN-1**','**IDN-999**'),{pattern:/historical contract body cannot be rewritten/});
test('owner policy: existing audit deletion guard cannot weaken',ownerPolicyScript,dir=>mutateText(dir,'contracts/c23-audit-lifecycle-events-contract.md','MUST NOT be updated or deleted through application paths','MAY be deleted through application paths'),{pattern:/existing requirement meaning/});
test('owner policy: new route source invalidates empty scan',ownerPolicyScript,dir=>{writeFileSync(join(dir,'src/bootstrap/new-router.ts'),"router.get('/health', handler);\n");},{pattern:/route scan must cover exact current src inventory/});
test('recovery: generated owner view cannot misstate a recommendation',recoveryScript,dir=>mutateText(dir,recoveryBase+'owner-decisions.md','Keep deterministic paths first','MUTATED_RECOMMENDATION'),{pattern:/exact generated decision view/});

test('owner policy: malformed revision change-log header fails',ownerPolicyScript,dir=>mutateText(dir,'contracts/c23-audit-lifecycle-events-contract.md','| Version | Date | Change | By |','| Version | 1.1.0 |'),{pattern:/complete revision change-log table/});
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
console.log(`Validator inventory: ${inventoryCount}; shard: ${shardIndex}/${shardTotal}; selected: ${results.length}; digest: ${createHash("sha256").update(JSON.stringify(inventoryNames)).digest("hex")}`);
process.exit(failed ? 1 : 0);
