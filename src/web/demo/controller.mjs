import { ApiError } from './api.mjs';
const empty=()=>({phase:'loading',screen:'home',session:null,membership:null,assignments:[],states:[],team:[],teamStates:{},content:null,assignmentId:null,memberId:null,feedbackId:null,selected:null,error:null,notice:'',busy:false});
const sameRef=(a,b)=>a?.version===b?.version&&a?.digest===b?.digest;
const protocol=()=>{throw new ApiError('protocol');};
/** Owns presentation state only. APIs remain the authority for permissions and completion. */
export function createDemoController({api,onChange=()=>{},online=()=>globalThis.navigator?.onLine!==false,makeKey=()=>globalThis.crypto.randomUUID()}={}) {
 let state=empty(),epoch=0,active=null,writePending=false,closingScope=null;
 const keys=new Map(),idleWaiters=[];
 const emit=()=>onChange(structuredClone(state));
 const snapshot=()=>structuredClone(state);
 const clear=()=>{state=empty();state.phase='ready';keys.clear();};
 const keyFor=purpose=>{if(!keys.has(purpose))keys.set(purpose,makeKey());return keys.get(purpose);};
 const scope=()=>({...state.session.demo.scope});
 const allowed=op=>!!state.session?.allowedOperations.includes(op);
 function requireOps(...ops){if(!state.session)throw new ApiError('server',{status:401,code:'UNAUTHENTICATED'});if(ops.some(op=>!allowed(op)))throw new ApiError('server',{status:403,code:'FORBIDDEN'});}
 const valid=t=>t===epoch;
 async function call(t,operation,options={}){const result=await api.call(operation,{...options,signal:active?.signal});if(!valid(t))throw new ApiError('cancelled');return result;}
 async function list(t,operation,params={},query={}){
  const items=[],seen=new Set();let cursor=null;
  do{const page=await call(t,operation,{params,query:{...query,limit:50,cursor}});items.push(...page.items);cursor=page.nextCursor;if(cursor){if(seen.has(cursor)||seen.size>=20)protocol();seen.add(cursor);}}while(cursor);return items;
 }
 function fail(error){
  if(error.kind==='cancelled')return;
  if(error.status===403)clear();
  if(error.status===401){clear();state.notice='Your demo session is no longer available. Start a new demo to continue.';}
  state.phase=error.status===401?'unauthenticated':error.status===403?'forbidden':error.kind==='offline'||!online()?'offline':'error';
  state.error={kind:error.kind||'network',status:error.status||0,code:error.code||'',requestId:error.requestId||null,retryAfterSeconds:error.retryAfterSeconds||null};
 }
 async function run(work,{mutation=false,discard=false}={}){
  if(writePending)return false;
  active?.abort();active=new AbortController();const t=++epoch;
  if(mutation)writePending=true;
  if(discard){clear();state.phase='loading';}
  state.busy=mutation;state.phase='loading';state.error=null;emit();
  try{if(!online())throw new ApiError('offline');await work(t);if(valid(t)){state.phase='ready';state.error=null;}}
  catch(error){if(valid(t))fail(error);}
  finally{if(mutation){writePending=false;for(const resolve of idleWaiters.splice(0))resolve();}if(valid(t)){state.busy=false;emit();}}
  return true;
 }
 function validateOwn(assignments,states){
  const ids=new Set();for(const view of assignments){const a=view.assignment;if(ids.has(a.id)||a.identityId!==state.session.identityId||a.organizationId!==scope().organizationId||a.locationId!==scope().locationId)protocol();ids.add(a.id);const s=states.find(x=>x.assignmentId===a.id);if(!s||s.identityId!==a.identityId||s.contentPackId!==a.contentPackId||!sameRef(s.contentVersion,a.contentVersion)||s.session?.id!==view.session?.id||s.session?.status!==view.session?.status||s.responses.length!==s.recordedBlockCount||s.responses.some((r,i)=>r.sequence!==i+1||r.learningSessionId!==s.session?.id||!sameRef(r.contentVersion,s.contentVersion)))protocol();if(s.session&&(s.session.assignmentId!==a.id||s.session.identityId!==a.identityId))protocol();if(s.session?.status==='COMPLETED'&&(s.recordedBlockCount!==s.requiredBlockCount||!s.session.completedAt))protocol();}
  if(states.some(s=>!ids.has(s.assignmentId))||states.length!==ids.size)protocol();
 }
 async function own(t){
  requireOps('ListOwnAssignments','ReadOwnLearnerState');
  const params=scope();const assignments=await list(t,'ListOwnAssignments',params);const states=await list(t,'ReadOwnLearnerState',params);
  validateOwn(assignments,states);state.assignments=assignments;state.states=states;
 }
 async function team(t){
  requireOps('ListTeam','ReadTeamMemberLearnerState');const members=await list(t,'ListTeam',scope()),results={};
  for(const member of members){if(member.scope.organizationId!==scope().organizationId||member.scope.locationId!==scope().locationId)protocol();const rows=await list(t,'ReadTeamMemberLearnerState',{...scope(),identityId:member.identityId});if(rows.some(row=>row.identityId!==member.identityId||Object.hasOwn(row,'responses')||(row.session?.status==='COMPLETED'&&(row.recordedBlockCount!==row.requiredBlockCount||!row.session.completedAt))))protocol();results[member.identityId]=rows;}
  state.team=members;state.teamStates=results;
 }
 async function hydrate(t,{expected=null}={}){
  const current=await call(t,'ReadCurrentSession');
  if(state.session&&(state.session.identityId!==current.identityId||state.session.demo.runId!==current.demo.runId||state.session.demo.scope.organizationId!==current.demo.scope.organizationId||state.session.demo.scope.locationId!==current.demo.scope.locationId))keys.clear();
  // A different tab may rotate the shared HttpOnly cookie. Never carry old persona/scope data forward.
  state.assignments=[];state.states=[];state.team=[];state.teamStates={};state.content=null;
  if(expected&&(current.identityId!==expected.identityId||current.demo.runId!==expected.demo.runId||current.demo.persona!==expected.demo.persona))protocol();
  state.session=current;requireOps('ListOwnMemberships');const memberships=await call(t,'ListOwnMemberships');
  const member=memberships.items.find(m=>m.organizationId===current.demo.scope.organizationId&&m.locationId===current.demo.scope.locationId);
  if(!member||memberships.nextCursor!==null)throw new ApiError('server',{status:403,code:'FORBIDDEN'});state.membership=member;
  state.content=null;state.feedbackId=null;state.selected=null;state.assignmentId=null;state.memberId=null;
  if(allowed('ListOwnAssignments')){await own(t);state.screen='learner';}else if(allowed('ListTeam')){await team(t);state.screen='manager';}else throw new ApiError('server',{status:403,code:'FORBIDDEN'});
 }
 function ownState(){const s=state.states.find(x=>x.assignmentId===state.assignmentId);if(!s)protocol();return s;}
 async function readAssignment(t,id){
  await own(t);const view=state.assignments.find(x=>x.assignment.id===id);if(!view)throw new ApiError('server',{status:404,code:'NOT_FOUND'});
  state.assignmentId=id;requireOps('ReadAssignedContentVersion');const a=view.assignment;
  const content=await call(t,'ReadAssignedContentVersion',{params:{...scope(),contentPackId:a.contentPackId,contentVersion:a.contentVersion.version}});
  if(content.contentPackId!==a.contentPackId||content.organizationId!==a.organizationId||!sameRef(content.contentVersion,a.contentVersion))protocol();
  const s=ownState();if(s.nextBlockId!==(content.blocks[s.recordedBlockCount]?.id??null)||s.responses.some((r,i)=>r.evaluation.blockId!==content.blocks[i]?.id))protocol();state.content=content;state.screen=s.session?.status==='COMPLETED'?'completion':'training';state.feedbackId=null;state.selected=null;
 }
 async function begin(t){const issued=await call(t,'BeginDemoRun',{body:{}});await hydrate(t,{expected:issued});state.notice='Your isolated demo is ready. All training responses are saved by the service.';}
 return {
  snapshot,allowed,
  boot:async()=>{if(writePending)await new Promise(resolve=>idleWaiters.push(resolve));return run(async t=>{try{await hydrate(t);}catch(e){if(e.status===401){clear();state.screen='home';return;}throw e;}});},
  enter:()=>run(begin,{mutation:true,discard:true}),
  recover:()=>run(async t=>{await hydrate(t);state.notice='Session and saved records reloaded from the service.';}),
  refresh:()=>run(async t=>{const screen=state.screen,id=state.assignmentId,member=state.memberId;await hydrate(t);if(id&&allowed('ListOwnAssignments'))await readAssignment(t,id);if(screen==='member'&&state.team.some(x=>x.identityId===member)){state.memberId=member;state.screen='member';}state.notice='Showing the latest saved records.';}),
  dashboard:()=>run(async t=>{await hydrate(t);}),
  navigate:screen=>run(async t=>{if(screen==='home'){await hydrate(t);return;}if(screen==='manager'){requireOps('ListTeam');await team(t);state.screen='manager';}else{requireOps('ListOwnAssignments');await own(t);state.screen='learner';}state.feedbackId=null;state.selected=null;}),
  switchPersona:persona=>{
   if(!state.session||writePending)return false;if(!allowed('SwitchDemoPersona'))return run(async()=>{throw new ApiError('server',{status:403,code:'FORBIDDEN'});});const target=scope();
   return run(async t=>{const issued=await call(t,'SwitchDemoPersona',{body:{...target,persona}});await hydrate(t,{expected:issued});state.notice='Persona switched securely. The previous session is revoked.';},{mutation:true,discard:true});
  },
  start:id=>run(async t=>{
   requireOps('StartLearningSession');const view=state.assignments.find(x=>x.assignment.id===id);if(!view)protocol();
   if(!view.session){const session=await call(t,'StartLearningSession',{params:scope(),body:{assignmentId:id},key:keyFor('start:'+id)});await readAssignment(t,id);if(ownState().session?.id!==session.id)protocol();keys.delete('start:'+id);}else await readAssignment(t,id);
  },{mutation:true}),
  choose:index=>{if(state.phase!=='ready'||state.screen!=='training'||state.feedbackId)return;const s=ownState(),block=state.content?.blocks.find(x=>x.id===s.nextBlockId);if(!block||!Number.isInteger(index)||index<0||index>=block.options.length)return;state.selected=index;emit();},
  save:()=>run(async t=>{
   requireOps('RecordProgressEvent');const prior=ownState(),id=state.assignmentId,selected=state.selected,blockId=prior.nextBlockId;
   if(selected===null||!blockId||!prior.session||prior.session.status!=='ACTIVE')protocol();
   const purpose=`response:${prior.session.id}:${blockId}:${selected}`;
   const recorded=await call(t,'RecordProgressEvent',{params:{...scope(),learningSessionId:prior.session.id},body:{blockId,selectedOptionIndex:selected},key:keyFor(purpose)});
   await own(t);state.assignmentId=id;const canonical=ownState().responses.find(r=>r.id===recorded.id);
   if(!canonical||canonical.evaluation.blockId!==blockId||canonical.evaluation.selectedOptionIndex!==selected||ownState().nextBlockId!==(state.content.blocks[ownState().recordedBlockCount]?.id??null))protocol();state.feedbackId=canonical.id;state.selected=null;state.screen='training';keys.delete(purpose);
  },{mutation:true}),
  next:()=>{if(state.phase!=='ready'||!state.feedbackId)return;state.feedbackId=null;state.selected=null;emit();},
  complete:()=>run(async t=>{
   requireOps('CompleteLearningSession');const before=ownState();if(before.recordedBlockCount!==before.requiredBlockCount||!before.session||before.nextBlockId!==null)protocol();
   const result=await call(t,'CompleteLearningSession',{params:{...scope(),learningSessionId:before.session.id},body:{}});await own(t);
   const after=ownState();if(result.status!=='COMPLETED'||after.session?.id!==result.id||after.session.status!=='COMPLETED'||after.session.completedAt!==result.completedAt)protocol();state.feedbackId=null;state.screen='completion';
  },{mutation:true}),
  member:id=>run(async t=>{requireOps('ListTeam');await team(t);if(!state.team.some(x=>x.identityId===id))throw new ApiError('server',{status:404,code:'NOT_FOUND'});state.memberId=id;state.screen='member';}),
  assignAgain:assignmentId=>run(async t=>{
   requireOps('AssignContent');const target=state.memberId,rows=state.teamStates[target]||[],source=rows.find(x=>x.assignmentId===assignmentId);if(!target||!source)protocol();
   const purpose=`assign:${target}:${source.assignmentId}:${source.contentPackId}:${source.contentVersion.digest}`;
   const result=await call(t,'AssignContent',{params:scope(),body:{identityId:target,contentPackId:source.contentPackId,contentVersion:source.contentVersion},key:keyFor(purpose)});
   await team(t);if(!(state.teamStates[target]||[]).some(x=>x.assignmentId===result.id&&x.session===null))protocol();state.screen='member';state.memberId=target;state.notice='A new assignment was saved. Earlier completion stays with the earlier assignment.';keys.delete(purpose);
  },{mutation:true}),
  logout:()=>{if(!state.session||writePending)return false;if(!allowed('CloseDemoRun'))return run(async()=>{throw new ApiError('server',{status:403,code:'FORBIDDEN'});});closingScope=scope();return run(async t=>{state.notice='Ending this demo has not yet been confirmed.';await call(t,'CloseDemoRun',{body:closingScope});closingScope=null;clear();state.notice='Demo ended. Access was revoked. Synthetic records are retained in the isolated store.';},{mutation:true,discard:true});},
  reset:()=>{if(!state.session||writePending)return false;if(!allowed('CloseDemoRun'))return run(async()=>{throw new ApiError('server',{status:403,code:'FORBIDDEN'});});closingScope=scope();return run(async t=>{
   state.notice='Reset has not yet been confirmed. The current demo must end before a new one starts.';await call(t,'CloseDemoRun',{body:closingScope});closingScope=null;clear();state.notice='Previous demo ended.';
   try{await begin(t);}catch(error){state.notice='Previous demo ended. A new demo could not be started.';throw error;}
  },{mutation:true,discard:true});},
  retryClose:()=>{if(!closingScope||writePending)return false;return run(async t=>{state.notice='Ending this demo has not yet been confirmed.';await call(t,'CloseDemoRun',{body:closingScope});closingScope=null;clear();state.notice='Demo ended. Access was revoked.';},{mutation:true,discard:true});},
  offline:()=>{if(writePending)return;active?.abort();epoch++;state.phase='offline';state.error={kind:'offline',status:0,code:'',requestId:null};emit();},
  conceal:()=>{active?.abort();epoch++;clear();state.phase='loading';emit();},
 };
}
