import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const VALI_TOKEN = process.env.VALI_API_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PER_PAGE = 500;
const BASE_URL = "https://www.vali.bg/api/v1";

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

  const deepestId = ids[ids.length - 1];

  const subCategory = getCategoryNameById(deepestId);

  const topParent = getTopParentCategory(deepestId);
  const valiMainName = getText(topParent?.name);

  const mainCategory = mapMainCategory(valiMainName);

  return [mainCategory, subCategory];
}

async function valiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${VALI_TOKEN}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VALI error ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
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

  while (true) {
    const data =
      page === 1
        ? first
        : await valiGet(`/products/full?page=${page}&per_page=${PER_PAGE}`);

    const rows = getValiItems(data).map(toRow);
    const currentPage = getValiCurrentPage(data, page);
    const lastPage = getValiLastPage(data) || firstLastPage;

    console.log(`Fetching page ${currentPage}/${lastPage || "unknown"}`);

    if (rows.length === 0) {
      console.log("No more VALI products returned.");
      break;
    }

    const { error } = await supabase
      .from("vali_products")
      .upsert(rows, { onConflict: "id" });

    if (error) throw error;

    imported += rows.length;
    console.log(`Imported so far: ${imported}`);

    if (lastPage && currentPage >= lastPage) break;
    if (!lastPage && !hasValiNextPage(data, rows, PER_PAGE)) break;

    page = currentPage + 1;
  }

  console.log("VALI sync finished.");
}

main().catch((err) => {
  console.error("SYNC ERROR:", err);
  process.exit(1);
});
