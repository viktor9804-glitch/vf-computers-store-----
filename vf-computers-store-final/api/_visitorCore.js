import { createHmac, randomUUID } from "node:crypto";

export const VISITOR_COOKIE = "vf_visitor_id";
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_PATTERN = /bot|crawler|spider|slurp|facebookexternalhit|facebot|bingpreview|headless|lighthouse|pagespeed|uptimerobot|pingdom|monitoring/i;

export function parseCookies(header = "") {
  return String(header)
    .split(";")
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator < 1) return cookies;
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
      return cookies;
    }, {});
}

export function getVisitorId(cookieHeader = "") {
  const candidate = parseCookies(cookieHeader)[VISITOR_COOKIE];
  return VISITOR_ID_PATTERN.test(candidate || "") ? candidate.toLowerCase() : null;
}

export function createVisitorId() {
  return randomUUID();
}

export function hashVisitorId(visitorId, secret) {
  if (!secret) throw new Error("Visitor hash secret is unavailable.");
  return createHmac("sha256", secret).update(visitorId).digest("hex");
}

export function isLikelyBot(userAgent = "") {
  const value = String(userAgent).trim();
  return !value || BOT_PATTERN.test(value);
}

export function visitorCookieHeader(visitorId, secure = true) {
  return [
    `${VISITOR_COOKIE}=${encodeURIComponent(visitorId)}`,
    "Path=/",
    "Max-Age=31536000",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function normalizeStats(data) {
  const value = Array.isArray(data) ? data[0] : data;
  return {
    today: Math.max(0, Number(value?.today) || 0),
    month: Math.max(0, Number(value?.month) || 0),
  };
}
