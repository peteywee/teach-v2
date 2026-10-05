# Follow-up answers supplied in conversation

Provenance: user message in supplied conversation context, message index 95, following PR #65 and preceding PR #69. Preserved wording below; the conversation did not expose an exact timestamp. The user later stated “I answered all questions” and requested that all answers be documented for reuse even while blocked. Recommendation and draft wording is retained.

Recording your decisions:

1. OQ-AUTHZ-1 — Create new capability matrix (not recover V1). I'll draft this as a separate work item.

2. OQ-PRIV-1/2/3 — Conservative defaults (option b). Drafting below for your review:

- Deletion = hard delete from database. Anonymization = PII replaced with irreversible hash. Retention = keep as-is. Offboarding = revoke access, retain history.
- Retention: 1 year for all record classes (Identity, Credential, session, token, membership, learning, certification, audit). Legal hold suspends deletion.
- Exemptions: Audit records only (per AUD-1). No blanket exemptions. Legal hold is a suspension, not an exemption.

3. OQ-AUD-1 — 1 year retention. Fixed central policy, no tenant overrides. Audit deletion blocked.

4. OQ-REL-1 — Supabase (Postgres) + Vercel. Confirmed.

5. OQ-REL-4 — 24-hour rollback window. Migrations must be backward-compatible for 24h post-deploy.

6. OQ-OBS-1 — My recommendation: Sentry for error tracking (free tier 5k errors/month, excellent Vercel integration). Use Vercel's built-in Analytics for basic traffic. Datadog is overkill for foundation. Total cost: $0 to start.

7. OQ-OBS-3 — 90 days log retention. Separate from audit retention (1 year).

8. OQ-CERT-2 — Unknown. Flagged for follow-up. When you know who approves certification criteria (role/title), I'll record it.

9. OQ-IDN-6 — 6-digit PIN, 5 attempts, 15-minute lock. Recorded. PIN auth stays unavailable until implementation.

10. OQ-API-1 — I'll scan the codebase for routes now.

11. OQ-SES-2 — Derived from Vercel hosting:

- Recommended: Same-origin. Web at `https://t34ch.com`, API at `https://t34ch.com/api/*`.
- Cookie: Host-only (no `Domain` attribute), `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`.
- Rationale: Same-origin eliminates CORS complexity and cookie cross-domain issues. The API boundary is path-based (`/api/v1/*`), not subdomain-based. If you later need `api.t34ch.com`, that's a separate decision with CORS implications.

Scanning for API routes now.
