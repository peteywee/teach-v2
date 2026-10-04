#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectRepositoryIntegration } from './repository-integration-evidence.mjs';
const errors=inspectRepositoryIntegration(resolve(process.cwd()));
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('REPOSITORY INTEGRATION STRUCTURAL AUDIT PASS');
