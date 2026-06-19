const OPTIMIZABLE_IMAGE_HOSTS = new Set([
  "www.vali.bg",
  "qmuflwekhqqcfykayjdx.supabase.co",
  "images.unsplash.com",
]);

export function getOptimizedImageUrl(source, width = 640, quality = 76) {
  const value = String(source || "").trim();
  if (!value || value.startsWith("/") || value.startsWith("data:")) return value;
  if (import.meta.env.DEV) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !OPTIMIZABLE_IMAGE_HOSTS.has(url.hostname)) return value;
    return `/api/image?url=${encodeURIComponent(url.toString())}&w=${Math.round(width)}&q=${Math.round(quality)}`;
  } catch {
    return value;
  }
}

export function restoreOriginalImage(event, source) {
  const image = event.currentTarget;
  const original = String(source || "").trim();
  if (!original || image.dataset.originalFallback === "true") return;
  image.dataset.originalFallback = "true";
  image.removeAttribute("srcset");
  image.src = original;
}

export function getProductImageSrcSet(source) {
  const small = getOptimizedImageUrl(source, 320, 74);
  const medium = getOptimizedImageUrl(source, 640, 76);
  if (!small || small === source) return undefined;
  return `${small} 320w, ${medium} 640w`;
}
