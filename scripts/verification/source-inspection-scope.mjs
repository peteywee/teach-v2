import { inspectAuthoringRegistrationUncached } from '../kernel/demo-authoring-registration.mjs';
import { inspectAuthoringEngineeringUncached } from '../verification/demo-authoring-engineering.mjs';
import { inspectAuthoringPhysicalSuccessorUncached } from '../persistence/demo-authoring-physical-successor.mjs';
import { inspectKitchenRegistrationUncached } from '../kernel/demo-kitchen-registration.mjs';
import { inspectKitchenEngineeringUncached } from '../verification/demo-kitchen-engineering.mjs';
import { inspectKitchenPhysicalSuccessorUncached } from '../persistence/demo-kitchen-physical-successor.mjs';
import { inspectRecipeRegistrationUncached } from '../kernel/demo-recipes-registration.mjs';
import { inspectDemoRecipePhysicalSuccessorUncached } from '../persistence/demo-recipes-physical-successor.mjs';
import { inspectDemoRuntimeRegistrationUncached } from '../kernel/demo-runtime-registration.mjs';
import { inspectDemoStorageEvidenceUncached } from '../persistence/demo-storage-evidence.mjs';
import { inspectRepositoryIntegrationUncached } from '../architecture/repository-integration-evidence.mjs';
import { inspectMigrationHistoryUncached } from '../packaging/migration-history-guards.mjs';
import { inspectConsolidatedVerificationUncached } from '../verification/consolidated-ci-evidence.mjs';
import { inspectConsolidationCoverageUncached } from '../verification/consolidated-ci-evidence.mjs';
import { resolve } from 'node:path';

// Closed dispatch, not a public callback/reader/cache injection API. Only these
// genuine synchronous inspectors may run while an invocation-local memo exists.
// Each independent call starts fresh; no stat or proof survives its finally.
const implementations = new Map([
  ['authoringRegistration', inspectAuthoringRegistrationUncached],
  ['authoringEngineering', inspectAuthoringEngineeringUncached],
  ['authoringPhysical', inspectAuthoringPhysicalSuccessorUncached],
  // Fixed synchronous composition: a fresh scope per pair, never per mutation loop.
  ['authoringAdmissionPair', root => [
    inspectSourceInScope('authoringEngineering', root),
    inspectSourceInScope('authoringPhysical', root),
  ]],
  ['kitchenRegistration', inspectKitchenRegistrationUncached],
  ['kitchenEngineering', inspectKitchenEngineeringUncached],
  ['kitchenPhysical', inspectKitchenPhysicalSuccessorUncached],
  ['recipeRegistration', inspectRecipeRegistrationUncached],
  ['recipePhysical', inspectDemoRecipePhysicalSuccessorUncached],
  ['runtimeRegistration', inspectDemoRuntimeRegistrationUncached],
  ['storage', inspectDemoStorageEvidenceUncached],
  ['repositoryIntegration', inspectRepositoryIntegrationUncached],
  ['migrationHistory', inspectMigrationHistoryUncached],
  ['consolidatedVerification', inspectConsolidatedVerificationUncached],
  ['consolidationCoverage', inspectConsolidationCoverageUncached],
]);
let active = null;
export function inspectSourceInScope(name, root) {
  if (typeof name !== 'string' || !implementations.has(name)) throw new TypeError('finite source inspector required');
  if (typeof root !== 'string' || !root) throw new TypeError('nonempty string source root required');
  const canonicalRoot = resolve(root);
  const parent = active;
  const ownsScope = !active || active.root !== canonicalRoot;
  if (ownsScope) active = { root: canonicalRoot, results: new Map(), running: new Set() };
  const scope = active;
  try {
    if (scope.results.has(name)) return structuredClone(scope.results.get(name));
    if (scope.running.has(name)) throw new Error('cyclic source inspection: ' + name);
    scope.running.add(name);
    try {
      const result = implementations.get(name)(canonicalRoot);
      if (result && typeof result.then === 'function') throw new TypeError('source inspection must remain synchronous');
      // Never expose the memo's objects to a caller. Result mutation cannot
      // corrupt a later sibling check, even within this synchronous scope.
      scope.results.set(name, structuredClone(result));
      return result;
    } finally { scope.running.delete(name); }
  } finally {
    if (ownsScope) {
      scope.results.clear(); scope.running.clear();
      active = parent;
    }
  }
}
