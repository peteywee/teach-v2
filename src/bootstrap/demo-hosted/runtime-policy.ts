/** H02 owner-selected runtime. Does not modify historical H01 identity or grant activation. */
export const HOSTED_NODE_MAJOR = 24;
export function inspectHostedRuntime(buildNodeVersion:unknown,observedNodeVersion=process.versions.node){
 const valid=(value:unknown):value is string=>typeof value==='string'&&/^24\.\d+\.\d+$/.test(value);
 return Object.freeze({policy:'24.x',buildNodeVersion:valid(buildNodeVersion)?buildNodeVersion:null,observedNodeVersion,
  verified:valid(buildNodeVersion)&&valid(observedNodeVersion)&&buildNodeVersion===observedNodeVersion,
  requiresReverification:!valid(buildNodeVersion)||!valid(observedNodeVersion)||buildNodeVersion!==observedNodeVersion});
}
