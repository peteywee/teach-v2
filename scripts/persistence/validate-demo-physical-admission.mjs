import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { inspectDemoPhysicalAdmission } from './demo-admission-evidence.mjs';
const root=resolve(process.cwd());const result=await inspectDemoPhysicalAdmission(root);
if(result.errors.length){console.error(result.errors.join('\n'));process.exit(1);}
if(process.argv.includes('--record'))writeFileSync(`${root}/persistence/physical-slices/demo-runtime/admission.json`,JSON.stringify({admission_id:'TEACH-DEMO-RUNTIME-PHYSICAL-ADMISSION',version:'1.0.0',issue:'#82',package:'TEACH-DEMO-RUNTIME-2026-10-17@0.1.0',evaluated_at:new Date().toISOString(),decision:result.decision,criteria:result.criteria,mapping_sha256:result.mapping_sha256,evidence_plan_sha256:result.evidence_plan_sha256,semantic_review:result.semantic_review,physical_schema_authorized:true,implementation_authorized:true,migration_authoring_authorized:true,shared_or_production_migration_execution_authorized:false,runtime_proof:'NOT_RUN'},null,2)+'\n');
console.log('DEMO PHYSICAL ADMIT: eight criteria proven; isolated authoring authorized; runtime proof separate; shared/production execution NOT authorized');
