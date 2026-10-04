// Current migration authority permits disposable local tests only. This opt-in
// is an operator assertion, not backup/restore proof or production permission.
export function assertIsolatedDatabaseTarget(connectionString, env = process.env) {
  if (env.TEACH_ISOLATED_DB !== '1') {
    throw new Error('Database execution BLOCKED: TEACH_ISOLATED_DB=1 is required for disposable local tests');
  }
  let target;
  try { target = new URL(connectionString); }
  catch { throw new Error('Database execution BLOCKED: valid isolated DATABASE_URL is required'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      target.search || target.hash) {
    throw new Error('Database execution BLOCKED: only a loopback PostgreSQL URL without target overrides is permitted');
  }
  if (!/^\/teach_v2(?:_[a-z0-9_]+)?$/.test(target.pathname) ||
      /_(?:prod|production|shared|live)(?:_|$)/.test(target.pathname)) {
    throw new Error('Database execution BLOCKED: an isolated teach_v2 test database is required');
  }
  return connectionString;
}
