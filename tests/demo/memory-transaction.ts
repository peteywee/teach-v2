/** Test double only. Real PostgreSQL/locking evidence remains a separate required gate. */
import type { DemoTransaction, DemoTransactionRunner } from '../../src/bootstrap/demo/demo-transaction.js';
import type { ApplicationSessionRecord } from '../../src/modules/identity/domain/application-session.js';
import { evaluateSessionAuthentication, absoluteExpiryFromIssuedAt } from '../../src/modules/identity/domain/application-session.js';
import type { DemoRun, Membership } from '../../src/modules/organization/application/ports/demo-organization.js';
import type { Persona } from '../../src/modules/identity/application/ports/demo-identity.js';
import type { ContentRecord } from '../../src/modules/content/application/ports/demo-content.js';
import type { Assignment, LearningSession, Progress } from '../../src/modules/learning/application/ports/demo-learning.js';
import type { Receipt, ReceiptKey } from '../../src/modules/transaction-control/application/ports/demo-receipts.js';
import type { AuditFact, LifecycleFact } from '../../src/modules/audit-lifecycle/application/ports/demo-audit.js';

type State = {
  runs: Map<string, DemoRun>; personas: Map<string, Persona>; identities: Map<string, 'ACTIVE'|'INACTIVE'|'DELETED'>;
  sessions: Map<string, ApplicationSessionRecord>; memberships: Map<string, Membership>;
  reports: Array<{ managerIdentityId: string; learnerIdentityId: string; organizationId: string; locationId: string }>;
  content: Map<string, ContentRecord>; assignments: Map<string, Assignment>; learningSessions: Map<string, LearningSession>;
  progress: Progress[]; receipts: Map<string, Receipt>; audit: AuditFact[]; lifecycle: LifecycleFact[];
};
const scopeMatches = (a: { organizationId: string; locationId: string }, b: { organizationId: string; locationId: string }) => a.organizationId === b.organizationId && a.locationId === b.locationId;
const receiptKey = (key: ReceiptKey) => JSON.stringify([key.actorClass,key.actorReference,key.organizationId,key.locationId,key.operation,key.key]);
export class MemoryDemoTransaction implements DemoTransactionRunner {
  now = new Date('2026-10-17T12:00:00.000Z');
  failAudit: string | null = null;
  failCommit = false;
  advanceOnContentReadMs = 0;
  expireAfterAuditAction:string|null=null;
  advanceAfterAudit:{action:string;ms:number}|null=null;
  advanceOnReceiptLookupMs = 0;
  admissionOverrides: { prefixHour: number; globalHour: number; total: number } | null = null;
  state: State = { runs:new Map(),personas:new Map(),identities:new Map(),sessions:new Map(),memberships:new Map(),reports:[],content:new Map(),assignments:new Map(),learningSessions:new Map(),progress:[],receipts:new Map(),audit:[],lifecycle:[] };
  async run<T>(work: (tx: DemoTransaction) => Promise<T>): Promise<T> {
    const original = structuredClone(this.state);
    try { const result = await work(this.ports()); if (this.failCommit) throw new Error('injected commit failure'); return result; }
    catch (error) { this.state = original; throw error; }
  }
  private ports(): DemoTransaction {
    const sessions = {
      create: async (input: any): Promise<ApplicationSessionRecord> => {
        const record: ApplicationSessionRecord = { id:input.id,identityId:input.identityId,status:'ACTIVE',verifierVersion:'v1',verifier:Buffer.from(input.credential.verifier),issuedAt:input.now,absoluteExpiresAt:absoluteExpiryFromIssuedAt(input.now),lastUsedAt:input.now,revokedAt:null,expiredAt:null,createdAt:input.now,updatedAt:input.now };
        if (this.state.identities.get(input.identityId) !== 'ACTIVE' || this.state.sessions.has(input.id)) throw new Error('invalid session creation');
        this.state.sessions.set(record.id,record); return structuredClone(record);
      },
      getById: async (input: { id:string;identityId:string }) => { const s=this.state.sessions.get(input.id);return s?.identityId===input.identityId?structuredClone(s):null; },
      revokeWithOutcome: async (input: {id:string;identityId:string;now:Date}) => { const s=this.state.sessions.get(input.id);if(!s||s.identityId!==input.identityId)throw new Error('missing session');const transitioned=s.status==='ACTIVE';if(transitioned)this.state.sessions.set(s.id,{...s,status:'REVOKED',revokedAt:input.now,updatedAt:input.now});return {session:structuredClone(this.state.sessions.get(s.id)!),transitioned}; },
      revoke: async (input: {id:string;identityId:string;now:Date}) => (await sessions.revokeWithOutcome(input)).session,
      authenticateByVerifier: async (input: {verifier:Buffer;now:Date}) => {
        const s=[...this.state.sessions.values()].find(s=>Buffer.from(s.verifier).equals(input.verifier));
        if(!s||!evaluateSessionAuthentication({...s,identityActive:this.state.identities.get(s.identityId)==='ACTIVE'},input.now).allowed)return null;
        const updated={...s,lastUsedAt:input.now,updatedAt:input.now};this.state.sessions.set(s.id,updated);return structuredClone(updated);
      },
    };
    return {
      organization: {
        lockAdmission: async prefix => ({ now:new Date(this.now),retryAfterSeconds:null,...(this.admissionOverrides??{prefixHour:[...this.state.runs.values()].filter(r=>r.admissionPrefix===prefix&&this.now.getTime()-r.createdAt.getTime()<3600000).length,globalHour:[...this.state.runs.values()].filter(r=>this.now.getTime()-r.createdAt.getTime()<3600000).length,total:this.state.runs.size}) }),
        createScope: async run=>{this.state.runs.set(run.id,structuredClone(run));},
        lockRun: async id=>{const run=this.state.runs.get(id);return run?{run:structuredClone(run),now:new Date(this.now)}:null;},
        findRun: async id=>structuredClone(this.state.runs.get(id)??null),
        createMembership: async m=>{this.state.memberships.set(m.id,{...structuredClone(m),bundles:[]});},
        createGrant: async g=>{const m=this.state.memberships.get(g.membershipId);if(!m)throw new Error('missing membership');m.bundles.push(g.bundle);},
        createReporting: async r=>{this.state.reports.push(structuredClone(r));},
        getMembership: async (id,scope)=>structuredClone([...this.state.memberships.values()].find(m=>m.identityId===id&&scopeMatches(m,scope))??null),
        listMemberships: async id=>structuredClone([...this.state.memberships.values()].filter(m=>m.identityId===id)),
        listDirectReports: async (id,scope)=>this.state.reports.filter(r=>r.managerIdentityId===id&&scopeMatches(r,scope)).map(r=>r.learnerIdentityId),
        closeRun: async (id,reason,now)=>{const r=this.state.runs.get(id);if(!r)throw new Error('missing run');const terminal=r.status!=='ACTIVE'?r:{...r,status:reason==='EXPIRED'?'EXPIRED' as const:'CLOSED' as const,closedAt:now,closeReason:reason};this.state.runs.set(id,terminal);return structuredClone(terminal);},
        listExpiredRuns: async limit=>structuredClone([...this.state.runs.values()].filter(r=>r.status==='ACTIVE'&&r.expiresAt<=this.now).slice(0,limit)),
      },
      identity: {
        findDemoRunId:async id=>this.state.personas.get(id)?.demoRunId??null,
        now: async()=>new Date(this.now),getIdentityStatus:async id=>this.state.identities.get(id)??null,
        lockSession: async(id,identityId)=>sessions.getById({id,identityId}),
        findSessionByVerifier: async verifier=>{const s=[...this.state.sessions.values()].find(s=>Buffer.from(s.verifier).equals(verifier));return s?{id:s.id,identityId:s.identityId}:null;},
        sessions,
        createPersona: async p=>{const value={...structuredClone(p),identityStatus:'ACTIVE' as const};this.state.personas.set(p.identityId,value);this.state.identities.set(p.identityId,'ACTIVE');return value;},
        getPersona: async id=>{const p=this.state.personas.get(id);return p?{...structuredClone(p),identityStatus:this.state.identities.get(id)!}:null;},
        listPersonas: async runId=>[...this.state.personas.values()].filter(p=>p.demoRunId===runId).map(p=>({...structuredClone(p),identityStatus:this.state.identities.get(p.identityId)!})),
        countSessions: async runId=>[...this.state.sessions.values()].filter(s=>this.state.personas.get(s.identityId)?.demoRunId===runId).length,
        listActiveSessions: async runId=>[...this.state.sessions.values()].filter(s=>s.status==='ACTIVE'&&this.state.personas.get(s.identityId)?.demoRunId===runId).map(s=>({id:s.id,identityId:s.identityId})),
      },
      content: { getVersion:async(id,org,version)=>{this.now=new Date(this.now.getTime()+this.advanceOnContentReadMs);this.advanceOnContentReadMs=0;return structuredClone([...this.state.content.values()].find(c=>c.id===id&&c.organizationId===org&&c.version===version)??null);},publish:async c=>{this.state.content.set(c.id+':'+c.version,structuredClone(c));} },
      learning: {
        countAssignments:async scope=>[...this.state.assignments.values()].filter(a=>scopeMatches(a,scope)).length,
        createAssignment:async a=>{this.state.assignments.set(a.id,structuredClone(a));},
        getAssignment:async(id,scope)=>{const a=this.state.assignments.get(id);return a&&scopeMatches(a,scope)?structuredClone(a):null;},
        listAssignments:async(id,scope)=>structuredClone([...this.state.assignments.values()].filter(a=>a.identityId===id&&scopeMatches(a,scope))),
        createSession:async s=>{this.state.learningSessions.set(s.id,structuredClone(s));},
        getSession:async id=>structuredClone(this.state.learningSessions.get(id)??null),
        getSessionByAssignment:async id=>structuredClone([...this.state.learningSessions.values()].find(s=>s.assignmentId===id)??null),
        listProgress:async id=>structuredClone(this.state.progress.filter(p=>p.learningSessionId===id)),
        appendProgress:async p=>{this.state.progress.push(structuredClone(p));},
        completeSession:async(id,now)=>{const s=this.state.learningSessions.get(id);if(!s||s.status!=='ACTIVE')throw new Error('invalid completion');const result={...s,status:'COMPLETED' as const,completedAt:now};this.state.learningSessions.set(id,result);return structuredClone(result);},
      },
      audit: {append:async fact=>{if(fact.action===this.failAudit)throw new Error('injected required audit failure');this.state.audit.push(structuredClone(fact));if(this.advanceAfterAudit?.action===fact.action){this.now=new Date(this.now.getTime()+this.advanceAfterAudit.ms);this.advanceAfterAudit=null;}if(fact.action===this.expireAfterAuditAction){this.now=new Date([...this.state.runs.values()][0]!.expiresAt);this.expireAfterAuditAction=null;}},appendLifecycle:async fact=>{this.state.lifecycle.push(structuredClone(fact));},appendDenial:async()=>{}},
      receipts:{get:async key=>{this.now=new Date(this.now.getTime()+this.advanceOnReceiptLookupMs);this.advanceOnReceiptLookupMs=0;return structuredClone(this.state.receipts.get(receiptKey(key))??null);},put:async r=>{this.state.receipts.set(receiptKey(r),structuredClone(r));}},
    };
  }
}
