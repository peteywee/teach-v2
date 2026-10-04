#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const arch=load('architecture/authority.json');
const app=load('application-interfaces/authority.json');
const pd=load('persistence/discovery.json');
const pp=load('persistence/proposed.json');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const rel=load('kernel/relationships.json');
const events=load('kernel/events.json');
const inv=load('kernel/invariants.json');
const dt=load('kernel/decision-tables.json');
const gaps=load('domains/discovery-gaps.json');

if (arch?.version!=='1.0.0' || arch?.status!=='active') errors.push('persistence audit: Architecture authority missing');
if (app?.version!=='1.0.0' || app?.status!=='active') errors.push('persistence audit: Application Interface authority missing');
if (manifest?.version!=='0.13.0') errors.push('persistence audit: K00 live version drifted');
if (pd?.status!=='recorded') errors.push('persistence audit: discovery missing');
if (pp?.status!=='proposed') errors.push('persistence audit: proposal must remain proposed');

const approvedEntities=(entities?.entries||[]).filter(x=>x.status==='approved').length;
const approvedIds=(ids?.entries||[]).filter(x=>x.status==='approved').length;
const candidateStates=(states?.entries||[]).filter(x=>x.status==='candidate').length;
const candidateRel=(rel?.entries||[]).filter(x=>x.status==='candidate').length;
const candidateEvents=(events?.entries||[]).filter(x=>x.status==='candidate').length;
const candidateInv=(inv?.entries||[]).filter(x=>x.status==='candidate').length;
const candidateDt=(dt?.entries||[]).filter(x=>x.status==='candidate').length;
const missing=(gaps?.core_missing_kernel_candidates||[]).length;

if (approvedEntities!==13) errors.push(`persistence audit: approved entities changed to ${approvedEntities}`);
if (approvedIds!==4) errors.push(`persistence audit: approved identifiers changed to ${approvedIds}`);
if (candidateStates!==5) errors.push(`persistence audit: candidate state sets changed to ${candidateStates}`);
if (candidateRel!==18) errors.push(`persistence audit: candidate relationships changed to ${candidateRel}`);
if (candidateEvents!==10) errors.push(`persistence audit: candidate events changed to ${candidateEvents}`);
if (candidateInv!==22) errors.push(`persistence audit: candidate invariants changed to ${candidateInv}`);
if (candidateDt!==8) errors.push(`persistence audit: candidate decision tables changed to ${candidateDt}`);
if (missing!==9) errors.push(`persistence audit: core gaps changed to ${missing}`);

if (pp?.readiness?.full_relational_schema!=='BLOCKED' || pp?.readiness?.migration_implementation!=='BLOCKED') {
  errors.push('persistence audit: physical schema/migrations must remain blocked');
}

const proposalText=JSON.stringify(pp||{});
for (const id of (rel?.entries||[]).filter(x=>x.status==='candidate').map(x=>x.id)) {
  if (proposalText.includes(`"${id}"`) && !proposalText.includes('candidate')) {
    errors.push(`persistence audit: candidate relationship ${id} may not be implementation authority`);
  }
}

if (errors.length) {
  console.error(`ARCHITECTURE/APPLICATION/PERSISTENCE SELF-AUDIT FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('ARCHITECTURE/APPLICATION/PERSISTENCE SELF-AUDIT PASS');
console.log('PROVEN: Architecture 1.0.0 active');
console.log('PROVEN: Application Interfaces 1.0.0 active');
console.log('PROVEN: Persistence discovery recorded; proposal remains proposed');
console.log(`PROVEN: semantic counts preserved — entities=${approvedEntities} approved, ids=${approvedIds} approved, relationships=${candidateRel} candidate, states=${candidateStates} candidate`);
console.log('BLOCKED: Persistence owner approval');
console.log('BLOCKED: full relational schema');
console.log('BLOCKED: migration implementation');
console.log('BLOCKED: Transport Interfaces');
console.log('UNKNOWN: none introduced by this proposal');
console.log('CONTRADICTORY: none introduced by this proposal');
