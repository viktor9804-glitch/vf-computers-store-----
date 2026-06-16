import { createClient } from "@supabase/supabase-js";

const SITE_ORIGIN = "https://vf-computers.com";
const SUPABASE_PAGE_SIZE = 1000;
const VAT_RATE = 0.2;
const VALI_PRODUCT_SELECT = [
  "id",
  "reference_number",
  "manufacturer",
  "status",
  "price_client",
  "price_partner",
  "price_promo",
  "price_client_promo",
  "show",
  "model",
  "barcode",
  "warranty",
  "name",
  "description",
  "images",
  "filters",
  "raw",
  "site_main_category",
  "site_sub_category",
  "catalog_number",
].join(",");

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://qmuflwekhqqcfykayjdx.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_GKoOE2NCrH26dUCOF5sPvg_KYgly3uc";

const supabase = createClient(supabaseUrl, supabaseKey);

const normalizeText = (value) => String(value || "").trim();
const normalizeSearchText = (value) => normalizeText(value).toLowerCase();

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const grossPrice = (netPrice) => roundMoney(Number(netPrice || 0) * (1 + VAT_RATE));

const getBgText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.find((item) => item?.language_code === "bg")?.text || value[0]?.text || "";
  }
  if (typeof value === "object") {
    return value.bg || value.text || "";
  }
  return String(value);
};

const collectFilterValues = (value) => {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectFilterValues(item));
  if (typeof value === "boolean") return [value ? "Да" : "Не"];
  if (typeof value === "number") return [String(value)];
  if (typeof value === "object") return [JSON.stringify(value)];
  return [normalizeText(value)].filter(Boolean);
};

const extractValiFilters = (product) => {
  const sources = [
    product.filters,
    product.attributes,
    product.characteristics,
    product.specifications,
    product.properties,
    product.features,
    product.params,
    product.product_attributes,
    product.options,
  ];

  for (const source of sources) {
    if (!source) continue;

    if (Array.isArray(source)) {
      const result = {};

      source.forEach((item) => {
        const key =
          item?.name ||
          item?.title ||
          item?.attribute_name ||
          item?.key ||
          item?.label ||
          item?.filter_name;
        const value =
          item?.value ||
          item?.text ||
          item?.option ||
          item?.attribute_value ||
          item?.values ||
          item?.filter_value;

        if (key && value !== undefined && value !== null && value !== "") {
          result[normalizeText(key)] = value;
        }
      });

      if (Object.keys(result).length > 0) return result;
    }

    if (typeof source === "object" && !Array.isArray(source) && Object.keys(source).length > 0) {
      return source;
    }
  }

  return {};
};

const findMarkupPercent = (markups = [], mainCategory, subCategory) => {
  const main = normalizeSearchText(mainCategory);
  const sub = normalizeSearchText(subCategory);

  return Number(
    markups.find(
      (item) =>
        normalizeSearchText(item.main_category) === main &&
        normalizeSearchText(item.sub_category) === sub
    )?.markup_percent || 0
  );
};

const getFilter = (product, possibleKeys = []) => {
  const filters = product?.filters || {};
  const candidates = possibleKeys.map((key) => normalizeSearchText(key));

  for (const [key, value] of Object.entries(filters)) {
    if (candidates.includes(normalizeSearchText(key))) return value;
  }

  return undefined;
};

const getProductAttributeText = (product) => {
  const filterText = Object.entries(product?.filters || {})
    .flatMap(([key, value]) => [key, ...collectFilterValues(value)])
    .join(" ");

  return normalizeSearchText(
    [
      product?.attributes,
      product?.characteristics,
      product?.specs,
      product?.description,
      filterText,
    ]
      .filter(Boolean)
      .join(" ")
  );
};

const productText = (product) =>
  normalizeSearchText(
    [
      product?.title,
      product?.name,
      product?.category,
      product?.mainCategory,
      product?.site_main_category,
      product?.site_sub_category,
      product?.manufacturer,
      product?.model,
      getProductAttributeText(product),
    ]
      .filter(Boolean)
      .join(" ")
  );

const getProductNameText = (product) => normalizeSearchText(`${product?.title || ""} ${product?.name || ""}`);
const getPrimaryProductName = (product) => normalizeSearchText(product?.title || product?.name || "");
const productHasExactSubCategory = (product, categories = []) => {
  const subCategory = normalizeSearchText(product?.site_sub_category || product?.category || product?.subCategory);
  return categories.some((category) => subCategory === normalizeSearchText(category));
};

const getValiAvailability = (product = {}) => {
  const raw = product.raw || {};
  const explicitType = String(product.availability_type || raw.availability_type || "").toLowerCase().trim();
  const text = String(
    product.availability_text ??
      raw.availability_text ??
      product.availability ??
      raw.availability ??
      product.delivery_status ??
      raw.delivery_status ??
      product.stock_status ??
      raw.stock_status ??
      product.status_text ??
      raw.status_text ??
      product.expected_delivery ??
      raw.expected_delivery ??
      ""
  ).toLowerCase();
  const rawStatus = product.status ?? raw.status;
  const statusNumber = Number(rawStatus);
  const statusText = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "";
  const qty = Number(
    product.stock_quantity ??
      raw.stock_quantity ??
      product.quantity ??
      raw.quantity ??
      product.qty ??
      raw.qty ??
      product.stock ??
      raw.stock ??
      product.available_quantity ??
      raw.available_quantity ??
      0
  );

  if (
    explicitType === "in_stock" ||
    text.includes("налич") ||
    text.includes("available") ||
    text.includes("in stock") ||
    statusNumber === 0 ||
    statusNumber === 1 ||
    qty > 0
  ) {
    return { label: "В наличност", type: "in_stock", stockQty: qty };
  }

  return { label: "Не е в реална наличност", type: "unavailable", stockQty: qty };
};

const hasRealAvailability = (product) => {
  if (product.source === "vali") return product.availabilityType === "in_stock";
  if (product.stockQty !== null && product.stockQty !== undefined) return Number(product.stockQty) > 0;
  if (product.availabilityType) return product.availabilityType === "in_stock";
  return true;
};

const isCpu = (product) => {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("процесор ") || productHasExactSubCategory(product, ["Процесори", "CPU", "Processors"]);
  const blocked = /видео\s*карта|graphics|gpu|дънна\s*платка|motherboard|mainboard|кутия|case|кабел|adapter|адаптер|software/i.test(text);
  return allowed && !blocked;
};

const isMotherboard = (product) => {
  const name = getPrimaryProductName(product);
  return name.startsWith("дънна платка ") || productHasExactSubCategory(product, ["Дънни платки", "Motherboards", "Mainboards"]);
};

const isRam = (product) => {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("памет ") || /\bddr[345]\b/i.test(text) || productHasExactSubCategory(product, ["RAM памети", "RAM памет", "Оперативна памет", "Memory"]);
  const blocked = /видео\s*карта|graphics|gpu|дънна\s*платка|motherboard|mainboard|\bssd\b|\bhdd\b|твърд\s*диск|sodimm|so-dimm|лаптоп/i.test(text);
  return allowed && !blocked;
};

const isGpu = (product) => {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const accessoryText = normalizeSearchText(`${product?.name || ""} ${product?.title || ""} ${product?.category || ""}`);
  const allowed = name.startsWith("видео карта ") || productHasExactSubCategory(product, ["Видео карти", "GPU", "Graphics Cards"]);
  const blocked = /воден\s*блок|water\s*block|охлаждане|cooler|брекет|bracket|backplate|кабел|software/i.test(accessoryText);
  return allowed && !blocked;
};

const isStorage = (product) => {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed =
    productHasExactSubCategory(product, ["SSD / HDD", "SSD", "HDD", "Твърди дискове", "Storage"]) ||
    name.startsWith("ssd ") ||
    name.startsWith("твърд диск ") ||
    name.startsWith("hdd ") ||
    (/\bnvme\b|\bm\.?2\b|\bsata3\b/i.test(name) && /\bssd\b|твърд\s*диск|\bhdd\b/i.test(name));
  const blocked = /настолен\s*компютър|готов\s*компютър|лаптоп|notebook|дънна\s*платка|motherboard|mainboard|adapter|адаптер|case|кутия|чекмедже|enclosure|кутия\s*за|докинг|docking|heatsink|радиатор/i.test(text);
  return allowed && !blocked;
};

const isPsu = (product) => {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("захранващ блок ") || productHasExactSubCategory(product, ["Захранвания", "Power Supplies", "PSU"]);
  const blocked = /адаптер|adapter|\busb\b|разклонител/i.test(text);
  return allowed && !blocked;
};

const isCase = (product) => {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("кутия ") || productHasExactSubCategory(product, ["Кутии", "Cases", "Computer Cases"]);
  const blocked = /кутийка|батерия|battery|\bdvd\b|кабел|adapter|адаптер/i.test(text);
  return allowed && !blocked;
};

const isCooler = (product) => {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed =
    name.startsWith("охладител ") ||
    name.startsWith("водно охлаждане") ||
    productHasExactSubCategory(product, ["Охлаждане", "Охладители", "CPU Coolers"]);
  const blocked = /воден\s*блок|water\s*block/i.test(text) && !/cpu|процесор/i.test(text);
  return allowed && !blocked;
};

const getSocket = (product) => {
  const explicitSocket = normalizeSearchText(
    getFilter(product, ["CPU Socket", "Socket", "Сокет", "Процесорен сокет", "Processor Socket", "Socket Type"])
  );
  const haystack = `${explicitSocket} ${getProductAttributeText(product)} ${getProductNameText(product)}`;
  const socketPatterns = [
    ["AM5", /\bam5\b/i],
    ["AM4", /\bam4\b/i],
    ["LGA1851", /\blga\s*1851\b|\b1851\b/i],
    ["LGA1700", /\blga\s*1700\b|\b1700\b/i],
    ["LGA1200", /\blga\s*1200\b|\b1200\b/i],
    ["LGA1155", /\blga\s*1155\b|\b1155\b/i],
    ["LGA1151", /\blga\s*1151\b|\b1151\b/i],
  ];

  return socketPatterns.find(([, pattern]) => pattern.test(haystack))?.[0] || "";
};

const getRamType = (product) => {
  const explicitType = normalizeSearchText(getFilter(product, ["RAM Type", "Memory Type", "DDR", "Тип памет", "Памет", "Supported Memory"]));
  const haystack = `${explicitType} ${getProductAttributeText(product)} ${getProductNameText(product)}`;
  if (/\bddr5\b/i.test(haystack)) return "DDR5";
  if (/\bddr4\b/i.test(haystack)) return "DDR4";
  if (/\bddr3\b/i.test(haystack)) return "DDR3";
  return "";
};

const estimateCpuWatts = (product) => {
  const text = productText(product);
  const explicit = text.match(/(\d{2,3})\s*w\b/i);
  if (explicit) return Number(explicit[1]);
  if (/ryzen\s*9|i9/i.test(text)) return 170;
  if (/ryzen\s*7|i7/i.test(text)) return 125;
  if (/ryzen\s*5|i5/i.test(text)) return 95;
  return 75;
};

const estimateGpuWatts = (product) => {
  const text = productText(product);
  const explicit = text.match(/(\d{3,4})\s*w\b/i);
  if (explicit) return Number(explicit[1]);
  if (/4090|7900\s*xtx/i.test(text)) return 450;
  if (/4080|5080|7900\s*xt/i.test(text)) return 340;
  if (/4070|5070|7800\s*xt/i.test(text)) return 260;
  if (/4060|5060|7700\s*xt|7600/i.test(text)) return 180;
  if (/3060|6600/i.test(text)) return 170;
  if (/3050|1650|6400/i.test(text)) return 120;
  return 180;
};

const estimateGpuTier = (product) => {
  const text = productText(product);
  if (/5090|4090/.test(text)) return 10;
  if (/5080|4080|7900\s*xtx|9070/.test(text)) return 9;
  if (/5070|4070|7800\s*xt|b580/.test(text)) return 8;
  if (/5060|4060|7700\s*xt|7600|b570/.test(text)) return 7;
  if (/3060|6600|3050/.test(text)) return 5;
  if (/1650|6400|1030|710/.test(text)) return 2;
  return 4;
};

const estimateCpuTier = (product) => {
  const text = productText(product);
  if (/ryzen\s*9|i9|ultra\s*9/.test(text)) return 10;
  if (/ryzen\s*7|i7|ultra\s*7/.test(text)) return 8;
  if (/ryzen\s*5|i5|ultra\s*5/.test(text)) return 6;
  if (/ryzen\s*3|i3/.test(text)) return 4;
  return 5;
};

const getRamGb = (product) => {
  const text = productText(product);
  const kitMatch = text.match(/(\d+)\s*gb\s*\(\s*2\s*x\s*(\d+)\s*gb/i);
  if (kitMatch) return Number(kitMatch[1]);
  const match = text.match(/(\d+)\s*gb/i);
  return match ? Number(match[1]) : 0;
};

const getStorageGb = (product) => {
  const text = productText(product);
  const tbMatch = text.match(/(\d+(?:[.,]\d+)?)\s*tb/i);
  if (tbMatch) return Number(tbMatch[1].replace(",", ".")) * 1000;
  const gbMatch = text.match(/(\d+)\s*gb/i);
  return gbMatch ? Number(gbMatch[1]) : 0;
};

const getPsuWatts = (product) => {
  const text = productText(product);
  const match = text.match(/(\d{3,4})\s*w\b/i) || text.match(/(\d{3,4})\s*вата/i);
  return match ? Number(match[1]) : 0;
};

const scoreGamingPart = (product, { budget = 0, rgbPreference = false, cpuPreference = "" } = {}) => {
  const text = productText(product);
  let score = 0;

  score += Number(product.price || 0) / Math.max(Number(budget || 1), 1);
  if (rgbPreference && /\brgb\b|argb|подсвет/i.test(text)) score -= 0.12;
  if (/gaming|gamer|rtx|rx\s*\d|geforce|radeon|nvme/i.test(text)) score -= 0.08;
  if (cpuPreference === "amd" && /amd|ryzen|am4|am5/i.test(text)) score -= 0.18;
  if (cpuPreference === "intel" && /intel|core\s*i[3579]|lga/i.test(text)) score -= 0.18;
  return score;
};

const componentLabel = {
  CPU: "Процесор",
  Motherboard: "Дънна платка",
  RAM: "RAM",
  GPU: "Видео карта",
  SSD: "SSD",
  PSU: "Захранване",
  Case: "Кутия",
  Cooler: "Охлаждане",
};

const toOfferComponent = (type, product) => ({
  type,
  name: product.name,
  price: product.price,
  image: product.image,
  catalog_number: product.catalog_number || product.reference_number || "",
  id: product.id,
  slug: product.slug || "",
  productUrl: product.productUrl,
});

const estimatePerformance = ({ games = [], useCase = "", gpu, cpu }) => {
  const text = normalizeSearchText(`${games.join(" ")} ${useCase}`);
  const gpuText = productText(gpu);
  const cpuText = productText(cpu);

  if (/cs2|counter/.test(text)) {
    return /4060|7600|3060|6600|4070|7700|7800|5070/.test(gpuText)
      ? "CS2: очаквано много добър 1080p competitive performance при подходящи настройки."
      : "CS2: подходяща 1080p конфигурация, точният FPS зависи от настройките.";
  }
  if (/fortnite/.test(text)) return "Fortnite: добра 1080p gaming конфигурация, с опция за competitive настройки.";
  if (/gta/.test(text)) return "GTA V: комфортна 1080p конфигурация на високи настройки.";
  if (/стрийм|stream/.test(text)) return "Стрийминг: балансирана CPU/GPU конфигурация за игра и encode според избраните настройки.";
  if (/office|офис/.test(text)) return "Офис работа: бърза ежедневна работа, браузър, документи и леки приложения.";
  if (/ryzen\s*7|i7|ryzen\s*9|i9/.test(cpuText)) return "Силна многозадачна конфигурация с резерв за игри и работа.";
  return "Балансирана конфигурация за 1080p gaming и ежедневна работа.";
};

const normalizeLocalProduct = (product) => {
  const netPrice = Number(product.price || 0);
  const id = `local-${product.id}`;

  return {
    id,
    localId: product.id,
    catalog_number: product.catalog_number || "",
    slug: product.slug || "",
    name: product.title || product.name || "Продукт",
    title: product.title || product.name || "Продукт",
    model: product.model || "",
    manufacturer: product.manufacturer || product.brand || "",
    reference_number: product.reference_number || product.referenceNumber || "",
    mainCategory: product.main_category || product.mainCategory || product.category || "Компютри",
    category: product.category || product.sub_category || "Компютри",
    price: grossPrice(netPrice),
    netPrice,
    stockQty: product.stock === undefined ? null : Number(product.stock || 0),
    availabilityType: Number(product.stock || 0) > 0 ? "in_stock" : "",
    image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image || "",
    images: Array.isArray(product.images) ? product.images : product.image ? [product.image] : [],
    description: product.description || "",
    filters: product.filters || product.specs || {},
    source: "local",
    productUrl: `${SITE_ORIGIN}/product/${id}`,
  };
};

const normalizeValiProduct = (product, markups) => {
  const filters = extractValiFilters(product);
  const basePrice = Number(product.price_partner || product.price_client || 0);
  const markupPercent = findMarkupPercent(markups, product.site_main_category, product.site_sub_category);
  const siteNetPrice = roundMoney(basePrice + (basePrice * markupPercent) / 100);
  const title = getBgText(product.name) || product.model || "VALI продукт";
  const availability = getValiAvailability(product);
  const id = `vali-${product.id}`;

  return {
    id,
    valiId: product.id,
    catalog_number: product.catalog_number || "",
    slug: product.slug || "",
    title,
    name: title,
    model: product.model || "",
    manufacturer: product.manufacturer || product.brand || product.vendor || "",
    reference_number: product.reference_number || product.referenceNumber || product.sku || "",
    mainCategory: product.site_main_category || "Други",
    category: product.site_sub_category || product.site_main_category || "Други",
    price: grossPrice(siteNetPrice),
    netPrice: siteNetPrice,
    basePrice,
    markupPercent,
    stockQty: availability.stockQty,
    availabilityType: availability.type,
    availabilityLabel: availability.label,
    warranty: product.warranty || product.raw?.warranty || null,
    image: product.images?.[0]?.href || product.image || "",
    images: product.images?.map((item) => item.href).filter(Boolean) || [],
    description: getBgText(product.description) || "",
    filters,
    source: "vali",
    productUrl: `${SITE_ORIGIN}/product/${id}`,
  };
};

const fetchAll = async (queryFactory) => {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFactory().range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...(data || []));
    if ((data || []).length < SUPABASE_PAGE_SIZE) return { data: rows, error: null };
    from += SUPABASE_PAGE_SIZE;
  }
};

const loadVisibleProducts = async () => {
  const [markupsRes, valiRes, localRes] = await Promise.all([
    supabase.from("category_markups").select("*"),
    fetchAll(() => supabase.from("vali_products").select(VALI_PRODUCT_SELECT).eq("show", true)),
    fetchAll(() => supabase.from("products").select("*").eq("show", true)),
  ]);

  const markups = markupsRes.data || [];
  const products = [];

  if (valiRes.error) {
    console.warn("[AI build PC] Partial or failed vali_products load.", valiRes.error.message);
  }
  if (localRes.error && !String(localRes.error.message || "").includes("products.show")) {
    console.warn("[AI build PC] Partial or failed products load.", localRes.error.message);
  }

  products.push(...(valiRes.data || []).map((product) => normalizeValiProduct(product, markups)));
  products.push(...(localRes.data || []).map(normalizeLocalProduct));

  return products.filter(
    (product) =>
      product.productUrl &&
      Number(product.price || 0) > 0 &&
      hasRealAvailability(product)
  );
};

const getPools = (products) => ({
  CPU: products.filter(isCpu),
  Motherboard: products.filter(isMotherboard),
  RAM: products.filter(isRam),
  GPU: products.filter(isGpu),
  SSD: products.filter(isStorage),
  PSU: products.filter(isPsu),
  Case: products.filter(isCase),
  Cooler: products.filter(isCooler),
});

const sortByFit = (products, options) =>
  [...products].sort((first, second) => scoreGamingPart(first, options) - scoreGamingPart(second, options));

const chooseBuild = (pools, options) => {
  const budget = Number(options.budget || 0);
  const cpuPool = sortByFit(pools.CPU, options).slice(0, 8);
  const gpuPool = [...pools.GPU]
    .sort((first, second) => {
      const tierDelta = estimateGpuTier(second) - estimateGpuTier(first);
      if (tierDelta !== 0) return tierDelta;
      return Number(first.price || 0) - Number(second.price || 0);
    })
    .slice(0, 12);
  const casePool = sortByFit(pools.Case, options);
  const wantsGaming = /gaming|game|cs2|fortnite|gta|стрийм|stream/i.test(
    `${options.useCase || ""} ${(options.games || []).join(" ")}`
  );
  const storageCandidates = wantsGaming
    ? pools.SSD.filter((product) => getStorageGb(product) >= 480)
    : pools.SSD;
  const storagePool = sortByFit(storageCandidates.length > 0 ? storageCandidates : pools.SSD, options);
  const psuPool = [...pools.PSU].sort((first, second) => {
    const wattsDelta = getPsuWatts(first) - getPsuWatts(second);
    if (wattsDelta !== 0) return wattsDelta;
    return Number(first.price || 0) - Number(second.price || 0);
  });
  const coolerPool = sortByFit(pools.Cooler, options);

  let best = null;

  for (const cpu of cpuPool) {
    const cpuSocket = getSocket(cpu);
    if (!cpuSocket) continue;

    const boards = sortByFit(
      pools.Motherboard.filter((board) => getSocket(board) === cpuSocket),
      options
    ).slice(0, 6);

    for (const motherboard of boards) {
      const boardRamType = getRamType(motherboard);
      const compatibleRam = pools.RAM.filter((ram) => {
        const ramType = getRamType(ram);
        return (!boardRamType || !ramType || ramType === boardRamType) && (!wantsGaming || getRamGb(ram) >= 16);
      });
      const ramPool = sortByFit(
        compatibleRam.length > 0
          ? compatibleRam
          : pools.RAM.filter((ram) => !boardRamType || !getRamType(ram) || getRamType(ram) === boardRamType),
        options
      ).slice(0, 5);

      for (const ram of ramPool) {
        for (const gpu of gpuPool) {
          const minPsuWatts = Math.ceil((estimateCpuWatts(cpu) + estimateGpuWatts(gpu) + 120) * 1.35);
          const psu = psuPool.find((candidate) => getPsuWatts(candidate) >= minPsuWatts);
          const storage = storagePool[0];
          const computerCase = casePool[0];
          if (!psu || !storage || !computerCase) continue;

          const needsCooler = /tray|без\s*охладител|no\s*cooler|без\s*кутия/i.test(productText(cpu));
          const cooler = needsCooler ? coolerPool[0] : null;
          if (needsCooler && !cooler) continue;

          const components = [
            toOfferComponent("CPU", cpu),
            toOfferComponent("Motherboard", motherboard),
            toOfferComponent("RAM", ram),
            toOfferComponent("GPU", gpu),
            toOfferComponent("SSD", storage),
            toOfferComponent("PSU", psu),
            toOfferComponent("Case", computerCase),
            ...(cooler ? [toOfferComponent("Cooler", cooler)] : []),
          ];
          const totalPrice = roundMoney(components.reduce((sum, item) => sum + Number(item.price || 0), 0));
          if (budget > 0 && totalPrice > budget) continue;

          const performanceBias = /gaming|game|cs2|fortnite|gta|стрийм|stream/i.test(
            `${options.useCase || ""} ${(options.games || []).join(" ")}`
          )
            ? estimateGpuTier(gpu) * 90 + estimateCpuTier(cpu) * 20
            : estimateCpuTier(cpu) * 55;
          const score = performanceBias - totalPrice * 0.02;

          if (!best || score > best.score) {
            best = { components, totalPrice, score, cpu, gpu };
          }
        }
      }
    }
  }

  return best;
};

export const buildPcOffer = async (params = {}) => {
  const budget = Number(params.budget || 0);
  const products = await loadVisibleProducts();
  const pools = getPools(products);
  const missing = Object.entries(pools)
    .filter(([type, items]) => type !== "Cooler" && items.length === 0)
    .map(([type]) => type);

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      components: [],
      totalPrice: 0,
      explanation: `Няма достатъчно налични и видими продукти за: ${missing.map((type) => componentLabel[type] || type).join(", ")}.`,
    };
  }

  const build = chooseBuild(pools, {
    budget,
    useCase: params.useCase || "",
    games: Array.isArray(params.games) ? params.games : [],
    rgbPreference: Boolean(params.rgbPreference),
    cpuPreference: normalizeSearchText(params.cpuPreference || ""),
  });

  if (!build) {
    return {
      ok: false,
      missing: [],
      components: [],
      totalPrice: 0,
      explanation:
        budget > 0
          ? "Не намерих съвместима конфигурация от налични и видими продукти в зададения бюджет."
          : "Не намерих съвместима конфигурация от налични и видими продукти.",
    };
  }

  return {
    ok: true,
    components: build.components,
    totalPrice: build.totalPrice,
    explanation:
      "Конфигурацията е избрана само от видими продукти с реална наличност в сайта. Проверени са CPU socket, DDR тип на RAM и достатъчна мощност на захранването.",
    expectedPerformance: estimatePerformance({
      games: params.games || [],
      useCase: params.useCase || "",
      gpu: build.gpu,
      cpu: build.cpu,
    }),
  };
};

export const formatBuildOfferForChat = (offer) => {
  if (!offer?.ok) {
    const missingText = (offer?.missing || []).length
      ? `\nЛипсващи компоненти: ${(offer.missing || []).map((type) => componentLabel[type] || type).join(", ")}`
      : "";
    return `${offer?.explanation || "Не намерих подходяща конфигурация."}${missingText}\nМоля, свържете се с магазина за ръчна оферта.`;
  }

  const lines = offer.components.flatMap((component) => [
    `${componentLabel[component.type] || component.type}: ${component.name} — ${component.price}€`,
    `Линк: [Виж продукта](${component.productUrl})`,
    "",
  ]);

  lines.push(`Общо: ${offer.totalPrice}€`);
  lines.push("");
  lines.push(offer.explanation);
  if (offer.expectedPerformance) lines.push(offer.expectedPerformance);

  return lines.join("\n").trim();
};

export const extractPcBuildParams = ({ message = "", history = [] } = {}) => {
  const allMessages = [
    ...(Array.isArray(history) ? history : []),
    { role: "user", content: message },
  ];
  const userText = allMessages
    .filter((item) => item?.role !== "assistant")
    .map((item) => item.content || "")
    .join("\n");
  const assistantText = allMessages
    .filter((item) => item?.role === "assistant")
    .map((item) => item.content || "")
    .join("\n");
  const text = normalizeSearchText(`${userText}\n${assistantText}`);
  const current = normalizeSearchText(message);
  const previousUserText = normalizeSearchText(
    (Array.isArray(history) ? history : [])
      .filter((item) => item?.role !== "assistant")
      .map((item) => item.content || "")
      .join("\n")
  );

  const pcIntentPattern =
    /gaming\s*pc|гейминг|компютър\s+за|pc\s+за|сглоби|конфигурац|custom|cs2|counter|fortnite|gta|стрийм|stream|офис\s*pc|office\s*pc|монтаж/i;
  const hasCurrentIntent = pcIntentPattern.test(current);
  const hasContextIntent = pcIntentPattern.test(previousUserText) || /бюджет|amd|intel|rgb|какъв е бюджетът/i.test(assistantText);

  const budgetMatches = [...text.matchAll(/(?:до|budget|бюджет|около|за)?\s*(\d{3,5})(?:\s*)(?:€|евро|eur)?/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => value >= 250 && value <= 20000);
  const budget = budgetMatches.at(-1) || 0;

  const games = [];
  if (/cs2|counter/.test(text)) games.push("CS2");
  if (/fortnite/.test(text)) games.push("Fortnite");
  if (/gta/.test(text)) games.push("GTA V");

  let useCase = "custom";
  if (/офис|office/.test(text)) useCase = "office";
  if (/gaming|гейминг|cs2|fortnite|gta|игр/.test(text)) useCase = "gaming";
  if (/стрийм|stream/.test(text)) useCase = "streaming";
  if (/монтаж|video editing|premiere|davinci/.test(text)) useCase = "editing";

  let cpuPreference = "";
  if (/\bamd\b|ryzen/.test(text)) cpuPreference = "amd";
  if (/\bintel\b|core\s*i[3579]/.test(text)) cpuPreference = "intel";
  if (/нямам конкрет|без предпоч|няма значение|нямам предпоч/.test(text)) cpuPreference = "";

  const rgbPreference = /\brgb\b|argb|подсвет|светещ/i.test(text);

  return {
    shouldBuild: hasCurrentIntent || (hasContextIntent && (budget > 0 || rgbPreference || /нямам конкрет|amd|intel/.test(current))),
    missingBudget: (hasCurrentIntent || hasContextIntent) && budget <= 0,
    budget,
    useCase,
    games,
    rgbPreference,
    cpuPreference,
  };
};
