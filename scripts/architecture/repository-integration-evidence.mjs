import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { inspectFutureAdmission } from '../persistence/future-admission-evidence.mjs';
import { inspectCommandCoverage } from './command-coverage-evidence.mjs';
import { inspectAssignmentAdmission } from '../persistence/assignment-admission-evidence.mjs';

export function inspectRepositoryIntegration(root) {
  const errors=[];
  const fail=(message)=>errors.push(`repository integration: ${message}`);
  const load=(path)=>{try{return JSON.parse(readFileSync(join(root,path),'utf8'));}catch(error){fail(`${path}: ${error.message}`);return null;}};
  const text=(path)=>{try{return readFileSync(join(root,path),'utf8');}catch(error){fail(`${path}: ${error.message}`);return '';}};
  const walk=(dir)=>{
    try{return readdirSync(join(root,dir),{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(`${dir}/${x.name}`):[`${dir}/${x.name}`]);}
    catch(error){fail(`${dir}: ${error.message}`);return [];}
  };
  const arch=load('architecture/authority.json');
  const moduleName=(name)=>name.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());
  const allowedModules=new Set((arch?.topology?.runtime_domain_modules||[]).map(moduleName));
  const sources=walk('src/modules').filter(x=>/\.(?:ts|mts|mjs)$/.test(x) && !/\.test\.(?:ts|mts|mjs)$/.test(x));
  for(const path of sources) {
    const [, , owner, layer]=path.split('/');
    if(!allowedModules.has(owner)) fail(`${path}: unregistered runtime module`);
    const source=text(path).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
    const imports=[...source.matchAll(/\b(?:import|export)\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?['"]([^'"]+)['"]/g),
      ...source.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]/g)].map(x=>x[1]);
    for(const specifier of imports) {
      const target=specifier.startsWith('.')?resolve(root,dirname(path),specifier):specifier;
      if(layer==='domain' && (specifier==='pg' || specifier.startsWith('drizzle-orm') ||
         specifier.startsWith('.') && !target.startsWith(resolve(root,`src/modules/${owner}/domain`)+'/'))) fail(`${path}: Domain imports a non-Domain dependency`);
      if(layer==='application' && (specifier==='pg' || specifier.startsWith('drizzle-orm') || /\/(?:infrastructure|interfaces)\//.test(target))) fail(`${path}: Application imports Infrastructure/Interfaces`);
      if(target.startsWith(resolve(root,'src/modules')+'/') && !target.startsWith(resolve(root,`src/modules/${owner}`)+'/') && /\/infrastructure\//.test(target)) fail(`${path}: foreign Infrastructure import forbidden`);
    }
    if(layer==='infrastructure' && /export\s+interface\s+\w*Repository\b/.test(source)) fail(`${path}: repository port must be Application-owned`);
    if(layer==='infrastructure' && /class\s+\w*Repository\b/.test(source) &&
       (!/implements\s+\w*Repository\b/.test(source) || !imports.some(x=>x.includes('/application/ports/')))) fail(`${path}: adapter must implement an Application-owned repository port`);
    if(layer==='infrastructure' && /class\s+\w*Repository\b/.test(source)) {
      const inputs=[...source.matchAll(/\basync\s+\w+\s*\(\s*input\s*:/g)].length;
      const snapshots=[...source.matchAll(/input\s*=\s*snapshotPersistenceInput\(input\)/g)].length;
      if(inputs && (inputs!==snapshots || !imports.includes('./input-snapshot.mjs'))) fail(`${path}: capture every mutable repository input before await`);
    }
    if(/\bpgTable\s*\(/.test(source) && /assignment|certification|progress.event/i.test(path)) fail(`${path}: future physical schema has no ADMIT authority`);
    for(const match of source.matchAll(/\bpgTable\s*\(\s*['"]([^'"]+)['"]/g)) {
      if(/assignment|certification|progress.?event/i.test(match[1])) fail(`${path}: future physical table has no ADMIT authority`);
    }
  }
  for(const path of walk('drizzle')) {
    if(path.endsWith('.sql')) {
      for(const match of text(path).matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)/gi)) {
        if(/assignment|certification|progress.?event/i.test(match[1])) fail(`${path}: future migration table has no ADMIT authority`);
      }
    }
    if(/_snapshot\.json$/.test(path)) for(const table of Object.keys(load(path)?.tables||{})) {
      if(/assignment|certification|progress.?event/i.test(table)) fail(`${path}: future snapshot table has no ADMIT authority`);
    }
  }
  const composition=text('src/bootstrap/learning-persistence-schema.ts');
  if(/Repository|\.insert\(|\.update\(|\.delete\(/.test(composition)) fail('build-time schema composition cannot activate runtime persistence');
  const queue=load('persistence/physical-slices/queue-post-p05.json');
  const relationships=load('kernel/relationships.json');
  const ids=load('kernel/identifiers.json');
  const entities=load('kernel/entities.json');
  if(queue?.version!=='1.2.0' || !Array.isArray(queue?.slices) || queue.slices.length!==3 ||
     JSON.stringify(queue.slices.map(x=>x.slice))!==JSON.stringify(['P06','P07','P08'])) fail('exact future-slice gate inventory required');
  for(const item of queue?.slices||[]) {
    if(item.status!=='GATE_REQUIRED' || item.admission_decision!=='BLOCK' || item.implementation_authorized!==false || item.migration_authoring_authorized!==false ||
       !Array.isArray(item.blockers) || !item.blockers.length || item.blockers.some(x=>typeof x!=='string' || !x.trim())) fail(`${item.slice}: queue must preserve admission BLOCK and explicit blockers`);
    const entity=(entities?.entries||[]).find(x=>x.id===item.entity);
    const identifier=(ids?.entries||[]).find(x=>x.id===item.identifier);
    if(entity?.status!=='approved' || entity?.owning_domain!==item.domain || identifier?.status!=='approved' || identifier?.represents!==item.entity) fail(`${item.slice}: approved logical identity/ownership required`);
    const expected=(relationships?.entries||[]).filter(x=>x.status==='approved' && x.from===item.entity && x.owning_domain===item.domain).map(x=>x.id).sort();
    if(!Array.isArray(item.relationships) || JSON.stringify([...item.relationships].sort())!==JSON.stringify(expected)) fail(`${item.slice}: queue relationship set must match the live registry`);
    if(item.evidence_plan===null) fail(`${item.slice}: evidence plan is required`);
    if(item.evidence_plan!==null && (typeof item.evidence_plan!=='string' || !existsSync(join(root,item.evidence_plan)))) fail(`${item.slice}: referenced evidence plan missing`);
  }
  // Every entry point that may mutate a database must guard before its Pool.
  const databasePaths=['scripts/db/migrate.ts',...walk('scripts/db').filter(x=>/^scripts\/db\/verify-.*-replay\.ts$/.test(x)),...walk('tests/integration').filter(x=>x.endsWith('.test.ts'))];
  for(const path of databasePaths) {
    const source=text(path);
    const guard=source.indexOf('assertIsolatedDatabaseTarget(process.env.DATABASE_URL)');
    const pool=source.search(/new\s+(?:pg\.)?Pool\s*\(/);
    if(!source.includes('import { assertIsolatedDatabaseTarget }') || guard<0 || pool<0 || guard>pool) fail(`${path}: isolated target guard must run before any Pool`);
  }
  for(const n of [1,2,3,4,5]) {
    const workflow=text(`.github/workflows/slice-p0${n}-implementation.yml`);
    if(!workflow.includes("TEACH_ISOLATED_DB: '1'")) fail(`P0${n}: isolated CI declaration required`);
    if(/\bpaths(?:-ignore)?:/.test(workflow) || !/pull_request:\s*\n\s*branches: \[main\]/.test(workflow) || !/push:\s*\n\s*branches: \[main\]/.test(workflow)) fail(`P0${n}: physical proofs must run on every PR and main tree`);
  }
  errors.push(...inspectAssignmentAdmission(root), ...inspectFutureAdmission(root,'P07'), ...inspectFutureAdmission(root,'P08'), ...inspectCommandCoverage(root));
  return errors;
}
