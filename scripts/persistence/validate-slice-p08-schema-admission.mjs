#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectFutureAdmission } from './future-admission-evidence.mjs';
const errors=inspectFutureAdmission(resolve(process.cwd()),'P08');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('P08 admission evidence validation PASS');
console.log('Historical admission decision: BLOCK (4 PROVEN / 4 UNKNOWN); any exact current successor is separately verified; runtime remains blocked');
