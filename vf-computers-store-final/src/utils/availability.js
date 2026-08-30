const BLOCKED_TYPES = new Set(["out_of_stock", "on_the_way", "discontinued", "ask_price"]);

export function isProductOrderable(product) {
  return Boolean(product) && product.canOrder !== false && !BLOCKED_TYPES.has(product.availabilityType);
}

export function isCartItemOrderable(item, products = []) {
  if (!isProductOrderable(item)) return false;
  if (item.source !== "config" && !item.is_custom_pc_build) return true;
  const parts = Object.values(item.parts || {}).flat().filter(Boolean);
  return parts.length > 0 && parts.every((part) =>
    isProductOrderable(products.find((product) => String(product.id) === String(part.id)) || part)
  );
}
