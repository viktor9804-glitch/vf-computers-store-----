import {
  createServerSupabase,
  enforceRateLimit,
  publicApiError,
  sendJson,
} from "./_serverSecurity.js";
import {
  createVisitorId,
  getVisitorId,
  hashVisitorId,
  isLikelyBot,
  normalizeStats,
  visitorCookieHeader,
} from "./_visitorCore.js";

async function loadStats(supabase) {
  const { data, error } = await supabase.rpc("get_site_visit_stats");
  if (error) throw error;
  return normalizeStats(data);
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    enforceRateLimit(req, { scope: "site-visitors", limit: 300, windowMs: 10 * 60 * 1000 });
    const supabase = createServerSupabase();

    if (req.method === "GET" || isLikelyBot(req.headers?.["user-agent"])) {
      return sendJson(res, 200, await loadStats(supabase));
    }

    let visitorId = getVisitorId(req.headers?.cookie);
    if (!visitorId) {
      visitorId = createVisitorId();
      const forwardedProto = String(req.headers?.["x-forwarded-proto"] || "https");
      res.setHeader("Set-Cookie", visitorCookieHeader(visitorId, forwardedProto !== "http"));
    }

    const secret = process.env.VISITOR_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const visitorHash = hashVisitorId(visitorId, secret);
    const { data, error } = await supabase.rpc("record_site_visit", {
      p_visitor_hash: visitorHash,
    });
    if (error) throw error;

    return sendJson(res, 200, normalizeStats(data));
  } catch (error) {
    const response = publicApiError(error, "Visitor statistics are temporarily unavailable.");
    return sendJson(res, response.status, response.body);
  }
}
