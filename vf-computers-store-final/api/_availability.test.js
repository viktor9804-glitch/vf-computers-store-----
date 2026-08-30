import test from "node:test";
import assert from "node:assert/strict";
import { assertProductOrderable, buildTrustedOrder } from "./_orderCore.js";
import { buildFinancingRequest } from "./_tbi.js";
import { isCartItemOrderable, isProductOrderable } from "../src/utils/availability.js";

function catalog(status, orderItems = [{ id: "vali-42", quantity: 1 }]) {
  return {
    from(table) {
      const data = table === "vali_products"
        ? { id: 42, status, show: true, name: [{ language_code: "bg", text: "Test product" }], price_partner: 100 }
        : table === "orders" ? { id: "order-test", items: orderItems, payment_status: "pending" }
        : table === "store_settings" ? { value: {} } : [];
      const query = {
        select() { return this; }, eq() { return this; },
        maybeSingle() { return Promise.resolve({ data, error: null }); },
        then(resolve, reject) { return Promise.resolve({ data, error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
}

for (const [status, type] of [[0, "out_of_stock"], [3, "on_the_way"]]) {
  test(`${type}: frontend rejects even a stale canOrder=true flag`, () => {
    assert.equal(isProductOrderable({ availabilityType: type, canOrder: true }), false);
  });
  test(`${type}: server rejects ordinary orders and flattened PC components`, async () => {
    await assert.rejects(buildTrustedOrder(catalog(status), {
      items: [{ product_id: "vali-42", quantity: 1 }], payment_method: "cod",
    }), { status: 409, code: "PRODUCT_UNAVAILABLE" });
  });
  test(`${type}: TBI rejects direct product, saved order and PC configuration`, async () => {
    for (const input of [{ product_id: "vali-42" }, { order_id: "order-test", order_token: "valid_test_order_token_123" }]) {
      await assert.rejects(buildFinancingRequest(catalog(status), input, {}), { status: 409, code: "PRODUCT_UNAVAILABLE" });
    }
    await assert.rejects(buildFinancingRequest(catalog(status, [{ id: "config-test", quantity: 1, parts: { cpu: { id: "vali-42" } } }]),
      { order_id: "order-test", order_token: "valid_test_order_token_123" }, {}),
    { status: 409, code: "PRODUCT_UNAVAILABLE" });
  });
}

test("available, limited and on-request products keep their existing policy", async () => {
  for (const status of [1, 2, 4]) {
    const order = await buildTrustedOrder(catalog(status), { items: [{ product_id: "vali-42", quantity: 1 }], payment_method: "cod" });
    assert.equal(order.items.length, 1);
  }
  for (const type of ["in_stock", "limited", "order"]) assert.equal(isProductOrderable({ availabilityType: type, canOrder: true }), true);
  assert.throws(() => assertProductOrderable({ source: "vali", row: { show: true, status: 2 } }, 4), { code: "INSUFFICIENT_STOCK" });
});

test("old cart and PC configurations respect refreshed product availability", () => {
  assert.equal(isCartItemOrderable({ id: "vali-42", canOrder: false }), false);
  const configuration = { source: "config", parts: { cpu: { id: "vali-42", canOrder: true }, storage: [{ id: "local-7", canOrder: true }] } };
  assert.equal(isCartItemOrderable(configuration, [{ id: "vali-42", availabilityType: "on_the_way" }]), false);
  assert.equal(isCartItemOrderable(configuration, [{ id: "vali-42", canOrder: true }]), true);
});
