import { ApiError, assertAllowedKeys } from './_serverSecurity.js';
import { roundMoney, validateOrderBody } from './_orderCore.js';

export function mobileInput(body, quote = false) {
  const { points_to_spend = 0, expected_total_cents, ...order } = body || {};
  const points = Number(points_to_spend);
  if (!Number.isSafeInteger(points) || points < 0 || points > 2147483647) throw new ApiError(400,'INVALID_POINTS','Невалиден брой точки.');
  if (!quote && (!Number.isSafeInteger(expected_total_cents) || expected_total_cents < 0)) throw new ApiError(400,'INVALID_TOTAL','Невалидна крайна сума.');
  const validated = validateOrderBody({ ...order, ...(quote ? { idempotency_key: 'quote_validation_no_order_0001' } : {}) });
  if (!['cod', 'bank'].includes(validated.payment_method)) throw new ApiError(400,'PAYMENT_UNAVAILABLE','Избери наложен платеж или банков превод.');
  // Merge duplicate product references before checking stock; splitting lines cannot bypass limits.
  const merged = new Map();
  for (const item of validated.items) {
    if (!item.product_id) throw new ApiError(400,'PRODUCT_ID_REQUIRED','Липсва идентификатор на продукт.');
    const current = merged.get(item.product_id);
    if (current) current.quantity += item.quantity; else merged.set(item.product_id,{...item});
  }
  if ([...merged.values()].some(x=>x.quantity>20)) throw new ApiError(400,'INVALID_QUANTITY','До 20 броя от един продукт.');
  return { order: { ...validated, items: [...merged.values()] }, points, expectedTotal: expected_total_cents };
}
export function quoteOrder(order, settings, balance, points) {
  if (!settings?.active && !settings?.checkout_active) throw new ApiError(503,'LOYALTY_UNAVAILABLE','Мобилното поръчване още не е активирано.');
  if (!settings.active && points>0) throw new ApiError(409,'LOYALTY_UNAVAILABLE','Точките още не са активирани.');
  const gross = roundMoney(order.subtotal + order.vat);
  const discountCents = points * settings.point_value_cents;
  const maxDiscountCents = Math.floor(Math.round(gross*100)*settings.max_discount_percent/100);
  if (points > Math.max(0, balance)) throw new ApiError(409,'INSUFFICIENT_POINTS','Нямаш достатъчно налични точки.');
  if (discountCents > maxDiscountCents) throw new ApiError(409,'DISCOUNT_LIMIT',`Отстъпката може да е до ${settings.max_discount_percent}% от продуктите.`);
  const discount = discountCents/100;
  return { gross_products: gross, discount, shipping: order.shipping, total: roundMoney(gross+order.shipping-discount), points_to_earn: settings.active ? Math.floor(Math.round((gross-discount)*100)*settings.earn_points_per_euro/100) : 0, points_to_spend: points };
}
export function validateSettlement(body) {
  assertAllowedKeys(body,new Set(['order_id','action','refunded_gross']));
  if (!/^[1-9]\d{0,18}$/.test(String(body.order_id||'')) || !['delivered_paid','cancelled','refund'].includes(body.action)) throw new ApiError(400,'INVALID_SETTLEMENT','Невалидна операция.');
  if (body.action==='delivered_paid') return {status:'Доставена',payment_status:'paid'};
  if (body.action==='cancelled') return {status:'Отказана'};
  if (!Number.isFinite(body.refunded_gross)||body.refunded_gross<0) throw new ApiError(400,'INVALID_REFUND','Невалидна сума за възстановяване.');
  return {loyalty_refunded_gross:roundMoney(body.refunded_gross)};
}
