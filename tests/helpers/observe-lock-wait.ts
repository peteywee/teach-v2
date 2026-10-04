import assert from 'node:assert/strict';
import type { Pool } from 'pg';

// Observe PostgreSQL's actual blocking dependency, rather than infer it from a
// fixed sleep. The assertion is bounded and runs only in isolated CI fixtures.
export async function observeLockWait(pool: Pool, blockerPid: number, minimum = 1): Promise<void> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    await pool.query('select pg_stat_clear_snapshot()');
    const row = await pool.query<{ count: number }>(`with recursive blocked(pid) as (
      select pid from pg_stat_activity where datname=current_database() and $1=any(pg_blocking_pids(pid))
      union
      select activity.pid from pg_stat_activity activity
      join blocked parent on parent.pid=any(pg_blocking_pids(activity.pid))
      where activity.datname=current_database()
    ) select count(*)::int as count from blocked`, [blockerPid]);
    if ((row.rows[0]?.count ?? 0) >= minimum) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`expected ${minimum} query(s) blocked by held PostgreSQL lock`);
}
