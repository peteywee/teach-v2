import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectHostedRuntime} from '../../src/bootstrap/demo-hosted/runtime-policy.js';
test('Node24 patch equality is evidence only and changes require re-verification',()=>{
 assert.equal(inspectHostedRuntime('24.19.0','24.19.0').verified,true);
 for(const [build,observed] of [['24.19.0','24.19.1'],['24.19.0','22.19.0'],['22.19.0','22.19.0'],['24.19.0','24.19.0-rc.1'],['24.19.0','24.20.0']])assert.equal(inspectHostedRuntime(build,observed).requiresReverification,true);
 for(const missing of [null,undefined,{},'24.x'])assert.equal(inspectHostedRuntime(missing,'24.19.0').verified,false);
});
