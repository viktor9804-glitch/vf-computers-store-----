import { createClient } from "@supabase/supabase-js";

const DEFAULT_SITE_URL = "https://vf-computers.com";
const DEFAULT_IMAGE_PATH = "/vf-computers-social-preview.png";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const cleanText = (value, max = 300) => String(value ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, max);

function getBgText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.find((item) => item?.language_code === "bg")?.text || value[0]?.text || "";
  }
  return value.bg || value.text || "";
}

function absoluteUrl(value, siteUrl, fallback) {
  try {
    const url = new URL(value || fallback, `${siteUrl}/`);
    return url.protocol === "https:" ? url.toString() : new URL(fallback, `${siteUrl}/`).toString();
  } catch {
    return new URL(fallback, `${siteUrl}/`).toString();
  }
}

function firstImage(row, source) {
  const images = Array.isArray(row?.images) ? row.images : [];
  if (source === "vali") return images[0]?.href || row?.image || "";
  return (typeof images[0] === "string" ? images[0] : images[0]?.href) || row?.image || "";
}

async function loadProduct(supabase, publicId) {
  if (!/^(local|vali|store)-[A-Za-z0-9-]+$/.test(publicId)) return null;
  const [source, ...parts] = publicId.split("-");
  const databaseId = parts.join("-");
  let result;

  if (source === "vali") {
    result = await supabase.from("vali_products").select("*").eq("id", databaseId).eq("show", true).maybeSingle();
  } else if (source === "store") {
    result = await supabase.from("physical_store_products").select("*").eq("id", databaseId).eq("show_on_site", true).maybeSingle();
  } else {
    result = await supabase.from("products").select("*").eq("id", databaseId).maybeSingle();
  }

  if (result.error || !result.data || result.data.hidden === true) return null;
  const row = result.data;
  return {
    title: source === "vali" ? getBgText(row.name) || row.model : row.title || row.name,
    description: source === "vali" ? getBgText(row.description) : row.description,
    category: row.site_sub_category || row.sub_category || row.category || "Компютри и компоненти",
    image: firstImage(row, source),
  };
}

function renderHtml({ canonicalUrl, description, imageUrl, siteUrl, title }) {
  const pageTitle = `${title} | ВФ Компютри`;
  return `<!doctype html>
<html lang="bg">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:locale" content="bg_BG" />
    <meta property="og:site_name" content="ВФ Компютри" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  </head>
  <body>
    <p><a href="${escapeHtml(canonicalUrl)}">Виж продукта във ВФ Компютри</a></p>
    <noscript><a href="${escapeHtml(siteUrl)}">ВФ Компютри</a></noscript>
  </body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  const publicId = String(req.query?.product_id || "").trim().slice(0, 200);
  const siteUrl = absoluteUrl(process.env.SITE_URL || DEFAULT_SITE_URL, DEFAULT_SITE_URL, DEFAULT_SITE_URL).replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/product/${encodeURIComponent(publicId)}`;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let product = null;
  if (supabaseUrl && serviceRoleKey && publicId) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    product = await loadProduct(supabase, publicId);
  }

  const title = cleanText(product?.title, 160) || "Продукт от ВФ Компютри";
  const description = cleanText(product?.description, 260)
    || `${cleanText(product?.category, 100) || "Компютри и компоненти"} от ВФ Компютри — онлайн магазин и сервиз в Елхово.`;
  const imageUrl = absoluteUrl(product?.image, siteUrl, DEFAULT_IMAGE_PATH);
  const html = renderHtml({ canonicalUrl, description, imageUrl, siteUrl, title });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("X-Robots-Tag", "index, follow");
  return res.status(product ? 200 : 404).send(req.method === "HEAD" ? "" : html);
}
