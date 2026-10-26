#!/usr/bin/env node
import { inspectKitchenRegistration } from './demo-kitchen-registration.mjs';
const result=inspectKitchenRegistration(process.cwd());
if(!result.present)result.errors.push('demo kitchen registration: exact bounded source registration required');
if(result.errors.length){console.error(result.errors.join('\n'));process.exit(1);}
console.log('Demo kitchen source registration PASS: finite schema 1.0/1.1/1.2 lineage, exact authority and immutable predecessors.');
console.log('NOT PROVEN: independent review, physical admission, executed migration, deployment or runtime behavior. Owner release approval remains conditional on tests and checks.');
