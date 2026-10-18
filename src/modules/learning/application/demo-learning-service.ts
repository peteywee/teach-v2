import { randomUUID,createHash } from 'node:crypto';
import type { LearningPort,Assignment,LearningSession,Progress } from './ports/demo-learning.js';
import type { ContentPort,ContentVersion } from '../../content/application/ports/demo-content.js';
import type { AuditPort } from '../../audit-lifecycle/application/ports/demo-audit.js';
import type { ReceiptPort } from '../../transaction-control/application/ports/demo-receipts.js';
import type { IdentityPort } from '../../identity/application/ports/demo-identity.js';
import type { OrganizationPort,DemoRun } from '../../organization/application/ports/demo-organization.js';
import type { DemoCommandContext } from '../../authorization/application/ports/demo-command-context.js';
import type { DemoContext } from '../../authorization/application/demo-authorization.js';
import { fixedMembership } from '../../authorization/application/demo-authorization.js';
import { DemoError } from '../../authorization/application/demo-error.js';
import { appendDemoSuccess,appendDemoLifecycle } from '../../audit-lifecycle/application/demo-audit.js';
import { prepareDemoReceipt } from '../../transaction-control/application/demo-receipts.js';
import { readPublishedDemoContent,sameContentVersion } from '../../content/application/demo-content-service.js';
import { evaluateResponse } from '../domain/demo-evaluation.js';
import type { TeachingContent,ValidatedContent } from '../../content/domain/demo-content.js';
import { startLearningSession,finishLearningSession } from './learning-session-service.js';

export interface DemoLearningPorts {learning:LearningPort;content:ContentPort;receipts:ReceiptPort;audit:AuditPort;identity:IdentityPort;organization:OrganizationPort}
export const assignmentDto=(a:Assignment)=>({id:a.id,identityId:a.identityId,organizationId:a.organizationId,locationId:a.locationId,contentPackId:a.contentPackId,contentVersion:{...a.contentVersion},status:a.status,assignedAt:a.assignedAt.toISOString()});
export const sessionDto=(s:LearningSession)=>({id:s.id,identityId:s.identityId,assignmentId:s.assignmentId,status:s.status,startedAt:s.startedAt.toISOString(),completedAt:s.completedAt?.toISOString()??null});
export const progressDto=(p:Progress)=>({id:p.id,learningSessionId:p.learningSessionId,contentPackId:p.contentPackId,contentVersion:{...p.contentVersion},eventSchemaVersion:p.eventSchemaVersion,sequence:p.sequence,evaluation:{...p.evaluation},recordedAt:p.recordedAt.toISOString()});

export async function assignDemoContent(ports:DemoLearningPorts,context:DemoCommandContext,input:{identityId:string;contentPackId:string;contentVersion:ContentVersion},key:string|null,admissionRun?:DemoRun):Promise<object>{
  const target=await ports.identity.getPersona(input.identityId);const membership=await ports.organization.getMembership(input.identityId,context.scope);
  if(!target||target.kind!=='LEARNER'||target.identityStatus!=='ACTIVE'||!fixedMembership(membership,target,context.scope))throw new DemoError('NOT_FOUND');
  const run=await ports.organization.findRun(target.demoRunId);if(!run||run.id!==target.demoRunId||run.organizationId!==context.scope.organizationId||run.locationId!==context.scope.locationId)throw new DemoError('NOT_FOUND');
  if(context.actor.actorClass==='HumanActor'){
    const reports=await ports.organization.listDirectReports(context.actor.actorReference,context.scope);if(reports.length!==1||reports[0]!==input.identityId)throw new DemoError('NOT_FOUND');
  }else if(context.actor.actorReference!=='automation:demo-admission-v1'||!admissionRun||admissionRun.id!==run.id||admissionRun.status!=='ACTIVE')throw new DemoError('FORBIDDEN');
  const receipt=await prepareDemoReceipt(ports.receipts,context,'AssignContent',key,{...context.scope,...input});if(receipt.replay)return receipt.replay;
  const count=await ports.learning.countAssignments(context.scope);if(!Number.isSafeInteger(count)||count<0)throw new DemoError('SERVICE_UNAVAILABLE');if(count>=10||context.actor.actorClass==='AutomationActor'&&count!==0)throw new DemoError('PRECONDITION_FAILED');
  const content=await readPublishedDemoContent(ports.content,context.scope,input.contentPackId,input.contentVersion.version);if(content.digest!==input.contentVersion.digest)throw new DemoError('INVALID_REQUEST');
  await context.refresh();const assignment:Assignment={id:randomUUID(),...context.scope,identityId:input.identityId,contentPackId:input.contentPackId,contentVersion:{...input.contentVersion},status:'ACTIVE',assignedAt:new Date(context.now)};
  await ports.learning.createAssignment(assignment);const result=assignmentDto(assignment);
  await appendDemoLifecycle(ports.audit,context,'AssignContent','Assignment',assignment.id,{schemaVersion:1,...result});
  await appendDemoSuccess(ports.audit,context,'AssignContent',{type:'Assignment',id:assignment.id},key);await receipt.save(result);return result;
}
async function ownAssignment(ports:DemoLearningPorts,context:DemoContext,id:string):Promise<Assignment>{const a=await ports.learning.getAssignment(id,context.scope);if(!a||a.identityId!==context.persona.identityId||a.status!=='ACTIVE')throw new DemoError('NOT_FOUND');return a;}
async function ownSession(ports:DemoLearningPorts,context:DemoContext,id:string):Promise<{session:LearningSession;assignment:Assignment}>{const session=await ports.learning.getSession(id);if(!session||session.identityId!==context.persona.identityId)throw new DemoError('NOT_FOUND');const assignment=await ownAssignment(ports,context,session.assignmentId);return {session,assignment};}
async function assignmentContent(ports:DemoLearningPorts,context:DemoCommandContext,assignment:Assignment):Promise<ValidatedContent>{const value=await readPublishedDemoContent(ports.content,context.scope,assignment.contentPackId,assignment.contentVersion.version);if(value.digest!==assignment.contentVersion.digest)throw new DemoError('SERVICE_UNAVAILABLE');return value;}
export async function startAssignedDemoSession(ports:DemoLearningPorts,context:DemoContext,assignmentId:string,key:string|null):Promise<object>{
  const assignment=await ownAssignment(ports,context,assignmentId);const receipt=await prepareDemoReceipt(ports.receipts,context,'StartLearningSession',key,{...context.scope,assignmentId});if(receipt.replay)return receipt.replay;
  if(await ports.learning.getSessionByAssignment(assignmentId))throw new DemoError('CONFLICT');await assignmentContent(ports,context,assignment);await context.refresh();
  const session:LearningSession={id:randomUUID(),identityId:context.persona.identityId,assignmentId,status:'ACTIVE',startedAt:new Date(context.now),completedAt:null};
  await startLearningSession({createAuthorizedStart:async record=>{await ports.learning.createSession({...session,...record});return record;},getById:async()=>null,completeActive:async()=>null},{authorizeSessionStart:async input=>input.identityId===assignment.identityId&&input.assignmentId===assignment.id?{...input,assigned:true,authorized:true}:null},session);
  const result=sessionDto(session);await appendDemoSuccess(ports.audit,context,'StartLearningSession',{type:'LearningSession',id:session.id},key);await receipt.save(result);return result;
}
function validProgress(rows:Progress[],session:LearningSession,assignment:Assignment,pack:TeachingContent):Progress[]{
  const ordered=[...rows].sort((a,b)=>a.sequence-b.sequence);if(ordered.length>3)throw new DemoError('SERVICE_UNAVAILABLE');
  for(const [index,row] of ordered.entries()){
    const block=pack.blocks[index];if(!block||row.sequence!==index+1||row.learningSessionId!==session.id||row.contentPackId!==assignment.contentPackId||!sameContentVersion(row.contentVersion,assignment.contentVersion)||row.eventSchemaVersion!=='1.0.0'||row.evaluation.blockId!==block.id)throw new DemoError('SERVICE_UNAVAILABLE');
    let expected;try{expected=evaluateResponse(pack,block.id,row.evaluation.selectedOptionIndex,0);}catch{throw new DemoError('SERVICE_UNAVAILABLE');}
    if(row.evaluation.engineVersion!==expected.engineVersion||row.evaluation.matchesExpectedChoice!==expected.matchesExpectedChoice||row.evaluation.feedback!==expected.feedback)throw new DemoError('SERVICE_UNAVAILABLE');
  }return ordered;
}
export async function recordDemoProgress(ports:DemoLearningPorts,context:DemoContext,sessionId:string,input:{blockId:string;selectedOptionIndex:number},key:string|null):Promise<object>{
  const {session,assignment}=await ownSession(ports,context,sessionId);const receipt=await prepareDemoReceipt(ports.receipts,context,'RecordProgressEvent',key,{...context.scope,learningSessionId:sessionId,...input});if(receipt.replay)return receipt.replay;
  if(session.status!=='ACTIVE')throw new DemoError('CONFLICT');const content=await assignmentContent(ports,context,assignment);const rows=validProgress(await ports.learning.listProgress(session.id),session,assignment,content.content);await context.refresh();
  let evaluation;try{evaluation=evaluateResponse(content.content,input.blockId,input.selectedOptionIndex,0);}catch{throw new DemoError('INVALID_REQUEST');}
  if(content.content.blocks[rows.length]?.id!==input.blockId)throw new DemoError('CONFLICT');
  const progress:Progress={id:randomUUID(),learningSessionId:session.id,contentPackId:assignment.contentPackId,contentVersion:{...assignment.contentVersion},eventSchemaVersion:'1.0.0',sequence:rows.length+1,evaluation,recordedAt:new Date(context.now)};
  await ports.learning.appendProgress(progress);const result=progressDto(progress);await receipt.save(result);return result;
}
export async function completeDemoSession(ports:DemoLearningPorts,context:DemoContext,sessionId:string):Promise<object>{
  const {session,assignment}=await ownSession(ports,context,sessionId);if(session.status!=='ACTIVE')throw new DemoError('CONFLICT');const content=await assignmentContent(ports,context,assignment);const rows=validProgress(await ports.learning.listProgress(session.id),session,assignment,content.content);await context.refresh();if(rows.length!==3)throw new DemoError('PRECONDITION_FAILED');
  let completed:LearningSession|null=null;await finishLearningSession({createAuthorizedStart:async()=>{throw new DemoError('FORBIDDEN');},getById:async()=>session,completeActive:async scope=>{if(scope.id!==session.id||scope.identityId!==session.identityId)throw new DemoError('NOT_FOUND');completed=await ports.learning.completeSession(session.id,new Date(context.now));return completed;}},{id:session.id,identityId:session.identityId});
  if(!completed)throw new DemoError('SERVICE_UNAVAILABLE');await appendDemoSuccess(ports.audit,context,'CompleteLearningSession',{type:'LearningSession',id:session.id});return sessionDto(completed);
}
export function pageRows<T>(rows:T[],limit:number,cursor:string|null,tuple:(row:T)=>string[]):{items:T[];nextCursor:string|null}{
  let start=0;if(cursor){let parsed:unknown;try{const bytes=Buffer.from(cursor,'base64url');if(bytes.toString('base64url')!==cursor)throw 0;parsed=JSON.parse(bytes.toString('utf8'));}catch{throw new DemoError('INVALID_REQUEST');}
    if(!Array.isArray(parsed)||parsed.some(v=>typeof v!=='string'))throw new DemoError('INVALID_REQUEST');const canonical=JSON.stringify(parsed);start=rows.findIndex(row=>JSON.stringify(tuple(row))===canonical)+1;if(start===0)throw new DemoError('NOT_FOUND');}
  const items=rows.slice(start,start+limit);const nextCursor=start+limit<rows.length&&items.length?Buffer.from(JSON.stringify(tuple(items[items.length-1]!))).toString('base64url'):null;return {items,nextCursor};
}
const orderedAssignments=(rows:Assignment[])=>[...rows].sort((a,b)=>a.assignedAt.getTime()-b.assignedAt.getTime()||(a.id<b.id?-1:a.id>b.id?1:0));
export async function listDemoAssignments(ports:DemoLearningPorts,context:DemoContext,limit:number,cursor:string|null){
  const page=pageRows(orderedAssignments(await ports.learning.listAssignments(context.persona.identityId,context.scope)),limit,cursor,a=>[a.assignedAt.toISOString(),a.id]);
  const items=[];for(const assignment of page.items){const content=await assignmentContent(ports,context,assignment);const session=await ports.learning.getSessionByAssignment(assignment.id);if(session&&session.identityId!==assignment.identityId)throw new DemoError('SERVICE_UNAVAILABLE');items.push({assignment:assignmentDto(assignment),title:content.content.title,session:session?sessionDto(session):null});}
  await context.refresh();return {items,nextCursor:page.nextCursor};
}
export async function readDemoLearnerStates(ports:DemoLearningPorts,context:DemoContext,identityId:string,query:{limit:number;cursor:string|null;assignmentId:string|null},own:boolean){
  let rows=orderedAssignments(await ports.learning.listAssignments(identityId,context.scope));if(query.assignmentId){rows=rows.filter(a=>a.id===query.assignmentId);if(!rows.length)throw new DemoError('NOT_FOUND');}
  const page=pageRows(rows,query.limit,query.cursor,a=>[a.assignedAt.toISOString(),a.id]);const items=[];
  for(const assignment of page.items){const content=await assignmentContent(ports,context,assignment);const session=await ports.learning.getSessionByAssignment(assignment.id);if(session&&(session.identityId!==identityId||session.assignmentId!==assignment.id))throw new DemoError('SERVICE_UNAVAILABLE');const responses=session?validProgress(await ports.learning.listProgress(session.id),session,assignment,content.content):[];
    if(session?.status==='COMPLETED'&&responses.length!==3)throw new DemoError('SERVICE_UNAVAILABLE');
    const state={id:'ls_'+createHash('sha256').update(JSON.stringify(['LearnerState','1.0.0',context.scope.organizationId,context.scope.locationId,identityId,assignment.id])).digest('hex'),projectionVersion:'1.0.0',identityId,assignmentId:assignment.id,contentPackId:assignment.contentPackId,contentVersion:{...assignment.contentVersion},title:content.content.title,session:session?sessionDto(session):null,recordedBlockCount:responses.length,requiredBlockCount:3,nextBlockId:content.content.blocks[responses.length]?.id??null};items.push(own?{...state,responses:responses.map(progressDto)}:state);
  }await context.refresh();return {items,nextCursor:page.nextCursor};
}
