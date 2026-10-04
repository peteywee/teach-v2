import { serialize, deserialize } from 'node:v8';

// Detach the complete trusted input before any await. V8 preserves Buffer and
// Date representations; a shallow copy would retain mutable nested authority.
export function snapshotPersistenceInput(input) {
  return deserialize(serialize(input));
}
