import { sql } from 'drizzle-orm';
import { pgTable,text,timestamp,foreignKey,unique,check,type AnyPgColumn } from 'drizzle-orm/pg-core';
export function defineDemoPersonaTable(identityId:AnyPgColumn<{data:string}>,runId:AnyPgColumn<{data:string}>) {
 return pgTable('identity_demo_personas',{id:text('id').primaryKey(),identityId:text('identity_id').notNull(),demoRunId:text('demo_run_id').notNull(),kind:text('kind').notNull(),createdAt:timestamp('created_at',{withTimezone:true,mode:'date'}).notNull()},t=>[
  foreignKey({name:'demo_persona_identity_fk',columns:[t.identityId],foreignColumns:[identityId]}),foreignKey({name:'demo_persona_run_fk',columns:[t.demoRunId],foreignColumns:[runId]}),unique('demo_persona_identity_uq').on(t.identityId),unique('demo_persona_slot_uq').on(t.demoRunId,t.kind),check('demo_persona_kind_check',sql`${t.kind} IN ('LEARNER','MANAGER')`)
 ]);
}
