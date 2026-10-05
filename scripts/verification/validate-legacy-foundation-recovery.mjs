#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {deriveOwnerDecisionInventory} from './owner-decision-inventory.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname);
const read=path=>readFileSync(join(root,path),'utf8'),json=path=>JSON.parse(read(path));
const check=(condition,message)=>{if(!condition)throw new Error(`legacy recovery: ${message}`);};
const hash=text=>createHash('sha256').update(text).digest('hex');
const base='verification/legacy-recovery/';
try {
 const inventory=json(base+'owner-decisions.json');
 check(JSON.stringify(inventory)===JSON.stringify(deriveOwnerDecisionInventory(root,inventory.consulted_v2_baseline)),'live owner inventory drift');
 const packet=json(base+'decision-packet.json'),ids=inventory.unresolved_contract_questions.map(x=>x.id);
 check(packet.state==='PROPOSED'&&packet.owner_approval_recorded===false&&packet.resolution_authorized===false&&packet.runtime_activation==='BLOCKED'&&packet.shared_or_production_execution_authorized===false,'recommendations cannot grant authority');
 check(packet.recommendations.length===ids.length&&new Set(packet.recommendations.map(x=>x.id)).size===ids.length&&ids.every(id=>packet.recommendations.some(x=>x.id===id)),'exact complete recommendation inventory required');
 for(const row of packet.recommendations){const source=inventory.unresolved_contract_questions.find(x=>x.id===row.id);check(row.state==='PROPOSED'&&row.owner_approval_recorded===false&&row.authority_source===source.contract&&row.affects===source.affects&&row.recommendation?.trim()&&row.recommended_option?.trim(),'recommendation authority and source must remain explicit');}
 check(new Set(packet.review_ready_selection_ids).size===packet.review_ready_selection_ids.length&&packet.review_ready_selection_ids.every(x=>ids.includes(x)),'unique known review selections required');
 for(const id of ['OQ-AUTHZ-1','OQ-AUD-1','OQ-PRIV-1','OQ-PRIV-2','OQ-PRIV-3','OQ-SES-2'])check(packet.not_selection_ready_without_more_detail.includes(id)&&!packet.review_ready_selection_ids.includes(id),'detailed owner values remain required');
 const view=read(base+'owner-decisions.md');for(const id of [...ids,...inventory.physical_shape_questions.map(x=>x.id),...inventory.semantic_candidates.map(x=>x.id)])check(view.includes(id),`decision view omitted ${id}`);
 const manifest=json(base+'legacy-sources.json'),keys=new Set(),pins={main:'99162f17eace95238160f20c03e0b47af2c77fcd',cutover:'79fdce5cc3b207750888e5c2c1c198159ad17077'};
 check(manifest.legacy_runtime_retested===false&&manifest.legacy_authority_for_v2===false&&manifest.copied_runtime_sources.length===0,'legacy evidence cannot grant V2 authority');
 for(const source of manifest.sources){const key=source.label+':'+source.path;check(!keys.has(key)&&source.repo==='peteywee/teach'&&source.head_sha===pins[source.label]&&!source.path.startsWith('/')&&!source.path.split('/').includes('..')&&/^[a-f0-9]{40}$/.test(source.git_blob_sha)&&/^[a-f0-9]{64}$/.test(source.sha256)&&Number.isInteger(source.bytes)&&source.bytes>0,'exact pinned source metadata required');keys.add(key);}
 const excerpts=json(base+'legacy-excerpts.json');for(const row of excerpts.excerpts)check(keys.has(row.source)&&row.start_line>0&&row.end_line>=row.start_line&&hash(row.text)===row.excerpt_sha256,'excerpt source and digest required');
 // Offline CI checks committed metadata/excerpts. Collection verified complete file bytes against pinned Git blobs; it is not a fresh remote-runtime proof.
 const reuse=json(base+'reuse-map.json');check(reuse.owner_policy_approval_recorded===false&&reuse.legacy_authority_for_v2===false&&reuse.runtime_activation==='BLOCKED'&&reuse.shared_or_production_execution_authorized===false,'reuse cannot grant authority');
 for(const row of reuse.lessons)check(keys.has(row.source)&&row.legacy_runtime_retested===false&&row.v2_runtime_conformance==='UNKNOWN','historical lessons cannot claim current runtime proof');
 for(const row of reuse.reimplemented_mechanisms)check(keys.has(row.source)&&existsSync(join(root,row.target))&&row.tests.length>=2&&row.tests.every(x=>existsSync(join(root,x)))&&row.full_runtime_conformance==='UNKNOWN','reimplementation target and tests required');
 const service=read('src/modules/identity/application/session-revocation-service.ts'),binder=read('src/modules/identity/infrastructure/persistence/postgres-session-command-transaction.ts');
 check(service.includes('requireSessionAuthorization(structuredClone(captured))')&&service.includes('if (outcome.transitioned) await context.audit.appendRequired')&&service.indexOf('requireSessionAuthorization')<service.indexOf('revokeWithOutcome'),'authorized conditional required audit mechanism required');
 check(binder.includes('authorizationFactory(transaction)')&&binder.includes('auditFactory(transaction)')&&binder.includes('new PostgresApplicationSessionRepository(transaction)')&&binder.includes('throw new IdentityCommandDependenciesUnavailableError()'),'same transaction binding and refusal required');
 check(read('.github/workflows/slice-p02-implementation.yml').includes('run: pnpm test:session:commands:integration')&&read('scripts/verification/self-audit-catalog.mjs').includes("['postgres-session-commands'"),'session transaction PG automation required');
 console.log(`PASS legacy recovery: ${ids.length} unresolved owner questions, pinned reference evidence and conditional session audit; runtime BLOCKED`);
} catch(error){console.error(error.message);process.exitCode=1;}
