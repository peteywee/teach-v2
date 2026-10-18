import type { Actor } from './demo-actor.js';
import type { Scope } from '../../../organization/application/ports/demo-organization.js';
/** Transaction-bound server authority, not a transport DTO or persisted grant. */
export interface DemoCommandContext {actor:Actor;scope:Scope;requestId:string;now:Date;refresh():Promise<Date>}
