#!/usr/bin/env node
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {scanContractQuestions} from './owner-decision-inventory.mjs';
const root=resolve(process.cwd()),base='verification/owner-decisions/2026-10-04/';
const read=path=>readFileSync(join(root,path),'utf8'),json=path=>JSON.parse(read(path)),hash=text=>createHash('sha256').update(text).digest('hex');
const check=(condition,message)=>{if(!condition)throw new Error(`owner registration: ${message}`);};
try {
 const reg=json(base+'registration.json'),revisions=json(base+'contract-revisions.json'),questions=scanContractQuestions(root);
 check(reg.registration_id==='TEACH-OWNER-DECISION-RECONCILIATION-66'&&reg.issue==='#66'&&reg.status==='recorded'&&reg.owner==='Patrick Craven'&&reg.owner_local_date==='2026-10-04'&&reg.timezone==='America/Chicago','exact owner decision provenance required');
 const records=new Map(reg.records.map(x=>[x.id,x]));check(records.size===14&&reg.records.length===14,'exact classified question inventory required');
 const selected=new Map([
 ['OQ-IDN-6',{pin_digits:6,attempts:5,lock_minutes:15,authentication_available:false}],
 ['OQ-AUD-1',{duration:1,unit:'year',policy:'fixed-central',tenant_overrides:false,deletion_authorized:false}],
 ['OQ-REL-1',{database:'Supabase PostgreSQL',web_api:'Vercel'}],
 ['OQ-REL-4',{rollback_window_hours:24,migration_backward_compatibility_hours:24}],
 ['OQ-OBS-3',{duration:90,unit:'days',store_kind:'operational-log',canonical_audit_policy_separate:true}],
 ]);
 for(const [id,value] of selected){const r=records.get(id);check(r?.state==='CONFIRMED'&&r.owner_selection_recorded===true&&r.question_resolved===true&&JSON.stringify(r.value)===JSON.stringify(value),`exact selected ${id} policy required`);check(!questions.unresolved.some(x=>x.id===id)&&questions.resolved.some(x=>x.id===id),`selected ${id} contract resolution required`);}
 for(const [id,state] of [['OQ-AUTHZ-1','DIRECTION_RECORDED'],['OQ-PRIV-1','DRAFT_FOR_REVIEW'],['OQ-PRIV-2','DRAFT_FOR_REVIEW'],['OQ-PRIV-3','DRAFT_FOR_REVIEW'],['OQ-OBS-1','RECOMMENDED'],['OQ-SES-1','RECOMMENDED'],['OQ-SES-2','RECOMMENDED'],['OQ-CERT-2','UNKNOWN'],['OQ-API-1','SOURCE_SCAN_PENDING_SELECTION']]){
  const r=records.get(id);check(r?.state===state&&r.owner_selection_recorded===false&&r.question_resolved===false&&questions.unresolved.some(x=>x.id===id),`unselected ${id} must remain unresolved`);
 }
 for(const r of records.values())check(r.implementation_conformance==='UNKNOWN'&&r.runtime_activation==='BLOCKED','policy must not claim runtime proof');
 check(records.get('OQ-AUTHZ-1').value.matrix_source==='NEW_V2'&&records.get('OQ-AUTHZ-1').value.legacy_grants_adopted===false&&records.get('OQ-AUTHZ-1').value.exact_matrix_approved===false,'new matrix direction cannot approve legacy grants or exact matrix');
 check(records.get('OQ-PRIV-2').credential_validity_extension_authorized===false&&records.get('OQ-PRIV-3').exemption_basis_approved===false,'privacy draft cannot extend authentication validity or approve exemptions');
 const provider=records.get('OQ-OBS-1');check(provider.provider_selected===false&&provider.analytics_activation_authorized===false&&provider.value.alert_destination==='UNKNOWN'&&provider.total_cost_claim==='NOT_VERIFIED'&&provider.ninety_day_log_storage_proven===false,'recommended providers cannot approve analytics, alert targets, cost or retention proof');
 check(reg.effects.confirmed_policy_question_count===selected.size&&reg.effects.runtime_activation==='BLOCKED'&&Object.entries(reg.effects).filter(([key])=>key.endsWith('_authorized')||key.endsWith('_approved')).every(([,value])=>value===false),'policy effects must preserve every execution/approval gate');
 check(records.get('OQ-AUD-1').retention_conformance==='UNKNOWN'&&records.get('OQ-OBS-3').retention_conformance==='UNKNOWN'&&records.get('OQ-AUD-1').retention_clock==='UNKNOWN','retention policy is not enforcement evidence');
 const expectedVersions={'contracts/c11-identity-credentials-contract.md':'1.5.0','contracts/c23-audit-lifecycle-events-contract.md':'1.1.0','contracts/c52-deployment-release-recovery-contract.md':'1.2.0','contracts/c53-observability-contract.md':'1.1.0'};
 check(revisions.issue==='#66'&&revisions.revisions.length===4&&revisions.production_execution_authorized===false,'four bounded SYS-21 revisions required');
 for(const revision of revisions.revisions){const text=read(revision.contract),m=JSON.parse(text.match(/<!--tos-doc\s*([\s\S]*?)-->/)[1]),archive=read(revision.superseded_copy),a=JSON.parse(archive.match(/<!--tos-doc\s*([\s\S]*?)-->/)[1]);check(text.includes('| Version | Date | Change | By |')&&text.includes(`| ${revision.to} | 2026-10-04 | Record owner-selected`),'complete revision change-log table required');check(m.version===expectedVersions[revision.contract]&&revision.to===m.version&&m.approval.approved_version===m.version&&(m.approval.basis.includes('#66')||m.approval.basis.includes('OQ-IDN-1'))&&m.supersedes.includes(`${m.doc_id}@${revision.from}`),'current contract version/approval ancestry required');check(a.status==='superseded'&&a.version===revision.from&&a.superseded_by===`${m.doc_id}@${m.version}`,'prior contract preservation required');const marker='The original body below is preserved, including its former current-status wording.\n',i=archive.indexOf(marker);check(i>=0&&hash(archive.slice(i+marker.length))===revision.historical_body_sha256,'historical contract body cannot be rewritten');for(const line of archive.slice(i+marker.length).split('\n').filter(x=>/^- \*\*[A-Z]+-\d+\*\*/.test(x)))check(text.includes(line),'existing requirement meaning must remain unchanged');}
 const c11=read('contracts/c11-identity-credentials-contract.md'),c23=read('contracts/c23-audit-lifecycle-events-contract.md'),c52=read('contracts/c52-deployment-release-recovery-contract.md'),c53=read('contracts/c53-observability-contract.md');
 for(const [text,tokens] of [[c11,['**IDN-30**','6 digits, 5 attempts, and a 15-minute lock','IDN-AC-23']],[c23,['**AUD-11**','one year, fixed centrally, with no tenant overrides','Audit deletion remains BLOCKED','AUD-AC-9']],[c52,['**REL-17**','24 hours after deployment/promotion','backward-compatible','**REL-18**','Supabase PostgreSQL','Vercel','REL-AC-10','REL-AC-11']],[c53,['**OBS-11**','90 days','provider default with a shorter horizon','OBS-AC-9']]])for(const token of tokens)check(text.includes(token),`policy/acceptance connection missing ${token}`);
 const ledger=read('contracts/APPROVAL-RECORD.md');check(ledger.includes('## Part 24 — Owner policy selections')&&[...selected.keys()].every(x=>ledger.includes(x)),'canonical owner ledger required');
 const index=read('contracts/README.md');for(const token of ['"version": "0.17.0"','- Package version: `0.17.0`','**391**','**267**','**56**','**11**'])check(index.includes(token),'current contract index totals required');
 const scan=json(base+'route-scan.json'),files=[];function walk(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){const child=path+'/'+entry.name;if(entry.isDirectory())walk(child);else files.push(child);}}walk('src');files.sort();const hashes=Object.fromEntries(files.map(x=>[x,hash(read(x))]));
 check(JSON.stringify(scan.source_sha256)===JSON.stringify(hashes)&&scan.source_file_count===files.length,'route scan must cover exact current src inventory');
 const entries=files.filter(x=>/\/(?:app|pages)\/.*(?:route\.[cm]?[jt]sx?|api\/)|\/(?:routes|routers)\//.test(x)),hits=files.filter(x=>/\b(?:app|router)\.(?:get|post|put|patch|delete|route)\s*\(|\b(?:createServer|serve)\s*\(/.test(read(x)));
 check(entries.length===0&&hits.length===0&&scan.implemented_http_route_count===0&&scan.approved_boundary_exceptions.length===0&&scan.oq_api_1_resolved===false&&scan.runtime_route_inventory==='UNKNOWN'&&scan.deployment_inspected===false,'absent HTTP transport cannot approve routes or claim deployed inspection');
 const c12=read('contracts/c12-application-sessions-contract.md');for(const token of ['ABSOLUTE_12H_IDLE_30M','SESSION_VERIFIER_V1_SHA256_256BIT'])check(c12.includes(token),'session expiry/verifier authority must remain unchanged');
 check(c11.includes('7 days')&&c11.includes('15 minutes')&&c11.includes('1 hour'),'token validity must remain separate from retention');
 console.log('PASS owner policy registration: 5 selected questions, 4 SYS-21 revisions, drafts unresolved; runtime/deletion/production BLOCKED');
} catch(error){console.error(error.message);process.exitCode=1;}
