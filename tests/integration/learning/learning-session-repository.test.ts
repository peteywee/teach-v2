import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import { observeLockWait } from '../../helpers/observe-lock-wait.js';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { learningSessions } from '../../../src/bootstrap/learning-persistence-schema.js';
import { PostgresLearningSessionRepository } from '../../../src/modules/learning/infrastructure/persistence/postgres-learning-session-repository.js';
import { completeLearningSession, newLearningSession } from '../../../src/modules/learning/domain/learning-session.js';

const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString, max: 20, statement_timeout: 5000 });
const repository = new PostgresLearningSessionRepository(drizzle(pool, { schema: { learningSessions } }), learningSessions);
const references = { id: 'session-1', identityId: 'learner-1', assignmentId: 'assignment-1' };
const scope = { id: references.id, identityId: references.identityId };

function postgresError(code: string) {
  return (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const wrapped = error as Error & { code?: string; cause?: unknown };
    const cause = (wrapped.cause ?? wrapped) as { code?: string };
    return cause.code === code;
  };
}

beforeEach(async () => {
  await pool.query('truncate table identity_identities cascade');
  await pool.query("insert into identity_identities (id) values ('learner-1'),('learner-2')");
});
after(async () => { await pool.end(); });

test('persists ACTIVE with one required Assignment reference and canonical Identity FK', async () => {
  assert.deepEqual(await repository.createAuthorizedStart(newLearningSession(references)), newLearningSession(references));
  const row = await pool.query('select * from learning_sessions where id=$1', [references.id]);
  assert.deepEqual(row.rows[0], { id: references.id, identity_id: references.identityId, assignment_id: references.assignmentId, status: 'ACTIVE' });
  const columns = await pool.query("select column_name,is_nullable from information_schema.columns where table_schema='public' and table_name='learning_sessions' order by ordinal_position");
  assert.deepEqual(columns.rows.map((row) => [row.column_name, row.is_nullable]), [['id','NO'],['identity_id','NO'],['assignment_id','NO'],['status','NO']]);
  const fks = await pool.query("select pg_get_constraintdef(oid,true) as definition from pg_constraint where conrelid='learning_sessions'::regclass and contype='f'");
  assert.equal(fks.rows.length, 1); assert.match(fks.rows[0].definition, /REFERENCES identity_identities\(id\)/);
  // No Assignment table exists in this slice; this proves requiredness only.
});
test('missing Identity is rejected by the physical FK', async () => {
  await assert.rejects(repository.createAuthorizedStart(newLearningSession({ ...references, identityId: 'missing' })), postgresError('23503'));
  assert.equal((await pool.query('select count(*)::int as n from learning_sessions')).rows[0].n, 0);
});
for (const assignment of [null, '', '  ']) {
  test(`database rejects assignment_id=${JSON.stringify(assignment)}`, async () => {
    await assert.rejects(pool.query('insert into learning_sessions (id,identity_id,assignment_id) values ($1,$2,$3)', [references.id, references.identityId, assignment]), /not-null constraint|learning_session_references_check/);
  });
}
test('repository and database both reject COMPLETED ingress', async () => {
  await assert.rejects(repository.createAuthorizedStart(completeLearningSession(newLearningSession(references))), /terminal/);
  await assert.rejects(pool.query("insert into learning_sessions (id,identity_id,assignment_id,status) values ($1,$2,$3,'COMPLETED')", Object.values(references)), /must start ACTIVE/);
});
test('cross-Identity reads and completion disclose nothing and do no mutation', async () => {
  await repository.createAuthorizedStart(newLearningSession(references));
  const wrong = { ...scope, identityId: 'learner-2' };
  assert.equal(await repository.getById(wrong), null);
  assert.equal(await repository.completeActive(wrong), null);
  assert.equal((await repository.getById(scope))?.status, 'ACTIVE');
  assert.equal(await repository.getById({ ...scope, id: 'missing' }), null);
  assert.equal(await repository.completeActive({ ...scope, id: 'missing' }), null);
});
test('completion is terminal; duplicate start cannot overwrite or reopen', async () => {
  await repository.createAuthorizedStart(newLearningSession(references));
  assert.equal((await repository.completeActive(scope))?.status, 'COMPLETED');
  assert.equal(await repository.completeActive(scope), null);
  await assert.rejects(repository.createAuthorizedStart(newLearningSession(references)), postgresError('23505'));
  await assert.rejects(pool.query("update learning_sessions set status='ACTIVE' where id=$1", [references.id]), /only ACTIVE to COMPLETED/);
  assert.equal((await repository.getById(scope))?.status, 'COMPLETED');
});
test('unlisted lifecycle updates are rejected at the database boundary', async () => {
  await repository.createAuthorizedStart(newLearningSession(references));
  for (const status of ['ACTIVE', 'PAUSED', 'ABANDONED', 'REOPENED']) {
    await assert.rejects(pool.query('update learning_sessions set status=$1 where id=$2', [status, references.id]), /only ACTIVE to COMPLETED/);
  }
  assert.equal((await repository.getById(scope))?.status, 'ACTIVE');
});
test('Identity, Assignment, and session ID cannot be reassigned', async () => {
  await repository.createAuthorizedStart(newLearningSession(references));
  for (const sql of ["update learning_sessions set identity_id='learner-2'", "update learning_sessions set assignment_id='assignment-other'", "update learning_sessions set id='session-other'"]) {
    await assert.rejects(pool.query(sql), /references are immutable/);
  }
  assert.deepEqual(await repository.getById(scope), newLearningSession(references));
});
test('16 concurrent completions produce exactly one successful mutation', async () => {
  await repository.createAuthorizedStart(newLearningSession(references));
  const lock = await pool.connect();
  try {
    await lock.query('begin');
    await lock.query('select id from learning_sessions where id=$1 for update', [references.id]);
    const pending = Promise.all(Array.from({ length: 16 }, () => repository.completeActive(scope)));
    let waiting = 0;
    const deadline = Date.now() + 3000;
    while (waiting < 16 && Date.now() < deadline) {
      await lock.query('select pg_stat_clear_snapshot()');
      const row = await lock.query(`select count(*)::int as n from pg_stat_activity
        where datname=current_database() and wait_event_type='Lock'
          and query like '%update "learning_sessions"%'`);
      waiting = row.rows[0].n;
      if (waiting < 16) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    // Release even if the assertion fails so contenders never remain blocked.
    await lock.query('commit');
    const results = await pending;
    assert.equal(waiting, 16, 'all contenders must overlap behind the same row lock');
    assert.equal(results.filter((row) => row !== null).length, 1);
    assert.equal(results.filter((row) => row === null).length, 15);
    assert.equal((await repository.getById(scope))?.status, 'COMPLETED');
  } finally {
    await lock.query('rollback');
    lock.release();
  }
});

test('failed LearningSession completion preserves ACTIVE and immutable references', async () => {
  await repository.createAuthorizedStart(newLearningSession(references));
  await pool.query(`create function test_fail_learning_complete() returns trigger language plpgsql as $$ begin raise exception 'forced completion failure'; end $$`);
  await pool.query('create trigger test_fail_learning_complete before update on learning_sessions for each row execute function test_fail_learning_complete()');
  try {
    await assert.rejects(repository.completeActive(scope), (error: unknown) => {
      const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause ?? error : error;
      return cause instanceof Error && cause.message === 'forced completion failure';
    });
    assert.deepEqual(await repository.getById(scope),newLearningSession(references));
  } finally {
    await pool.query('drop trigger if exists test_fail_learning_complete on learning_sessions'); await pool.query('drop function if exists test_fail_learning_complete()');
  }
});
test('completion captures scope before a row-lock wait and cannot redirect to another learner', async () => {
  await repository.createAuthorizedStart(newLearningSession(references));
  const other = {id:'other',identityId:'learner-2',assignmentId:'assignment-other'};
  await repository.createAuthorizedStart(newLearningSession(other));
  const mutable = {...scope}; const holder = await pool.connect();
  let pending: ReturnType<typeof repository.completeActive> | undefined;
  try {
    await holder.query('begin');
    const pid = (await holder.query<{pid:number}>('select pg_backend_pid() as pid')).rows[0]!.pid;
    await holder.query('select id from learning_sessions where id=$1 for update',[scope.id]);
    pending=repository.completeActive(mutable); void pending.catch(()=>{}); await observeLockWait(pool,pid);
    mutable.id=other.id;mutable.identityId=other.identityId;
  } finally {await holder.query('rollback');holder.release();}
  assert.equal((await pending!)?.id,scope.id);
  assert.equal((await repository.getById(other))?.status,'ACTIVE');
});
