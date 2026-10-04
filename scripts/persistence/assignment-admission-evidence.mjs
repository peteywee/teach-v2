import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requiredAdmissionCriteria } from './admission-criteria.mjs';

export function inspectAssignmentAdmission(root) {
  const errors=[];
  const fail=(message)=>errors.push(`P06 admission: ${message}`);
  const load=(path)=>{try{return JSON.parse(readFileSync(join(root,path),'utf8'));}catch(error){fail(`${path}: ${error.message}`);return null;}};
  const plan=load('persistence/physical-slices/assignment/admission-evidence-plan.json');
  const admission=load('persistence/physical-slices/assignment/admission.json');
  const entities=load('kernel/entities.json');
  const identifiers=load('kernel/identifiers.json');
  const relationships=load('kernel/relationships.json');
  const ownership=load('domains/ownership-map.json');
  const architecture=load('architecture/authority.json');
  const authority=load('persistence/authority.json');
  const find=(registry,id)=>(registry?.entries||[]).find(x=>x.id===id);
  const entity=find(entities,'Assignment');
  const identifier=find(identifiers,'AssignmentId');
  if(entity?.status!=='approved' || entity?.owning_domain!=='Learning') fail('approved Learning-owned Assignment required');
  if(identifier?.status!=='approved' || identifier?.represents!=='Assignment' || identifier?.owning_domain!=='Learning') fail('approved canonical AssignmentId required');
  if(!(ownership?.entries||[]).some(x=>x.kind==='entity' && x.id==='Assignment' && x.decision_state==='approved' && x.proposed_owner==='Learning') ||
     !architecture?.topology?.runtime_domain_modules?.includes('Learning')) fail('explicit approved Learning ownership/module required');
  const refs=['AssignmentTargetsIdentity','AssignmentReferencesContentPack'];
  for(const id of refs) {
    const r=find(relationships,id);
    if(r?.status!=='approved' || r?.from!=='Assignment' || r?.owning_domain!=='Learning' || r?.cardinality!=='many-to-one') fail(`registered relationship ${id} required`);
  }
  if(plan?.version!=='0.1.0' || plan?.status!=='recorded' || plan?.issue!=='#60' || plan?.owning_module!=='Learning' ||
     JSON.stringify(plan?.records)!==JSON.stringify(['Assignment']) || JSON.stringify(plan?.registered_relationships)!==JSON.stringify(refs)) fail('exact P06 evidence plan/provenance required');
  for(const field of ['shape_decision','lifecycle_decision','protected_scope_decision','content_version_decision']) {
    if(plan?.[field]!=='UNKNOWN') fail(`${field} remains UNKNOWN until an approved gate revision`);
  }
  const proofPatterns=[/two independent empty/i,/P05-to-P06/i,/content-version/i,/capability.*scope/i,/deny without inserting/i,/audit.*atomically/i,/duplicate.*concurrent/i,/foreign-module/i,/authorization.*atomically/i];
  if(!Array.isArray(plan?.required_evidence) || plan.required_evidence.some(x=>typeof x!=='string' || !x.trim()) ||
     proofPatterns.some(pattern=>!plan?.required_evidence?.some(x=>pattern.test(x)))) fail('complete migration/version/scope/audit/atomicity evidence plan required');
  if(!Array.isArray(plan?.unresolved_gates) || plan.unresolved_gates.length<5 || plan.unresolved_gates.some(x=>typeof x!=='string' || !x.trim())) fail('unresolved authority/dependency gates must remain explicit');
  if(plan?.runtime_activation!=='BLOCKED') fail('runtime must remain BLOCKED');
  for(const record of [plan,admission]) for(const key of ['physical_schema_authorized','implementation_authorized','migration_authoring_authorized','shared_or_production_migration_execution_authorized']) {
    if(record?.[key]!==false) fail(`${key} must remain false while P06 is BLOCK`);
  }
  if(admission?.version!=='0.1.0' || admission?.status!=='recorded' || admission?.slice!=='SLICE-P06' || admission?.issue!=='#60' || admission?.decision!=='BLOCK') fail('current P06 decision must be BLOCK');
  const expected=requiredAdmissionCriteria;
  const criteria=admission?.criteria;
  if(JSON.stringify(authority?.schema_admission_gate?.criteria)!==JSON.stringify(expected)) fail('exact Persistence Model criteria required');
  const proven=new Set([expected[0],expected[1],expected[5],expected[7]]);
  if(!Array.isArray(criteria) || criteria.length!==8 || new Set(criteria.map(x=>x.criterion)).size!==8 ||
     criteria.some(x=>!expected.includes(x.criterion) || x.state!==(proven.has(x.criterion)?'PROVEN':'UNKNOWN') || typeof x.evidence!=='string' || !x.evidence.trim())) {
    fail('exact eight distinct criteria must preserve four PROVEN and four UNKNOWN states');
  }
  const decision=Array.isArray(criteria) && criteria.length===8 && criteria.every(x=>x.state==='PROVEN')?'ADMIT':'BLOCK';
  if(admission?.decision!==decision) fail('decision must be derived fail-closed from all eight criteria');
  return errors;
}
