import { pgTable } from '../../../../platform/database-target.js';
import { sql } from 'drizzle-orm';
import { text,timestamp,integer,jsonb,foreignKey,unique,check,type AnyPgColumn } from 'drizzle-orm/pg-core';
type Ref=AnyPgColumn<{data:string}>;
export function defineDemoReceiptTable(organizationId:Ref,locationId:Ref,locationOrganizationId:Ref) {
 return pgTable('transaction_command_receipts',{id:text('id').primaryKey(),actorClass:text('actor_class').notNull(),actorReference:text('actor_reference').notNull(),organizationId:text('organization_id').notNull(),locationId:text('location_id').notNull(),operation:text('operation').notNull(),key:text('key').notNull(),canonicalPayloadDigest:text('canonical_payload_digest').notNull(),responseSchemaVersion:integer('response_schema_version').notNull(),response:jsonb('response').notNull(),createdAt:timestamp('created_at',{withTimezone:true,mode:'date'}).notNull(),replayUntil:timestamp('replay_until',{withTimezone:true,mode:'date'}).notNull()},t=>[
  foreignKey({name:'receipt_organization_fk',columns:[t.organizationId],foreignColumns:[organizationId]}),foreignKey({name:'receipt_location_scope_fk',columns:[t.locationId,t.organizationId],foreignColumns:[locationId,locationOrganizationId]}),unique('receipt_authority_key_uq').on(t.actorClass,t.actorReference,t.organizationId,t.locationId,t.operation,t.key),check('receipt_operation_check',sql`${t.operation} IN ('AssignContent','StartLearningSession','RecordProgressEvent')`),check('receipt_actor_check',sql`${t.actorClass} IN ('HumanActor','AutomationActor')`),check('receipt_shape_check',sql`${t.responseSchemaVersion}=1 AND ${t.canonicalPayloadDigest} ~ '^[a-f0-9]{64}$' AND isfinite(${t.createdAt}) AND ${t.replayUntil}=${t.createdAt}+interval '24 hours'`)
 ]);
}
