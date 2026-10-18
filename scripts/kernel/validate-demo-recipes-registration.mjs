#!/usr/bin/env node
import { inspectRecipeRegistration } from './demo-recipes-registration.mjs';
import { inspectDemoRuntimeRegistration } from './demo-runtime-registration.mjs';
const result = inspectRecipeRegistration(process.cwd());
const errors = [...result.errors, ...inspectDemoRuntimeRegistration(process.cwd()).errors];
if (!result.present) errors.push('demo recipe registration: exact approved successor is required');
if (errors.length) { console.error(`Demo recipe registration FAILED (${errors.length})\n${errors.join('\n')}`); process.exit(1); }
console.log('Demo recipe registration PASS: exact C31/C41/C42 successor, five predecessor authority files, three fictional recipes, preserved original registration.');
console.log('NOT PROVEN: independent review, implementation conformance or browser/runtime behavior. NOT AUTHORIZED: activation, hosting, spending or live-database changes.');
