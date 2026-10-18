#!/usr/bin/env node
import { inspectDemoRuntimeRegistration } from './demo-runtime-registration.mjs';
const result = inspectDemoRuntimeRegistration(process.cwd());
if (!result.registered) result.errors.push('demo registration: expected exact registered package and evidence');
if (result.errors.length) {
  console.error(`Demo runtime registration FAILED (${result.errors.length})\n${result.errors.join('\n')}`);
  process.exit(1);
}
console.log(`Demo runtime registration PASS: ${result.registeredEntries} exact semantic entries; ${result.closure.approvedEntries} approved entries / ${result.closure.checkedReferences} semantic references / ${result.closure.exceptions.length} holds`);
console.log('PROVEN: immutable package, owner evidence, exact successor overlays and historical ancestry.');
console.log('NOT AUTHORIZED: runtime activation, physical migration, shared or production execution.');
