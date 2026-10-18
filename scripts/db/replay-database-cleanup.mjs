import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

// pg-pool can resolve end() before its clients finish disconnecting. Never
// terminate those backends: their still-open sockets can emit a fatal pool error.
// This is only for the disposable databases owned by the replay entry points.
export async function dropReplayDatabase(admin, name, timeoutMs = 5000) {
  if (!/^teach_v2_[a-z0-9_]+$/i.test(name)) throw new Error('unsafe replay database identifier');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) {
    throw new Error('replay disconnect timeout must be between 1 and 5000 ms');
  }
  const deadline = performance.now() + timeoutMs;
  while (true) {
    const sessions = await admin.query(
      'select pid from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
      [name],
    );
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw new Error(`replay database disconnect timed out: ${name}`);
    if (sessions.rows.length === 0) break;
    await delay(Math.min(25, remaining));
  }
  // No FORCE or backend termination: unexpected new connections must fail closed.
  await admin.query(`drop database if exists "${name}"`);
}
