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
    t = t.replace("0.14.0", "0.13.0");
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
