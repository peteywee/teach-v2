import {databaseObject} from '../../../../platform/database-target.js';
import type {AuthoringOwner} from '../../../content/application/ports/demo-authoring.js';
import type {AuthoringReceiptPort,AuthoringReceipt} from '../../application/ports/demo-authoring-receipts.js';
type Query={query<T>(statement:string,values?:readonly unknown[]):Promise<T[]>};
const scope=(o:AuthoringOwner)=>[o.runId,o.organizationId,o.locationId,o.managerIdentityId];
export class PostgresDemoAuthoringReceipts implements AuthoringReceiptPort {
 constructor(private readonly db:Query){}
 async get(o:AuthoringOwner,key:string){const [r]=await this.db.query<AuthoringReceipt>(`SELECT demo_run_id AS "runId",organization_id AS "organizationId",location_id AS "locationId",manager_identity_id AS "managerIdentityId",key,operation,payload_digest AS "payloadDigest",result,created_at AS "createdAt",expires_at AS "expiresAt" FROM ${databaseObject("content_authoring_receipts")} WHERE demo_run_id=$1 AND organization_id=$2 AND location_id=$3 AND manager_identity_id=$4 AND key=$5`,[...scope(o),key]);return r??null;}
 async countOwnedReceipts(o:AuthoringOwner){const [r]=await this.db.query<{n:number}>(`SELECT pg_catalog.count(*)::int AS n FROM ${databaseObject("content_authoring_receipts")} WHERE demo_run_id=$1 AND organization_id=$2 AND location_id=$3 AND manager_identity_id=$4`,scope(o));return r!.n;}
 async put(r:AuthoringReceipt){await this.db.query(`INSERT INTO ${databaseObject("content_authoring_receipts")}(demo_run_id,organization_id,location_id,manager_identity_id,key,operation,payload_digest,result,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,[...scope(r),r.key,r.operation,r.payloadDigest,JSON.stringify(r.result),r.createdAt,r.expiresAt]);}
}
