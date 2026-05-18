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

async function run() {
  try {
    console.log("Starting FAST price/stock sync...");

    let page = 1;
    let lastPage = 1;
    let updated = 0;

    do {
      console.log(`Fetching page ${page}...`);

      const data = await valiFetch(`/products?per_page=500&page=${page}`);
      lastPage = data.last_page || 1;

      for (const product of data.items || []) {
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

      console.log(`Finished page ${page}/${lastPage} | Updated: ${updated}`);
      page++;
    } while (page <= lastPage);

    console.log("FAST SYNC COMPLETE");
    console.log("TOTAL UPDATED:", updated);
  } catch (error) {
    console.error("SYNC ERROR:", error.message);
  }
}

run();