import {randomUUID} from 'node:crypto';
import {parseStrictJson,validateContent,publicContent,canonicalJson,type StationTeachingContent} from '../domain/demo-content.js';
import {AUTHORING_LIMITS,catalogOf,catalogDigest,validateAuthoringCatalog,composeAuthoredContent} from '../domain/demo-authoring.js';
import type {AuthoringPort,AuthoringOwner,AuthoringContentRef,ContentDraft} from './ports/demo-authoring.js';
import type {ContentPort,ContentRecord} from './ports/demo-content.js';
import type {AuthoringReceiptPort} from '../../transaction-control/application/ports/demo-authoring-receipts.js';
import {prepareAuthoringReceipt} from '../../transaction-control/application/demo-authoring-receipts.js';
import type {DemoContext} from '../../authorization/application/demo-authorization.js';
import {AUTHORING_OPERATIONS} from '../../authorization/application/demo-authoring-authorization.js';
import {DemoError} from '../../authorization/application/demo-error.js';
import type {AuditPort} from '../../audit-lifecycle/application/ports/demo-audit.js';
import {appendDemoSuccess} from '../../audit-lifecycle/application/demo-audit.js';
import type {LearningPort} from '../../learning/application/ports/demo-learning.js';
import type {OrganizationPort} from '../../organization/application/ports/demo-organization.js';
export interface AuthoringServicePorts {content:ContentPort;organization:OrganizationPort;authoring:AuthoringPort;authoringReceipts:AuthoringReceiptPort;audit:AuditPort;learning:LearningPort}
export type SaveDraftInput={expectedRevision:number;mode:'replace';catalog:unknown}|{expectedRevision:number;mode:'restorePublished';publishedContentRef:AuthoringContentRef};
const ref=(v:ContentRecord):AuthoringContentRef=>({contentPackId:v.id,version:v.version,digest:v.digest});
const equal=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
function sourceContent(record:ContentRecord|null,owner:AuthoringOwner):StationTeachingContent{
 if(!record||record.organizationId!==owner.organizationId)throw new DemoError('NOT_FOUND');
 try{const v=validateContent(parseStrictJson(record.canonicalJson));if(v.content.schemaVersion!=='1.2.0'||v.canonicalJson!==record.canonicalJson||v.digest!==record.digest||v.content.contentPackId!==record.id||v.content.organizationId!==record.organizationId||v.content.version!==record.version)throw Error();return v.content;}catch{throw new DemoError('SERVICE_UNAVAILABLE');}
}
async function source(ports:AuthoringServicePorts,owner:AuthoringOwner,context:DemoContext){
 const learners=await ports.organization.listDirectReports(owner.managerIdentityId,owner);await context.refresh();if(learners.length!==1)throw new DemoError('FORBIDDEN');
 const assignments=await ports.learning.listAssignments(learners[0]!,owner);await context.refresh();
 // The seed is identified by its fixed immutable version, never timestamp/random-ID order.
 const seeds=assignments.filter(a=>a.organizationId===owner.organizationId&&a.locationId===owner.locationId&&a.identityId===learners[0]&&a.contentVersion.version==='1.2.0');
 const initial=seeds[0];if(!initial)throw new DemoError('NOT_FOUND');
 if(seeds.some(a=>a.contentPackId!==initial.contentPackId||a.contentVersion.digest!==initial.contentVersion.digest))throw new DemoError('SERVICE_UNAVAILABLE');
 const record=await ports.content.getVersion(initial.contentPackId,owner.organizationId,initial.contentVersion.version);await context.refresh();
 if(record?.digest!==initial.contentVersion.digest)throw new DemoError('SERVICE_UNAVAILABLE');return {record,content:sourceContent(record,owner)};
}
function draftDto(d:ContentDraft){return {id:d.id,revision:d.revision,catalogDigest:d.catalogDigest,catalog:structuredClone(d.catalog),createdAt:d.createdAt.toISOString(),updatedAt:d.updatedAt.toISOString(),baseContentRef:{...d.baseContentRef},lastPublished:d.lastPublished?structuredClone(d.lastPublished):null};}
function validateDraft(d:ContentDraft|null,owner:AuthoringOwner,base:ContentRecord):ContentDraft|null{
 if(!d)return null;
 if(d.runId!==owner.runId||d.managerIdentityId!==owner.managerIdentityId||d.organizationId!==owner.organizationId||d.locationId!==owner.locationId||d.contentPackId!==base.id||!equal(d.baseContentRef,ref(base))||!Number.isSafeInteger(d.revision)||d.revision<1||d.revision>AUTHORING_LIMITS.saves||d.catalogDigest!==catalogDigest(d.catalog))throw new DemoError('SERVICE_UNAVAILABLE');
 return d;
}
async function current(ports:AuthoringServicePorts,owner:AuthoringOwner,context:DemoContext,base:ContentRecord){const draft=await ports.authoring.getDraft(owner);await context.refresh();return validateDraft(draft,owner,base);}
async function versions(ports:AuthoringServicePorts,owner:AuthoringOwner,context:DemoContext,base:ContentRecord){
 const rows=await ports.authoring.listPublished(owner,base.id);await context.refresh();if(rows.length<1||rows.length>AUTHORING_LIMITS.publications+1)throw new DemoError('SERVICE_UNAVAILABLE');
 const seen=new Set<string>();for(const row of rows){sourceContent(row,owner);if(row.id!==base.id||seen.has(row.version)||!/^1\.2\.(?:[0-9]|10)$/.test(row.version))throw new DemoError('SERVICE_UNAVAILABLE');seen.add(row.version);}
 rows.sort((a,b)=>Number(a.version.split('.')[2])-Number(b.version.split('.')[2]));if(rows.some((r,i)=>r.version!==`1.2.${i}`)||!equal(ref(rows[0]!),ref(base)))throw new DemoError('SERVICE_UNAVAILABLE');return rows;
}
export async function readAuthoringWorkspace(ports:AuthoringServicePorts,owner:AuthoringOwner,context:DemoContext){
 const base=await source(ports,owner,context),draft=await current(ports,owner,context,base.record),published=await versions(ports,owner,context,base.record);if(draft)validateAuthoringCatalog(draft.catalog,base.content);
 const assignmentCount=await ports.learning.countAssignments(context.scope);await context.refresh();if(!Number.isSafeInteger(assignmentCount)||assignmentCount<1||assignmentCount>10)throw new DemoError('SERVICE_UNAVAILABLE');
 const latest=published[published.length-1]!;
 return {schemaVersion:1,runId:owner.runId,scope:{organizationId:owner.organizationId,locationId:owner.locationId},managerIdentityId:owner.managerIdentityId,expiresAt:context.run.expiresAt.toISOString(),allowedOperations:[...AUTHORING_OPERATIONS],source:{contentPackId:base.record.id,baseContentRef:ref(base.record),people:structuredClone(base.content.people),title:base.content.title,catalog:catalogOf(base.content)},draft:draft?draftDto(draft):null,latestPublished:{contentRef:ref(latest),catalog:catalogOf(sourceContent(latest,owner))},publishedVersions:published.map(ref),limits:{...AUTHORING_LIMITS,remainingSaves:AUTHORING_LIMITS.saves-(draft?.revision??0),remainingPublications:AUTHORING_LIMITS.publications-(published.length-1),remainingAssignments:10-assignmentCount}};
}
export async function saveContentDraft(ports:AuthoringServicePorts,owner:AuthoringOwner,context:DemoContext,input:SaveDraftInput,key:string|null){
 const receipt=await prepareAuthoringReceipt(ports.authoringReceipts,owner,context,'SaveContentDraft',key,input);if(receipt.replay)return receipt.replay;
 const base=await source(ports,owner,context),prior=await current(ports,owner,context,base.record);if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision!==(prior?.revision??0))throw new DemoError('CONFLICT');
 let inputCatalog:unknown;
 if(input.mode==='replace')inputCatalog=input.catalog;else{const published=await versions(ports,owner,context,base.record);const selected=published.find(v=>equal(ref(v),input.publishedContentRef));if(!selected)throw new DemoError('NOT_FOUND');inputCatalog=catalogOf(sourceContent(selected,owner));}
 const catalog=validateAuthoringCatalog(inputCatalog,base.content),digest=catalogDigest(catalog);
 if(prior&&prior.catalogDigest===digest){const result={operation:'SaveContentDraft',draftId:prior.id,revision:prior.revision,catalogDigest:prior.catalogDigest,updatedAt:prior.updatedAt.toISOString()};await receipt.save(result);return result;}
 if(prior&&prior.revision>=AUTHORING_LIMITS.saves)throw new DemoError('PRECONDITION_FAILED');await context.refresh();
 const next:ContentDraft={...owner,id:prior?.id??randomUUID(),contentPackId:base.record.id,baseContentRef:ref(base.record),revision:(prior?.revision??0)+1,catalog,catalogDigest:digest,createdAt:prior?.createdAt??new Date(context.now),updatedAt:new Date(context.now),lastPublished:prior?.lastPublished??null};
 if(!await ports.authoring.saveDraft(next,input.expectedRevision))throw new DemoError('CONFLICT');await context.refresh();
 await appendDemoSuccess(ports.audit,context,'SaveContentDraft',{type:'ContentDraft',id:next.id,version:String(next.revision),digest:next.catalogDigest},key);await context.refresh();
 const result={operation:'SaveContentDraft',draftId:next.id,revision:next.revision,catalogDigest:next.catalogDigest,updatedAt:next.updatedAt.toISOString()};await receipt.save(result);return result;
}
export async function previewContentDraft(ports:AuthoringServicePorts,owner:AuthoringOwner,context:DemoContext,revision:number){
 const base=await source(ports,owner,context),draft=await current(ports,owner,context,base.record);if(!draft)throw new DemoError('NOT_FOUND');if(draft.revision!==revision)throw new DemoError('CONFLICT');
 const preview=composeAuthoredContent(base.content,draft.catalog,`0.0.0-draft.${draft.revision}`);await context.refresh();return {draft:true,revision:draft.revision,catalogDigest:draft.catalogDigest,content:publicContent(preview)};
}
export async function publishContentDraft(ports:AuthoringServicePorts,owner:AuthoringOwner,context:DemoContext,input:{expectedRevision:number;draftDigest:string},key:string|null){
 const receipt=await prepareAuthoringReceipt(ports.authoringReceipts,owner,context,'PublishContentDraft',key,input);if(receipt.replay)return receipt.replay;
 const base=await source(ports,owner,context),draft=await current(ports,owner,context,base.record);if(!draft)throw new DemoError('NOT_FOUND');if(draft.revision!==input.expectedRevision||draft.catalogDigest!==input.draftDigest)throw new DemoError('CONFLICT');
 if(draft.lastPublished?.revision===draft.revision){const result={operation:'PublishContentDraft',draftId:draft.id,revision:draft.revision,contentRef:{...draft.lastPublished.contentRef},unchanged:true};await receipt.save(result);return result;}
 const published=await versions(ports,owner,context,base.record),latest=published[published.length-1]!;
 const sameBusiness=composeAuthoredContent(base.content,draft.catalog,latest.version).canonicalJson===latest.canonicalJson;
 if(sameBusiness){if(!await ports.authoring.markPublished(owner,draft.id,draft.revision,ref(latest)))throw new DemoError('CONFLICT');await context.refresh();const result={operation:'PublishContentDraft',draftId:draft.id,revision:draft.revision,contentRef:ref(latest),unchanged:true};await receipt.save(result);return result;}
 if(published.length>AUTHORING_LIMITS.publications)throw new DemoError('PRECONDITION_FAILED');
 const value=composeAuthoredContent(base.content,draft.catalog,`1.2.${published.length}`);await context.refresh();const record:ContentRecord={id:base.record.id,organizationId:owner.organizationId,version:value.content.version,digest:value.digest,canonicalJson:value.canonicalJson};
 await ports.authoring.appendVersion(owner,record);await context.refresh();if(!await ports.authoring.markPublished(owner,draft.id,draft.revision,ref(record)))throw new DemoError('CONFLICT');await context.refresh();
 await appendDemoSuccess(ports.audit,context,'PublishContentPack',{type:'ContentPack',id:record.id,version:record.version,digest:record.digest},key);await context.refresh();
 const result={operation:'PublishContentDraft',draftId:draft.id,revision:draft.revision,contentRef:ref(record),unchanged:false};await receipt.save(result);return result;
}
