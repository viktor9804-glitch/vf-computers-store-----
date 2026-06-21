import test from "node:test";
import assert from "node:assert/strict";
import {
  getVisitorId,
  hashVisitorId,
  isLikelyBot,
  normalizeStats,
  visitorCookieHeader,
} from "./_visitorCore.js";

const id = "550e8400-e29b-41d4-a716-446655440000";

test("visitor cookie accepts only a valid UUID v4", () => {
  assert.equal(getVisitorId(`other=x; vf_visitor_id=${id}`), id);
  assert.equal(getVisitorId("vf_visitor_id=invalid"), null);
});

test("visitor identifiers are hashed deterministically", () => {
  assert.equal(hashVisitorId(id, "secret"), hashVisitorId(id, "secret"));
  assert.notEqual(hashVisitorId(id, "secret"), hashVisitorId(id, "another-secret"));
});

test("known crawlers do not count as visitors", () => {
  assert.equal(isLikelyBot("Mozilla/5.0 Chrome/140 Safari/537.36"), false);
  assert.equal(isLikelyBot("Googlebot/2.1"), true);
  assert.equal(isLikelyBot(""), true);
});

test("visitor stats are normalized to non-negative numbers", () => {
  assert.deepEqual(normalizeStats({ today: "12", month: 42 }), { today: 12, month: 42 });
  assert.deepEqual(normalizeStats({ today: -1, month: null }), { today: 0, month: 0 });
});

test("visitor cookie is private and long lived", () => {
  const header = visitorCookieHeader(id, true);
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Secure/);
  assert.match(header, /Max-Age=31536000/);
});
