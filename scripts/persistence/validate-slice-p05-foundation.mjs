#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectLearningFoundation } from './learning-foundation-evidence.mjs';

const errors = inspectLearningFoundation(resolve(process.cwd()));
if (errors.length) {
  console.error(`SLICE-P05 FOUNDATION EVIDENCE FAILED (${errors.length} problems):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('SLICE-P05 FOUNDATION EVIDENCE PASS');
console.log('Historical foundation reconciled with separate physical evidence; runtime activation: BLOCKED');
console.log('Shared/production migration execution authorized: false');
