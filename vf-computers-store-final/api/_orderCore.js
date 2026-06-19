import { ApiError, assertAllowedKeys, text } from "./_serverSecurity.js";

const VAT_RATE = 0.2;
const ALLOWED_PAYMENT_METHODS = new Set(["cod", "bank", "tbi"]);
const ORDER_KEYS = new Set([
  "items",
  "customer_name",
  "phone",
  "email",
  "city",
  "delivery_address",
  "econt_office",
  "payment_method",
  "idempotency_key",
]);
const ITEM_KEYS = new Set(["product_id", "catalog_number", "quantity"]);
const PRODUCT_ID_PATTERN = /^(?:local|vali|store)-[A-Za-z0-9-]{1,80}$/;
const CATALOG_NUMBER_PATTERN = /^[A-Za-z0-9._/-]{1,100}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const normalizeKey = (value) => text(value, 300).toLowerCase();

export function validateOrderBody(body) {
  assertAllowedKeys(body, ORDER_KEYS);

  const customerName = text(body.customer_name, 160);
  const phone = text(body.phone, 40);
  const email = text(body.email, 254).toLowerCase();
  const city = text(body.city, 120);
  const deliveryAddress = text(body.delivery_address, 300);
  const econtOffice = text(body.econt_office, 300);
  const paymentMethod = text(body.payment_method, 20).toLowerCase();
  const idempotencyKey = text(body.idempotency_key, 100);

  if (customerName.length < 2 || phone.length < 6 || city.length < 2) {
    throw new ApiError(400, "INVALID_CUSTOMER", "Невалидни данни за клиента.");
  }
  if (!deliveryAddress && !econtOffice) {
    throw new ApiError(400, "MISSING_DELIVERY", "Липсва адрес за доставка.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "INVALID_EMAIL", "Невалиден имейл адрес.");
  }
  if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
    throw new ApiError(400, "INVALID_PAYMENT_METHOD", "Невалиден метод на плащане.");
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Невалиден idempotency key.");
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw new ApiError(400, "INVALID_ITEMS", "Поръчката трябва да съдържа между 1 и 50 продукта.");
  }

  const items = body.items.map((item, index) => {
    assertAllowedKeys(item, ITEM_KEYS, `item ${index + 1}`);
    const productId = text(item.product_id, 100);
    const catalogNumber = text(item.catalog_number, 100);
    const quantity = Number(item.quantity);

    if ((!productId || !PRODUCT_ID_PATTERN.test(productId)) &&
        (!catalogNumber || !CATALOG_NUMBER_PATTERN.test(catalogNumber))) {
      throw new ApiError(400, "INVALID_PRODUCT_REFERENCE", "Невалиден продуктов идентификатор.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new ApiError(400, "INVALID_QUANTITY", "Невалидно количество.");
    }

    return { product_id: productId || null, catalog_number: catalogNumber || null, quantity };
  });

  return {
    items,
    customer_name: customerName,
    phone,
    email: email || null,
    city,
    delivery_address: deliveryAddress || econtOffice,
    econt_office: econtOffice || null,
    payment_method: paymentMethod,
    idempotency_key: idempotencyKey,
  };
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

function promotionIsActive(promotion, now = new Date()) {
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
    if (!promotionIsActive(promotion)) continue;
    let score = -1;
    if (promotion.product_id && ids.includes(String(promotion.product_id))) score = 3;
    else if (
      promotion.main_category && promotion.sub_category &&
      normalizeKey(promotion.main_category) === normalizeKey(product.mainCategory) &&
      normalizeKey(promotion.sub_category) === normalizeKey(product.category)
    ) score = 2;
    else if (
      promotion.main_category &&
      normalizeKey(promotion.main_category) === normalizeKey(product.mainCategory)
    ) score = 1;

    if (score < 0) continue;
    if (score > bestScore ||
        (score === bestScore && Number(promotion.discount_percent || 0) > Number(best?.discount_percent || 0))) {
      best = promotion;
      bestScore = score;
    }
  }

  return best;
}

export function assertProductOrderable(product, quantity) {
  if (product.source === "vali") {
    const status = Number(product.row.status);
    if (product.row.show !== true || status === 0 || status === 5) {
      throw new ApiError(409, "PRODUCT_UNAVAILABLE", "Продуктът не може да бъде поръчан.");
    }
    if (status === 2 && quantity > 3) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", "Заявеното количество не е налично.");
    }
    const knownStock = Number(
      product.row.stock_quantity ?? product.row.quantity ?? product.row.qty ?? product.row.available_quantity
    );
    if (Number.isFinite(knownStock) && knownStock > 0 && quantity > knownStock) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", "Заявеното количество не е налично.");
    }
    return;
  }

  const stock = Number(product.row.stock || 0);
  if (product.source === "store" && product.row.show_on_site !== true) {
    throw new ApiError(409, "PRODUCT_UNAVAILABLE", "Продуктът не може да бъде поръчан.");
  }
  if (!Number.isFinite(stock) || stock < quantity) {
    throw new ApiError(409, "INSUFFICIENT_STOCK", "Заявеното количество не е налично.");
  }
}

function normalizeProduct(source, row) {
  const publicId = `${source}-${row.id}`;
  const images = Array.isArray(row.images) ? row.images : [];
  const image = source === "vali"
    ? images[0]?.href || row.image || ""
    : images[0] || row.image || "";

  return {
    source,
    row,
    publicId,
    databaseId: row.id,
    catalogNumber: row.catalog_number || row.reference_number || "",
    name: source === "vali" ? getBgText(row.name) || row.model : row.title || row.name,
    image,
    warranty: row.warranty || row.guarantee || null,
    mainCategory: row.site_main_category || row.main_category || row.category || "",
    category: row.site_sub_category || row.sub_category || row.category || "",
    baseNetPrice: Number(source === "vali" ? row.price_partner || row.price_client : row.price),
  };
}

async function queryProductById(supabase, productId) {
  const [source, ...parts] = productId.split("-");
  const databaseId = parts.join("-");
  const table = source === "vali"
    ? "vali_products"
    : source === "local"
      ? "products"
      : "physical_store_products";
  const { data, error } = await supabase.from(table).select("*").eq("id", databaseId).maybeSingle();
  if (error) throw error;
  return data ? normalizeProduct(source, data) : null;
}

async function queryProductByCatalogNumber(supabase, catalogNumber) {
  for (const [source, table] of [["local", "products"], ["vali", "vali_products"]]) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("catalog_number", catalogNumber)
      .maybeSingle();
    if (error) throw error;
    if (data) return normalizeProduct(source, data);
  }
  return null;
}

export async function loadOrderProduct(supabase, item) {
  const product = item.product_id
    ? await queryProductById(supabase, item.product_id)
    : await queryProductByCatalogNumber(supabase, item.catalog_number);
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Продуктът не е намерен.");
  assertProductOrderable(product, item.quantity);
  return product;
}

export async function loadPricingContext(supabase) {
  const [markupsResult, promotionsResult, deliveryResult] = await Promise.all([
    supabase.from("category_markups").select("main_category,sub_category,markup_percent"),
    supabase.from("promotions").select("product_id,main_category,sub_category,discount_percent,is_active,starts_at,ends_at"),
    supabase.from("store_settings").select("value").eq("key", "delivery_settings").maybeSingle(),
  ]);

  if (markupsResult.error || promotionsResult.error) {
    throw new ApiError(503, "PRICING_UNAVAILABLE", "Цената не може да бъде потвърдена.");
  }

  return {
    markups: markupsResult.data || [],
    promotions: promotionsResult.data || [],
    delivery: {
      free_delivery_threshold: 200,
      default_delivery_price: 8,
      ...(!deliveryResult.error && deliveryResult.data?.value ? deliveryResult.data.value : {}),
    },
  };
}

function priceProduct(product, quantity, pricing) {
  if (!Number.isFinite(product.baseNetPrice) || product.baseNetPrice <= 0) {
    throw new ApiError(409, "INVALID_PRODUCT_PRICE", "Продуктът няма валидна цена.");
  }

  const markup = product.source === "vali"
    ? Number((pricing.markups || []).find((item) =>
        normalizeKey(item.main_category) === normalizeKey(product.mainCategory) &&
        normalizeKey(item.sub_category) === normalizeKey(product.category)
      )?.markup_percent || 0)
    : 0;
  const markedUpNet = roundMoney(product.baseNetPrice * (1 + markup / 100));
  const promotion = findBestPromotion(product, pricing.promotions);
  const discount = Math.min(100, Math.max(0, Number(promotion?.discount_percent || 0)));
  const unitNet = roundMoney(markedUpNet * (1 - discount / 100));

  return {
    id: product.publicId,
    product_id: product.publicId,
    catalog_number: product.catalogNumber,
    name: product.name,
    title: product.name,
    product_name: product.name,
    image: product.image,
    image_url: product.image,
    quantity,
    price: unitNet,
    unit_price: unitNet,
    warranty: product.warranty,
    source: product.source,
  };
}

export function calculateOrderTotals(items, deliverySettings) {
  const subtotal = roundMoney(items.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0
  ));
  const vat = roundMoney(subtotal * VAT_RATE);
  const grossProducts = roundMoney(subtotal + vat);
  const threshold = Number(deliverySettings.free_delivery_threshold || 200);
  const shipping = grossProducts >= threshold
    ? 0
    : roundMoney(Number(deliverySettings.default_delivery_price || 8));
  return { subtotal, vat, shipping, total: roundMoney(grossProducts + shipping) };
}

export async function buildTrustedOrder(supabase, input, userId = null) {
  const pricing = await loadPricingContext(supabase);
  const loadedProducts = await Promise.all(
    input.items.map(async (item) => ({
      product: await loadOrderProduct(supabase, item),
      quantity: item.quantity,
    }))
  );
  const items = loadedProducts.map(({ product, quantity }) =>
    priceProduct(product, quantity, pricing)
  );
  const totals = calculateOrderTotals(items, pricing.delivery);
  const paymentLabel = input.payment_method === "cod"
    ? "Наложен платеж"
    : input.payment_method === "bank"
      ? "Банков превод"
      : "TBI Bank - на изплащане";

  return {
    customer_name: input.customer_name,
    customer_phone: input.phone,
    customer_email: input.email,
    customer_city: input.city,
    customer_address: input.econt_office || input.delivery_address,
    customer_comment: null,
    items,
    ...totals,
    payment_method: input.payment_method,
    payment_label: paymentLabel,
    is_custom_pc_build: false,
    payment_status: "pending",
    status: "Приета",
    user_id: userId,
    idempotency_key: input.idempotency_key,
  };
}
