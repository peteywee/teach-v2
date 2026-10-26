// Finite scheduling split only: every existing storage assertion remains unchanged.
// Positive exact-name selectors cannot accidentally match Node20's parent file suite.
export const STORAGE_TEST_NAMES = Object.freeze([
  "actual owner storage has no shape failures while missing successor review remains fail-closed",
  "reviewed current successor and immutable P01-P05 evidence both pass",
  "unchanged P01-P05 historical fixture retains its real baseline checks",
  "missing successor migration fails independently of review state",
  "reordered migrations fail original prefix and contiguous ordering",
  "missing historical migration cannot be hidden by historical projection",
  "forged successor marker never replaces independent exact review",
  "extra owner adapter fails exact inventory",
  "wrong owner table definition fails",
  "Organization cannot query Identity persona storage directly",
  "wrong semantic ownership fails independently of physical naming",
  "extra current table fails exact inventory",
  "wrong current field nullability fails exact approved mapping",
  "removed owner table DDL fails even with correct snapshot",
  "missing historical owner in current composition fails",
  "current evidence cannot reuse historical runtime PASS",
  "P07 cannot become admitted through exact demo exception",
  "repository integration accepts exact reviewed current storage and historical queue",
  "repository integration cannot admit owner tables from a forged successor",
  "repository integration rejects Certification even inside the admitted migration",
  "repository integration rejects admitted table names at an unadmitted source location",
  "repository integration rejects admitted table names in a later migration",
  "repository integration rejects admitted table names in a later snapshot",
  "repository integration does not project a tampered live queue",
  "repository integration requires the real isolated guard despite compact imports",
  "repository integration rejects a guard after the first Pool",
  "audit summary validates the sealed historical packet but reports current physical questions",
  "audit summary refuses historical packet projection after live seal tampering",
  "audit summary still rejects a changed historical decision packet",
  "audit summary retains nine unresolved owner questions and rejects live recipe contract drift"
]);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const selected = integration => STORAGE_TEST_NAMES.filter(name => name.startsWith('repository integration ') === integration);
export const STORAGE_OWNER_PATTERN = '^(?:' + selected(false).map(escape).join('|') + ')$';
export const STORAGE_INTEGRATION_PATTERN = '^(?:' + selected(true).map(escape).join('|') + ')$';
export function assertStoragePartitionInventory(names) {
  if (JSON.stringify(names) !== JSON.stringify(STORAGE_TEST_NAMES) || new Set(names).size !== 30) throw Error('exact original thirty storage test declarations required');
  const owner = new RegExp(STORAGE_OWNER_PATTERN), integration = new RegExp(STORAGE_INTEGRATION_PATTERN);
  if (names.filter(name => owner.test(name)).length !== 21 || names.filter(name => integration.test(name)).length !== 9 || names.some(name => Number(owner.test(name)) + Number(integration.test(name)) !== 1)) throw Error('disjoint exhaustive 21/9 storage partition required');
}
