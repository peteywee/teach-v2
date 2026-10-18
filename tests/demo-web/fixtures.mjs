/** Test-only transport doubles, never served by assets.json or imported by browser code. */
import {ApiError} from '../../src/web/demo/api.mjs';
export const date='2026-10-18T03:00:00.000Z',version={version:'1.0.0',digest:'sha256:'+'a'.repeat(64)},scope={organizationId:'org_1',locationId:'loc_1'};
const self=['ReadCurrentSession','ListOwnMemberships','SwitchDemoPersona','CloseDemoRun','RevokeApplicationSession'];
export const learnerOps=[...self,'ListOwnAssignments','ReadOwnLearnerState','ReadAssignedContentVersion','StartLearningSession','RecordProgressEvent','CompleteLearningSession'];
export const managerOps=[...self,'ListTeam','ReadTeamMemberLearnerState','AssignContent'];
export const session=(persona='LEARNER')=>({identityId:persona==='LEARNER'?'learner_1':'manager_1',displayLabel:persona==='LEARNER'?'Alex, demo learner':'Jordan, demo manager',sessionExpiresAt:'2026-10-18T05:00:00.000Z',demo:{runId:'run_1',persona,expiresAt:'2026-10-18T05:00:00.000Z',scope},allowedOperations:persona==='LEARNER'?learnerOps:managerOps,synthetic:true});
export const assignment=(id='assignment_1')=>({id,identityId:'learner_1',...scope,contentPackId:'pack_1',contentVersion:version,status:'ACTIVE',assignedAt:date});
export const content={contentPackId:'pack_1',organizationId:scope.organizationId,contentVersion:version,schemaVersion:'1.0.0',title:'Clear handoffs',blocks:[0,1,2].map(i=>({id:'block_'+i,kind:'SINGLE_CHOICE',instruction:'Confirm what is needed.',prompt:'Which response makes the request clear?',options:['Confirm the details.','Make an assumption.']})),synthetic:true};
export const membership={id:'membership_1',...scope,status:'ACTIVE',organizationLabel:'Demo workspace',locationLabel:'Practice location',synthetic:true};
export const member={identityId:'learner_1',displayLabel:'Alex, demo learner',scope,synthetic:true};
export function mockService(){
 let current=null;const records=[{assignment:assignment(),session:null,responses:[]}],calls=[];
 const state=r=>({id:'state_'+r.assignment.id,projectionVersion:'1.0.0',identityId:'learner_1',assignmentId:r.assignment.id,contentPackId:'pack_1',contentVersion:version,title:'Clear handoffs',session:r.session,recordedBlockCount:r.responses.length,requiredBlockCount:3,nextBlockId:r.responses.length<3?'block_'+r.responses.length:null});
 const response=(r,body)=>({id:'event_'+r.assignment.id+'_'+r.responses.length,learningSessionId:r.session.id,contentPackId:'pack_1',contentVersion:version,eventSchemaVersion:'1.0.0',sequence:r.responses.length+1,evaluation:{engineVersion:'1.0.0',blockId:body.blockId,selectedOptionIndex:body.selectedOptionIndex,matchesExpectedChoice:body.selectedOptionIndex===0,feedback:'Confirming the details makes the next step clear.'},recordedAt:date});
 const service={calls,records,get current(){return current;},set current(value){current=value;},override:null,async call(op,options={}){calls.push({op,options});if(service.override){const value=await service.override(op,options);if(value!==undefined)return structuredClone(value);}
  if(op==='BeginDemoRun'){current=session();return structuredClone(current);}
  if(!current)throw new ApiError('server',{status:401,code:'UNAUTHENTICATED'});
  const r=records.find(r=>r.assignment.id===options.body?.assignmentId||r.session?.id===options.params?.learningSessionId)||records[0];
  let result;
  switch(op){
   case 'ReadCurrentSession':result=current;break;
   case 'ListOwnMemberships':result={items:[membership],nextCursor:null};break;
   case 'ListOwnAssignments':result={items:records.map(r=>({assignment:r.assignment,title:'Clear handoffs',session:r.session})),nextCursor:null};break;
   case 'ReadOwnLearnerState':result={items:records.map(r=>({...state(r),responses:r.responses})),nextCursor:null};break;
   case 'ReadAssignedContentVersion':result=content;break;
   case 'StartLearningSession':r.session={id:'session_'+r.assignment.id,identityId:'learner_1',assignmentId:r.assignment.id,status:'ACTIVE',startedAt:date,completedAt:null};result=r.session;break;
   case 'RecordProgressEvent':result=response(r,options.body);r.responses.push(result);break;
   case 'CompleteLearningSession':r.session.status='COMPLETED';r.session.completedAt=date;result=r.session;break;
   case 'SwitchDemoPersona':current=session(options.body.persona);result=current;break;
   case 'ListTeam':result={items:[member],nextCursor:null};break;
   case 'ReadTeamMemberLearnerState':result={items:records.map(state),nextCursor:null};break;
   case 'AssignContent':{const a=assignment('assignment_'+(records.length+1));records.push({assignment:a,session:null,responses:[]});result=a;break;}
   case 'CloseDemoRun':case 'RevokeApplicationSession':current=null;result=null;break;
   default:throw new Error('Unexpected operation '+op);
  }return structuredClone(result);
 }};return service;
}
export function deferred(){let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});return {promise,resolve,reject};}
