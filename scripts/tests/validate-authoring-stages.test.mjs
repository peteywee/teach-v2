import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expectedPlan, inspectAuditPlan } from '../verification/self-audit-catalog.mjs';
import { authoringStages } from '../verification/authoring-stage-catalog.mjs';
import { inspectAuthoringEngineering } from '../verification/demo-authoring-engineering.mjs';
import { renderConsolidatedProducerWorkflow } from '../verification/self-audit-workflow.mjs';
import { inspectWorkflowText } from '../verification/workflow-lifecycle-inventory.mjs';
import { hostedSchemaCaseNames, hostedSourceChecks } from '../verification/run-hosted-source-check.mjs';
const root = resolve(new URL('../..', import.meta.url).pathname);
test('five distinct bounded authoring commands retain all original fifty-two stage identities and argv', () => {
  const source = inspectAuthoringEngineering(root); assert.equal(source.present, true); assert.deepEqual(source.errors, []);
  const prior = JSON.parse(source.predecessorFiles['verification/whole-repository/self-audit-plan.json']);
  assert.equal(prior.stages.length, 52); assert.equal(expectedPlan.stages.length, 57);
  assert.deepEqual(expectedPlan.stages.filter(stage => !authoringStages.some(([id]) => id === stage.id)), prior.stages);
  assert.equal(new Set(expectedPlan.stages.map(stage => stage.id)).size, 57);
  for (const [id, command, args] of authoringStages) {
    assert.deepEqual(expectedPlan.stages.find(stage => stage.id === id), { id, command, args, timeout_ms: 25000 });
    for (const path of args.filter(value => /^(?:scripts|tests)\//.test(value))) assert.ok(existsSync(join(root, path)), path);
    const removed = structuredClone(expectedPlan); removed.stages = removed.stages.filter(stage => stage.id !== id); assert.ok(inspectAuditPlan(removed).length);
    const weakened = structuredClone(expectedPlan); weakened.stages.find(stage => stage.id === id).timeout_ms = 30000; assert.ok(inspectAuditPlan(weakened).length);
  }
  const recoveryTest = 'scripts/tests/validate-authoring-recovery-policy.test.mjs';
  assert.ok(expectedPlan.stages.find(stage => stage.id === 'demo-authoring-source-tests').args.includes(recoveryTest));
  const missingRecovery = structuredClone(expectedPlan); missingRecovery.stages.find(stage => stage.id === 'demo-authoring-source-tests').args = missingRecovery.stages.find(stage => stage.id === 'demo-authoring-source-tests').args.filter(arg => arg !== recoveryTest);
  assert.ok(inspectAuditPlan(missingRecovery).length, 'required recovery policy proof cannot be dropped');
  assert.equal(expectedPlan.shell_execution, false); assert.equal(expectedPlan.max_operation_ms, 25000);
});
test('one owned loopback fixture brackets exactly the kitchen and two authoring PostgreSQL proofs', () => {
  const workflow = renderConsolidatedProducerWorkflow(); assert.equal(readFileSync(join(root, '.github/workflows/development-self-audit.yml'), 'utf8'), workflow);
  const jobs = inspectWorkflowText('.github/workflows/development-self-audit.yml', workflow); assert.equal(jobs.length, 1);
  const steps = jobs[0].all_step_ids, start = steps.indexOf('kitchen_postgres_start');
  assert.deepEqual(steps.slice(start, start + 5), ['kitchen_postgres_start', 'audit_demo_kitchen_postgres', 'audit_demo_authoring_postgres', 'audit_demo_authoring_isolated_history', 'kitchen_postgres_stop']);
  assert.equal(steps.filter(id => id === 'kitchen_postgres_start').length, 1); assert.equal(steps.filter(id => id === 'kitchen_postgres_stop').length, 1);
  assert.ok(workflow.includes('id: kitchen_postgres_stop\n        if: always()\n        run: timeout 25s node scripts/verification/kitchen-loopback-postgres.mjs stop'));
  assert.equal(hostedSchemaCaseNames.schema_registration.length, 8); assert.equal(hostedSchemaCaseNames.schema_support.length, 41); assert.equal(Object.keys(hostedSourceChecks).length, 11);
});
