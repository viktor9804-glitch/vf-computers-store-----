import { supabase } from "../supabaseClient";

const PAGE_SIZE = 1000;
const SEARCH_FIELDS = [
  "id",
  "title:name->0->>text",
  "reference_number",
  "manufacturer",
  "status",
  "public_price",
  "model",
  "site_main_category",
  "site_sub_category",
  "first_image:images->0->>href",
].join(",");

const SEARCH_SYNONYM_GROUPS = [
  ["процесор", "процесори", "processor", "cpu"],
  ["видеокарта", "видеокарти", "видео карта", "video card", "graphics card", "gpu"],
  ["памет", "памети", "оперативна памет", "memory", "ram"],
  ["дънна платка", "дънни платки", "motherboard", "mainboard"],
  ["охладител", "охладители", "охлаждане", "cooler", "cooling"],
  ["захранване", "захранващ блок", "power supply", "psu"],
  ["твърд диск", "диск", "storage", "hdd", "ssd", "nvme"],
  ["монитор", "монитори", "display", "screen"],
  ["лаптоп", "лаптопи", "notebook", "laptop"],
  ["слушалки", "headset", "headphones"],
  ["клавиатура", "keyboard"],
  ["мишка", "mouse"],
];

let catalogPromise;

export const normalizeCatalogSearch = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9а-я]+/gi, " ")
  .trim();

const getBgName = (name) => {
  if (typeof name === "string") return name;
  if (!Array.isArray(name)) return "";
  return name.find((item) => item?.language_code === "bg")?.text || name[0]?.text || "";
};

const getAvailability = (status) => {
  switch (Number(status)) {
    case 0: return { label: "Няма наличност", type: "out_of_stock" };
    case 1: return { label: "В наличност", type: "in_stock" };
    case 2: return { label: "Ограничена наличност", type: "limited" };
    case 3: return { label: "На път", type: "on_the_way" };
    case 4: return { label: "По заявка", type: "order" };
    case 5: return { label: "Попитай за цена", type: "ask_price" };
    default: return { label: "По заявка", type: "order" };
  }
};

const prepareProduct = (product, source = "vali") => {
  const title = product.title || getBgName(product.name) || product.model || "Продукт";
  const mainCategory = product.site_main_category || product.mainCategory || "";
  const category = product.site_sub_category || product.category || "";
  const referenceNumber = product.reference_number || product.catalog_number || product.barcode || "";
  const availability = product.availabilityLabel
    ? { label: product.availabilityLabel, type: product.availabilityType || "" }
    : getAvailability(product.status);
  const id = source === "vali" ? `vali-${product.id}` : String(product.id);
  const image = product.first_image || product.image || product.images?.[0]?.href || product.images?.[0] || "/placeholder.webp";
  const searchable = normalizeCatalogSearch([
    title,
    product.model,
    product.manufacturer,
    referenceNumber,
    mainCategory,
    category,
  ].filter(Boolean).join(" "));

  return {
    id,
    source,
    title,
    model: product.model || "",
    manufacturer: product.manufacturer || "",
    referenceNumber,
    mainCategory,
    category,
    price: Number(product.public_price ?? product.price ?? 0),
    image,
    availabilityLabel: availability.label,
    availabilityType: availability.type,
    searchable,
    normalizedTitle: normalizeCatalogSearch(title),
    normalizedModel: normalizeCatalogSearch(product.model),
    normalizedManufacturer: normalizeCatalogSearch(product.manufacturer),
    normalizedReference: normalizeCatalogSearch(referenceNumber),
    normalizedCategory: normalizeCatalogSearch(`${mainCategory} ${category}`),
  };
};

const fetchCatalogPage = (from, to, withCount = false) => supabase
  .from("storefront_vali_products")
  .select(SEARCH_FIELDS, withCount ? { count: "exact" } : undefined)
  .eq("show", true)
  .order("id", { ascending: true })
  .range(from, to);

export async function loadCatalogSearchIndex() {
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    const firstPage = await fetchCatalogPage(0, PAGE_SIZE - 1, true);
    if (firstPage.error) throw firstPage.error;

    const pageCount = Math.ceil(Number(firstPage.count || firstPage.data?.length || 0) / PAGE_SIZE);
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => {
        const from = (index + 1) * PAGE_SIZE;
        return fetchCatalogPage(from, from + PAGE_SIZE - 1);
      })
    );

    const failedPage = remainingPages.find((page) => page.error);
    if (failedPage?.error) throw failedPage.error;

    return [
      ...(firstPage.data || []),
      ...remainingPages.flatMap((page) => page.data || []),
    ].map((product) => prepareProduct(product));
  })().catch((error) => {
    catalogPromise = undefined;
    throw error;
  });

  return catalogPromise;
}

const getTermVariants = (term) => {
  const variants = new Set([term]);
  SEARCH_SYNONYM_GROUPS.forEach((group) => {
    const normalizedGroup = group.map(normalizeCatalogSearch);
    if (normalizedGroup.some((value) => value === term || value.startsWith(`${term} `))) {
      normalizedGroup.forEach((value) => variants.add(value));
    }
  });
  return [...variants];
};

export const matchesCatalogSearchText = (values, query) => {
  const normalizedQuery = normalizeCatalogSearch(query);
  if (!normalizedQuery) return false;
  const searchable = normalizeCatalogSearch(values.filter(Boolean).join(" "));
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .map(getTermVariants)
    .every((variants) => variants.some((variant) => searchable.includes(variant)));
};

const scoreProduct = (product, normalizedQuery, termGroups) => {
  let score = 0;

  if (product.normalizedTitle === normalizedQuery) score += 1200;
  if (product.normalizedReference === normalizedQuery || product.normalizedModel === normalizedQuery) score += 1100;
  if (product.normalizedTitle.startsWith(normalizedQuery)) score += 650;
  if (product.normalizedReference.startsWith(normalizedQuery) || product.normalizedModel.startsWith(normalizedQuery)) score += 560;
  if (product.normalizedTitle.includes(normalizedQuery)) score += 420;
  if (product.normalizedCategory.includes(normalizedQuery)) score += 180;

  for (const variants of termGroups) {
    const directTerm = variants[0];
    if (product.normalizedTitle.includes(directTerm)) score += 110;
    if (product.normalizedTitle.split(" ").some((word) => word.startsWith(directTerm))) score += 80;
    if (product.normalizedModel.includes(directTerm) || product.normalizedReference.includes(directTerm)) score += 90;
    if (product.normalizedManufacturer.includes(directTerm)) score += 60;
    if (product.normalizedCategory.includes(directTerm)) score += 45;

    if (!product.searchable.includes(directTerm) && variants.slice(1).some((variant) => product.searchable.includes(variant))) {
      score += 22;
    }
  }

  if (product.availabilityType === "in_stock") score += 8;
  if (product.availabilityType === "limited") score += 4;
  return score;
};

export async function searchCatalog(query, localProducts = [], limit = 6) {
  const normalizedQuery = normalizeCatalogSearch(query);
  if (normalizedQuery.length < 2) return { items: [], total: 0 };

  const remoteProducts = await loadCatalogSearchIndex();
  const localIndex = localProducts
    .filter((product) => product?.source !== "vali")
    .map((product) => prepareProduct(product, product.source || "local"));
  const uniqueProducts = new Map(remoteProducts.map((product) => [product.id, product]));
  localIndex.forEach((product) => uniqueProducts.set(product.id, product));

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const termGroups = terms.map(getTermVariants);
  const matches = [];

  uniqueProducts.forEach((product) => {
    const matchesEveryTerm = termGroups.every((variants) => (
      variants.some((variant) => product.searchable.includes(variant))
    ));
    if (!matchesEveryTerm) return;
    matches.push({ product, score: scoreProduct(product, normalizedQuery, termGroups) });
  });

  matches.sort((left, right) => (
    right.score - left.score || left.product.title.localeCompare(right.product.title, "bg")
  ));

  return {
    total: matches.length,
    items: matches.slice(0, limit).map((match) => match.product),
  };
}
