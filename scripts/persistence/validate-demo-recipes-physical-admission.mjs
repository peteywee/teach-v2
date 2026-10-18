#!/usr/bin/env node
import { resolve } from 'node:path';
import { inspectDemoRecipePhysicalSuccessor } from './demo-recipes-physical-successor.mjs';
const result = inspectDemoRecipePhysicalSuccessor(resolve(process.cwd()));
if (result.errors.length || !result.present || !result.admitted || result.migrationCount !== 7) {
  console.error('DEMO RECIPE PHYSICAL ADMISSION FAILED\n' + (result.errors.length ? result.errors.join('\n') : 'Exact independently reviewed seven-migration successor required.'));
  process.exitCode = 1;
} else {
  console.log('DEMO RECIPE PHYSICAL ADMISSION PASS: exact one-function successor; seven migrations; 22 unchanged tables. Structural authoring only; runtime proof NOT_RUN and activation BLOCKED.');
}
