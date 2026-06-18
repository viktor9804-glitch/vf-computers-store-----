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

function getValiAvailability(product = {}) {
  const text = String(
    product.availability_text ??
    product.availability ??
    product.delivery_status ??
    product.stock_status ??
    product.status_text ??
    product.expected_delivery ??
    ""
  ).toLowerCase();
  const rawStatus = product.status;
  const statusNumber = Number(rawStatus);
  const statusText = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "";

  const qty = Number(
    product.stock_quantity ??
    product.quantity ??
    product.qty ??
    product.stock ??
    product.available_quantity ??
    0
  );

  if (
    text.includes("на път") ||
    text.includes("очаква") ||
    text.includes("preorder") ||
    text.includes("on the way") ||
    statusText.includes("на път") ||
    statusText.includes("очаква")
  ) {
    return {
      availability_text: "На път",
      availability_type: "on_the_way",
      stock_quantity: qty,
      expected_delivery: product.expected_delivery || product.delivery_date || product.expected_date || null,
    };
  }

  if (
    text.includes("налич") ||
    text.includes("available") ||
    text.includes("in stock") ||
    statusNumber === 1 ||
    qty > 0
  ) {
    return {
      availability_text: "В наличност",
      availability_type: "in_stock",
      stock_quantity: qty,
      expected_delivery: product.expected_delivery || product.delivery_date || product.expected_date || null,
    };
  }

  return {
    availability_text: text ? product.availability_text || product.availability || product.delivery_status || product.stock_status || product.status_text : "С поръчка",
    availability_type: "order",
    stock_quantity: qty,
    expected_delivery: product.expected_delivery || product.delivery_date || product.expected_date || null,
  };
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
        const availability = getValiAvailability(product);
        const { error } = await supabase
          .from("vali_products")
          .update({
            status: product.status,
            show: product.show,
            availability_text: availability.availability_text,
            availability_type: availability.availability_type,
            stock_quantity: availability.stock_quantity,
            expected_delivery: availability.expected_delivery,
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
