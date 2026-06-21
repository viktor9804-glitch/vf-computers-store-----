import { createClient } from "@supabase/supabase-js";
import { handleVisitorRequest } from "./_visitors.js";

const PAGE_SIZE = 1000;
let memoryCache = null;
let memoryCacheExpiresAt = 0;

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadUniqueCategories(supabase) {
  const unique = new Map();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("storefront_vali_products")
      .select("site_main_category,site_sub_category")
      .eq("show", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    for (const row of data || []) {
      const main = String(row.site_main_category || "").trim();
      const sub = String(row.site_sub_category || "").trim();
      if (!main || !sub) continue;
      unique.set(`${main}\u0000${sub}`, {
        site_main_category: main,
        site_sub_category: sub,
      });
    }

    if ((data || []).length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(unique.values());
}

export default async function handler(req, res) {
  if (req.query?.action === "visitors") {
    return handleVisitorRequest(req, res);
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    if (memoryCache && Date.now() < memoryCacheExpiresAt) {
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ categories: memoryCache });
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ error: "CATALOG_NOT_CONFIGURED" });
    }

    const categories = await loadUniqueCategories(supabase);
    memoryCache = categories;
    memoryCacheExpiresAt = Date.now() + 60 * 60 * 1000;

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ categories });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "CATALOG_CATEGORIES_UNAVAILABLE" });
  }
}
