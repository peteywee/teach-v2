# Paired database login tests

Production Vercel builds run two independent login tests after the existing
reviewed package builder succeeds. They use the same `TEACH_DB_PASSWORD` value
already inside the Production build environment. No credential is retrieved
through an API, printed, written to an artifact, or supplied in a URL.

| Test | Endpoint | Login role |
| --- | --- | --- |
| `vercel-pooler` | Existing shared pooler, port 6543 | `teach_v2_demo_runtime.acqafjkdkdmtpnsxiesw` |
| `supabase-direct` | Project's direct Postgres host, port 5432 | `teach_v2_demo_runtime` |

Each test makes one connection with certificate verification, sets the session
read-only at connection startup, and selects only the current role, database,
and read-only setting. It closes its own connection afterward. Connection,
query, and cleanup waits are bounded; neither test retries. The tests run in
parallel so an authentication or network failure in one cannot suppress the
other. Neither test uses the connector's privileged operator session.

The build logs contain one `TEACH_DATABASE_LOGIN_COMPARISON` JSON record with
the exact source commit, each outcome, and a comparison:

- `BOTH_AUTHENTICATED`: the deployed credential authenticated on both routes,
  with the intended role, database, verified TLS, and read-only session.
- `BOTH_REJECTED_PASSWORD`: both routes rejected the credential at login with
  SQLSTATE `28P01`; the tests do not claim to know either original password.
- `DIRECT_ACCEPTED_POOLER_REJECTED`: direct login accepted the credential while
  the shared pooler returned `28P01`, supporting investigation of the pooler.
- `INCONCLUSIVE`: networking, TLS, query/readback, cleanup, or mixed outcomes
  prevent a credential comparison. A direct IPv6 connectivity failure is not a
  password result.

Diagnostic results do not turn a failed login into an accepted release or
replace the browser/API/database acceptance checks. They do not change the
application handler, environment, role privileges, records, or runtime pool.
Preview/local builds make no hosted diagnostic connections. Invalid target or
configuration produces a fixed blocked report without opening a connection.

Regression checks: `node --import tsx --test tests/demo-successor/accepting.test.ts`.
Live results must come from a reviewed, exact-source Production build; local
test fixtures only validate the probe's behavior and secret-safe reporting.
