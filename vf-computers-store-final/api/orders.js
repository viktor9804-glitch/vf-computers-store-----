import {
  ApiError,
  createServerSupabase,
  enforceRateLimit,
  publicApiError,
  sendJson,
  validateRequestSize,
} from "./_serverSecurity.js";
import { buildTrustedOrder, validateOrderBody } from "./_orderCore.js";

const ORDER_RESPONSE_FIELDS = [
  "id", "order_number", "customer_email", "items", "subtotal", "vat", "shipping", "total",
  "payment_method", "payment_label", "status", "payment_status", "created_at",
].join(",");

const bearerToken = (req) => {
  const authorization = String(req.headers?.authorization || "");
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
};

async function resolveUserId(supabase, req) {
  const token = bearerToken(req);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new ApiError(401, "INVALID_SESSION", "Невалидна потребителска сесия.");
  return data.user.id;
}

async function loadIdempotentOrder(supabase, idempotencyKey) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_RESPONSE_FIELDS)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    enforceRateLimit(req, { scope: "create-order", limit: 5 });
    validateRequestSize(req, 16 * 1024);
    const input = validateOrderBody(req.body || {});
    const supabase = createServerSupabase();
    const existing = await loadIdempotentOrder(supabase, input.idempotency_key);
    if (existing) return sendJson(res, 200, { order: existing, idempotent: true });

    if (input.payment_method === "tbi" &&
        (!process.env.TBI_RESELLER_CODE || !process.env.TBI_RESELLER_KEY || !process.env.TBI_ENCRYPTION_KEY)) {
      throw new ApiError(409, "TBI_UNAVAILABLE", "TBI финансирането временно не е налично.");
    }

    const userId = await resolveUserId(supabase, req);
    const trustedOrder = await buildTrustedOrder(supabase, input, userId);
    const { data, error } = await supabase
      .from("orders")
      .insert(trustedOrder)
      .select(ORDER_RESPONSE_FIELDS)
      .single();

    if (error?.code === "23505") {
      const duplicate = await loadIdempotentOrder(supabase, input.idempotency_key);
      if (duplicate) return sendJson(res, 200, { order: duplicate, idempotent: true });
    }
    if (error) throw error;
    return sendJson(res, 201, { order: data, idempotent: false });
  } catch (error) {
    const response = publicApiError(error, "Поръчката не може да бъде създадена в момента.");
    return sendJson(res, response.status, response.body);
  }
}
