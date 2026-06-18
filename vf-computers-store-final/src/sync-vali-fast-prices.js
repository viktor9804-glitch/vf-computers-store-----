import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALI_API_BASE = process.env.VALI_API_BASE;
const VALI_API_TOKEN = process.env.VALI_API_TOKEN;
const DRY_RUN = process.env.VALI_SYNC_DRY_RUN === "true";

async function valiFetch(path) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${VALI_API_BASE}${path}${separator}api_token=${VALI_API_TOKEN}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Vali API ${res.status}: ${text}`);
  }

  return JSON.parse(text);
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

async function run() {
  try {
    console.log("Starting FAST price/stock sync...");
    if (DRY_RUN) console.log("DRY RUN: database writes are disabled.");

    let page = 1;
    let lastPage = 0;
    const remoteProducts = [];

    while (true) {
      console.log(`Fetching page ${page}...`);

      const data = await valiFetch(`/products?per_page=500&page=${page}`);
      const products = getValiItems(data);
      const currentPage = getValiCurrentPage(data, page);
      lastPage = getValiLastPage(data) || lastPage;

      if (products.length === 0) {
        console.log("No more VALI products returned.");
        break;
      }

      remoteProducts.push(...products);
      console.log(`Finished page ${currentPage}/${lastPage || "unknown"} | Fetched: ${remoteProducts.length}`);

      if (lastPage && currentPage >= lastPage) break;
      if (!lastPage && !hasValiNextPage(data, products, 500)) break;

      page = currentPage + 1;
    }

    const existingIds = new Set();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("vali_products")
        .select("id")
        .range(from, from + 999);
      if (error) throw error;
      (data || []).forEach((product) => existingIds.add(String(product.id)));
      if ((data || []).length < 1000) break;
    }

    const now = new Date().toISOString();
    const updates = remoteProducts
      .filter((product) => existingIds.has(String(product.id)))
      .map((product) => ({
        id: product.id,
        status: product.status,
        show: product.show,
        price_client: product.price_client,
        price_partner: product.price_partner,
        price_promo: product.price_promo,
        price_client_promo: product.price_client_promo,
        updated_at: now,
      }));

    for (let index = 0; !DRY_RUN && index < updates.length; index += 500) {
      const { error } = await supabase
        .from("vali_products")
        .upsert(updates.slice(index, index + 500), { onConflict: "id" });
      if (error) throw error;
    }

    const remoteIds = new Set(remoteProducts.map((product) => String(product.id)));
    const staleIds = [...existingIds].filter((id) => !remoteIds.has(id));
    for (let index = 0; !DRY_RUN && index < staleIds.length; index += 100) {
      const { error } = await supabase
        .from("vali_products")
        .update({
          show: false,
          status: 0,
          updated_at: now,
        })
        .in("id", staleIds.slice(index, index + 100));
      if (error) throw error;
    }

    const newProducts = remoteProducts.filter((product) => !existingIds.has(String(product.id)));
    console.log("FAST SYNC COMPLETE");
    console.log("TOTAL UPDATED:", updates.length);
    console.log("DEACTIVATED STALE:", staleIds.length);
    console.log("NEW PRODUCTS REQUIRING FULL SYNC:", newProducts.length);
    if (newProducts.length > 0) {
      console.log("Run npm run sync:vali:full to import their full catalog data.");
    }
  } catch (error) {
    console.error("SYNC ERROR:", error.message);
    process.exitCode = 1;
  }
}

run();
