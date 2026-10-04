import { serialize, deserialize } from 'node:v8';

// Keep this private to the owning module; cross-domain Infrastructure imports
// are forbidden. Clone scope, dates, and idempotency binding before any await.
export function snapshotPersistenceInput(input) {
  return deserialize(serialize(input));
}
