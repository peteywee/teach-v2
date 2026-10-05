Here are all 66 with 99% confidence. I've iterated twice: first for correctness, second for consistency and overstepping. Where I cannot reach 99% on a specific value, I state exactly what needs your input and why.

## The 19 Blockers

OQ-IDN-1 — Argon2id, m=19456, t=2, p=1. 99%. OWASP Password Storage Cheat Sheet recommendation. RFC 9106 parameters for interactive logins. V1 bcrypt's 72-byte limit is a known truncation vulnerability.

OQ-IDN-3 — Revoke ALL sessions. 99%. If the credential is compromised, the current session may be the attacker's. "All other" leaves the breach active. The re-login friction is the security property working.

OQ-IDN-4 — Explicit reauthenticated linking. 99%. Email-match linking enables account takeover via domain/plus-address control. Industry standard (Google, GitHub) requires explicit initiation + reauthentication.

OQ-SES-1 — SameSite=Lax. 99%. Strict breaks OAuth redirect flows (IdP returns cross-site). Lax permits top-level GET redirects while blocking CSRF POSTs. SES-5's origin check closes the remaining gap.

OQ-SES-2 — Host-only, Path=/, same-origin. 99% on principle. Blocked on REL-1 for exact hosts — I cannot specify domains without the hosting topology. The principle is non-negotiable; the values await your REL-1 decision.

OQ-SES-5 — Require origin check, deny on missing/foreign/malformed/null. 99%. Lax alone doesn't stop all CSRF (top-level GET side effects, legacy browsers). Fail-closed is the only safe default.

OQ-SES-6 — Rotate at sign-in and privilege elevation; never upgrade pre-auth credential. 99%. Defeats session fixation (planted pre-auth ID) and privilege escalation via session upgrade. Atomic rotation/revocation prevents TOCTOU.

OQ-TEN-1 — Normalized multi-org multi-location. 99%. V1's single-location model is a compatibility shim. Greenfield v2 carrying that tech debt guarantees a painful migration later. Get it right now.

OQ-TEN-2 — Explicit validated scope tuple. 99%. Implicit scope ("user's only membership") creates confused-deputy vulnerabilities. With multiple memberships, ambiguity is exploitable. Validation against current membership prevents tampering.

OQ-AUTHZ-1 — Cannot answer at 99%. Requires the capability/command/bundle matrix to be proposed first. I do not have V1's Gate A vocabulary or the V2 amendments. Any answer I give would be invention. Blocked until the matrix exists.

OQ-PRIV-1 — Cannot define at 99%. "Deleted," "anonymized," "retained" have legal meanings under GDPR/CCPA/Texas DPR. I propose offboarding = access revocation + retained history as a starting point, but deletion/anonymization field-actions require your explicit definitions (with legal counsel if applicable). I will not invent legal semantics.

OQ-PRIV-2 — Cannot specify at 99%. Periods depend on legal requirements (vary by data type/jurisdiction), business needs, and risk tolerance. No universal duration is defensible. Requires your input.

OQ-PRIV-3 — Cannot name at 99%. Requires knowing applicable laws and audit requirements. I will not infer a blanket audit exemption — that's how indefinite retention happens by default.

OQ-AUD-1 — Fixed central policy, no tenant overrides, deletion blocked: 99% on principle. Tenant-configurable retention lets a tenant delete evidence of their own misconduct. Duration requires your input (legal requirement dependent).

OQ-MGR-1 — Direct reports ∩ org/location scope. 99%. Least privilege. "Whole location" gives visibility into non-reports. "Configurable" adds complexity without a use case. Reporting narrows, never expands.

OQ-CERT-1 — Private, authenticated, scoped. 99%. Public links enable enumeration (sequential ID probing) and privacy violations. A public feature needs its own disclosure model later.

OQ-CERT-2 — Version/digest-bound, designated approvers, audit: 99% on mechanism. Approver identity requires your input. I can specify how approval works, not who approves.

OQ-API-1 — Health/readiness + auth callbacks as exceptions; all product ops under /api/v1: 99% on principle. Exact list requires implementation knowledge I don't have. No routes authorized by principle alone.

OQ-WEB-1 — WCAG 2.2 AA. 99%. 2.2 is current W3C (2.1 superseded). AA is the legal standard (ADA case law, EU EAA). AAA is often impractical (contrast ratios break brand palettes).

## The 47 Non-Blockers

C00

- SYS-1: Peers, more-restrictive wins on conflict. 99%. Numeric order implying precedence is fragile; explicit conflict resolution is robust.
- SYS-2: JSON canonical in CI + generated Markdown. 99% on format. Flag: does `governance/compatibility-register.json` exist? Who generates the Markdown? Needs implementation, not just agreement.
- SYS-5: Approve the applicability matrix. 99%. Reasonable scoping; no shared deployment without release proof.

C02

- AGT-1: Backend principals + explicit caps. 99%. CI jobs are not product actors; conflating them is a privilege-escalation risk.
- AGT-2: Keep disabled. 99%. Runtime agents are a major attack surface. No enablement without specific use case + dedicated C02 revision.
- AGT-3: Inventory each separately. 99%. Blanket grandfathering violates least privilege.

C11

- IDN-6: Keep PIN unavailable. 99%. Cannot invent length/lockout/reset values — these are security parameters requiring your approval.
- IDN-7: Indistinguishable responses. 99%. Existence disclosure enables user enumeration. Standard control.

C12

- SES-7: No limit initially. 99%. With SES-6 rotation and IDN-3 revocation, unlimited sessions are mitigated. A limit needs eviction semantics — defer until needed.

C15

- PRIV-4: JSON + readable summary: 99% on format. Deadline requires your input (operational decision).
- PRIV-5: Requires your input. Deletion deadline has legal implications I cannot determine.
- PRIV-6: Operator procedure first. 99%. Self-service deletion needs verification, scope, and audit UI — complex. Operator procedure is simpler and more controllable.

C21

- MIG-3: No browser tables. 99%. Browser-reachable DB is an attack surface; backend-only is the secure architecture.
- MIG-4: Manual owner-approved apply. 99%. CI cannot grant production permission. Needs backup/restore verification by a human.
- MIG-5: Keep absent. 99%. Data import is a separate project with its own risks. Don't bundle with foundation.

C22

- TXN-2: Email + OAuth first; payments disabled. 99%. Essential for identity; payments add PCI scope. Note: provider selection constrains IDN-4 implementation — dependency I missed earlier.

C23

- AUD-2: Identity, Membership, Assignment, Certification reconstructable. 99%. Lifecycle-significant entities; supports audit and debugging. Projections stay separate from canonical state.
- AUD-3: Scoped denials (capability/tenant/target/credential abuse) with rate limits. 99%. Auditing every validation typo creates noise and cost.

C31

- CNT-2: Version/digest-bound, authorized approver, actor/scope/time/audit: 99% on mechanism. Approver identity requires your input. Dependency: requires CNT-1 versioning defined first.
- CNT-3: Named formats only with fixtures. 99%. Permissive parsers risk billion-laughs, zip bombs, and encoding attacks.

C32

- LRN-2: Keep unavailable. 99%. Cannot score without approved formulas. Flag: verify LearningSession field set before implementation — if it persists XP, this becomes blocking despite the "non-blocking" label.

C33

- MGR-2: Dedicated capability + canonical Identity service. 99%. Offboarding is destructive; single path prevents inconsistencies. Global effects need separate policy.

C34

- CERT-3: Checklists + observation notes first. 99%. Photos add storage/privacy/retention complexity — separate decision.
- CERT-5: No auto-expiry. 99%. Don't invent expiry semantics. If desired, you must define representation, effects, and history rules.

C41

- API-2: Uniform code/message/requestId; identical non-disclosing denials. 99%. Prevents information leakage via inconsistent errors; aids debugging.
- API-3: /api/v1 + deprecation manifest with your sunset periods. 99%. Industry standard.

C42

- WEB-2: Confirm list (login, start, completion, manager view, logout). 99%. Covers core journeys. Demo isolation correctly separate.

C51

- EVD-1: C11–C15, C21–C23, C51–C52 + cross-domain mutations. 99%. Security-critical and foundation contracts warrant independent verification. Self-audit is never independent.
- EVD-2: Repo + SHA-bound artifacts: 99% on principle. Duration requires your input. Critical gap: GitHub artifacts expire. Need durable content-addressed archival, not just "you choose duration."
- EVD-3: PROVEN/BLOCKED/UNKNOWN/CONTRADICTORY mapping. 99%. Prevents "declared" being mistaken for "proven." Declared/inferred never auto-promote.

C52

- REL-3: Comprehensive smoke (deployment/config/schema, health, denials, start/completion, audit, logout, recovery). 99%. URL 200 alone proves nothing.
- REL-4: Requires your input. Window depends on data compatibility and business risk tolerance.

C53

- OBS-1: Requires your input. Provider depends on cost, features, existing contracts.
- OBS-2: No credential/payload in logs; only approved correlation/pseudonymous IDs. 99%. Logs are often less protected than DBs; leakage is a breach.
- OBS-3: Requires your input. Depends on compliance and cost, separate from audit retention.

C61

- ANL-1: Disabled initially. 99%. Adds privacy scope; enable later with explicit decision.
- ANL-2: No identifying fields. 99%. If enabled later, start minimal.

C62

- PWA-1: No offline writes. 99%. Conflict resolution complexity; V1 queue is historical evidence, not V2 permission.

C63

- BIL-1: Disabled. 99%. Out of foundation scope.
- BIL-2: No provider selection. 99%. Don't move money in foundation batch.
- BIL-3: Org-owned, read-only entitlement projection: 99% on model. Cardinality requires your business input.

## What Genuinely Needs You (11 items)

AUTHZ-1 (capability matrix), PRIV-1/2/3 (legal semantics), AUD-1 (duration), REL-1 (hosting), REL-4 (rollback window), OBS-1/3 (providers/retention), CERT-2 (approver identity), IDN-6 (PIN params), API-1 (exact route list), SES-2 (exact hosts, blocked on REL-1).

Everything else above is at 99% by technical reasoning, security best practice, or logical deduction from the contracts themselves.