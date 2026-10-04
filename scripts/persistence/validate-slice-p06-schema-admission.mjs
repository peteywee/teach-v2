#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectAssignmentAdmission } from './assignment-admission-evidence.mjs';

const errors=inspectAssignmentAdmission(resolve(process.cwd()));
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('P06 admission evidence validation PASS');
console.log('Admission decision: BLOCK (4 PROVEN / 4 UNKNOWN); physical authoring and runtime remain unauthorized');
