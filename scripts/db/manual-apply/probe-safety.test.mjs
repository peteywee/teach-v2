import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Structural guard for these two fixed reviewed SQL files, not a general SQL parser or authority gate.
for (const file of ['catalog-preservation.sql','collision-probes.sql']) {
 test(`${file}: metadata-only read-only transaction shape`, () => {
  const sql=readFileSync(new URL(file,import.meta.url),'utf8').replace(/--[^\n]*/g,'');
  const statements=sql.split(';').map(s=>s.trim()).filter(Boolean);
  assert.match(statements[0],/^BEGIN(?: TRANSACTION ISOLATION LEVEL REPEATABLE READ)? READ ONLY$/);
  assert.equal(statements.at(-1),'ROLLBACK');
  for (const statement of statements.slice(1,-1)) assert.match(statement,/^(?:SELECT\b|SET LOCAL (?:statement_timeout|lock_timeout|search_path)\b)/);
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP|CREATE|ALTER|GRANT|REVOKE|COPY|CALL|COMMIT|dblink|pg_read_file|pg_write_file|pg_authid|rolpassword|nextval|setval)\b/i);
  assert.match(sql,/SET LOCAL statement_timeout = '5s'/);
  assert.doesNotMatch(sql,/\bFROM\s+(?:public|auth|storage|teach_v2_demo)\s*\./i);
 });
}
