import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALI_API_BASE = process.env.VALI_API_BASE;
const VALI_API_TOKEN = process.env.VALI_API_TOKEN;

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

async function valiFetch(path) {

  const separator = path.includes("?") ? "&" : "?";

  const url =
    `${VALI_API_BASE}${path}${separator}api_token=${VALI_API_TOKEN}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Vali API ${res.status}: ${text}`);
  }

  try {
  return JSON.parse(text);
} catch {
  throw new Error("Invalid JSON response");
}
}


async function run() {

  try {

    console.log("Starting FULL product details sync...");

    const { data: products, error } = await supabase
      .from("vali_products")
      .select("id");

    if (error) throw error;

    let updated = 0;

    for (const product of products || []) {

      try {

        console.log(`Fetching product ${product.id}...`);

        let fullProduct;

try {

  fullProduct =
    await valiFetch(`/product/${product.id}/full`);

} catch (err) {

  console.log(
    `Skipping invalid product ${product.id}`
  );

  continue;
}

        const { error: updateError } = await supabase
          .from("vali_products")
          .update({
            raw: fullProduct,
            ...getValiAvailability(fullProduct),
            updated_at: new Date().toISOString()
          })
          .eq("id", product.id);

        if (updateError) {
          console.error(updateError);
          continue;
        }

        updated++;

        console.log(
          `Updated FULL product: ${product.id}`
        );

      } catch (err) {

        console.error(
          `Failed product ${product.id}:`,
          err.message
        );
      }
    }

    console.log("FULL DETAILS SYNC COMPLETE");
    console.log("TOTAL UPDATED:", updated);

  } catch (error) {

    console.error("SYNC ERROR:", error.message);
  }
}

run();
