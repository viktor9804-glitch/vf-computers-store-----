import {
  assertTbiConfig,
  buildFinancingRequest,
  createServerSupabase,
  enforceRateLimit,
  getTbiConfig,
  publicError,
  registerApplication,
  sendJson,
  TbiError,
  validateRequestSize,
} from "./_tbi.js";

const ALLOWED_BODY_KEYS = new Set(["product_id", "order_id", "order_token", "quantity", "customer"]);

export default async function handler(req, res) {
  if (req.method === "GET") {
    const config = getTbiConfig();
    return sendJson(res, 200, { enabled: config.enabled, mode: config.mode });
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    enforceRateLimit(req, { scope: "tbi-register", limit: 10 });
    validateRequestSize(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const unexpected = Object.keys(body).filter((key) => !ALLOWED_BODY_KEYS.has(key));
    if (unexpected.length) {
      return sendJson(res, 400, {
        error: "Заявката съдържа непозволени полета. Цената се определя само от сървъра.",
        code: "UNTRUSTED_FIELDS",
      });
    }

    const config = assertTbiConfig();
    const supabase = createServerSupabase();
    const financing = await buildFinancingRequest(supabase, body, config);

    if (financing.orderId) {
      const existingResult = await supabase.from("tbi_applications")
        .select("tbi_reference,status,amount,redirect_url")
        .eq("order_id", financing.orderId)
        .in("status", ["pending", "approved"])
        .maybeSingle();
      if (existingResult.error) {
        throw new TbiError(500, "TBI_STORAGE_FAILED", "TBI заявката не може да бъде проверена в момента.");
      }
      if (existingResult.data?.status === "approved") {
        throw new TbiError(409, "ORDER_ALREADY_APPROVED", "Поръчката вече има одобрено финансиране.");
      }
      if (existingResult.data?.redirect_url) {
        return sendJson(res, 200, {
          success: true,
          url: existingResult.data.redirect_url,
          reference: existingResult.data.tbi_reference,
          amount: Number(existingResult.data.amount),
          reused: true,
        });
      }
      if (existingResult.data) {
        throw new TbiError(409, "TBI_APPLICATION_IN_PROGRESS", "TBI заявката вече се обработва. Моля, опитайте отново след малко.");
      }
    }

    const insertResult = await supabase.from("tbi_applications").insert({
      order_id: financing.orderId,
      product_id: financing.productId,
      tbi_reference: financing.reference,
      status: "pending",
      amount: financing.amount,
      response_data: { stage: "created", mode: config.mode },
    }).select("id").single();
    if (insertResult.error) {
      throw Object.assign(new Error("TBI application persistence failed"), { code: "TBI_STORAGE_FAILED" });
    }

    try {
      const registration = await registerApplication(config, financing.payload);
      await supabase.from("tbi_applications").update({
        redirect_url: registration.url,
        response_data: { stage: "registered", mode: config.mode, register_response: registration.response },
        updated_at: new Date().toISOString(),
      }).eq("id", insertResult.data.id);
      return sendJson(res, 200, {
        success: true,
        url: registration.url,
        reference: financing.reference,
        amount: financing.amount,
      });
    } catch (error) {
      await supabase.from("tbi_applications").update({
        status: "error",
        response_data: { stage: "registration_error", code: error?.code || "TBI_REGISTRATION_FAILED" },
        updated_at: new Date().toISOString(),
      }).eq("id", insertResult.data.id);
      throw error;
    }
  } catch (error) {
    const response = publicError(error);
    console.error("[TBI] Registration failed.", { code: error?.code || "TBI_INTERNAL_ERROR", status: response.status });
    return sendJson(res, response.status, response.body);
  }
}
