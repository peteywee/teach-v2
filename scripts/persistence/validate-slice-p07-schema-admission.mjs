#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectFutureAdmission } from './future-admission-evidence.mjs';
const errors=inspectFutureAdmission(resolve(process.cwd()),'P07');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('P07 admission evidence validation PASS');
console.log('Admission decision: BLOCK (4 PROVEN / 4 UNKNOWN); physical authoring and runtime remain unauthorized');
