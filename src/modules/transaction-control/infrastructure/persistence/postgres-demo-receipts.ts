import type {ReceiptPort,Receipt,ReceiptKey} from '../../application/ports/demo-receipts.js';
type Query={query<T>(text:string,values?:readonly unknown[]):Promise<T[]>};
const fields='id,actor_class AS "actorClass",actor_reference AS "actorReference",organization_id AS "organizationId",location_id AS "locationId",operation,key,canonical_payload_digest AS "canonicalPayloadDigest",response_schema_version AS "responseSchemaVersion",response,created_at AS "createdAt",replay_until AS "replayUntil"';
export class PostgresDemoReceipts implements ReceiptPort {
 constructor(private readonly db:Query){}
 async get(k:ReceiptKey){const values=[k.actorClass,k.actorReference,k.organizationId,k.locationId,k.operation,k.key];await this.db.query('SELECT pg_advisory_xact_lock(737305,hashtext($1))',[JSON.stringify(values)]);const [r]=await this.db.query<Receipt>(`SELECT ${fields} FROM transaction_command_receipts WHERE actor_class=$1 AND actor_reference=$2 AND organization_id=$3 AND location_id=$4 AND operation=$5 AND key=$6 FOR UPDATE`,values);return r??null;}
 async put(r:Receipt){await this.db.query('INSERT INTO transaction_command_receipts(id,actor_class,actor_reference,organization_id,location_id,operation,key,canonical_payload_digest,response_schema_version,response,created_at,replay_until) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)',[r.id,r.actorClass,r.actorReference,r.organizationId,r.locationId,r.operation,r.key,r.canonicalPayloadDigest,r.responseSchemaVersion,JSON.stringify(r.response),r.createdAt,r.replayUntil]);}
}
