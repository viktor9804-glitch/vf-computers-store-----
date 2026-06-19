import {
  assertTbiConfig,
  createServerSupabase,
  decryptTbiPayload,
  enforceRateLimit,
  normalizeCallbackStatus,
  publicError,
  resolveCallbackStatus,
  safeEqual,
  sanitizeForStorage,
  sendJson,
  TbiError,
  validateRequestSize,
} from "./_tbi.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    enforceRateLimit(req, { scope: "tbi-callback", limit: 60 });
    validateRequestSize(req, 64 * 1024);
    const config = assertTbiConfig();
    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (!safeEqual(body.reseller_code, config.resellerCode) || !safeEqual(body.reseller_key, config.resellerKey)) {
      throw new TbiError(401, "TBI_CALLBACK_UNAUTHORIZED", "Unauthorized callback.");
    }
    if (!body.data) {
      throw new TbiError(400, "TBI_CALLBACK_DATA_MISSING", "Missing callback data.");
    }

    const decrypted = decryptTbiPayload(body.data, config.encryptionKey);
    const reference = String(
      decrypted.orderid || decrypted.order_id || decrypted.reference || decrypted.tbi_reference || ""
    ).trim();
    if (!reference) {
      throw new TbiError(400, "TBI_CALLBACK_REFERENCE_MISSING", "Missing callback reference.");
    }

    const supabase = createServerSupabase();
    const applicationResult = await supabase.from("tbi_applications")
      .select("id,order_id,tbi_reference,status,amount,response_data")
      .eq("tbi_reference", reference)
      .maybeSingle();
    if (applicationResult.error || !applicationResult.data) {
      throw new TbiError(404, "TBI_APPLICATION_NOT_FOUND", "Unknown callback reference.");
    }

    const application = applicationResult.data;
    const callbackAmount = Number(decrypted.amount ?? decrypted.total ?? decrypted.credit_amount);
    if (Number.isFinite(callbackAmount) && Math.abs(callbackAmount - Number(application.amount)) > 0.01) {
      throw new TbiError(409, "TBI_CALLBACK_AMOUNT_MISMATCH", "Callback amount mismatch.");
    }

    const incomingStatus = normalizeCallbackStatus(
      decrypted.status || decrypted.application_status || decrypted.result || decrypted.decision
    );
    const status = resolveCallbackStatus(application.status, incomingStatus);
    const callbackHistory = Array.isArray(application.response_data?.callbacks)
      ? application.response_data.callbacks.slice(-19)
      : [];
    callbackHistory.push({
      received_at: new Date().toISOString(),
      incoming_status: incomingStatus,
      applied_status: status,
      raw: {
        ...sanitizeForStorage(body),
        encrypted_data: String(body.data).slice(0, 64 * 1024),
      },
      decrypted: sanitizeForStorage(decrypted),
    });
    const responseData = {
      ...(application.response_data || {}),
      callbacks: callbackHistory,
    };

    const updateResult = await supabase.from("tbi_applications").update({
      status,
      response_data: responseData,
      updated_at: new Date().toISOString(),
    }).eq("id", application.id);
    if (updateResult.error) {
      throw new TbiError(500, "TBI_CALLBACK_STORAGE_FAILED", "Callback storage failed.");
    }

    if (application.order_id) {
      const orderUpdateResult = await supabase.from("orders").update({
        payment_status: status,
        updated_at: new Date().toISOString(),
      }).eq("id", application.order_id);
      if (orderUpdateResult.error) {
        throw new TbiError(500, "TBI_ORDER_UPDATE_FAILED", "Callback order update failed.");
      }
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    const response = publicError(error);
    console.error("[TBI] Callback rejected.", { code: error?.code || "TBI_CALLBACK_ERROR", status: response.status });
    return sendJson(res, response.status, response.body);
  }
}
