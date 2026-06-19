import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const rateLimitBuckets = new Map();

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const text = (value, maxLength = 500) =>
  String(value ?? "").trim().slice(0, maxLength);

export function createServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new ApiError(500, "SERVER_NOT_CONFIGURED", "Server configuration is unavailable.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function validateRequestSize(req, maxBytes = 16 * 1024) {
  const declared = Number(req.headers?.["content-length"] || 0);
  const measured = Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");

  if (declared > maxBytes || measured > maxBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request payload is too large.");
  }
}

export function assertAllowedKeys(value, allowedKeys, label = "request") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_REQUEST", `Invalid ${label}.`);
  }

  const unexpected = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unexpected.length > 0) {
    throw new ApiError(400, "UNTRUSTED_FIELDS", `Unexpected fields in ${label}.`);
  }
}

export function enforceRateLimit(
  req,
  { scope, limit = 10, windowMs = 10 * 60 * 1000 } = {}
) {
  const forwarded = text(
    req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "unknown",
    200
  );
  const clientId = forwarded.split(",")[0].trim() || "unknown";
  const key = `${scope || "api"}:${createHash("sha256").update(clientId).digest("hex")}`;
  const now = Date.now();

  if (rateLimitBuckets.size > 5000) {
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
  }

  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }
}

export function sendJson(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
}

export function publicApiError(error, fallbackMessage = "Request failed.") {
  const status = Number(error?.status) || 500;
  return {
    status,
    body: {
      error: status >= 500 ? fallbackMessage : error.message || fallbackMessage,
      code: error?.code || "REQUEST_FAILED",
    },
  };
}
