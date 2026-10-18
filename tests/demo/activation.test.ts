import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateLocalDemoActivation,isolatedDemoTargetFingerprint,type LocalDemoAttestation,type LocalDemoEvidence} from '../../src/bootstrap/demo/local-activation.js';
const target=isolatedDemoTargetFingerprint('postgresql://agent@127.0.0.1:55438/teach_v2_demo_service','1');
const attestation:LocalDemoAttestation={kind:'LOCAL_ISOLATED_VERIFICATION',version:1,enabled:true,shared_or_production:false,runtime_readiness:'UNDER_TEST',candidate_commit:'a'.repeat(40),candidate_tree:'b'.repeat(40),package_sha256sums:'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a',registration_sha256:'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d',semantic_review_sha256:'1695c5ff3a884c063323eda27e6905f3af61f4814da8aee8d7ea534aa347f655',physical_admission_sha256:'d'.repeat(64),physical_mapping_sha256:'5cac3a47dc4ac22085fc262c14a89a5f4e9586d7b4dc0004b5ca084bf34c7ae4',isolated_target_sha256:target,allowed_origin:'http://localhost:4444'};
const evidence:LocalDemoEvidence={candidateCommit:attestation.candidate_commit,candidateTree:attestation.candidate_tree,clean:true,packageSha256:attestation.package_sha256sums,registrationSha256:attestation.registration_sha256,semanticReviewSha256:attestation.semantic_review_sha256,physicalAdmissionSha256:attestation.physical_admission_sha256,physicalMappingSha256:attestation.physical_mapping_sha256,physicalAdmitted:true,databaseTargetSha256:target,allowedOrigin:attestation.allowed_origin};
test('local attestation binds source, admission, exact origin and sanitized isolated target without conformance claims',()=>{
 assert.equal(validateLocalDemoActivation(attestation,evidence).runtime_readiness,'UNDER_TEST');
 assert.equal(target,isolatedDemoTargetFingerprint('postgresql://different:secret@127.0.0.1:55438/teach_v2_demo_service','1'));
 assert.doesNotMatch(target,/agent|secret|postgresql/);
 for(const key of Object.keys(attestation)){const changed={...attestation,[key]:'mismatch'};assert.throws(()=>validateLocalDemoActivation(changed,evidence));const missing={...attestation} as any;delete missing[key];assert.throws(()=>validateLocalDemoActivation(missing,evidence));}
 for(const key of Object.keys(evidence)){const changed={...evidence,[key]:typeof (evidence as any)[key]==='boolean'?false:'mismatch'};assert.throws(()=>validateLocalDemoActivation(attestation,changed as LocalDemoEvidence));}
 assert.throws(()=>validateLocalDemoActivation({...attestation,conformance:'PASS'},evidence));
 assert.throws(()=>validateLocalDemoActivation(null,evidence));
});
test('local activation cannot be retargeted to shared or external databases, origin aliases, HTTPS exceptions or absent opt-in',()=>{
 for(const url of ['postgresql://agent@db.example/teach_v2_demo_test','postgresql://agent@127.0.0.1/teach_v2_prod','postgresql://agent@127.0.0.1/teach_v2_demo_shared','postgresql://agent@127.0.0.1/teach_v2_demo_test?host=remote','http://localhost/teach_v2_demo_test'])assert.throws(()=>isolatedDemoTargetFingerprint(url,'1'));
 assert.throws(()=>isolatedDemoTargetFingerprint('postgresql://agent@localhost/teach_v2_demo_test',undefined));
 for(const origin of ['http://localhost:4444/','http://127.0.0.1:4444','http://public.example:4444','https://localhost:4444','http://localhost'])assert.throws(()=>validateLocalDemoActivation({...attestation,allowed_origin:origin},{...evidence,allowedOrigin:origin}));
});

test('missing or unapproved attestation rejects before opening any pool or listener',async()=>{
 const {startLocalDemoServer}=await import('../../src/bootstrap/demo/local-server.js');
 await assert.rejects(startLocalDemoServer({sourceRoot:process.cwd(),attestationPath:'/tmp/nonexistent-demo-local-attestation',attestationSha256:'0'.repeat(64),databaseUrl:'postgresql://agent@127.0.0.1:55438/teach_v2_demo_test',isolatedOptIn:'1',allowedOrigin:'http://localhost:4444'}));
});

test('executing checkout cannot borrow a different clean checkout identity',async()=>{
 const {executingDemoSourceRoot}=await import('../../src/bootstrap/demo/local-activation.js');
 assert.equal(executingDemoSourceRoot(process.cwd()),process.cwd());
 const other=mkdtempSync(join(tmpdir(),'demo-root-substitution-'));
 try{assert.throws(()=>executingDemoSourceRoot(other));}finally{rmSync(other,{recursive:true});}
});
