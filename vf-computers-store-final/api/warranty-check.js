import {
  assertAllowedKeys,
  createServerSupabase,
  enforceRateLimit,
  publicApiError,
  sendJson,
  validateRequestSize,
} from "./_serverSecurity.js";
import { toPublicWarranty, validateWarrantyCode } from "./_publicChecks.js";

const ALLOWED_KEYS = new Set(["warranty_code"]);
const NOT_FOUND = { error: "Няма намерен запис с този код.", code: "RECORD_NOT_FOUND" };

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    enforceRateLimit(req, { scope: "warranty-check", limit: 12 });
    validateRequestSize(req, 2048);
    assertAllowedKeys(req.body || {}, ALLOWED_KEYS);
    const code = validateWarrantyCode(req.body?.warranty_code);
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("warranties")
      .select(`
        warranty_code, warranty_number, public_code,
        product_name, product_model, product_brand, product_manufacturer,
        warranty_start, warranty_start_date, sale_date,
        warranty_end, warranty_end_date, warranty_until,
        warranty_months, status,
        warranty_items(product_name, product_model, manufacturer, warranty_months, warranty_end)
      `)
      .or(`warranty_number.eq.${code},public_code.eq.${code},warranty_code.eq.${code}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return sendJson(res, 404, NOT_FOUND);
    return sendJson(res, 200, { warranty: toPublicWarranty(data) });
  } catch (error) {
    if (error?.status === 404 || error?.code === "RECORD_NOT_FOUND") {
      return sendJson(res, 404, NOT_FOUND);
    }
    const response = publicApiError(error, "Проверката временно не е достъпна.");
    return sendJson(res, response.status, response.body);
  }
}
