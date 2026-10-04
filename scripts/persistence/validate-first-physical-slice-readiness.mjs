#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const r=load('persistence/physical-slices/readiness.json');
const m=load('kernel/manifest.json');
const reg=load('persistence/semantic-closure/registration.json');
const rel=load('kernel/relationships.json');
const admission=load('persistence/physical-slices/transaction-control/admission.json');
const plan=load('persistence/physical-slices/transaction-control/admission-evidence-plan.json');
const implementation=load('persistence/physical-slices/transaction-control/implementation.json');

if (m?.version!=='0.16.0') errors.push(`slice readiness: expected K00 0.16.0, found ${m?.version}`);
if (reg?.version!=='1.0.0' || reg?.status!=='recorded') errors.push('slice readiness: semantic closure registration missing');
if (r) {
  if (r.readiness_id!=='TEACH-FIRST-PHYSICAL-SLICE-READINESS' || r.version!=='1.2.0' || r.status!=='recorded') errors.push('slice readiness: identity/state mismatch');
  if (r.current_admitted_slice_count!==3 || (r.current_physical_slice_admissions||[]).length!==3 || !['SLICE-P01','SLICE-P02','SLICE-P03'].every(id=>r.current_physical_slice_admissions?.some(x=>x.id===id))) errors.push('slice readiness: exactly SLICE-P01, SLICE-P02, and SLICE-P03 must be admitted');
  if ((r.candidate_slices||[]).length!==5) errors.push('slice readiness: expected 5 candidate slices');
  const implementedAdmissions=(r.current_physical_slice_admissions||[]).filter(x=>['PROVEN','IMPLEMENTED'].includes(x.implementation_state));
  if (implementedAdmissions.length!==2 || !implementedAdmissions.some(x=>x.id==='SLICE-P01') || !implementedAdmissions.some(x=>x.id==='SLICE-P02')) errors.push('slice readiness: SLICE-P01 and SLICE-P02 must both be implemented (PROVEN or IMPLEMENTED)');
  const p02=(r.candidate_slices||[]).find(x=>x.id==='SLICE-P02');
  if (!p02 || p02.current_state!=='ADMITTED' || (p02.blockers_removed_by_owner_decisions||[]).length!==3 || (p02.blockers||[]).length!==0 || r.current_physical_slice_admissions?.find(x=>x.id==='SLICE-P02')?.implementation_state!=='IMPLEMENTED') errors.push('slice readiness: P02 must remain admitted with IMPLEMENTED evidence preserved');
  const p03=(r.candidate_slices||[]).find(x=>x.id==='SLICE-P03');
  if (!p03 || p03.current_state!=='ADMITTED' || p03.implementation_authorized!==true || (p03.blockers||[]).length!==0) errors.push('slice readiness: P03 must be ADMITTED with implementation authorized');
  if ((r.candidate_slices||[]).filter(x=>!['SLICE-P01','SLICE-P02','SLICE-P03'].includes(x.id)).some(x=>x.current_state!=='BLOCKED')) errors.push('slice readiness: P04-P05 must remain BLOCKED');
  if (r.narrowed_next_lane?.preferred_slice!=='SLICE-P03') errors.push('slice readiness: next lane must be SLICE-P03');
  if ((r.narrowed_next_lane?.owner_decisions_required||[]).length!==0) errors.push('slice readiness: P03 owner decisions must be closed');
  if (r.narrowed_next_lane?.physical_implementation_authorized!==true) errors.push('slice readiness: P03 implementation must be authorized after ADMIT');
  if (r.narrowed_next_lane?.next_required_gate!=='Implement SLICE-P03 physical persistence and prove acceptance evidence') errors.push('slice readiness: P03 implementation must be next');
  const rr=(rel?.entries||[]).find(x=>x.id==='ReconciliationRecordUsesIdempotencyKey');
  if (!rr || rr.status!=='approved' || rr.cardinality!=='many-to-zero-or-one') errors.push('slice readiness: relationship promotion must be approved many-to-zero-or-one');
  if (admission?.version!=='2.0.0' || admission?.issue!=='#26' || admission?.decision!=='ADMIT' || admission?.physical_schema_authorized!==true || admission?.implementation_authorized!==true || admission?.shared_or_production_migration_execution_authorized!==false) errors.push('slice readiness: current SLICE-P01 admission record mismatch');
  if (plan?.version!=='1.0.0' || plan?.status!=='recorded' || plan?.physical_schema_authorized!==false) errors.push('slice readiness: admission evidence plan missing or over-authorized');
  if (implementation?.version!=='1.0.0' || implementation?.status!=='recorded' || implementation?.verification_source_commit!=='8147efa69ce9c4c4bd93d4a1529e116edcf1776a' || implementation?.verification?.postgres_integration_tests!=='PROVEN (9/9)' || implementation?.review?.unresolved_threads!==0) errors.push('slice readiness: verified SLICE-P01 implementation evidence missing');
  if (r.implementation_guard?.tables_generated!==3 || r.implementation_guard?.migrations_generated!==2 || r.implementation_guard?.repositories_generated!==3 || r.implementation_guard?.physical_schema_authorized!==true || r.implementation_guard?.shared_or_production_migration_execution_authorized!==false) errors.push('slice readiness: implemented artifact counts/boundary mismatch');
}
if (errors.length) {
  console.error(`Post-closure physical slice readiness FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Post-closure physical slice readiness PASS');
console.log('K00: 0.16.0');
console.log('Physical slices admitted: 3 (SLICE-P01, SLICE-P02, SLICE-P03)');
console.log('Implemented slices: SLICE-P01 TransactionControl (PROVEN), SLICE-P02 Identity (IMPLEMENTED)');
console.log('P01 implementation evidence: PROVEN');
console.log('P02 owner decisions: PROVEN');
console.log('P02 schema admission: ADMIT / PROVEN');
console.log('P02 implementation evidence: IMPLEMENTED');
console.log('Shared/production migration execution: BLOCKED');
console.log('Next gate: implement P03 and prove acceptance evidence');
