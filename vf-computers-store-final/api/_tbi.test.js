import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptTbiPayload,
  encryptTbiPayload,
  normalizeCallbackStatus,
  resolveCallbackStatus,
  safeEqual,
} from "./_tbi.js";

test("AES-256-CTR payload matches the supplied PHP Cryptor format", () => {
  const payload = { orderid: "VF-1", currency: "EUR" };
  const iv = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
  const encrypted = encryptTbiPayload(payload, "test-encryption-key", iv);

  assert.equal(
    encrypted,
    "AAECAwQFBgcICQoLDA0OD+SRERWmhrc14aqjOctvwLr8AWJ0s/h9yjGG9zPW/kUHGRkr"
  );
  assert.deepEqual(decryptTbiPayload(encrypted, "test-encryption-key"), payload);
});

test("callback status normalization only returns supported states", () => {
  assert.equal(normalizeCallbackStatus("ACCEPTED"), "approved");
  assert.equal(normalizeCallbackStatus("declined"), "rejected");
  assert.equal(normalizeCallbackStatus("canceled"), "cancelled");
  assert.equal(normalizeCallbackStatus("processing"), "pending");
  assert.equal(normalizeCallbackStatus("unexpected-status"), "error");
});

test("merchant credential comparison is exact", () => {
  assert.equal(safeEqual("merchant", "merchant"), true);
  assert.equal(safeEqual("merchant", "MERCHANT"), false);
  assert.equal(safeEqual("merchant", "merchant-extra"), false);
});

test("terminal callback statuses cannot be downgraded by late callbacks", () => {
  assert.equal(resolveCallbackStatus("approved", "pending"), "approved");
  assert.equal(resolveCallbackStatus("rejected", "approved"), "rejected");
  assert.equal(resolveCallbackStatus("pending", "approved"), "approved");
  assert.equal(resolveCallbackStatus("error", "pending"), "pending");
});
