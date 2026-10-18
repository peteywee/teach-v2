import {DemoError} from '../../modules/authorization/application/demo-error.js';
import {validateHostedBindingProposal,type HostedBindingProposal} from './configuration.js';

export const HOSTED_POOL_POLICY=Object.freeze({max:2,min:0,connectionTimeoutMillis:3000,idleTimeoutMillis:10000,queryTimeoutMillis:10000,statementTimeoutMillis:5000,lockTimeoutMillis:2000,idleInTransactionTimeoutMillis:5000,transactionTimeoutMillis:10000,tls:Object.freeze({rejectUnauthorized:true,minVersion:'TLSv1.2'}),poolMode:'transaction',namedPreparedStatements:false,startupMigration:false} as const);
export type HostedPoolPolicy=typeof HOSTED_POOL_POLICY;
/** Proposed policy, not an executed pg.Pool configuration. Provider support and
 * per-transaction timeout enforcement must be verified before any real factory. */
export function prepareHostedPoolPolicy(binding:unknown,policy:unknown=HOSTED_POOL_POLICY):{target:HostedBindingProposal['supabase'];policy:HostedPoolPolicy}{
 const captured=validateHostedBindingProposal(binding);
 if(!samePolicy(policy,HOSTED_POOL_POLICY))throw new DemoError('SERVICE_UNAVAILABLE');
 return {target:structuredClone(captured.supabase),policy:HOSTED_POOL_POLICY};
}
export type HostedPoolFactory<T>=(proposal:ReturnType<typeof prepareHostedPoolPolicy>)=>Promise<T>;

function samePolicy(value:unknown,expected:unknown):boolean {
 if(expected===null||typeof expected!=='object')return value===expected;
 if(value===null||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const v=Object.getOwnPropertyDescriptors(value), e=Object.entries(expected);
 return Reflect.ownKeys(value).length===e.length&&e.every(([key,item])=>Object.hasOwn(v,key)&&Object.hasOwn(v[key]!,'value')&&samePolicy(v[key]!.value,item));
}
