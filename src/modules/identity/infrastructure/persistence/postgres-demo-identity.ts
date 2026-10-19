import { databaseObject, databaseFunction } from '../../../../platform/database-target.js';
import type { IdentityPort,Persona,PersonaKind } from '../../application/ports/demo-identity.js';
import type { ApplicationSessionRecord } from '../../domain/application-session.js';
import type { IdentityDatabase } from './identity-database.js';
import { PostgresApplicationSessionRepository } from './postgres-application-session-repository.js';
type Query={query<T>(text:string,values?:readonly unknown[]):Promise<T[]>};
const personaFields='p.id,p.identity_id AS "identityId",p.demo_run_id AS "demoRunId",p.kind,p.created_at AS "createdAt",i.status AS "identityStatus"';
export class PostgresDemoIdentity implements IdentityPort {
 readonly sessions:PostgresApplicationSessionRepository;
 constructor(private readonly db:Query, sessionDb:IdentityDatabase){this.sessions=new PostgresApplicationSessionRepository(sessionDb);}
 async findDemoRunId(id:string){const [r]=await this.db.query<{demoRunId:string}>(`SELECT demo_run_id AS "demoRunId" FROM ${databaseObject("identity_demo_personas")} WHERE identity_id=$1`,[id]);return r?.demoRunId??null;}
 async now(){const [r]=await this.db.query<{now:Date}>(`SELECT ${databaseFunction("clock_timestamp")}() AS now`);return r!.now;}
 async getIdentityStatus(id:string){const [r]=await this.db.query<{status:'ACTIVE'|'INACTIVE'|'DELETED'}>(`SELECT status FROM ${databaseObject("identity_identities")} WHERE id=$1 FOR UPDATE`,[id]);return r?.status??null;}
 async lockSession(id:string,identityId:string):Promise<ApplicationSessionRecord|null>{await this.getIdentityStatus(identityId);const [row]=await this.db.query<{id:string}>(`SELECT id FROM ${databaseObject("identity_application_sessions")} WHERE id=$1 AND identity_id=$2 FOR UPDATE`,[id,identityId]);return row?this.sessions.getById({id,identityId}):null;}
 async findSessionByVerifier(verifier:Buffer){if(!Buffer.isBuffer(verifier)||verifier.length!==32)return null;const [r]=await this.db.query<{id:string;identityId:string}>(`SELECT id,identity_id AS "identityId" FROM ${databaseObject("identity_application_sessions")} WHERE verifier_version='v1' AND credential_verifier=$1`,[Buffer.from(verifier)]);return r??null;}
 async createPersona(v:{id:string;identityId:string;demoRunId:string;kind:PersonaKind;createdAt:Date}){await this.db.query(`INSERT INTO ${databaseObject("identity_identities")}(id,status,offboarded_at,created_at,updated_at) VALUES($1,'ACTIVE',NULL,$2,$2)`,[v.identityId,v.createdAt]);await this.db.query(`INSERT INTO ${databaseObject("identity_demo_personas")}(id,identity_id,demo_run_id,kind,created_at) VALUES($1,$2,$3,$4,$5)`,[v.id,v.identityId,v.demoRunId,v.kind,v.createdAt]);return {...v,identityStatus:'ACTIVE' as const};}
 async getPersona(id:string){const [r]=await this.db.query<Persona>(`SELECT ${personaFields} FROM ${databaseObject("identity_demo_personas")} p JOIN ${databaseObject("identity_identities")} i ON i.id=p.identity_id WHERE p.identity_id=$1 FOR UPDATE OF i,p`,[id]);return r??null;}
 async listPersonas(id:string){return this.db.query<Persona>(`SELECT ${personaFields} FROM ${databaseObject("identity_demo_personas")} p JOIN ${databaseObject("identity_identities")} i ON i.id=p.identity_id WHERE p.demo_run_id=$1 ORDER BY i.id FOR UPDATE OF i,p`,[id]);}
 async countSessions(id:string){const [r]=await this.db.query<{n:number}>(`SELECT ${databaseFunction("count")}(*)::int AS n FROM ${databaseObject("identity_application_sessions")} s JOIN ${databaseObject("identity_demo_personas")} p ON p.identity_id=s.identity_id WHERE p.demo_run_id=$1`,[id]);return r!.n;}
 async listActiveSessions(id:string){return this.db.query<{id:string;identityId:string}>(`SELECT s.id,s.identity_id AS "identityId" FROM ${databaseObject("identity_application_sessions")} s JOIN ${databaseObject("identity_demo_personas")} p ON p.identity_id=s.identity_id WHERE p.demo_run_id=$1 AND s.status='ACTIVE' ORDER BY s.id FOR UPDATE OF s`,[id]);}
}
