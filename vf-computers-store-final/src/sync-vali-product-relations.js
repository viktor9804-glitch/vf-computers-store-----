import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {
    console.log("Starting product relations/images sync...");

    const { data: products, error } = await supabase
      .from("vali_products")
      .select("id, raw");

    if (error) throw error;

    let totalCategories = 0;
    let totalImages = 0;

    for (const product of products || []) {
      const raw = product.raw || {};

      await supabase
        .from("vali_product_categories")
        .delete()
        .eq("product_id", product.id);

      if (raw.categories?.length) {
        const rows = raw.categories.map(c => ({
          product_id: product.id,
          category_id: c.id
        }));

        const { error: catError } = await supabase
          .from("vali_product_categories")
          .insert(rows);

        if (!catError) totalCategories += rows.length;
      }

      await supabase
        .from("vali_product_images")
        .delete()
        .eq("product_id", product.id);

      if (raw.images?.length) {
        const rows = raw.images.map((img, index) => ({
          product_id: product.id,
          image_url: img.href,
          sort_order: index + 1
        }));

        const { error: imgError } = await supabase
          .from("vali_product_images")
          .insert(rows);

        if (!imgError) totalImages += rows.length;
      }

      console.log(`Synced product: ${product.id}`);
    }

    console.log("RELATIONS/IMAGES SYNC COMPLETE");
    console.log("TOTAL CATEGORY LINKS:", totalCategories);
    console.log("TOTAL IMAGES:", totalImages);
  } catch (error) {
    console.error("SYNC ERROR:", error.message);
  }
}

run();