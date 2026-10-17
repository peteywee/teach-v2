import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectCapabilityAdmission, inspectAdmissionSchema } from '../kernel/capability-admission.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-capability-admission-'));
for (const path of ['kernel','domains','contracts','application-interfaces','governance/decision-closure']) cpSync(join(root,path),join(fixture,path),{recursive:true});
after(() => rmSync(fixture,{recursive:true,force:true}));
const read = path => readFileSync(join(fixture,path),'utf8');
const json = path => JSON.parse(read(path));
const registration = 'domains/capabilities/registration.json';
const approval = 'domains/capabilities/owner-approval.json';
const proposal = 'domains/capabilities/proposal-0.1.1/';
const rejected = (path, mutate, pattern = /capability admission|capability schema/) => {
  const original = read(path);
  try {
    writeFileSync(join(fixture,path), mutate(original));
    const errors = inspectCapabilityAdmission(fixture).errors;
    assert.ok(errors.length, `accepted mutation of ${path}`);
    assert.match(errors.join('\n'),pattern);
  } finally { writeFileSync(join(fixture,path),original); }
};
const rejectedJson = (path, mutate, pattern) => rejected(path, text => {
  const value = JSON.parse(text); mutate(value); return JSON.stringify(value,null,2)+'\n';
}, pattern);
const cli = script => spawnSync(process.execPath,[join(root,script)],{cwd:fixture,encoding:'utf8',timeout:5000});

test('exact owner-approved 36-entry overlay and all-family closure pass',()=>{
  const result=inspectCapabilityAdmission(root);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.promotedEntries,36);
  assert.equal(result.closure.approvedEntries,120);
  assert.equal(result.closure.checkedReferences,147);
  assert.equal(result.closure.exceptions.length,3);
  assert.deepEqual(inspectCapabilityAdmission(fixture).errors,[]);
});
test('real admission CLI passes clean fixture and rejects actual unauthorized extra name',()=>{
  let result=cli('scripts/kernel/validate-capability-admission.mjs');assert.equal(result.status,0,result.stderr);
  const path='kernel/capabilities.json',original=read(path);
  try { const d=json(path);d.entries.push({...d.entries[0],id:'platform.everything.allow'});writeFileSync(join(fixture,path),JSON.stringify(d));
    for(const script of ['scripts/kernel/validate-capability-admission.mjs','scripts/kernel/validate-semantic-kernel.mjs']) {result=cli(script);assert.equal(result.status,1,result.stdout+result.stderr);assert.match(result.stderr,/exact approved overlay/);}
  }finally{writeFileSync(join(fixture,path),original);}
});
test('every one of the 36 entries is required approved, never partial or deleted',()=>{
  for(const [path,select] of [['kernel/values.json',e=>e.id==='Capability'],['kernel/identifiers.json',e=>e.id==='CapabilityId'],['kernel/capabilities.json',()=>true]]) {
    for(const entry of json(path).entries.filter(select)) {
      rejectedJson(path,d=>{d.entries.find(e=>e.id===entry.id).status='candidate';},/exact approved overlay/);
      rejectedJson(path,d=>{d.entries=d.entries.filter(e=>e.id!==entry.id);},/exact approved overlay/);
    }
  }
});
test('no unrelated candidate or held Membership can be promoted',()=>{
  for(const [path,id] of [['kernel/entities.json','Membership'],['kernel/identifiers.json','LocationId'],['kernel/values.json','EmailAddress'],['kernel/events.json','MembershipCreated'],['kernel/decision-tables.json','AuthorizationDecision']]) {
    const actual=json(path).entries.find(e=>e.id===id)??json(path).entries.find(e=>e.status==='candidate');
    rejectedJson(path,d=>{d.entries.find(e=>e.id===actual.id).status='approved';},/exact approved overlay/);
  }
});
test('every operation reference is bound to its own immutable C14 row',()=>{
  for(let i=0;i<34;i++) rejectedJson('kernel/capabilities.json',d=>{d.entries[i].authorization_policy_ref.json_pointer=`/operations/${(i+1)%34}`;},/C14 operation reference/);
});
test('definition, owner, fields and namespace cannot redefine the approved names',()=>{
  for(const [field,value] of [['id','legacy.platform.operator'],['definition',[]],['owning_domain','Identity'],['kind','entity'],['identifier','MembershipId'],['grants',['org_admin']],['scope','PLATFORM'],['lifecycle',{}],['relationships',['Membership']]]) rejectedJson('kernel/capabilities.json',d=>{d.entries[0][field]=value;},/exact approved overlay/);
});
test('typed Capability and CapabilityId links must close without alternate entities',()=>{
  rejectedJson('kernel/values.json',d=>{d.entries.find(e=>e.id==='Capability').kind='entity';});
  rejectedJson('kernel/values.json',d=>{d.entries.find(e=>e.id==='Capability').identifier='LocationId';},/typed|identifier type/);
  rejectedJson('kernel/identifiers.json',d=>{d.entries.find(e=>e.id==='CapabilityId').represents='Membership';},/must represent/);
  rejectedJson('kernel/identifiers.json',d=>{d.entries.find(e=>e.id==='CapabilityId').validation.allowed_values_source='legacy/grants.json';},/typed name validation/);
});
test('candidate, missing and malformed references fail on every SEM-36 field',()=>{
  for(const field of ['requires','from','to','entity','emitted_by','scope']) for(const value of ['Membership','MissingDependency',{id:'Membership'}]) rejectedJson('kernel/capabilities.json',d=>{d.entries[0][field]=field==='requires'&&typeof value==='string'?[value]:value;});
});
test('duplicate capabilities and duplicate typed IDs cannot hide outside exact family',()=>{
  rejectedJson('kernel/capabilities.json',d=>d.entries.push(d.entries[0]));
  rejectedJson('kernel/identifiers.json',d=>d.entries.push(d.entries.find(e=>e.id==='CapabilityId')));
  rejectedJson('kernel/entities.json',d=>d.entries.push({id:'Capability',kind:'entity',status:'approved'}));
});
test('owner evidence cannot be absent, forged, replaced by a boolean or broadened',()=>{
  for(const change of [d=>{delete d.response;},d=>{d.response.author='agent';},d=>{d.response.text='approved';},d=>{d.package_version='0.1.0';},d=>{d.owner_approval_verified=true;},d=>{d.runtime_activation_authorized=true;}]) rejectedJson(approval,change,/exact recorded owner approval/);
  const original=read(approval);try{rmSync(join(fixture,approval));assert.match(inspectCapabilityAdmission(fixture).errors.join('\n'),/missing or malformed/);}finally{writeFileSync(join(fixture,approval),original);}
});
test('immutable proposal remains candidate and never gains fabricated approval',()=>{
  rejectedJson(proposal+'entries.proposed.json',d=>{d.entries[0].status='approved';},/immutable package file differs/);
  rejectedJson(proposal+'manifest.json',d=>{d.owner_approval={verified:true};},/immutable package file differs/);
  rejected(proposal+'SHA256SUMS',s=>s.replace(/^[a-f0-9]/,'0'),/immutable package digest/);
  rejected(proposal+'README.md',s=>s+'\n',/immutable package file differs/);
});
test('original source-baseline hashes cannot be rewritten to legitimize edits',()=>{
  rejectedJson('domains/capabilities/source-baseline.json',d=>{d.files['kernel/entities.json']=d.files['kernel/entities.json'].replace('candidate','approved');},/immutable source-baseline/);
  rejectedJson(proposal+'manifest.json',d=>{d.sources[0].sha256='0'.repeat(64);},/immutable package file differs/);
});
test('all C14 policy bytes, existing bundles and grants remain immutable',()=>{
  rejected('governance/decision-closure/c14-capability-matrix.json',s=>s+'\n',/C14 policy bytes/);
  rejectedJson('governance/decision-closure/c14-capability-matrix.json',d=>{d.operations[0].bundles=['org_admin'];},/C14 policy bytes/);
  rejectedJson('governance/decision-closure/c14-capability-matrix.json',d=>{d.bundles.manager.capabilities.push('content.pack.publish');},/C14 policy bytes/);
});
test('registration cannot claim runtime grants, activation or independent proof',()=>{
  for(const field of ['runtime_grants_created','runtime_activation_authorized','runtime_dependency_closure_proven','independent_review_passed']) rejectedJson(registration,d=>{d[field]=true;},/exact registration scope/);
  rejectedJson(registration,d=>d.promoted_entries.pop(),/exact registration scope/);
});
test('existing ownership and historical approval provenance cannot change',()=>{
  rejectedJson('domains/ownership-map.json',d=>{d.entries.find(e=>e.id==='Identity').proposed_owner='Authorization';},/exact ownership/);
  rejectedJson('domains/ownership-map.json',d=>{d.approval_history=[];},/exact ownership/);
  rejectedJson('domains/ownership-map.json',d=>{d.entries.pop();},/exact ownership/);
  rejectedJson('kernel/manifest.json',d=>{d.slice_p03_relationship_registration.issue='#999';},/historical metadata/);
  rejectedJson('kernel/manifest.json',d=>{d.version='0.18.0';},/exact K00/);
});
test('semantic schema cannot be loosened or silently accept unknown keywords',()=>{
  rejectedJson('kernel/schema/capability-admission.schema.json',d=>{delete d.properties.entries.const;},/deterministic admitted schema differs/);
  rejectedJson('kernel/schema/capability-admission.schema.json',d=>{d.properties.entries.items.properties.status.const='candidate';},/deterministic admitted schema differs/);
  assert.match(inspectAdmissionSchema('x',{type:'string',unknown_rule:true}).join('\n'),/unsupported schema keyword/);
  assert.match(inspectAdmissionSchema(42,{type:'string'}).join('\n'),/type/);
  assert.match(inspectAdmissionSchema({},{type:'object',required:['definition']}).join('\n'),/missing definition/);
});
test('Membership hold details remain exact and cannot exempt capability references',()=>{
  rejectedJson('kernel/entities.json',d=>{d.entries.find(e=>e.id==='Membership').promotion_hold={owner:'Patrick Craven',approved:true};});
  rejectedJson('kernel/capabilities.json',d=>{d.entries[0].requires.push('Membership');},/SEM-36|hold/);
});
