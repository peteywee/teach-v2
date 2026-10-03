#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const governedRoots = ['contracts', 'governance', 'kernel', 'domains'];
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const statuses = new Set(['draft', 'proposed', 'active', 'superseded', 'retired', 'recorded']);
const classes = new Set([
  'contract', 'contract-index', 'approval-record', 'source-record', 'governance-policy',
  'semantic-kernel', 'architecture-decision', 'specification', 'decision-table', 'runbook', 'evidence-summary'
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

function parseMeta(text, path) {
  const m = text.match(/^<!--tos-doc\n([\s\S]*?)\n-->/);
  if (!m) throw new Error(`${path}: missing leading tos-doc metadata block`);
  try { return JSON.parse(m[1]); }
  catch (e) { throw new Error(`${path}: invalid tos-doc JSON: ${e.message}`); }
}

function cmpVersion(a, b) {
  if (!semver.test(a || '') || !semver.test(b || '')) return null;
  const aa = a.split('.').map(Number), bb = b.split('.').map(Number);
  for (let i=0;i<3;i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return 0;
}

function gitShow(ref, path) {
  try { return execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }); }
  catch { return null; }
}

const errors = [];
const docs = [];
for (const r of governedRoots) {
  const abs = join(ROOT, r);
  try { docs.push(...walk(abs)); } catch {}
}

const idVersions = new Map();
const activeIds = new Map();
for (const abs of docs) {
  const path = relative(ROOT, abs).replaceAll('\\','/');
  const text = readFileSync(abs, 'utf8');
  let m;
  try { m = parseMeta(text, path); } catch (e) { errors.push(e.message); continue; }
  for (const key of ['doc_id','class','version','status','owner','created_on','updated_on']) {
    if (!m[key]) errors.push(`${path}: missing ${key}`);
  }
  if (m.version && !semver.test(m.version)) errors.push(`${path}: invalid version ${m.version}`);
  if (m.status && !statuses.has(m.status)) errors.push(`${path}: invalid status ${m.status}`);
  if (m.class && !classes.has(m.class)) errors.push(`${path}: invalid class ${m.class}`);
  for (const key of ['created_on','updated_on']) if (m[key] && !dateRe.test(m[key])) errors.push(`${path}: invalid ${key} ${m[key]}`);
  if (m.created_on && m.updated_on && m.created_on > m.updated_on) errors.push(`${path}: created_on is after updated_on`);
  const idVersion = `${m.doc_id}@${m.version}`;
  if (idVersions.has(idVersion)) errors.push(`${path}: duplicate document version ${idVersion}; first seen in ${idVersions.get(idVersion)}`);
  else idVersions.set(idVersion, path);
  if (m.status === 'active') {
    if (activeIds.has(m.doc_id)) errors.push(`${path}: more than one active version of ${m.doc_id}; first active version in ${activeIds.get(m.doc_id)}`);
    else activeIds.set(m.doc_id, path);
  }
  if (path.includes('/superseded/') && m.status !== 'superseded') errors.push(`${path}: document under superseded/ must have status superseded`);
  if (m.class === 'contract' && m.status === 'active') {
    if (!m.approval || m.approval.state !== 'approved' || !m.approval.record) errors.push(`${path}: active contract missing approved approval record`);
    const vm = text.match(/^\| Version\s+\|\s*([^|\s]+)\s*\|/m);
    if (!vm) errors.push(`${path}: contract missing visible Version row`);
    else if (vm[1] !== m.version) errors.push(`${path}: visible version ${vm[1]} disagrees with metadata version ${m.version}`);
  }
}

const baseArgIndex = process.argv.indexOf('--base');
const base = baseArgIndex >= 0 ? process.argv[baseArgIndex + 1] : process.env.DOC_GOV_BASE_REF;
if (base) {
  let changed = [];
  try {
    changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`, '--', 'contracts/**/*.md', 'contracts/*.md', 'governance/**/*.md', 'governance/*.md', 'kernel/**/*.md', 'kernel/*.md', 'domains/**/*.md', 'domains/*.md'], { encoding: 'utf8' })
      .split('\n').map(s=>s.trim()).filter(Boolean);
  } catch (e) {
    errors.push(`unable to determine changed governed documents against ${base}: ${e.message}`);
  }
  for (const path of changed) {
    let nowText;
    try { nowText = readFileSync(join(ROOT,path),'utf8'); } catch { continue; }
    let now;
    try { now = parseMeta(nowText, path); } catch { continue; }
    const oldText = gitShow(base, path);
    if (!oldText) continue; // new document
    let old;
    try { old = parseMeta(oldText, `${base}:${path}`); } catch { continue; }
    if (now.doc_id !== old.doc_id) errors.push(`${path}: doc_id changed from ${old.doc_id} to ${now.doc_id}`);
    const oldVisibleVersion = old.version || oldText.match(/^\| Version\s+\|\s*([^|\s]+)\s*\|/m)?.[1];
    if (oldVisibleVersion) {
      const c = cmpVersion(now.version, oldVisibleVersion);
      if (c === null || c <= 0) errors.push(`${path}: changed without version increase (${oldVisibleVersion} -> ${now.version})`);
    }
    const oldCreated = old.created_on || oldText.match(/^\| Created\s+\|\s*(\d{4}-\d{2}-\d{2})\s*\|/m)?.[1];
    const oldUpdated = old.updated_on || oldText.match(/^\| Last updated\s+\|\s*(\d{4}-\d{2}-\d{2})\s*\|/m)?.[1];
    if (oldUpdated && now.updated_on < oldUpdated) errors.push(`${path}: updated_on moved backward (${oldUpdated} -> ${now.updated_on})`);
    if (oldCreated && now.created_on !== oldCreated) errors.push(`${path}: created_on changed (${oldCreated} -> ${now.created_on})`);
  }
}

if (errors.length) {
  console.error(`Document governance FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`Document governance PASS: ${docs.length} governed Markdown documents validated${base ? ` against ${base}` : ''}.`);
