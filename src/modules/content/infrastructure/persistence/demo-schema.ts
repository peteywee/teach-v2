import { sql } from 'drizzle-orm';
import { pgTable,text,primaryKey,foreignKey,unique,check,type AnyPgColumn } from 'drizzle-orm/pg-core';
export function defineDemoContentTables(organizationId:AnyPgColumn<{data:string}>) {
 const packs=pgTable('content_packs',{id:text('id').primaryKey(),organizationId:text('organization_id').notNull()},t=>[foreignKey({name:'content_organization_fk',columns:[t.organizationId],foreignColumns:[organizationId]}),unique('content_identity_scope_uq').on(t.id,t.organizationId)]);
 const versions=pgTable('content_pack_versions',{contentPackId:text('content_pack_id').notNull(),version:text('version').notNull(),digest:text('digest').notNull(),canonicalJson:text('canonical_json').notNull()},t=>[
  primaryKey({name:'content_version_pk',columns:[t.contentPackId,t.version]}),foreignKey({name:'content_version_pack_fk',columns:[t.contentPackId],foreignColumns:[packs.id]}),unique('content_exact_version_uq').on(t.contentPackId,t.version,t.digest),check('content_digest_check',sql`${t.digest} ~ '^sha256:[0-9a-f]{64}$' AND ${t.digest} = 'sha256:' || encode(sha256(convert_to(${t.canonicalJson},'UTF8')),'hex')`),check('content_payload_size_check',sql`octet_length(${t.canonicalJson}) <= 65536`)
 ]);
 return {packs,versions};
}
