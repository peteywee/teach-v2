#!/usr/bin/env node
import { inspectCapabilityAdmission } from './capability-admission.mjs';
const result = inspectCapabilityAdmission(process.cwd());
if (result.errors.length) {
  console.error(`Capability admission FAILED (${result.errors.length})\n${result.errors.join('\n')}`);
  process.exit(1);
}
console.log(`Capability admission PASS: exact ${result.promotedEntries} approved name/type entries, ${result.capabilityNames} unchanged C14 names`);
console.log('PROVEN: recorded owner approval, immutable proposal/source hashes, exact K00 0.17 / ownership 1.8 ancestry, all-family closure and three historical holds');
console.log('BLOCKED: runtime activation; no grants, routes, APIs, migrations, principal or other candidate admissions');
