import { inspectAuthoringPhysicalSuccessor } from '../persistence/demo-authoring-physical-successor.mjs';
// The physical leaf requires the genuine engineering review, which authenticates
// raw registration. One complete chain avoids redundant synchronous reparsing.
const result = inspectAuthoringPhysicalSuccessor(process.cwd());
const errors = [...result.errors];
if (!result.present || !result.admitted) errors.push('complete authoring source, independent review and physical envelope required');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Demo manager-authoring source/admission PASS: exact five manager operations and two private representations; no runtime, permission or migration execution performed.');
