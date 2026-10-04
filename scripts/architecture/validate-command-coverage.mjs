#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectCommandCoverage } from './command-coverage-evidence.mjs';
const errors=inspectCommandCoverage(resolve(process.cwd()));
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('COMMAND COVERAGE PASS: every approved command has exact owner, authority and partial/blocked source traceability');
console.log('Full runtime conformance: UNKNOWN; runtime activation and shared/production execution: BLOCKED');
