import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const VALI_TOKEN = process.env.VALI_API_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PER_PAGE = 500;
const DATABASE_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 4;
const BASE_URL = (process.env.VALI_API_BASE || "https://www.vali.bg/api/v1").replace(/\/$/, "");
const DRY_RUN = process.env.VALI_SYNC_DRY_RUN === "true";

if (!VALI_TOKEN) throw new Error("Missing VALI_API_TOKEN");
if (!SUPABASE_URL) throw new Error("Missing VITE_SUPABASE_URL");
if (!SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let categoryMap = new Map();

function getText(arr, lang = "bg") {
  if (!Array.isArray(arr)) return "";
  return arr.find((x) => x.language_code === lang)?.text || arr[0]?.text || "";
}

function extractValiFilters(product) {
  const filters = {};

  for (const p of product.parameters || []) {
    const key = getText(p.parameter_name);
    const value = getText(p.parameter_text) || getText(p.option_name);

    if (key && value) {
      if (!filters[key]) filters[key] = [];
      if (!filters[key].includes(value)) filters[key].push(value);
    }
  }

  return filters;
}

function getCategoryById(id) {
  return categoryMap.get(Number(id)) || null;
}

function getCategoryNameById(id) {
  return getText(getCategoryById(id)?.name) || "Други";
}

function getTopParentCategory(catId) {
  let cat = getCategoryById(catId);

  while (cat && Number(cat.parent) !== 0) {
    cat = getCategoryById(cat.parent);
  }

  return cat || null;
}

function mapMainCategory(valiMainName) {
  const map = {
    "Компютърни компоненти": "Компоненти",
    "Компютърни системи": "Геймърски компютри",
    "Лаптопи, таблети и аксесоари": "Лаптопи",
    "Монитори и дисплеи": "Монитори",
    "Компютърна периферия": "Периферия",
    "Геймърска периферия": "Периферия",
    "Мрежово оборудване": "Мрежово оборудване",
  };

  return map[valiMainName] || valiMainName || "Други";
}

function mapCategory(product) {
  const ids = (product.categories || [])
    .map((c) => Number(c.id))
    .filter(Boolean);

  if (ids.length === 0) return ["Други", "Други"];

  // VALI returns the primary product category first. The following entries can
  // be secondary collections (for example STEM), not descendants of the first.
  const deepestId = ids[0];

  const subCategory = getCategoryNameById(deepestId);

  const topParent = getTopParentCategory(deepestId);
  const valiMainName = getText(topParent?.name);

  const mainCategory = mapMainCategory(valiMainName);

  return [mainCategory, subCategory];
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function withRetry(label, operation) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) break;
      const delay = attempt * 1500;
      console.warn(`${label} failed (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${delay} ms.`);
      await wait(delay);
    }
  }

  throw lastError;
}

async function valiGet(path) {
  return withRetry(`VALI request ${path}`, async () => {
    const separator = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE_URL}${path}${separator}api_token=${encodeURIComponent(VALI_TOKEN)}`, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`VALI error ${res.status}: ${text.slice(0, 300)}`);
    }

    return res.json();
  });
}

async function upsertRows(table, rows, options) {
  for (let index = 0; index < rows.length; index += DATABASE_BATCH_SIZE) {
    const batch = rows.slice(index, index + DATABASE_BATCH_SIZE);
    await withRetry(`Supabase ${table} upsert`, async () => {
      const { error } = await supabase.from(table).upsert(batch, options);
      if (error) throw error;
    });
  }
}

function toRow(product) {
  const [mainCategory, subCategory] = mapCategory(product);
  return {
    id: product.id,
    idwf: product.idWF,
    reference_number: product.reference_number,
    manufacturer_id: product.manufacturer_id,
    manufacturer: product.manufacturer,
    status: product.status,
    price_client: product.price_client,
    price_partner: product.price_partner,
    price_promo: product.price_promo,
    price_client_promo: product.price_client_promo,

    show: product.show,
    model: product.model,
    barcode: product.barcode,
    warranty: product.warranty,
    weight: product.weight,

    categories: product.categories || [],
    name: product.name || [],
    description: product.description || [],
    images: product.images || [],
    documents: product.documents || [],
    parameters: product.parameters || [],
    flags: product.flags || [],

    filters: extractValiFilters(product),

    site_main_category: mainCategory,
    site_sub_category: subCategory,
    site_category_path: [mainCategory, subCategory],

    updated_at: new Date().toISOString(),
  };
}

function getValiItems(response) {
  return response.items || response.data || [];
}

function getValiLastPage(response) {
  return Number(
    response.last_page ||
    response.lastPage ||
    response.meta?.last_page ||
    response.pagination?.last_page ||
    0
  );
}

function getValiCurrentPage(response, fallbackPage) {
  return Number(
    response.current_page ||
    response.currentPage ||
    response.meta?.current_page ||
    response.pagination?.current_page ||
    fallbackPage
  );
}

function hasValiNextPage(response, rows, pageSize) {
  return Boolean(
    response.next_page_url ||
    response.nextPageUrl ||
    response.links?.next ||
    rows.length === pageSize
  );
}

async function main() {
  console.log("Starting VALI sync...");
  if (DRY_RUN) console.log("DRY RUN: database writes are disabled.");

  console.log("Loading VALI categories...");
  const categoriesResponse = await valiGet("/categories");
  const categoriesList =
    categoriesResponse.items ||
    categoriesResponse.data ||
    categoriesResponse ||
    [];

  categoryMap = new Map(
    categoriesList.map((cat) => [Number(cat.id), cat])
  );

  console.log(`Loaded categories: ${categoryMap.size}`);

  const categoryRows = categoriesList.map((category) => ({
    id: category.id,
    parent: category.parent,
    name_bg: getText(category.name, "bg"),
    name_en: getText(category.name, "en"),
    show: category.show,
    sort_order: category.order,
    raw: category,
  }));
  if (!DRY_RUN) {
    await upsertRows("vali_categories", categoryRows, { onConflict: "id" });
  }

  const first = await valiGet(`/products/full?page=1&per_page=${PER_PAGE}`);

  const totalItems =
    first.total_items ||
    first.totalItems ||
    first.meta?.total ||
    first.pagination?.total ||
    null;
  const firstLastPage = getValiLastPage(first);

  console.log(`Total: ${totalItems || "unknown"}`);
  console.log(`Pages: ${firstLastPage || "unknown"}`);

  let imported = 0;
  let page = 1;
  const remoteIds = new Set();

  while (true) {
    const data =
      page === 1
        ? first
        : await valiGet(`/products/full?page=${page}&per_page=${PER_PAGE}`);

    const rows = getValiItems(data).map(toRow);
    rows.forEach((row) => remoteIds.add(String(row.id)));
    const currentPage = getValiCurrentPage(data, page);
    const lastPage = getValiLastPage(data) || firstLastPage;

    console.log(`Fetching page ${currentPage}/${lastPage || "unknown"}`);

    if (rows.length === 0) {
      console.log("No more VALI products returned.");
      break;
    }

    if (!DRY_RUN) {
      await upsertRows("vali_products", rows, { onConflict: "id" });
    }

    imported += rows.length;
    console.log(`Imported so far: ${imported}`);

    if (lastPage && currentPage >= lastPage) break;
    if (!lastPage && !hasValiNextPage(data, rows, PER_PAGE)) break;

    page = currentPage + 1;
  }

  // Keep historical rows for orders/overrides, but never show products that
  // disappeared from the authoritative VALI response.
  const databaseProducts = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("vali_products")
      .select("id")
      .range(from, from + 999);
    if (error) throw error;
    databaseProducts.push(...(data || []));
    if ((data || []).length < 1000) break;
  }

  const staleIds = databaseProducts
    .map((product) => product.id)
    .filter((id) => !remoteIds.has(String(id)));

  for (let index = 0; !DRY_RUN && index < staleIds.length; index += 100) {
    const staleBatch = staleIds.slice(index, index + 100);
    await withRetry("Supabase stale product deactivation", async () => {
      const { error } = await supabase
        .from("vali_products")
        .update({
          show: false,
          status: 0,
          updated_at: new Date().toISOString(),
        })
        .in("id", staleBatch);
      if (error) throw error;
    });
  }

  console.log("VALI sync finished.");
  console.log(`Imported/updated: ${imported}`);
  console.log(`Deactivated stale products: ${staleIds.length}`);
}

main().catch((err) => {
  console.error("SYNC ERROR:", err);
  process.exit(1);
});
