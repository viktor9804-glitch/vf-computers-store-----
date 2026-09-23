export const getProductPublicId = (product = {}) => {
  const catalogNumber = String(product.catalog_number || product.catalogNumber || "").trim();
  if (catalogNumber) return catalogNumber;

  const internalId = String(product.id || "").trim();
  if (internalId.startsWith("vali-")) return `product-${internalId.slice("vali-".length)}`;
  return internalId;
};

export const getProductPath = (product) => `/product/${encodeURIComponent(getProductPublicId(product))}`;
