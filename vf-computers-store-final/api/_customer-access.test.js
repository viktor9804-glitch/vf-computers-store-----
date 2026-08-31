import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrdersHandler} from './orders.js';
const input={items:[{product_id:'vali-219',quantity:1}],customer_name:'Test User',phone:'0888123456',email:'test@example.com',city:'Test',delivery_address:'Test address',payment_method:'cod',idempotency_key:'test_order_12345678901234567890'};
let ip=0;
async function call({user,prior,token='token',extra={}}){
  let reads=0;
  const db={auth:{getUser:async()=>user?{data:{user}}:{error:{message:'expired'}}},from:()=>{reads++;const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:prior})};return q;}};
  const res={status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;},setHeader(){}};
  await createOrdersHandler(()=>db)({method:'POST',headers:{'x-forwarded-for':`test-${++ip}`,...(token?{authorization:`Bearer ${token}`}:{})},body:{...input,...extra}},res);
  return {...res,reads};
}
test('expired login cannot retrieve a cached order even with its key',async()=>{const r=await call({prior:{user_id:'b',items:['secret']}});assert.equal(r.statusCode,401);assert.equal(r.reads,0);});
test('another customer or guest cannot read a registered customer order through idempotency',async()=>{
  for(const user of [{id:'a'},null]){const r=await call({user,token:user?'token':'',prior:{user_id:'b',items:['secret']}});assert.equal(r.statusCode,409);assert.ok(!JSON.stringify(r.body).includes('secret'));}
});
test('own cached order is returned but internal metadata is not exposed',async()=>{const r=await call({user:{id:'a'},prior:{id:17,user_id:'a',items:[],internal_notes:'secret'}});assert.equal(r.statusCode,200);assert.equal(r.body.order.id,17);assert.equal('internal_notes' in r.body.order,false);});
test('guests cannot spend points or set an order owner',async()=>{
  assert.equal((await call({token:'',extra:{points_to_spend:5}})).statusCode,401);
  assert.equal((await call({user:{id:'a'},extra:{user_id:'b'}})).statusCode,400);
});
