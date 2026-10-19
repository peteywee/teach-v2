import {validateHostedOrigin} from '../demo-hosted/configuration.js';
import {successorPoolOptions} from './pool.js';
/** Server-only configuration, not an approval mechanism. No request input is accepted. */
export function captureRuntimeConfiguration(env:Readonly<Record<string,string|undefined>>) {
 if(env.TEACH_DB_SCHEMA!=='teach_v2_demo'||env.TEACH_SUPABASE_PROJECT!=='acqafjkdkdmtpnsxiesw')throw Error('Invalid isolated target');
 const origin=validateHostedOrigin(env.TEACH_DEMO_ORIGIN??'');
 const options=successorPoolOptions({host:env.TEACH_DB_HOST??'',user:env.TEACH_DB_USER??'',password:env.TEACH_DB_PASSWORD??'',ca:env.TEACH_DB_CA??''});
 if(options.user!=='teach_v2_demo_runtime.acqafjkdkdmtpnsxiesw')throw Error('Invalid runtime role target');
 return Object.freeze({origin,options:Object.freeze(options)});
}
