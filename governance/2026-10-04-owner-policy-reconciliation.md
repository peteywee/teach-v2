<!--tos-doc
{
  "doc_id": "TEACH-GOV-OWNER-POLICY-66",
  "class": "governance-policy",
  "version": "1.0.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-04",
  "updated_on": "2026-10-04",
  "depends_on": ["contracts/", "verification/owner-decisions/2026-10-04/registration.json"]
}
-->

# SYS-21 owner policy reconciliation — issue #66

Issue #66 was created before material edits. Owner selections are dated 2026-10-04 America/Chicago, against main `3fe92889aa55fa4a69d3b1e28c3a1211719b1b3f`. The attachment is reference recommendations, not an approval token for its other questions or confidence claims.

| Contract | Preserved → current | Selected question | Appended requirement / acceptance |
| --- | --- | --- | --- |
| C11 | 1.3.0 → 1.4.0 | OQ-IDN-6: 6 digits, 5 attempts, 15-minute lock; PIN authentication unavailable | IDN-30 / IDN-AC-23 |
| C23 | 1.0.3 → 1.1.0 | OQ-AUD-1: one year, central policy, no tenant overrides; deletion BLOCKED | AUD-11 / AUD-AC-9 |
| C52 | 1.1.0 → 1.2.0 | OQ-REL-1: Supabase PostgreSQL + Vercel; OQ-REL-4: 24-hour rollback/migration compatibility | REL-17/18 / REL-AC-10/11 |
| C53 | 1.0.3 → 1.1.0 | OQ-OBS-3: 90-day operational logs, separate from audit | OBS-11 / OBS-AC-9 |

The prior normative bodies are preserved and hashed under contracts/superseded/. Existing requirement meaning/IDs remain unchanged; new IDs append policy/acceptance detail before any runtime implementation. Central package/ledger advances to 0.15.0; live index consistently counts unresolved rows, excluding resolved questions. Historical registration/kernel evidence is retained; live package pins and dependent source projections are regenerated.

Impact includes C12 session/token validity, C14 capability authorization, C15 privacy, C21 migration compatibility/production proof, C23 audit immutability, C34 criteria approval, C41 transport and C61 analytics. None of those separate gates is waived. OQ-AUTHZ-1 has new-matrix direction only (#67); OQ-PRIV-1/2/3 remain drafts (#68). Provider/alert destination, cookie topology/SameSite, certification approver and exact API exceptions remain unresolved.

Implementation conformance for the new policies is UNKNOWN. Source scans, schema admission, deployed/provider capability, retention worker/archive/clock, PIN authentication and production rollback evidence are different claims. No runtime code, dependency, kernel/ownership, Application/Persistence authority, admission, migration, provider configuration, destructive operation or deployment changes.

Verification: exact prior-body hash; unchanged prior requirements; current contract/index/ledger ancestry; positive/negative owner-state classification; exact source route-scan hash; regeneration of live owner inventory and generated Markdown; preserved verifier/expiry policy; full existing repository/self-audit checks. Results become PROVEN only when exact-source CI completes; independent review is not claimed.
