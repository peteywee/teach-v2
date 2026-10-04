// Structural admission preflight. PostgreSQL replay remains a separate proof.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function inspectMigrationHistory(root) {
  const errors = [];
  const fail = (message) => errors.push(`migration history: ${message}`);
  const json = (path) => {
    try { return JSON.parse(readFileSync(join(root, path), 'utf8')); }
    catch (error) { fail(`${path}: ${error.message}`); return null; }
  };
  const journal = json('drizzle/meta/_journal.json');
  const readiness = json('persistence/physical-slices/readiness.json');
  if (!Array.isArray(journal?.entries) || journal.entries.length === 0) {
    fail('nonempty Drizzle journal required');
    return errors;
  }
  if (journal.version !== '7' || journal.dialect !== 'postgresql') {
    fail('expected PostgreSQL Drizzle journal format 7');
  }
  let sqlFiles;
  let snapshotFiles;
  try {
    sqlFiles = readdirSync(join(root, 'drizzle')).filter((name) => name.endsWith('.sql'));
    snapshotFiles = readdirSync(join(root, 'drizzle/meta')).filter((name) => name.endsWith('_snapshot.json'));
  } catch (error) { fail(error.message); return errors; }
  const tags = new Set();
  const snapshots = new Set();
  const snapshotIds = new Set();
  let previousId = '00000000-0000-0000-0000-000000000000';
  let previousWhen = -1;
  let latestSnapshot = null;

  for (const [index, entry] of journal.entries.entries()) {
    if (entry?.idx !== index) fail(`journal index ${index} must have contiguous idx ${index}`);
    if (!Number.isSafeInteger(entry?.when) || entry.when <= previousWhen) {
      fail(`journal idx ${index} timestamp must be a strictly increasing safe integer`);
    }
    previousWhen = entry?.when;
    if (entry?.version !== journal.version || typeof entry?.breakpoints !== 'boolean') {
      fail(`journal idx ${index} format/breakpoints mismatch`);
    }
    const prefix = String(index).padStart(4, '0');
    if (typeof entry?.tag !== 'string' || !new RegExp(`^${prefix}_[A-Za-z0-9_]+$`).test(entry.tag)) {
      fail(`journal idx ${index} must use a safe ${prefix}_ migration tag`);
      continue;
    }
    if (tags.has(entry.tag)) fail(`duplicate journal tag ${entry.tag}`);
    tags.add(entry.tag);
    const sqlName = `${entry.tag}.sql`;
    const snapshotName = `${prefix}_snapshot.json`;
    snapshots.add(snapshotName);
    const snapshot = json(`drizzle/meta/${snapshotName}`);
    if (!snapshot || snapshot.version !== journal.version || snapshot.dialect !== journal.dialect ||
        !snapshot.tables || typeof snapshot.tables !== 'object' || Array.isArray(snapshot.tables)) {
      fail(`${snapshotName} format/tables mismatch`);
      continue;
    }
    if (typeof snapshot.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(snapshot.id) ||
        snapshot.id === '00000000-0000-0000-0000-000000000000' || snapshotIds.has(snapshot.id)) {
      fail(`${snapshotName} must have a unique nonzero snapshot id`);
    }
    snapshotIds.add(snapshot.id);
    if (snapshot.prevId !== previousId) fail(`${snapshotName} prevId breaks the snapshot chain`);
    previousId = snapshot.id;
    latestSnapshot = snapshot;
    const tableByName = new Map(Object.entries(snapshot.tables).map(([key, table]) => [key, table]));

    for (const [key, table] of tableByName) {
      for (const fk of Object.values(table.foreignKeys || {})) {
        const schema = fk.schemaTo || table.schema || 'public';
        const target = tableByName.get(`${schema}.${fk.tableTo}`);
        if (!target) fail(`${snapshotName} foreign key ${fk.name} targets missing table ${schema}.${fk.tableTo}`);
        if (fk.tableFrom !== table.name || !Array.isArray(fk.columnsFrom) || !Array.isArray(fk.columnsTo) ||
            fk.columnsFrom.length === 0 || fk.columnsFrom.length !== fk.columnsTo.length) {
          fail(`${snapshotName} foreign key ${fk.name} source/column mapping invalid`);
          continue;
        }
        for (const column of fk.columnsFrom) if (!Object.hasOwn(table.columns || {}, column)) {
          fail(`${snapshotName} foreign key ${fk.name} missing source column ${key}.${column}`);
        }
        for (const column of fk.columnsTo) if (target && !Object.hasOwn(target.columns || {}, column)) {
          fail(`${snapshotName} foreign key ${fk.name} missing target column ${schema}.${fk.tableTo}.${column}`);
        }
      }
    }
    try {
      // Drizzle's generated PostgreSQL SQL uses quoted identifiers. This catches
      // the stale P04 target even if the matching snapshot was left correct.
      const sql = readFileSync(join(root, 'drizzle', sqlName), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
      for (const match of sql.matchAll(/\bREFERENCES\s+(?:"([^"]+)"\s*\.\s*)?"([^"]+)"\s*\(([^)]+)\)/gi)) {
        const key = `${match[1] || 'public'}.${match[2]}`;
        const target = tableByName.get(key);
        if (!target) fail(`${sqlName} REFERENCES missing table ${key}`);
        for (const column of match[3].matchAll(/"([^"]+)"/g)) {
          if (target && !Object.hasOwn(target.columns || {}, column[1])) fail(`${sqlName} REFERENCES missing column ${key}.${column[1]}`);
        }
      }
    } catch (error) { fail(`${sqlName}: ${error.message}`); }
  }
  for (const file of sqlFiles) if (!tags.has(file.slice(0, -4))) fail(`SQL file ${file} is not journaled`);
  for (const file of snapshotFiles) if (!snapshots.has(file)) fail(`snapshot ${file} is not journaled`);
  const guard = readiness?.implementation_guard;
  if (guard?.migrations_generated !== journal.entries.length) {
    fail(`readiness migration count ${guard?.migrations_generated} differs from journal count ${journal.entries.length}`);
  }
  if (latestSnapshot && guard?.tables_generated !== Object.keys(latestSnapshot.tables).length) {
    fail(`readiness table count ${guard?.tables_generated} differs from final snapshot count ${Object.keys(latestSnapshot.tables).length}`);
  }
  return errors;
}
