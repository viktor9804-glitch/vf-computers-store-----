import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_TEST_BASE_URL = "https://beta.tbibank.support";
const REGISTER_APPLICATION_PATH = "/api/RegisterApplication";
const VAT_RATE = 0.2;
const DEFAULT_DELIVERY_SETTINGS = {
  free_delivery_threshold: 200,
  default_delivery_price: 8,
};
const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected", "cancelled", "error"]);
const rateLimitBuckets = new Map();

export class TbiError extends Error {
  constructor(status, code, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const normalizeKey = (value) => text(value).toLocaleLowerCase("bg-BG");

const requiredEnv = (name) => text(process.env[name], 4000);

export function getTbiConfig() {
  const mode = text(process.env.TBI_MODE || "test", 20).toLowerCase();
  const normalizedMode = mode === "production" ? "production" : "test";
  const configuredBaseUrl = normalizedMode === "production"
    ? requiredEnv("TBI_API_URL")
    : requiredEnv("TBI_TEST_API_URL") || DEFAULT_TEST_BASE_URL;

  const config = {
    mode: normalizedMode,
    resellerCode: requiredEnv("TBI_RESELLER_CODE"),
    resellerKey: requiredEnv("TBI_RESELLER_KEY"),
    encryptionKey: requiredEnv("TBI_ENCRYPTION_KEY"),
    successUrl: requiredEnv("TBI_SUCCESS_URL"),
    failUrl: requiredEnv("TBI_FAIL_URL"),
    callbackUrl: requiredEnv("TBI_CALLBACK_URL"),
    baseUrl: configuredBaseUrl,
  };

  config.enabled = Boolean(
    config.resellerCode &&
    config.resellerKey &&
    config.encryptionKey &&
    config.successUrl &&
    config.failUrl &&
    config.callbackUrl &&
    config.baseUrl
  );

  return config;
}

export function assertTbiConfig() {
  const config = getTbiConfig();
  if (!config.enabled) {
    throw new TbiError(503, "TBI_NOT_CONFIGURED", "TBI финансирането временно не е налично.");
  }

  for (const [name, value] of [
    ["TBI_SUCCESS_URL", config.successUrl],
    ["TBI_FAIL_URL", config.failUrl],
    ["TBI_CALLBACK_URL", config.callbackUrl],
    [config.mode === "production" ? "TBI_API_URL" : "TBI_TEST_API_URL", config.baseUrl],
  ]) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new TbiError(500, "TBI_INVALID_URL", `Невалидна TBI конфигурация: ${name}.`);
    }
    if (parsed.protocol !== "https:") {
      throw new TbiError(500, "TBI_INSECURE_URL", `TBI конфигурацията ${name} трябва да използва HTTPS.`);
    }
  }

  return config;
}

export function createServerSupabase() {
  const supabaseUrl = requiredEnv("SUPABASE_URL") || requiredEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new TbiError(500, "SUPABASE_NOT_CONFIGURED", "Сървърът за финансиране не е конфигуриран.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function encryptTbiPayload(value, encryptionKey, iv = randomBytes(16)) {
  if (!Buffer.isBuffer(iv) || iv.length !== 16) {
    throw new TypeError("TBI AES-256-CTR IV must be exactly 16 bytes.");
  }
  const keyHash = createHash("sha256").update(String(encryptionKey), "utf8").digest();
  const cipher = createCipheriv("aes-256-ctr", keyHash, iv);
  const plaintext = typeof value === "string" ? value : JSON.stringify(value);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64");
}

export function decryptTbiPayload(value, encryptionKey) {
  let raw;
  try {
    raw = Buffer.from(String(value || ""), "base64");
  } catch {
    throw new TbiError(400, "TBI_INVALID_DATA", "Невалидни callback данни.");
  }
  if (raw.length <= 16) {
    throw new TbiError(400, "TBI_INVALID_DATA", "Невалидни callback данни.");
  }
  const keyHash = createHash("sha256").update(String(encryptionKey), "utf8").digest();
  const decipher = createDecipheriv("aes-256-ctr", keyHash, raw.subarray(0, 16));
  const decrypted = Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString("utf8");
  try {
    return JSON.parse(decrypted);
  } catch {
    throw new TbiError(400, "TBI_INVALID_JSON", "Невалидни callback данни.");
  }
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function enforceRateLimit(req, { limit = 10, windowMs = 10 * 60 * 1000, scope = "tbi" } = {}) {
  const forwarded = text(req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "unknown", 200);
  const clientId = forwarded.split(",")[0].trim() || "unknown";
  const key = `${scope}:${createHash("sha256").update(clientId).digest("hex")}`;
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
    throw new TbiError(429, "RATE_LIMITED", "Твърде много опити. Моля, опитайте отново след няколко минути.");
  }
}

export function validateRequestSize(req, maxBytes = 32 * 1024) {
  const declared = Number(req.headers?.["content-length"] || 0);
  const measured = Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");
  if (declared > maxBytes || measured > maxBytes) {
    throw new TbiError(413, "PAYLOAD_TOO_LARGE", "Заявката е прекалено голяма.");
  }
}

function getBgText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.find((item) => item?.language_code === "bg")?.text || value[0]?.text || "";
  }
  if (typeof value === "object") return value.bg || value.text || "";
  return String(value);
}

function isPromotionActive(promotion, now = new Date()) {
  if (!promotion?.is_active) return false;
  if (promotion.starts_at && new Date(promotion.starts_at) > now) return false;
  if (promotion.ends_at && new Date(promotion.ends_at) < now) return false;
  return true;
}

function findBestPromotion(product, promotions) {
  const ids = [product.publicId, product.databaseId].filter(Boolean).map(String);
  let best = null;
  let bestScore = -1;
  for (const promotion of promotions || []) {
    if (!isPromotionActive(promotion)) continue;
    let score = -1;
    if (promotion.product_id && ids.includes(String(promotion.product_id))) score = 3;
    else if (
      promotion.main_category && promotion.sub_category &&
      normalizeKey(promotion.main_category) === normalizeKey(product.mainCategory) &&
      normalizeKey(promotion.sub_category) === normalizeKey(product.category)
    ) score = 2;
    else if (promotion.main_category && normalizeKey(promotion.main_category) === normalizeKey(product.mainCategory)) score = 1;
    if (score < 0) continue;
    if (score > bestScore || (score === bestScore && Number(promotion.discount_percent || 0) > Number(best?.discount_percent || 0))) {
      best = promotion;
      bestScore = score;
    }
  }
  return best;
}

async function loadPricingContext(supabase) {
  const [markupsResult, promotionsResult, deliveryResult] = await Promise.all([
    supabase.from("category_markups").select("main_category,sub_category,markup_percent"),
    supabase.from("promotions").select("*").eq("is_active", true),
    supabase.from("store_settings").select("value").eq("key", "delivery_settings").maybeSingle(),
  ]);
  if (markupsResult.error) throw new TbiError(503, "TBI_MARKUPS_UNAVAILABLE", "Цената не може да бъде потвърдена в момента.");
  if (promotionsResult.error) throw new TbiError(503, "TBI_PROMOTIONS_UNAVAILABLE", "Цената не може да бъде потвърдена в момента.");

  return {
    markups: markupsResult.data || [],
    promotions: promotionsResult.data || [],
    delivery: {
      ...DEFAULT_DELIVERY_SETTINGS,
      ...(!deliveryResult.error && deliveryResult.data?.value ? deliveryResult.data.value : {}),
    },
  };
}

function markupFor(product, markups) {
  return Number((markups || []).find((item) => (
    normalizeKey(item.main_category) === normalizeKey(product.mainCategory) &&
    normalizeKey(item.sub_category) === normalizeKey(product.category)
  ))?.markup_percent || 0);
}

async function loadProduct(supabase, publicId) {
  const id = text(publicId, 200);
  if (!/^(local|vali|store)-[A-Za-z0-9-]+$/.test(id)) {
    throw new TbiError(400, "INVALID_PRODUCT_ID", "Невалиден продукт.");
  }
  const [source, ...idParts] = id.split("-");
  const databaseId = idParts.join("-");
  let result;

  if (source === "vali") {
    result = await supabase.from("vali_products").select("*").eq("id", databaseId).eq("show", true).maybeSingle();
  } else if (source === "local") {
    result = await supabase.from("products").select("*").eq("id", databaseId).maybeSingle();
  } else {
    result = await supabase.from("physical_store_products").select("*").eq("id", databaseId).eq("show_on_site", true).gt("stock", 0).maybeSingle();
  }

  if (result.error || !result.data) {
    throw new TbiError(404, "PRODUCT_NOT_FOUND", "Продуктът не е наличен за финансиране.");
  }

  const row = result.data;
  if (source === "vali" && [0, 5].includes(Number(row.status))) {
    throw new TbiError(409, "PRODUCT_UNAVAILABLE", "Продуктът не е наличен за финансиране.");
  }
  if (source !== "vali" && Number(row.stock ?? 1) <= 0) {
    throw new TbiError(409, "PRODUCT_UNAVAILABLE", "Продуктът не е наличен за финансиране.");
  }

  const images = Array.isArray(row.images) ? row.images : [];
  const image = source === "vali"
    ? images[0]?.href || row.image || ""
    : images[0] || row.image || "";

  return {
    publicId: id,
    databaseId,
    source,
    name: source === "vali" ? getBgText(row.name) || row.model : row.title || row.name,
    description: source === "vali" ? getBgText(row.description) : row.description,
    sku: row.reference_number || row.catalog_number || row.sku || databaseId,
    category: row.site_sub_category || row.category || row.sub_category || "0",
    mainCategory: row.site_main_category || row.main_category || row.category || "",
    image,
    baseNetPrice: Number(source === "vali" ? row.price_partner || row.price_client : row.price),
  };
}

function pricedProduct(product, pricing) {
  if (!Number.isFinite(product.baseNetPrice) || product.baseNetPrice <= 0) {
    throw new TbiError(409, "INVALID_CATALOG_PRICE", "Продуктът няма валидна цена за финансиране.");
  }
  const markup = product.source === "vali" ? markupFor(product, pricing.markups) : 0;
  const markedUpNet = roundMoney(product.baseNetPrice * (1 + markup / 100));
  const promotion = findBestPromotion(product, pricing.promotions);
  const discount = Math.min(100, Math.max(0, Number(promotion?.discount_percent || 0)));
  const finalNet = roundMoney(markedUpNet * (1 - discount / 100));
  return { ...product, unitGrossPrice: roundMoney(finalNet * (1 + VAT_RATE)) };
}

function validateQuantity(value) {
  const quantity = Number(value ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new TbiError(400, "INVALID_QUANTITY", "Невалидно количество.");
  }
  return quantity;
}

function splitCustomerName(value) {
  const parts = text(value, 160).split(/\s+/).filter(Boolean);
  return {
    firstname: parts.shift() || "",
    lastname: parts.pop() || "",
    surname: parts.join(" "),
  };
}

function customerPayload(customer = {}) {
  const names = splitCustomerName(customer.name || customer.customer_name);
  return {
    ...names,
    email: text(customer.email || customer.customer_email, 254),
    phone: text(customer.phone || customer.customer_phone, 40),
    deliveryaddress: {
      country: text(customer.country || "Bulgaria", 80),
      county: text(customer.county, 100),
      city: text(customer.city || customer.customer_city, 120),
      streetname: text(customer.streetname || customer.address || customer.customer_address, 240),
      streetno: text(customer.streetno, 40),
      buildingno: text(customer.buildingno, 40),
      entranceno: text(customer.entranceno, 40),
      floorno: text(customer.floorno, 40),
      apartmentno: text(customer.apartmentno, 40),
      postalcode: text(customer.postalcode, 20),
    },
  };
}

function toTbiItem(product, quantity) {
  return {
    name: text(product.name || "VF Computers продукт", 300),
    description: text(product.description, 1000),
    qty: String(quantity),
    price: product.unitGrossPrice.toFixed(2),
    sku: text(product.sku, 120),
    category: text(product.category || "0", 120) || "0",
    imagelink: /^https:\/\//i.test(product.image || "") ? product.image : "",
  };
}

function addDelivery(items, deliverySettings) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0));
  const threshold = Number(deliverySettings.free_delivery_threshold || DEFAULT_DELIVERY_SETTINGS.free_delivery_threshold);
  const delivery = subtotal >= threshold ? 0 : Number(deliverySettings.default_delivery_price || DEFAULT_DELIVERY_SETTINGS.default_delivery_price);
  if (delivery > 0) {
    items.push({
      name: "Доставка",
      description: "Доставка на поръчката",
      qty: "1",
      price: roundMoney(delivery).toFixed(2),
      sku: "DELIVERY",
      category: "0",
      imagelink: "",
    });
  }
  return roundMoney(subtotal + Math.max(0, delivery));
}

export async function buildFinancingRequest(supabase, input, config) {
  const hasProduct = Boolean(input.product_id);
  const hasOrder = Boolean(input.order_id);
  if (hasProduct === hasOrder) {
    throw new TbiError(400, "INVALID_TARGET", "Изпратете точно един product_id или order_id.");
  }

  const pricing = await loadPricingContext(supabase);
  const reference = `VF-TBI-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  let order = null;
  let productsWithQuantity = [];
  let customer = input.customer || {};

  if (hasProduct) {
    const product = pricedProduct(await loadProduct(supabase, input.product_id), pricing);
    productsWithQuantity = [{ product, quantity: validateQuantity(input.quantity) }];
  } else {
    const orderResult = await supabase.from("orders").select("*").eq("id", text(input.order_id, 100)).maybeSingle();
    if (orderResult.error || !orderResult.data) {
      throw new TbiError(404, "ORDER_NOT_FOUND", "Поръчката не е намерена.");
    }
    order = orderResult.data;
    if (String(order.payment_status || "pending") === "approved") {
      throw new TbiError(409, "ORDER_ALREADY_APPROVED", "Поръчката вече има одобрено финансиране.");
    }
    const orderItems = Array.isArray(order.items) ? order.items : [];
    if (!orderItems.length || orderItems.length > 100) {
      throw new TbiError(400, "INVALID_ORDER_ITEMS", "Поръчката няма валидни артикули за финансиране.");
    }
    for (const item of orderItems) {
      const orderQuantity = validateQuantity(item.quantity || item.qty);
      if (String(item.id || "").startsWith("config-") && item.parts && typeof item.parts === "object") {
        const partRows = Object.values(item.parts).flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean);
        if (!partRows.length) {
          throw new TbiError(400, "INVALID_CONFIGURATION", "Конфигурацията няма валидни компоненти за финансиране.");
        }
        for (const part of partRows) {
          const product = pricedProduct(await loadProduct(supabase, part.id), pricing);
          productsWithQuantity.push({ product, quantity: orderQuantity });
        }
      } else {
        const product = pricedProduct(await loadProduct(supabase, item.id), pricing);
        productsWithQuantity.push({ product, quantity: orderQuantity });
      }
    }
    customer = order;
  }

  const items = productsWithQuantity.map(({ product, quantity }) => toTbiItem(product, quantity));
  const amount = addDelivery(items, pricing.delivery);
  const payload = {
    orderid: reference,
    currency: "EUR",
    ...customerPayload(customer),
    items,
    promo: "1",
    successRedirectURL: config.successUrl,
    failRedirectURL: config.failUrl,
  };

  return {
    reference,
    amount,
    orderId: order?.id || null,
    productId: hasProduct ? text(input.product_id, 200) : null,
    payload,
  };
}

export async function registerApplication(config, payload) {
  const endpoint = new URL(REGISTER_APPLICATION_PATH, `${config.baseUrl.replace(/\/$/, "")}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        reseller_code: config.resellerCode,
        reseller_key: config.resellerKey,
        data: encryptTbiPayload(payload, config.encryptionKey),
      }),
      signal: controller.signal,
    });
  } catch {
    throw new TbiError(502, "TBI_CONNECTION_FAILED", "Връзката с TBI не беше успешна. Моля, опитайте отново.");
  } finally {
    clearTimeout(timeout);
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.url) {
    throw new TbiError(502, "TBI_REGISTRATION_FAILED", "TBI заявката не беше създадена. Моля, опитайте отново.");
  }

  let redirectUrl;
  try {
    redirectUrl = new URL(result.url);
  } catch {
    throw new TbiError(502, "TBI_INVALID_REDIRECT", "TBI върна невалиден адрес за пренасочване.");
  }
  if (redirectUrl.protocol !== "https:") {
    throw new TbiError(502, "TBI_INSECURE_REDIRECT", "TBI върна невалиден адрес за пренасочване.");
  }

  return { url: redirectUrl.toString(), response: sanitizeForStorage(result) };
}

export function normalizeCallbackStatus(value) {
  const status = text(value, 80).toLowerCase();
  if (["approved", "approve", "accepted", "success", "successful", "completed"].includes(status)) return "approved";
  if (["rejected", "reject", "declined", "denied", "failed"].includes(status)) return "rejected";
  if (["cancelled", "canceled", "cancel", "aborted"].includes(status)) return "cancelled";
  if (["pending", "processing", "registered", "created", "in_progress"].includes(status)) return "pending";
  return ALLOWED_STATUSES.has(status) ? status : "error";
}

export function resolveCallbackStatus(currentStatus, incomingStatus) {
  const current = ALLOWED_STATUSES.has(currentStatus) ? currentStatus : "error";
  const incoming = ALLOWED_STATUSES.has(incomingStatus) ? incomingStatus : "error";
  const terminal = new Set(["approved", "rejected", "cancelled"]);
  return terminal.has(current) ? current : incoming;
}

export function sanitizeForStorage(value, depth = 0) {
  if (depth > 8) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeForStorage(item, depth + 1));
  if (!value || typeof value !== "object") return typeof value === "string" ? value.slice(0, 4000) : value;
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 100)) {
    if (/key|secret|password|token/i.test(key)) result[key] = "[REDACTED]";
    else if (key === "data" && depth === 0) result[key] = "[ENCRYPTED_PAYLOAD]";
    else result[key] = sanitizeForStorage(item, depth + 1);
  }
  return result;
}

export function sendJson(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
}

export function publicError(error) {
  if (error instanceof TbiError) {
    return { status: error.status, body: { error: error.publicMessage, code: error.code } };
  }
  return { status: 500, body: { error: "Възникна грешка при TBI финансирането.", code: "TBI_INTERNAL_ERROR" } };
}
