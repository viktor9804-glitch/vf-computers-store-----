import test from "node:test";
import assert from "node:assert/strict";
import { toPublicWarranty, validateServiceCode, validateWarrantyCode } from "./_publicChecks.js";

test("accepts the printed VF Warranty code, including pasted spaces and lowercase", () => {
  assert.equal(validateWarrantyCode("VF-GW-JL3N-WBXG-NPBZ"), "VF-GW-JL3N-WBXG-NPBZ");
  assert.equal(validateWarrantyCode("  vf-gw-jl3n- wbxg-npbz\n"), "VF-GW-JL3N-WBXG-NPBZ");
});

test("keeps legacy warranty codes working", () => {
  for (const code of ["VF-WAR-2026-X7K9P2", "VF-WARRANTY-2026-X7K9P2"]) {
    assert.equal(validateWarrantyCode(code), code);
  }
});

test("rejects sequential card numbers, incomplete codes and filter injection", () => {
  for (const code of ["", null, "GW-000000018", "VF-GW-JL3N-WBXG", "VF-GW-JL3N-WBXG-NPBZ-AAAA", "VF-GW-JL3N-WBXG-NPBZ,public_code.not.is.null", "VF-SVC-2026-ABCD"]) {
    assert.throws(() => validateWarrantyCode(code), { status: 404, code: "RECORD_NOT_FOUND" });
  }
});

test("service lookup remains separate", () => {
  assert.equal(validateServiceCode("VF-SVC-2026-ABCD"), "VF-SVC-2026-ABCD");
  assert.throws(() => validateServiceCode("VF-GW-JL3N-WBXG-NPBZ"));
});

test("public response uses the printed code and excludes customer data", () => {
  const result = toPublicWarranty({
    public_code: "VF-GW-JL3N-WBXG-NPBZ", warranty_code: "VF-WAR-2026-X7K9P2",
    warranty_number: "GW-000000018", sale_date: "2026-08-31", warranty_end: "2027-02-27",
    customer_name: "Private customer", phone: "Private phone", notes: "Private notes",
    warranty_items: [{ product_name: "Video card", warranty_months: 6, warranty_end: "2027-02-27", serial_number: "Private serial", sale_price: 50 }],
  });
  assert.equal(result.warranty_code, "VF-GW-JL3N-WBXG-NPBZ");
  assert.equal(result.warranty_start, "2026-08-31");
  assert.equal(result.warranty_items[0].warranty_end, "2027-02-27");
  assert.equal(JSON.stringify(result).includes("Private"), false);
  assert.equal("sale_price" in result.warranty_items[0], false);
});

test("supports older start and end date columns without exposing the sequential number", () => {
  const result = toPublicWarranty({ starts_at: "2026-08-31", ends_at: "2027-02-27", warranty_number: "GW-000000018" });
  assert.equal(result.warranty_start, "2026-08-31");
  assert.equal(result.warranty_end, "2027-02-27");
  assert.equal(result.warranty_code, null);
});
