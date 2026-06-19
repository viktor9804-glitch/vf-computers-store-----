import sharp from "sharp";

const ALLOWED_HOSTS = new Set([
  "www.vali.bg",
  "qmuflwekhqqcfykayjdx.supabase.co",
  "images.unsplash.com",
]);
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

function numericParam(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const sourceUrl = new URL(String(req.query.url || ""));
    if (sourceUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(sourceUrl.hostname)) {
      return res.status(400).json({ error: "IMAGE_SOURCE_NOT_ALLOWED" });
    }

    const width = numericParam(req.query.w, 640, 64, 1600);
    const quality = numericParam(req.query.q, 76, 40, 90);
    const upstream = await fetch(sourceUrl, {
      headers: { Accept: "image/avif,image/webp,image/*" },
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) return res.status(502).json({ error: "IMAGE_SOURCE_UNAVAILABLE" });

    const declaredLength = Number(upstream.headers.get("content-length") || 0);
    if (declaredLength > MAX_SOURCE_BYTES) {
      return res.status(413).json({ error: "IMAGE_SOURCE_TOO_LARGE" });
    }

    const source = Buffer.from(await upstream.arrayBuffer());
    if (source.length > MAX_SOURCE_BYTES) {
      return res.status(413).json({ error: "IMAGE_SOURCE_TOO_LARGE" });
    }

    const output = await sharp(source, { failOn: "none" })
      .rotate()
      .resize({ width, withoutEnlargement: true, fit: "inside" })
      .webp({ quality, effort: 4 })
      .toBuffer();

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400");
    return res.status(200).send(output);
  } catch {
    return res.status(400).json({ error: "INVALID_IMAGE_REQUEST" });
  }
}
