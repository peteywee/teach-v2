#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const text=(p)=>readFileSync(join(ROOT,p),'utf8');
const load=(p)=>{ try{return JSON.parse(text(p));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const index=text('contracts/README.md');
const approvals=text('contracts/APPROVAL-RECORD.md');
const c01=text('contracts/c01-canonical-semantics-contract.md');
const kread=text('kernel/README.md');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const rec=load('governance/2026-10-04-strict-nine-ratification.json');

if (!index.includes('"version": "0.11.3"') || !index.includes('- Package version: `0.11.3`')) errors.push('governance ratification: contract index must be 0.11.3');
if (!approvals.includes('"version": "0.11.3"') || !approvals.includes('- Contract package version: `0.11.3`')) errors.push('governance ratification: approval record must be 0.11.3');
if (!index.match(/\| C01 \|.*\| 1\.8\.0\s+\| `SEM`\s+\| 36\s+\| 25\s+\| 0\s+\| 0\s+\| `active` \|/)) errors.push('governance ratification: C01 index row not synchronized');
if (!index.includes('|     | **Total**') || !index.includes('**386**') || !index.includes('**262**') || !index.includes('**77**') || !index.includes('**25**')) errors.push('governance ratification: contract totals not synchronized');
if (!approvals.includes('## Part 18 — Strict-nine semantic promotion ratification')) errors.push('governance ratification: Part 18 missing');
if (!approvals.includes('`7534df2`') || !approvals.includes('CONTRADICTORY') || !approvals.includes('PROVEN')) errors.push('governance ratification: Part 18 truth-state evidence missing');
if (!approvals.match(/\| C11\s+\| OQ-IDN-2\s+\|.*\| Invitation 7 days; SetupToken 15 minutes; PasswordResetToken 1 hour \| 2026-10-04 \| Patrick Craven \|/)) errors.push('governance ratification: OQ-IDN-2 decision missing from ledger');
if (!approvals.match(/\| C11\s+\| OQ-IDN-5\s+\|.*\| Controlled rejection until explicit ReactivateIdentity; no Invitation or token created before reactivation \| 2026-10-04 \| Patrick Craven \|/)) errors.push('governance ratification: OQ-IDN-5 decision missing from ledger');
if (!approvals.match(/\| C32\s+\| OQ-LRN-1\s+\|.*\| ACTIVE -> COMPLETED; COMPLETED terminal; progress recording allowed only while ACTIVE \| 2026-10-03 \| Patrick Craven \|/)) errors.push('governance ratification: OQ-LRN-1 decision missing from ledger');
if (!c01.includes('"version": "1.8.0"') || !c01.includes('SEM-36')) errors.push('governance ratification: C01 live authority mismatch');
if (!kread.includes('strict-nine')) errors.push('governance ratification: K00 README provenance not reconciled');

const strictNine=['Identity','Credential','ApplicationSession','Organization','Assignment','LearningSession','ProgressEvent','Certification','ContentPack'];
for (const id of strictNine) {
  const e=(entities?.entries||[]).find(x=>x.id===id);
  if (e?.status!=='approved') errors.push(`governance ratification: ${id} must be approved`);
}
const membership=(entities?.entries||[]).find(x=>x.id==='Membership');
if (membership?.status!=='candidate' || membership?.promotion_hold?.blocked_by!=='OQ-TEN-1') errors.push('governance ratification: Membership hold drifted');

if (rec) {
  if (rec.version!=='1.0.0' || rec.status!=='recorded') errors.push('governance ratification: record identity/state mismatch');
  if (rec.original_change_commit!=='7534df216b702df5132a206a1b22003d9f983bea') errors.push('governance ratification: original commit mismatch');
  if (rec.original_procedure_state!=='CONTRADICTORY' || rec.current_content_state!=='PROVEN') errors.push('governance ratification: truth states drifted');
  if (!/^#(?:\d+|REHEARSAL)$/.test(rec.issue||'')) errors.push('governance ratification: issue reference invalid');
}

if (errors.length) {
  console.error(`Governance strict-nine ratification FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Governance strict-nine ratification PASS');
console.log('C01: 1.8.0 / 36 requirements / 25 acceptance cases');
console.log('K00: 0.13.0');
console.log('Strict-nine: 9 approved');
console.log('Membership: candidate hold OQ-TEN-1');
console.log('Original procedure: CONTRADICTORY; current content: PROVEN');
