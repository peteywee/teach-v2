import {randomUUID} from 'node:crypto';
import type {AuditPort,AuditFact,LifecycleFact,DenialFact} from '../../application/ports/demo-audit.js';
type Query={query<T>(text:string,values?:readonly unknown[]):Promise<T[]>};
export class PostgresDemoAudit implements AuditPort {
 constructor(private readonly db:Query){}
 async append(v:AuditFact){await this.db.query('INSERT INTO audit_events(id,occurred_at,request_id,idempotency_key,actor_class,actor_reference,action,result,target_type,target_id,target_version,target_digest,organization_id,location_id) VALUES($1,$2,$3,$4,$5,$6,$7,\'SUCCEEDED\',$8,$9,$10,$11,$12,$13)',[v.id,v.occurredAt,v.requestId,v.idempotencyKey,v.actorClass,v.actorReference,v.action,v.target.type,v.target.id,v.target.version??null,v.target.digest??null,v.organizationId,v.locationId]);}
 async appendLifecycle(v:LifecycleFact){await this.db.query('SELECT pg_advisory_xact_lock(737306,hashtext($1))',[JSON.stringify([v.aggregateType,v.aggregateId])]);await this.db.query('INSERT INTO lifecycle_events(id,occurred_at,request_id,owner_command,organization_id,location_id,aggregate_type,aggregate_id,sequence,previous_state,next_state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,(SELECT coalesce(max(sequence),0)+1 FROM lifecycle_events WHERE aggregate_type=$7 AND aggregate_id=$8),$9::jsonb,$10::jsonb)',[v.id,v.occurredAt,v.requestId,v.ownerCommand,v.organizationId,v.locationId,v.aggregateType,v.aggregateId,v.previousState===null?null:JSON.stringify(v.previousState),JSON.stringify(v.nextState)]);}
 async appendDenial(v:DenialFact){
  // Only validated owner facts enter this port. Never retain raw cookies, headers,
  // request bodies, unresolved object IDs, full IPs, or admission sentinels.
  const actor=v.actorReference;const prefix=v.ipPrefix;
  const bucket=new Date(Math.floor(v.occurredAt.getTime()/300000)*300000);
  const hour=new Date(Math.floor(v.occurredAt.getTime()/3600000)*3600000);
  const actorClass=actor===null?'UNAUTHENTICATED_DENIAL':'HumanActor';
  await this.db.query("SELECT pg_advisory_xact_lock(hashtextextended('demo-denial:'||demo_audit_denial_subject($1,$2,$3),0))",[actorClass,actor,prefix]);
  const [seen]=await this.db.query<{n:number}>(`SELECT count(*)::int AS n FROM audit_events WHERE result='DENIED' AND demo_audit_denial_subject(actor_class,actor_reference,ip_prefix)=demo_audit_denial_subject($1,$2,$3) AND denial_class=$4 AND action=$5 AND dedup_bucket_start=$6`,[actorClass,actor,prefix,v.denialClass,v.operation,bucket]);if(seen!.n)return;
  const [count]=await this.db.query<{n:number}>(`SELECT count(*)::int AS n FROM audit_events WHERE result='DENIED' AND demo_audit_denial_subject(actor_class,actor_reference,ip_prefix)=demo_audit_denial_subject($1,$2,$3) AND occurred_at >= $4 AND occurred_at < $4::timestamptz+interval '1 hour'`,[actorClass,actor,prefix,hour]);
  if(count!.n>=100){
   const [overflow]=await this.db.query<{n:number}>(`SELECT count(*)::int AS n FROM audit_events WHERE result='OVERFLOW' AND demo_audit_denial_subject(actor_class,actor_reference,ip_prefix)=demo_audit_denial_subject($1,$2,$3) AND overflow_bucket_start=$4`,[actorClass,actor,prefix,hour]);
   if(!overflow!.n)await this.db.query(`INSERT INTO audit_events(id,occurred_at,request_id,actor_class,actor_reference,action,result,target_type,ip_prefix,overflow_bucket_start) VALUES($1,$2,$3,$4,$5,'DENIAL_OVERFLOW','OVERFLOW','UNRESOLVED',$6,$7)`,[randomUUID(),v.occurredAt,v.requestId,actorClass,actor,prefix,hour]);return;
  }
  await this.db.query(`INSERT INTO audit_events(id,occurred_at,request_id,actor_class,actor_reference,action,result,target_type,organization_id,location_id,denial_class,ip_prefix,dedup_bucket_start) VALUES($1,$2,$3,$4,$5,$6,'DENIED','UNRESOLVED',$7,$8,$9,$10,$11)`,[randomUUID(),v.occurredAt,v.requestId,actorClass,actor,v.operation,v.organizationId,v.locationId,v.denialClass,prefix,bucket]);
 }
}
