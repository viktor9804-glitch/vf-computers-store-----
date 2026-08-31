import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './orders.js';
const response=()=>({setHeader(){},status(n){this.code=n;return this;},json(body){this.body=body;return this;},end(){return this;}});
test('mobile rewrite dispatch preserves authentication and leaves ordinary order routing intact',async()=>{
  const r=response();await handler({method:'POST',headers:{},query:{vf_mobile:'1',action:'orders'}},r);
  assert.equal(r.code,405);assert.equal(r.body.code,'METHOD_NOT_ALLOWED');
  const ordinary=response();await handler({method:'GET',headers:{},query:{}},ordinary);assert.equal(ordinary.code,405);
  const preflight=response();await handler({method:'OPTIONS',headers:{origin:'https://localhost'},query:{vf_mobile:'1',action:'order'}},preflight);assert.equal(preflight.code,204);
});
