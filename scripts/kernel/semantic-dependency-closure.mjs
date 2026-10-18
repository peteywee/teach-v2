import { isDeepStrictEqual } from 'node:util';

// C01 1.8.0 SEM-36 / SEM-AC-25. These are entry-level semantic references,
// not identifier/represents completeness, prose, or nested transition states.
const dependencyFields = ['requires', 'from', 'to', 'entity', 'emitted_by', 'scope'];
const typedFamilies = new Set(['entities', 'identifiers', 'values', 'relationships', 'states', 'state-machines', 'invariants', 'decision-tables', 'commands', 'events', 'capabilities']);
// Existing invariant scope labels describe the rule's area, not a K00 entry.
// Keep this interpretation local to that registry, rather than treating every
// unknown scope string as permission to skip dependency closure.
const invariantScopeLabels = new Set([
  'system', 'security', 'semantic-kernel', 'lifecycle', 'transaction-control',
  'organization', 'authorization', 'content', 'learning', 'certification',
  'verification', 'identity',
]);

// The existing exception is an exact edge, not permission for these commands
// to depend on any candidate. Its recorded scope is kernel/entities.json and
// governance/2026-10-04-strict-nine-ratification.json (owner direction, #14).
const membershipCommands = new Set(['CreateMembership', 'DeactivateMembership', 'RevokeMembership']);
const membershipHold = {
  decision: 'HELD as candidate by owner direction 2026-10-04 (strict-nine promotion).',
  reason: "OQ-TEN-1 (C13) directly affects the Membership entity's shape: the owner has not yet decided between the Gate A single-location compatibility membership model and a normalized multi-organization, multi-location model (see TEN-15). Promoting Membership now would risk approving an entity whose structure may change.",
  blocked_by: 'OQ-TEN-1',
  contract: 'C13',
  consequence: "CreateMembership, DeactivateMembership, and RevokeMembership remain approved but carry a documented exception to SEM-36 (approved-depends-on-approved) until Membership is promoted. See the validator's MEMBERSHIP_HOLD_EXCEPTION list.",
  release_condition: 'Owner resolves OQ-TEN-1; Membership then re-evaluated against the promotion gate.',
};

function referenceFamilies(file, field) {
  // Preserve the existing kernel validator's typed reference rules. In
  // particular IdempotencyKey is both an identifier and a value object, with
  // different approval states; a relationship endpoint names the identifier.
  if (file === 'relationships.json' && ['from', 'to'].includes(field)) return new Set(['entities.json', 'identifiers.json']);
  if (file === 'state-machines.json' && field === 'entity') return new Set(['entities.json']);
  if (file === 'events.json' && field === 'emitted_by') return new Set(['commands.json']);
  return null;
}

function references(file, entry, byId, errors) {
  return dependencyFields.flatMap(field => {
    const value = entry[field];
    const values = Array.isArray(value) ? value : [value];
    const refs = [];
    for (const [index, raw] of values.entries()) {
      // Missing/null/empty values contain no reference. Other unfamiliar
      // representations are not forbidden domain data, but cannot establish
      // closure PASS without a registered interpretation. Do not extract
      // invented concepts from prose or arbitrary nested object keys.
      if (raw === undefined || raw === null || typeof raw === 'string' && !raw.trim()) continue;
      if (field === 'requires' && raw && !Array.isArray(raw) && typeof raw === 'object' &&
          Object.keys(raw).length === 2 && typedFamilies.has(raw.family) &&
          typeof raw.id === 'string' && /^[A-Za-z][A-Za-z0-9_.:-]*$/.test(raw.id)) {
        refs.push({ ref: raw.id, family: raw.family });
        continue;
      }
      const ref = typeof raw === 'string' ? raw.trim() : null;
      if (ref !== null && byId.has(ref)) { refs.push(ref); continue; }
      if (ref !== null && field === 'scope' && file === 'invariants.json' && invariantScopeLabels.has(ref)) continue;
      if (ref !== null && /^[A-Za-z][A-Za-z0-9_.:-]*$/.test(ref)) { refs.push(ref); continue; }
      const location = `${file}: ${entry.id}.${field}${Array.isArray(value) ? `[${index}]` : ''}`;
      errors.push(`${location}: dependency closure cannot be established for this representation (SEM-36)`);
    }
    const unique = new Map(refs.map(ref => {
      const reference = typeof ref === 'string' ? { field, ref } : { field, ...ref };
      return [JSON.stringify(reference), reference];
    }));
    return [...unique.values()];
  });
}

export function inspectSemanticDependencyClosure(docs) {
  const entries = Object.entries(docs).flatMap(([file, doc]) =>
    Array.isArray(doc?.entries) ? doc.entries.map(entry => ({ file, entry })) : []);
  const byId = new Map();
  for (const item of entries) {
    const matches = byId.get(item.entry.id) || [];
    matches.push(item);
    byId.set(item.entry.id, matches);
  }
  const errors = [], exceptions = [];
  const pending = entries.filter(({ entry }) => entry.status === 'approved');
  const approvedEntries = pending.length;
  const visited = new Set();
  let checkedReferences = 0;
  for (const item of pending) {
    if (visited.has(item)) continue;
    visited.add(item);
    const { file, entry } = item;
    for (const { field, ref, family } of references(file, entry, byId, errors)) {
      checkedReferences++;
      const families = family ? new Set([`${family}.json`]) : referenceFamilies(file, field);
      const targets = (byId.get(ref) || []).filter(target => !families || families.has(target.file));
      const label = `${file}: ${entry.id}.${field} -> ${family ? `${family}:` : ''}${ref}`;
      if (targets.length !== 1) {
        const detail = targets.length ? `ambiguous dependency (${targets.map(x => `${x.file}:${x.entry.status}`).join(', ')})` : 'unregistered dependency';
        errors.push(`${label}: ${detail} (SEM-36)`);
        continue;
      }
      const target = targets[0];
      if (target.entry.status !== 'approved') {
        const held = target.file === 'entities.json' && target.entry.kind === 'entity' &&
          target.entry.id === 'Membership' && target.entry.status === 'candidate' &&
          isDeepStrictEqual(target.entry.promotion_hold, membershipHold) &&
          file === 'commands.json' && entry.kind === 'command' &&
          entry.status === 'approved' && membershipCommands.has(entry.id) && field === 'requires';
        if (!held) {
          errors.push(`${label}: depends on ${target.entry.status} entry without the exact owner-directed hold (SEM-36)`);
          continue;
        }
        exceptions.push(`${label}: owner-directed Membership hold OQ-TEN-1 / C13 / #14 (SEM-36)`);
      }
      // Inspect the closure behind an allowed hold too. It exempts Membership,
      // not additional candidate dependencies that might later be put on it.
      pending.push(target);
    }
  }
  return { errors, exceptions, approvedEntries, checkedReferences };
}
