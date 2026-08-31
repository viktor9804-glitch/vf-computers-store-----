import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOrderEmailHtml,getOrderTotals} from './_mailer.js';

test('email item prices reconcile with the points discount, shipping and saved total',()=>{
  const order={id:123,items:[{name:'Test',quantity:1,price:100}],subtotal:90,vat:18,shipping:5,total:113,loyalty_discount:12};
  const totals=getOrderTotals(order);
  assert.equal(totals.subtotal+totals.vat+totals.loyaltyDiscount,120);
  assert.equal(totals.subtotal+totals.vat+totals.shipping,totals.total);
  const html=buildOrderEmailHtml({order,introTitle:'Test',introText:'Test'});
  assert.equal((html.match(/Отстъпка с точки/g)||[]).length,1);
  assert.ok(!buildOrderEmailHtml({order:{...order,loyalty_discount:0},introTitle:'Test',introText:'Test'}).includes('Отстъпка с точки'));
});
