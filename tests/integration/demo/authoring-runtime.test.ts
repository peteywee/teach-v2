import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import {assertIsolatedDatabaseTarget} from '../../../scripts/db/isolated-database-target.mjs';
import {verifyIsolatedSchemaProof} from '../../../scripts/db/verify-isolated-schema.mjs';
import {SuccessorDemoTransaction} from '../../../src/bootstrap/demo-successor/transaction.js';
import {createAuthoringApplication,type AuthoringRequest} from '../../../src/bootstrap/demo-authoring/application.js';
import {canonicalJson} from '../../../src/modules/content/domain/demo-content.js';
import {createHash} from 'node:crypto';
const code=(expected:string)=>(e:any)=>e?.code===expected;
export async function exerciseAuthoringPostgres(pool:pg.Pool){
 const real=new SuccessorDemoTransaction(pool);let failReceipt=false;
 const app=createAuthoringApplication({transactions:{authoring:true,run:work=>real.run(tx=>work({...tx,authoringReceipts:{...tx.authoringReceipts!,get:(...args)=>tx.authoringReceipts!.get(...args),countOwnedReceipts:(...args)=>tx.authoringReceipts!.countOwnedReceipts(...args),put:async value=>{if(failReceipt)throw Error('injected receipt persistence failure');await tx.authoringReceipts!.put(value);}}}))}});
 function visitor(){let credential:string|null=null,scope:Record<string,string>={};return {get scope(){return scope;},async call(operation:string,body:Record<string,unknown>={},params:Record<string,string>={},key:string|null=null,query:Record<string,unknown>={}):Promise<any>{const result=await app.execute({operation,credential,requestId:randomUUID(),admissionPrefix:'SHARED_UNKNOWN',readInput:()=>({params:{...scope,...params},body,query:{limit:20,cursor:null,assignmentId:null,...query},idempotencyKey:key})} as AuthoringRequest);if(result.issuedCredential)credential=result.issuedCredential;if(result.clearCookie)credential=null;if(operation==='BeginDemoRun')scope=(result.body as any).demo.scope;return result.body;}};}
 const v=visitor(),first=await v.call('BeginDemoRun'),initial=(await v.call('ListOwnAssignments')).items[0].assignment;
 const old=(await pool.query('SELECT * FROM teach_v2_demo.content_pack_versions WHERE content_pack_id=$1',[initial.contentPackId])).rows;
 await assert.rejects(v.call('ReadAuthoringWorkspace'),code('FORBIDDEN'));
 await v.call('SwitchDemoPersona',{...v.scope,persona:'MANAGER'});const w=await v.call('ReadAuthoringWorkspace'),catalog=structuredClone(w.source.catalog);catalog.stations[0].label='Fry sample revised';
 const save={expectedRevision:0,mode:'replace',catalog};const results=await Promise.all(Array.from({length:4},()=>v.call('SaveContentDraft',save,{},'postgres_save_12345')));assert.deepEqual(results[0],results[3]);const d=results[0];
 assert.equal((await pool.query('SELECT revision FROM teach_v2_demo.content_authoring_drafts WHERE demo_run_id=$1',[w.runId])).rows[0].revision,1);
 await assert.rejects(v.call('SaveContentDraft',{...save,expectedRevision:1},{},'postgres_save_12345'),code('IDEMPOTENCY_KEY_REUSED'));
 await assert.rejects(v.call('SaveContentDraft',save,{},'postgres_stale_12345'),code('CONFLICT'));
 const preview=await v.call('PreviewContentDraft',{},{},null,{revision:1});assert.equal(preview.draft,true);assert.ok(!JSON.stringify(preview).includes('expectedOptionIndex'));
 failReceipt=true;await assert.rejects(v.call('PublishContentDraft',{expectedRevision:1,draftDigest:d.catalogDigest},{},'postgres_failure_123'));failReceipt=false;
 assert.deepEqual((await pool.query('SELECT * FROM teach_v2_demo.content_pack_versions WHERE content_pack_id=$1',[initial.contentPackId])).rows,old);
 const pubs=await Promise.all(Array.from({length:4},()=>v.call('PublishContentDraft',{expectedRevision:1,draftDigest:d.catalogDigest},{},'postgres_publish_123')));assert.deepEqual(pubs[0],pubs[3]);const p=pubs[0];assert.equal(p.contentRef.version,'1.2.1');assert.equal(p.unchanged,false);
 const repeated=await v.call('PublishContentDraft',{expectedRevision:1,draftDigest:d.catalogDigest},{},'postgres_repeat_123');assert.equal(repeated.unchanged,true);assert.deepEqual(repeated.contentRef,p.contentRef);
 assert.deepEqual((await pool.query('SELECT * FROM teach_v2_demo.content_pack_versions WHERE content_pack_id=$1 AND version=$2',[initial.contentPackId,initial.contentVersion.version])).rows,old);
 const next=await v.call('AssignContent',{identityId:first.identityId,contentPackId:p.contentRef.contentPackId,contentVersion:{version:p.contentRef.version,digest:p.contentRef.digest}},{},'postgres_assign_1234');assert.notEqual(next.id,initial.id);
 const other=visitor();await other.call('BeginDemoRun');await other.call('SwitchDemoPersona',{...other.scope,persona:'MANAGER'});await assert.rejects(other.call('ReadAuthoringWorkspace',{},v.scope),code('NOT_FOUND'));await assert.rejects(other.call('ReadAuthoringOperation',{}, {...v.scope,key:'postgres_publish_123'},null,{operation:'PublishContentDraft'}),code('NOT_FOUND'));
 assert.equal((await other.call('ReadAuthoringOperation',{}, {key:'postgres_publish_123'},null,{operation:'PublishContentDraft'})).found,false);
 // Direct SQL operates as the restricted runtime role: malformed transition rejected even outside HTTP.
 await assert.rejects(pool.query('UPDATE teach_v2_demo.content_authoring_drafts SET revision=revision+2 WHERE demo_run_id=$1',[w.runId]),code('23514'));
 await assert.rejects(pool.query('UPDATE teach_v2_demo.content_authoring_drafts SET manager_identity_id=$1 WHERE demo_run_id=$2',[first.identityId,w.runId]),code('23514'));
 const bad=structuredClone(catalog);bad.recipes[0].requirements[0].equipmentId='foreign_equipment';const bytes=canonicalJson(bad),digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
 await assert.rejects(pool.query('UPDATE teach_v2_demo.content_authoring_drafts SET revision=revision+1,catalog_json=$1,catalog_digest=$2,updated_at=pg_catalog.clock_timestamp() WHERE demo_run_id=$3',[bytes,digest,w.runId]),code('23514'));
 for(const mutate of [(c:any)=>{c.stations[0].label='\u00a0';},(c:any)=>{c.recipes[0].reference=' ';},(c:any)=>{c.recipes[0].ingredients[0]='\u00a0';},(c:any)=>{c.recipes[0].steps[0]='\t';}]){const invalid=structuredClone(catalog);mutate(invalid);const value=canonicalJson(invalid),bound='sha256:'+createHash('sha256').update(value).digest('hex');await assert.rejects(pool.query('UPDATE teach_v2_demo.content_authoring_drafts SET revision=revision+1,catalog_json=$1,catalog_digest=$2,updated_at=pg_catalog.clock_timestamp() WHERE demo_run_id=$3',[value,bound,w.runId]),code('23514'));}
 await assert.rejects(pool.query('DELETE FROM teach_v2_demo.content_authoring_drafts WHERE demo_run_id=$1',[w.runId]),code('42501'));
 await assert.rejects(pool.query('UPDATE teach_v2_demo.content_authoring_receipts SET key=key WHERE demo_run_id=$1',[w.runId]),code('42501'));
 // Zero/missing grants must be false, never SQL NULL authorizing a write.
 const incomplete=await real.run(async tx=>{const now=await tx.identity.now(),run={id:randomUUID(),organizationId:randomUUID(),locationId:randomUUID(),status:'ACTIVE' as const,createdAt:now,expiresAt:new Date(now.getTime()+3600000),closedAt:null,closeReason:null,admissionPrefix:'SHARED_UNKNOWN'};await tx.organization.createScope(run);const manager=await tx.identity.createPersona({id:randomUUID(),identityId:randomUUID(),demoRunId:run.id,kind:'MANAGER',createdAt:now});const membership={id:randomUUID(),identityId:manager.identityId,organizationId:run.organizationId,locationId:run.locationId,status:'ACTIVE' as const,createdAt:now,updatedAt:now};await tx.organization.createMembership(membership);return {run,manager,membership};});
 const ownerArgs=[incomplete.run.id,incomplete.run.organizationId,incomplete.run.locationId,incomplete.manager.identityId];
 for(const missing of ['both','manager']){
  assert.equal((await pool.query('SELECT teach_v2_demo.demo_authoring_owner_active($1,$2,$3,$4,pg_catalog.clock_timestamp()) allowed',ownerArgs)).rows[0].allowed,false,missing);
  await assert.rejects(pool.query(`INSERT INTO teach_v2_demo.content_authoring_drafts(id,demo_run_id,organization_id,location_id,manager_identity_id,content_pack_id,base_version,base_digest,revision,catalog_json,catalog_digest,created_at,updated_at) VALUES($5,$1,$2,$3,$4,$6,$7,$8,1,$9,$10,$11,$11)`,[...ownerArgs,randomUUID(),w.source.baseContentRef.contentPackId,w.source.baseContentRef.version,w.source.baseContentRef.digest,canonicalJson(catalog),d.catalogDigest,new Date()]),(e:any)=>e.code==='23514'&&/Draft owner/.test(e.message));
  await assert.rejects(pool.query(`INSERT INTO teach_v2_demo.content_authoring_receipts(demo_run_id,organization_id,location_id,manager_identity_id,key,operation,payload_digest,result,created_at,expires_at) VALUES($1,$2,$3,$4,'missing_grants_12345','SaveContentDraft',$5,'{}',pg_catalog.clock_timestamp(),$6)`,[...ownerArgs,'0'.repeat(64),incomplete.run.expiresAt]),(e:any)=>e.code==='23514'&&/Receipt owner/.test(e.message));
  if(missing==='both')await real.run(tx=>tx.organization.createGrant({id:randomUUID(),membershipId:incomplete.membership.id,bundle:'demo_visitor',createdAt:new Date()}));
 }
 await assert.rejects(pool.query(`INSERT INTO teach_v2_demo.organization_membership_grants(id,membership_id,bundle,created_at) VALUES($1,$2,'observer',pg_catalog.clock_timestamp())`,[randomUUID(),incomplete.membership.id]),code('23514'));
 await real.run(tx=>tx.organization.createGrant({id:randomUUID(),membershipId:incomplete.membership.id,bundle:'manager',createdAt:new Date()}));
 assert.equal((await pool.query('SELECT teach_v2_demo.demo_authoring_owner_active($1,$2,$3,$4,pg_catalog.clock_timestamp()) allowed',ownerArgs)).rows[0].allowed,true);
 const restore=await v.call('SaveContentDraft',{expectedRevision:1,mode:'restorePublished',publishedContentRef:w.source.baseContentRef},{},'postgres_restore_123');assert.equal(restore.revision,2);
 const restored=await v.call('PublishContentDraft',{expectedRevision:2,draftDigest:restore.catalogDigest},{},'postgres_restore_pub');assert.equal(restored.contentRef.version,'1.2.2');assert.equal(restored.unchanged,false);
 // Historical receipt does not have to equal the latest mutable draft revision.
 assert.equal((await v.call('ReadAuthoringOperation',{}, {key:'postgres_save_12345'},null,{operation:'SaveContentDraft'})).result.revision,1);
 await v.call('CloseDemoRun',v.scope);await assert.rejects(v.call('ReadAuthoringWorkspace'),code('UNAUTHENTICATED'));
}
test('authoring persists under restricted PostgreSQL17 role with real locks, rollback, immutable versions and exact isolation grants',async()=>{assertIsolatedDatabaseTarget(process.env.DATABASE_URL);const proof=await verifyIsolatedSchemaProof({exerciseRuntime:async({pool}:{pool:pg.Pool})=>exerciseAuthoringPostgres(pool)});assert.equal(proof.runtimeExercised,true);});
