import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALI_API_BASE = process.env.VALI_API_BASE;
const VALI_API_TOKEN = process.env.VALI_API_TOKEN;

function getText(arr, lang = "bg") {
  return arr?.find(x => x.language_code === lang)?.text || "";
}

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
    console.log("Starting Vali categories sync...");

    const categories = await valiFetch("/categories");

    for (const category of categories || []) {
      const { error } = await supabase.from("vali_categories").upsert({
  id: category.id,
  parent: category.parent,
  name_bg: getText(category.name, "bg"),
  name_en: getText(category.name, "en"),
  show: category.show,
  sort_order: category.order,
  raw: category
});

      if (error) throw error;

      console.log("Imported category:", category.id, getText(category.name, "bg"));
    }

    console.log("CATEGORIES SYNC COMPLETE");
    console.log("TOTAL CATEGORIES:", categories.length);
  } catch (error) {
    console.error("SYNC ERROR:", error.message);
  }
}

run();