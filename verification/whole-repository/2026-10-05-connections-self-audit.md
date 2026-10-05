# Connected mechanisms and development self-audit

This batch connects approved Identity lifecycle mechanisms and makes whole-repository verification automatic. It does not close the runtime backlog. Development evidence and product execution permission remain separate.

| Connection | Authority and mechanism | Evidence and remaining boundary |
| --- | --- | --- |
| DeactivateIdentity | C11 IDN-16 / IDN-20; Authorization Application port → Identity Application orchestration → transaction-bound Identity repository → required AuditLifecycle Application port | Unit ordering/denial/input capture; PostgreSQL tests prove owned-session revocation and rollback before/after probe append. Real C14 authorizer and admitted audit storage/adapter absent. |
| ReactivateIdentity | C11 IDN-16 / IDN-21; same transaction boundary | Reactivation retains revoked sessions; audit failure rolls back Identity. Canonical event publication and replay/idempotency conformance remain unknown. |
| Required audit | C23 / approved Application AuditAppendInterface; mandatory logical append inside the owner transaction | Missing factories fail before database mutation; disposable `test_atomic_probe` verifies atomicity, transaction ID and connection identity. It is not an AuditEvent schema admission or audit-contract implementation proof. |
| Development checks | C02 AGT-17 / C23 EVD; bounded, source-bound checkpoint evidence | Every PR/main runs all 21 stages. Every existing standalone validator is discovered by the whole audit; every Domain/Application test is discovered by the foundation stage. Self-audit is not independent review. |
| Current state projection | Live registries, command coverage and physical readiness | Generated report separates current facts from preserved policy baseline commits. It does not silently reinterpret historical approval documents. |

The transaction binder receives two backend factories. Both receive the exact Drizzle transaction used by the Identity repository. Owner-private nested transactions become savepoints; rollback of the outer transaction removes owner changes and required append together. The fixture authorizer locks the target Identity, but does not establish real actor, capability, organization or scope authority. Backend composition must supply that authority; no default grant or no-op audit is supplied.

Actor references and request IDs are input facts, not grants. Request ID is correlation, not a proven deduplication mechanism. AutomationActor input does not register or authorize a product automation identity; C02/C14 owner decisions still apply. RuntimeAgent is rejected. No protected transport or runtime composition is activated.

## Development workflow

1. Open a PR early. Every push to that PR reruns the self-audit and all five physical-slice workflows on the exact candidate SHA; main updates rerun against exact main.
2. During local development, run `pnpm self-audit` repeatedly. Each invocation runs the next single bounded checkpoint. A changed source stamp restarts the sequence. Use `pnpm self-audit --stage authority` for a selected checkpoint.
3. `pnpm self-audit --finish` reconciles evidence. Dirty worktrees remain UNKNOWN; only a clean committed source, every required stage, pinned Node 20/Linux runtime, matching plan and complete test inventories can produce the aggregate development PROVEN result. Local Node versions outside the pinned runtime cannot establish that aggregate CI proof.
4. CI retains JSON checkpoint reports and final summary as a SHA-named artifact, including failed and incomplete results. Output digests link reports to the corresponding CI logs. Reports are ordinary CI evidence, not signed attestation or an independent reviewer.

Each child check uses direct argv with `shell:false`, a 25-second timeout and forced termination. The full workflow has a 15-minute job limit; setup/install are separate CI steps. Checks that exceed their bound fail rather than silently extending it. Validator negatives run as three disjoint shards with one identical inventory digest and complete selected-case totals. PostgreSQL stages run sequentially on one disposable PostgreSQL 17 service, with existing pre-Pool isolated-target guards. Latest-history empty/P04 upgrade replay runs in the self-audit; each P01–P05 workflow continues its own prior-slice replay.

The required stages cover authority/boundaries, APPLY pins, target/input denials, production denials, migration guards, APPLY regressions, all validator negatives, audit negative paths, pinned typecheck, all foundation tests, generation determinism, replay, isolated migration and all five PostgreSQL suites plus atomic Identity command tests.

## Exit evidence and open dependencies

Local prepublication checks passed: 49 standalone validators, 189 validator cases (63 in each matching shard), 31 self-audit regressions and 114 transpiled Domain/Application tests. This local test run is not pinned TypeScript or PostgreSQL proof; exact candidate/main CI supplies those checks and retained reports.

Storage remains 8 tables / 5 migrations / 8 repositories / 5 implemented slices. No migration, admitted physical shape or approved policy baseline is changed. The command ledger remains 23 commands: 12 PARTIAL / 11 BLOCKED, full runtime UNKNOWN, runtime activation BLOCKED. P06/P07/P08 remain BLOCK with four PROVEN and four UNKNOWN criteria each.

| Next owner dependency | Why it blocks |
| --- | --- |
| #60 P06 Assignment shape/content-version/scope | Assignment existence/authorization and Learning atomic start depend on admitted owner semantics. #58 remains open. |
| C11 OQ-IDN-1 / OQ-IDN-3 | Credential hashing and credential-change session revocation cannot be invented. A stale ledger phrase implying all-session revocation was corrected to preserve the owner decision. |
| C14 capability/scope vocabulary and current-fact adapters | Registry remains empty; fixture checks cannot establish real protected-command authorization. |
| AuditLifecycle admission and append adapter | Atomic wiring is available, but real required audit storage/retention/retrieval conformance is not. |
| #63 whole-command runtime closure | Canonical events, idempotency, transport composition and acceptance evidence remain obligations beyond foundation storage. |

Shared/production execution remains BLOCKED. This development workflow cannot authorize migrations there, activate a product agent, or promote candidate invariants/decision tables.
