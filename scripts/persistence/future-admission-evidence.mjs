import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requiredAdmissionCriteria } from './admission-criteria.mjs';

const config={
  P07:{lane:'certification',entity:'Certification',identifier:'CertificationId',owner:'Certification',refs:['CertificationBelongsToIdentity','CertificationReferencesContentPack','CertificationObservedByIdentity'],proofs:[/two independent empty/,/P06-to-P07/,/content-version/,/capability.*scope/,/deny without inserting/,/audit.*atomically/,/duplicate.*concurrent/,/revocation.*history/,/public\/private/,/foreign-module/]},
  P08:{lane:'progress-event',entity:'ProgressEvent',identifier:'ProgressEventId',owner:'Learning',refs:['ProgressEventBelongsToLearningSession'],proofs:[/two independent empty/,/P07-to-P08/,/content-version/,/learner-only/,/manager.*deny without inserting/,/duplicate.*concurrent/,/atomically/,/completion.*contention/,/derivation/,/foreign-module/]},
};
export function inspectFutureAdmission(root,slice) {
  const c=config[slice]; if(!c) return ['future admission: unregistered slice'];
  const errors=[],fail=message=>errors.push(`${slice} admission: ${message}`);
  const load=path=>{try{return JSON.parse(readFileSync(join(root,path),'utf8'));}catch(error){fail(`${path}: ${error.message}`);return null;}};
  const plan=load(`persistence/physical-slices/${c.lane}/admission-evidence-plan.json`),admission=load(`persistence/physical-slices/${c.lane}/admission.json`);
  const authority=load('persistence/authority.json'),entities=load('kernel/entities.json'),ids=load('kernel/identifiers.json'),relationships=load('kernel/relationships.json'),ownership=load('domains/ownership-map.json'),arch=load('architecture/authority.json');
  const find=(registry,id)=>(registry?.entries||[]).find(x=>x.id===id);
  if(find(entities,c.entity)?.status!=='approved' || find(entities,c.entity)?.owning_domain!==c.owner || find(ids,c.identifier)?.status!=='approved' || find(ids,c.identifier)?.represents!==c.entity || find(ids,c.identifier)?.owning_domain!==c.owner) fail('approved canonical entity/identifier/owner required');
  if(!(ownership?.entries||[]).some(x=>x.kind==='entity' && x.id===c.entity && x.decision_state==='approved' && x.proposed_owner===c.owner) || !arch?.topology?.runtime_domain_modules?.includes(c.owner)) fail('approved ownership and runtime module required');
  const refs=(relationships?.entries||[]).filter(x=>x.status==='approved' && x.from===c.entity && x.owning_domain===c.owner).map(x=>x.id).sort();
  if(JSON.stringify(refs)!==JSON.stringify([...c.refs].sort()) || JSON.stringify(plan?.registered_relationships)!==JSON.stringify(c.refs)) fail('exact approved relationship inventory required');
  if(plan?.version!=='0.1.0' || plan?.status!=='recorded' || plan?.slice!==`SLICE-${slice}` || plan?.owning_module!==c.owner || JSON.stringify(plan?.records)!==JSON.stringify([c.entity])) fail('exact recorded evidence plan required');
  for(const field of ['shape_decision','lifecycle_decision','protected_scope_decision','content_version_decision']) if(plan?.[field]!=='UNKNOWN') fail(`${field} remains UNKNOWN until an approved gate revision`);
  if(plan?.runtime_activation!=='BLOCKED') fail('runtime activation must remain BLOCKED');
  for(const item of [plan,admission]) for(const field of ['physical_schema_authorized','implementation_authorized','migration_authoring_authorized','shared_or_production_migration_execution_authorized']) if(item?.[field]!==false) fail(`${field} must remain false while BLOCK`);
  if(!Array.isArray(plan?.required_evidence) || plan.required_evidence.some(x=>typeof x!=='string' || !x.trim()) || c.proofs.some(regex=>!plan?.required_evidence?.some(x=>typeof x==='string' && regex.test(x)))) fail('complete replay, scope, version, audit and contention evidence plan required');
  if(!Array.isArray(plan?.unresolved_gates) || plan.unresolved_gates.length<5 || plan.unresolved_gates.some(x=>typeof x!=='string' || !x.trim())) fail('unresolved owner/dependency gates required');
  if(admission?.version!=='0.1.0' || admission?.status!=='recorded' || admission?.slice!==`SLICE-${slice}` || admission?.decision!=='BLOCK') fail('current admission decision must be BLOCK');
  if(JSON.stringify(authority?.schema_admission_gate?.criteria)!==JSON.stringify(requiredAdmissionCriteria)) fail('exact Persistence Model criteria required');
  const expected=requiredAdmissionCriteria,proven=new Set([expected[0],expected[1],expected[5],expected[7]]),criteria=admission?.criteria;
  if(!Array.isArray(criteria) || criteria.length!==8 || new Set(criteria.map(x=>x?.criterion)).size!==8 || criteria.some(x=>!expected.includes(x?.criterion) || x?.state!==(proven.has(x.criterion)?'PROVEN':'UNKNOWN') || typeof x.evidence!=='string' || !x.evidence.trim())) fail('exact eight criteria must preserve four PROVEN and four UNKNOWN');
  return errors;
}
