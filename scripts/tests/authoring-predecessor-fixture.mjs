/** Test-only exact authoring → released-kitchen reconstruction. This module is
 * never imported by runtime or admission. Current source, independent review and
 * physical prefix are all checked before any historical bytes are written. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, rmSync, rmdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inspectAuthoringRegistration } from '../kernel/demo-authoring-registration.mjs';
import { inspectAuthoringEngineering, AUTHORING_ENGINEERING_MANIFEST, AUTHORING_ENGINEERING_REVIEW } from '../verification/demo-authoring-engineering.mjs';
import { inspectAuthoringPhysicalSuccessor } from '../persistence/demo-authoring-physical-successor.mjs';

export function installAuthoringPredecessor(root) {
  const source = inspectAuthoringRegistration(root);
  assert.deepEqual(source.errors, [], 'current authoring source must authenticate before fixture projection');
  if (!source.present) return () => {};
  const engineering = inspectAuthoringEngineering(root), physical = inspectAuthoringPhysicalSuccessor(root);
  for (const result of [engineering, physical]) { assert.equal(result.present, true); assert.deepEqual(result.errors, []); }
  assert.equal(physical.admitted, true, 'current complete immutable SQL prefix must authenticate before fixture unwind');
  const removed = [...new Set([...source.addedPaths, ...engineering.addedPaths, ...physical.addedPaths, AUTHORING_ENGINEERING_MANIFEST, AUTHORING_ENGINEERING_REVIEW])];
  const predecessors = { ...source.predecessorFiles, ...engineering.predecessorFiles };
  assert.ok(removed.every(path => !Object.hasOwn(predecessors, path)), 'successor addition cannot replace a predecessor');
  const live = new Map([...new Set([...removed, ...Object.keys(predecessors)])].map(path => [path, readFileSync(join(root, path), 'utf8')]));
  const directories = [...new Set(['domains/demo-authoring/proposal-0.1.0', 'domains/demo-authoring', 'verification/demo-authoring', 'persistence/physical-slices/demo-authoring', ...(engineering.addedDirectories ?? [])])].sort((a, b) => b.split('/').length - a.split('/').length || b.localeCompare(a));
  let restored = false;
  const restore = () => {
    if (restored) return;
    for (const [path, bytes] of live) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); }
    restored = true;
  };
  try {
    for (const [path, bytes] of Object.entries(predecessors)) writeFileSync(join(root, path), bytes);
    for (const path of removed) rmSync(join(root, path));
    // Nonrecursive removal refuses unknown evidence instead of concealing it.
    for (const path of directories) if (existsSync(join(root, path))) rmdirSync(join(root, path));
    return restore;
  } catch (error) { restore(); throw error; }
}
export function withAuthoringPredecessor(root, work) {
  const restore = installAuthoringPredecessor(root);
  try {
    const result = work();
    if (result && typeof result.then === 'function') return result.finally(restore);
    restore(); return result;
  } catch (error) { restore(); throw error; }
}
