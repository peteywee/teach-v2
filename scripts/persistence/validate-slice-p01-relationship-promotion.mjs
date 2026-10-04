#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};

const m=load('kernel/manifest.json');
const rel=load('kernel/relationships.json');
const promo=load('persistence/physical-slices/transaction-control/relationship-promotion.json');
const readiness=load('persistence/physical-slices/readiness.json');
const approvals=text('contracts/APPROVAL-RECORD.md');
const index=text('contracts/README.md');

if(m?.version!=='0.16.0') errors.push('SLICE-P01 relationship promotion: K00 must be 0.16.0');
if(promo?.promotion_id!=='TEACH-SLICE-P01-RELATIONSHIP-PROMOTION' || promo?.version!=='1.0.0' || promo?.status!=='recorded' || promo?.issue!=='#24') errors.push('SLICE-P01 relationship promotion: promotion record identity/state mismatch');
if(promo?.kernel_revision?.from!=='0.14.0' || promo?.kernel_revision?.to!=='0.15.0' || promo?.other_semantic_status_changes!==0) errors.push('SLICE-P01 relationship promotion: kernel revision scope drifted');
const rr=(rel?.entries||[]).find(x=>x.id==='ReconciliationRecordUsesIdempotencyKey');
if(!rr || rr.status!=='approved') errors.push('SLICE-P01 relationship promotion: relationship must be approved');
if(rr?.from!=='ReconciliationRecord' || rr?.to!=='IdempotencyKey' || rr?.cardinality!=='many-to-zero-or-one') errors.push('SLICE-P01 relationship promotion: relationship shape drifted');
if(rr?.owning_domain!=='TransactionControl' || JSON.stringify(rr?.authority_contracts)!==JSON.stringify(['C22'])) errors.push('SLICE-P01 relationship promotion: authority drifted');
if(JSON.stringify(rr?.does_not_grant)!==JSON.stringify(['key_reuse_across_operations','scope_broadening'])) errors.push('SLICE-P01 relationship promotion: non-grants drifted');
if(rr?.promotion_issue!=='#24' || rr?.promoted_on!=='2026-10-04') errors.push('SLICE-P01 relationship promotion: promotion provenance missing');

const approvedExpected=new Set([
 'AssignmentReferencesContentPack','AssignmentTargetsIdentity','CertificationBelongsToIdentity',
 'CertificationObservedByIdentity','CertificationReferencesContentPack','CredentialBelongsToIdentity',
 'IdentityHasApplicationSession','IdentityHasLearningSession','LearningSessionUsesAssignment',
 'ProgressEventBelongsToLearningSession','ReconciliationRecordUsesIdempotencyKey'
]);
const candidateExpected=new Set([
 'ContentPackContainsContentBlock','EntitlementBelongsToOrganization','LearnerStateBelongsToIdentity',
 'LearnerStateTracksContentPack','LifecycleEventReferencesIdentity','LocationBelongsToOrganization',
 'MembershipLinksIdentityOrganization','MembershipMayScopeLocation'
]);
const approved=new Set((rel?.entries||[]).filter(x=>x.status==='approved').map(x=>x.id));
const candidate=new Set((rel?.entries||[]).filter(x=>x.status==='candidate').map(x=>x.id));
if([...approvedExpected].some(x=>!approved.has(x))) errors.push('SLICE-P01 relationship promotion: historical approved relationship subset drifted');
if(candidate.size!==candidateExpected.size || [...candidateExpected].some(x=>!candidate.has(x))) errors.push('SLICE-P01 relationship promotion: candidate relationship set drifted');
if(readiness?.version!=='1.3.0' || readiness?.evidence_states?.relationship_promotion!=='PROVEN' || readiness?.evidence_states?.admission_rerun!=='PROVEN' || readiness?.evidence_states?.slice_p01_implementation!=='PROVEN' || readiness?.candidate_slices?.find(x=>x.id==='SLICE-P01')?.current_state!=='IMPLEMENTED') errors.push('SLICE-P01 relationship promotion: promotion must remain proven through readiness 1.3.0');
if(!approvals.includes('## Part 21 — SLICE-P01 relationship semantic promotion') || !approvals.includes('| TEACH-K00 | 0.14.0 | 0.15.0 |') || !approvals.includes('| #24 |')) errors.push('SLICE-P01 relationship promotion: canonical approval ledger entry missing');
const packageVersionOk=index.includes('- Package version: `0.14.0`');
const promotionSummaryOk=index.includes('K00 advances from `0.14.0` to `0.15.0`');
if(!packageVersionOk || !promotionSummaryOk) errors.push('SLICE-P01 relationship promotion: contract package record missing');

if(errors.length){
 console.error(`SLICE-P01 RELATIONSHIP PROMOTION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('SLICE-P01 RELATIONSHIP PROMOTION PASS');
console.log('K00: 0.16.0 current; P01 promotion history preserved');
console.log('ReconciliationRecordUsesIdempotencyKey: approved');
console.log('Relationships: historical P01 approved subset preserved; current set may include later owner-approved additions');
console.log('Other semantic status changes: 0');
console.log('SLICE-P01 physical implementation authorized: true');
console.log('Shared/production migration execution authorized: false');
console.log('SLICE-P01 implementation: PROVEN');
console.log('Next gate: C21 recovery/release proof before shared/production migration execution');

