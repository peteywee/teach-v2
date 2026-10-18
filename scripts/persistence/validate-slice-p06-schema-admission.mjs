#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectAssignmentAdmission } from './assignment-admission-evidence.mjs';

const errors=inspectAssignmentAdmission(resolve(process.cwd()));
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('P06 admission evidence validation PASS');
console.log('Historical admission decision: BLOCK (4 PROVEN / 4 UNKNOWN); any exact current successor is separately verified; runtime remains blocked');
