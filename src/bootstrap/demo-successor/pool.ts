import pg from 'pg';

/** Inert server-only configuration builder. No URL options can override TLS or timeouts.
 * No production factory or environment-variable activation is exported. */
export function successorPoolOptions(input:{host:string;user:string;password:string;ca:string}):pg.PoolConfig{
 if(!/^[a-z0-9][a-z0-9-]*\.pooler\.supabase\.com$(?![\s\S])/.test(input.host)||
 !/^teach_v2_demo_runtime\.[a-z0-9]{20}$(?![\s\S])/.test(input.user)||!input.password||
 !input.ca.includes('-----BEGIN CERTIFICATE-----'))throw Error('Invalid successor pool configuration');
 return {host:input.host,port:6543,database:'postgres',user:input.user,password:input.password,
 ssl:{ca:input.ca,rejectUnauthorized:true,minVersion:'TLSv1.2'},max:2,min:0,
 connectionTimeoutMillis:3000,idleTimeoutMillis:10000,query_timeout:10000,
 allowExitOnIdle:false};
}
/** Closure-owned retained pool for a future composition. Creation remains lazy, and this
 * seam has no authority to connect: only a caller-supplied factory can do that.
 * End once, reject reuse. Never attach a request-controlled factory in a provider handler. */
export function retainSuccessorPool<T extends {end():Promise<void>}>(factory:()=>T){
 let pool:T|undefined,closed=false;
 return Object.freeze({get(){if(closed)throw Error('Pool closed');return pool??=factory();},
 async close(){if(closed)return;closed=true;if(pool)await pool.end();}});
}
