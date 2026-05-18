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