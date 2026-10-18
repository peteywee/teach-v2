import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { requiredAdmissionCriteria } from './admission-criteria.mjs';
const lane='persistence/physical-slices/demo-runtime';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

// This is an engineering admission gate, not runtime verification or deployment authority.
export function inspectDemoPhysicalPrerequisites(root, registration) {
 const errors=[];const fail=message=>errors.push(`demo physical admission: ${message}`);
 const load=path=>{try{return JSON.parse(readFileSync(join(root,path),'utf8'));}catch(e){fail(`${path}: ${e.message}`);return null;}};
 const bytes=path=>{try{return readFileSync(join(root,path));}catch(e){fail(`${path}: ${e.message}`);return Buffer.from('');}};
 const mapping=load(`${lane}/representation.proposed.json`), plan=load(`${lane}/admission-evidence-plan.json`), review=load(`${lane}/independent-representation-review.json`);
 if(!mapping||!plan||!review)return {errors,decision:'BLOCK',criteria:[]};
 if(hash(bytes(`${lane}/independent-representation-review.json`))!=='55c87f49d613fdf3ada095caac11124c89ebe89ef13f8993a7ac3360a87928e0')fail('independent representation review bytes changed');
 if(review.outcome!=='PASS_WITH_PREREQUISITES'||review.unresolved_mapping_blockers?.length!==0||review.source_edits_by_reviewer!==false)fail('independent physical mapping PASS required');
 if(hash(bytes(`${lane}/representation.proposed.json`))!==review.mapping_sha256 || hash(bytes(`${lane}/admission-evidence-plan.json`))!==review.evidence_plan_sha256)fail('independently reviewed mapping/plan bytes changed');
 if(mapping.package_sha256sums_digest!=='a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a'||mapping.package_sha256sums_digest!==review.package_sha256sums_digest)fail('exact approved package digest required');
 if(registration?.errors?.length||registration?.registered!==true||registration?.registeredEntries!==131||registration?.closure?.exceptions?.length!==0)fail('exact package registration and dependency closure must PASS');
 const semanticReview=load(`${lane}/semantic-independent-review.json`);
 if(hash(bytes(`${lane}/semantic-independent-review.json`))!=='ab222ddd74a8b64b9e7b16dd549f369fd33594f80e350b68b122d6b84d1615ef'||hash(bytes(`${lane}/semantic-independent-review.md`))!=='1695c5ff3a884c063323eda27e6905f3af61f4814da8aee8d7ea534aa347f655')fail('independent semantic review bytes changed');
 if(semanticReview?.verdict!=='PASS'||semanticReview?.candidate_commit!=='4d759924389590c9bda330008dbfc76291485200'||semanticReview?.candidate_tree!=='5795b40203414a6751db4e44684b1151cf63903e'||semanticReview?.approved_package_sha256sums!==mapping.package_sha256sums_digest)fail('independent exact-candidate semantic registration PASS required');
 if(hash(bytes('domains/demo-runtime/registration.json'))!=='b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d')fail('independently passed semantic registration bytes changed');
 const registries=new Map();const entry=(family,id)=>{if(!registries.has(family))registries.set(family,load(`kernel/${family}.json`));return registries.get(family)?.entries?.find(e=>e.id===id);};
 const owners=load('domains/ownership-map.json');
 for(const table of mapping.tables??[]) {
  if(entry('entities',table.entity)?.status!=='approved'||entry('entities',table.entity)?.owning_domain!==table.owner)fail(`${table.table}: approved entity/owner required`);
  if(!owners?.entries?.some(e=>e.kind==='entity'&&e.id===table.entity&&e.proposed_owner===table.owner&&e.decision_state==='approved'))fail(`${table.table}: domain owner approval required`);
  for(const reference of table.semantic_dependencies??[])if(entry(reference.family,reference.id)?.status!=='approved')fail(`${table.table}: unapproved ${reference.family}:${reference.id}`);
  for(const [name,field] of Object.entries(table.fields??{})) {
   if(!field.authority||!table.semantic_dependencies.some(r=>r.family===field.authority.family&&r.id===field.authority.id)||!field.definition)fail(`${table.table}.${name}: exact typed authority missing`);
   if(!['text','timestamptz','jsonb','integer','boolean','bytea'].includes(field.postgres_type)||typeof field.nullable!=='boolean')fail(`${table.table}.${name}: unsupported representation`);
  }
  if(!table.constraints?.length||table.relationship_constraints?.length!==table.semantic_dependencies.filter(r=>r.family==='relationships').length)fail(`${table.table}: complete constraint/relationship mapping required`);
 }
 if(mapping.tables?.length!==15||mapping.tables.filter(t=>t.table==='learning_sessions').length!==1)fail('exact reviewed 14 new tables plus P05 extension required');
 for(const [name,digest] of Object.entries(mapping.prior_migration_sha256))if(hash(bytes(`drizzle/${name}`))!==digest)fail(`historical migration changed: ${name}`);
 for(const [name,digest] of Object.entries(mapping.prior_metadata_sha256))if(name!=='_journal.json'&&hash(bytes(`drizzle/meta/${name}`))!==digest)fail(`historical metadata changed: ${name}`);
 const prior=load(`${lane}/prior-journal.json`),journal=load('drizzle/meta/_journal.json');
 if(hash(bytes(`${lane}/prior-journal.json`))!==mapping.prior_metadata_sha256['_journal.json']||JSON.stringify(journal?.entries?.slice(0,5))!==JSON.stringify(prior?.entries))fail('original journal prefix must remain immutable');
 if(!plan.isolation?.includes('READ COMMITTED')||!plan.lock_order?.length||!plan.race_oracles?.length||!plan.append_failure_matrix||!plan.recovery)fail('complete isolated replay/race/rollback evidence plan required');
 const decision=errors.length?'BLOCK':'ADMIT';
 const criteria=requiredAdmissionCriteria.map(criterion=>({criterion,state:errors.length?'UNKNOWN':'PROVEN',evidence:`${lane}/representation.proposed.json; independent-representation-review.json; semantic-independent-review.json; admission-evidence-plan.json; fresh typed dependency and immutable-history evaluation`}));
 return {errors,decision,criteria,mapping_sha256:review.mapping_sha256,evidence_plan_sha256:review.evidence_plan_sha256,semantic_review:semanticReview};
}

// Composition order: validate semantic registration, then evaluate the pure physical gate.
// The semantic successor hook imports only inspectDemoPhysicalPrerequisites and
// provides its independently validated registration facts; it must never call this wrapper.
export async function inspectDemoPhysicalAdmission(root) {
 let registration;
 try { const verifier = await import(new URL('../kernel/demo-runtime-registration.mjs', import.meta.url)); registration = verifier.inspectDemoRuntimeRegistration(root); }
 catch (error) { registration = { errors: [error.message], registered: false }; }
 return inspectDemoPhysicalPrerequisites(root, registration);
}
