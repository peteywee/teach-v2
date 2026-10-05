# Owner decision reconciliation

Five exact selections are registered through SYS-21 issue #66: Supabase PostgreSQL + Vercel; 24-hour rollback compatibility; one-year central audit retention with deletion blocked; 90-day operational log retention; 6-digit PIN / 5 attempts / 15-minute lock with PIN authentication unavailable.

These resolve policy questions, not executable proof. Real release targets, rollback evidence, retention clocks/workers/archives and PIN hashing/attempt/reset/runtime evidence remain UNKNOWN or absent. Existing session and token expiries are unchanged. No other recommendation in the supplied attachment becomes an approval, regardless of its confidence label.

| Item | State | Next evidence/action |
| --- | --- | --- |
| New V2 capability matrix | Direction recorded; exact matrix unapproved | #67: propose command/capability/bundle/read/bootstrap/scope matrix with denial cases; C01 names / C14 semantics |
| Privacy definitions, one-year record-class retention, exemptions | Draft for review | #68: per-field action/clock/hold/dependent-copy matrix; distinguish pseudonymization from anonymization and subject-delete exemption from expiry |
| Certification criteria approver | UNKNOWN | Owner supplies role/title and approval-record ownership before resolution |
| Sentry and Vercel Analytics | Recommended | Error provider and alert destination remain unapproved; Analytics activation remains separate C61 gate |
| t34ch.com same-origin / host-only cookie / Lax | Recommended | Exact topology and SameSite require owner selection; no routes, DNS or provider settings changed |
| API exceptions | Source scan complete; selection open | Current V2 implements zero HTTP routes. Propose exact exception paths/methods/owners/auth before implementing them |

## Draft corrections

“PII replaced with irreversible hash” is not a sufficient anonymization guarantee. Direct identifiers can be guessed or linked even though a hash has no inverse function; NIST SP800-188 section4.3.2 discusses these risks. A corrected proposal must specify per-field removal/replacement, residual linkage, dependent copies and evidence. Hashes cannot automatically be treated as non-personal data.

Hard deletion and IdentityStatus.DELETED are different. The latter currently has no authorized ingress. The field/copy matrix must resolve existing immutable lifecycle/audit records, foreign references, backup expiry and exports before any destructive implementation. Offboarding retains its already-approved canonical Identity effects; “revoke access, retain history” is a draft summary, not permission to redefine them.

One year of retained record evidence does not make a session, invitation or reset/setup token valid for a year. Existing 12-hour/30-minute session limits and 7-day/15-minute/1-hour single-use-secret limits remain binding. The proposed generic retention clock and legal-hold actor/effects need detail. Credential hashes are authentication verifiers and must not be repurposed as a PII-anonymization mechanism.

Audit duration is selected separately. C23 still forbids application UPDATE/DELETE; deletion stays blocked. One-year policy cannot claim conformance until its clock/executor/exemption interactions and evidence are established. It does not approve the separate C15 exemption draft.

Sentry documents 30-day log lookback; Vercel runtime logs document shorter plan-specific horizons, up to 30 days. Neither alone proves 90-day retention. A redacted archive/sink and enforcement evidence are needed before making that claim. The supplied $0 total is not a verified project cost or spending approval.

## Scope and next batch

Prior C11/C23/C52/C53 versions are preserved; new stable requirement/acceptance IDs are appended; the central ledger/index and live owner projection are regenerated. No kernel, ownership, Application/Persistence authority, admission, migration, dependency, runtime or production state changes.

Next: complete #67’s concrete matrix and #68’s per-field privacy packet; collect owner decisions on recommended transport/error provider and unknown approver. Keep P06 #60 and atomic Learning #58 separate. Infrastructure choice does not turn provider claims into runtime evidence.

References: [NIST SP800-188](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-188.pdf), [Sentry log lookback](https://blog.sentry.io/log-drains-now-available/), [Vercel runtime-log limits](https://vercel.com/docs/logs/runtime).
