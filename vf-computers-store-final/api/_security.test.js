import test from "node:test";
import assert from "node:assert/strict";
import { validateServiceCode, validateWarrantyCode } from "./_publicChecks.js";
import { assertProductOrderable, calculateOrderTotals, validateOrderBody } from "./_orderCore.js";

const validOrder = {
  items: [{ product_id: "vali-219", quantity: 2 }],
  customer_name: "Test Customer",
  phone: "0888123456",
  email: "test@example.com",
  city: "Elhovo",
  delivery_address: "Test address 1",
  payment_method: "cod",
  idempotency_key: "test_order_12345678901234567890",
};

test("public check codes use strict allowlists", () => {
  assert.equal(validateWarrantyCode("vf-war-2026-x7k9p2"), "VF-WAR-2026-X7K9P2");
  assert.equal(validateServiceCode("VF-SVC-2026-K7F9Q2M4"), "VF-SVC-2026-K7F9Q2M4");
  assert.throws(() => validateWarrantyCode("' or true --"));
  assert.throws(() => validateServiceCode("VF-SVC-%"));
});

test("order input rejects client supplied prices and statuses", () => {
  assert.throws(
    () => validateOrderBody({ ...validOrder, total: 0 }),
    (error) => error.code === "UNTRUSTED_FIELDS"
  );
  assert.throws(
    () => validateOrderBody({ ...validOrder, items: [{ product_id: "vali-219", quantity: 1, price: 0.01 }] }),
    (error) => error.code === "UNTRUSTED_FIELDS"
  );
});

test("server totals are derived from trusted net unit prices", () => {
  assert.deepEqual(
    calculateOrderTotals([{ unit_price: 100, quantity: 1 }], {
      free_delivery_threshold: 200,
      default_delivery_price: 8,
    }),
    { subtotal: 100, vat: 20, shipping: 8, total: 128 }
  );
});

test("unavailable and over-limit VALI products are rejected", () => {
  assert.throws(
    () => assertProductOrderable({ source: "vali", row: { show: true, status: 0 } }, 1),
    (error) => error.code === "PRODUCT_UNAVAILABLE"
  );
  assert.throws(
    () => assertProductOrderable({ source: "vali", row: { show: true, status: 2 } }, 4),
    (error) => error.code === "INSUFFICIENT_STOCK"
  );
});
