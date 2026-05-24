import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALI_API_BASE = process.env.VALI_API_BASE;
const VALI_API_TOKEN = process.env.VALI_API_TOKEN;

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

    let page = 1;
    let lastPage = 0;
    let updated = 0;

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

      for (const product of products) {
        const { error } = await supabase
          .from("vali_products")
          .update({
            status: product.status,
            show: product.show,
            price_client: product.price_client,
            price_partner: product.price_partner,
            price_promo: product.price_promo,
            price_client_promo: product.price_client_promo,
            updated_at: new Date().toISOString()
          })
          .eq("id", product.id);

        if (error) {
          console.error("Update error:", product.id, error.message);
          continue;
        }

        updated++;
      }

      console.log(`Finished page ${currentPage}/${lastPage || "unknown"} | Updated: ${updated}`);

      if (lastPage && currentPage >= lastPage) break;
      if (!lastPage && !hasValiNextPage(data, products, 500)) break;

      page = currentPage + 1;
    }

    console.log("FAST SYNC COMPLETE");
    console.log("TOTAL UPDATED:", updated);
  } catch (error) {
    console.error("SYNC ERROR:", error.message);
  }
}

run();
