#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectLearningImplementation } from './learning-implementation-evidence.mjs';
const errors = inspectLearningImplementation(resolve(process.cwd()));
if (errors.length) {
  console.error(`SLICE-P05 IMPLEMENTATION BOUNDARY FAILED (${errors.length} problems):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('SLICE-P05 IMPLEMENTATION BOUNDARY PASS');
console.log('Required Assignment reference: non-null; existence/authorization: not proven');
console.log('Runtime activation and shared/production migration execution: BLOCKED');
