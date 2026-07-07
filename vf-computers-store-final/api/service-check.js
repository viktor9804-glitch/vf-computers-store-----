import {
  assertAllowedKeys,
  createServerSupabase,
  enforceRateLimit,
  publicApiError,
  sendJson,
  validateRequestSize,
} from "./_serverSecurity.js";
import { toPublicService, validateServiceCode } from "./_publicChecks.js";

const ALLOWED_KEYS = new Set(["public_code"]);
const NOT_FOUND = { error: "Няма намерен запис с този код.", code: "RECORD_NOT_FOUND" };

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    enforceRateLimit(req, { scope: "service-check", limit: 12 });
    validateRequestSize(req, 2048);
    assertAllowedKeys(req.body || {}, ALLOWED_KEYS);
    const code = validateServiceCode(req.body?.public_code);
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("service_protocols")
      .select("public_code,device_type,brand,model,status,public_work_summary,public_services,public_total_price,currency,updated_at,completed_at")
      .eq("public_code", code)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return sendJson(res, 404, NOT_FOUND);
    return sendJson(res, 200, { service: toPublicService(data) });
  } catch (error) {
    if (error?.status === 404 || error?.code === "RECORD_NOT_FOUND") {
      return sendJson(res, 404, NOT_FOUND);
    }
    const response = publicApiError(error, "Проверката временно не е достъпна.");
    return sendJson(res, response.status, response.body);
  }
}
