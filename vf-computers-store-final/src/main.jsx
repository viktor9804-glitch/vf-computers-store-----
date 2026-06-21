import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
  useLocation
} from "react-router-dom";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Cpu, Monitor, Laptop, HardDrive, Gamepad2, Search, ShoppingCart, Menu, X,
  Star, Heart, ShieldCheck, Truck, Wrench, Phone, Mail, MapPin, Minus, Plus,
  Trash2, CreditCard, Sparkles, Zap, Settings, CheckCircle2, PackageCheck,
  User, SlidersHorizontal, ChevronDown, Bot, Gauge, Server, MemoryStick,
  Cable, Fan, Power, Send, ExternalLink, Download
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { CartProvider, useCart } from "./context/CartContext";
import MegaMenu from "./components/MegaMenu";
import ProductCard from "./components/ProductCard";
import ProductFilters from "./components/ProductFilters";
import ProductGallery from "./components/ProductGallery";
import Home from "./pages/Home";
import { useScrollTop } from "./hooks/useScrollTop";
import { getOptimizedImageUrl, getProductImageSrcSet, restoreOriginalImage } from "./utils/images";
import "./style.css";

const BuilderPage = React.lazy(() => import("./pages/BuilderPage"));
const CategoryRoutePage = React.lazy(() => import("./pages/Category"));
const ProductPageRoute = React.lazy(() => import("./pages/Product"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const WarrantyCheckPage = React.lazy(() => import("./pages/WarrantyCheck"));
const ServiceCheckPage = React.lazy(() => import("./pages/ServiceCheck"));
const AIAssistant = React.lazy(() => import("./components/AIAssistant"));
const Cart = React.lazy(() => import("./components/Cart"));
const Checkout = React.lazy(() => import("./components/Checkout"));
const Footer = React.lazy(() => import("./components/Footer"));

const LOGO_URL = "/VF_logo_header.webp";

const storeInfo = {
  name: "ВФ Компютри",
  phone: "0876 126 326",
  rawPhone: "0876126326",
  email: "v.f-computers@abv.bg",
  address: "гр. Елхово, ул. Славянска №5",
};


const bankInfo = {
  bank: "Пощенска банка",
  iban: "BG29BPBI79341038936401",
  bic: "BPBIBGSF",
  holder: "V F COMPUTERS LTD",
  note: "Моля използвайте номера на поръчката като основание за плащане.",
};

const paymentMethods = [
  {
    id: "cod",
    title: "Наложен платеж",
    text: "Плащане при получаване на пратката.",
    badge: "Най-често",
  },
  {
    id: "bank",
    title: "Банков превод",
    text: "Поръчката се обработва след потвърждение на превода.",
    badge: "За фирми",
  },
  {
    id: "tbi",
    title: "TBI Bank - на изплащане",
    text: "Онлайн кандидатстване за покупка на изплащане.",
    badge: "Изплащане",
  },
];

const PUBLIC_ADMIN_DISABLED = true;
const STORAGE_BUCKET = "product-images";
const VALI_PRODUCT_SELECT = [
  "id",
  "reference_number",
  "manufacturer",
  "status",
  "show",
  "public_price",
  "public_old_price",
  "discount_percent",
  "model",
  "barcode",
  "warranty",
  "name",
  "description",
  "images",
  "filters",
  "site_main_category",
  "site_sub_category",
].join(",");

const VALI_CARD_SELECT = [
  "id",
  "reference_number",
  "manufacturer",
  "status",
  "show",
  "public_price",
  "public_old_price",
  "discount_percent",
  "model",
  "barcode",
  "warranty",
  "name",
  "images",
  "site_main_category",
  "site_sub_category",
].join(",");

const formatPrice = (value) => {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const VAT_RATE = 0.20;

const calculateVat = (net) => Number(net || 0) * VAT_RATE;
const calculateGross = (net) => Number(net || 0) * (1 + VAT_RATE);

const DEFAULT_DELIVERY_SETTINGS = {
  provider: "Еконт",
  free_delivery_threshold: 200,
  delivery_min: 8,
  delivery_max: 20,
  default_delivery_price: 8,
};

const createStorageSelectionRow = () => ({
  id: globalThis.crypto?.randomUUID?.() || `storage-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  product: null,
});

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

const MANUAL_CATEGORY_GROUPS = [
  { title: "Лаптопи", items: ["Реновирани Лаптопи"] },
  { title: "Компютри", items: ["Реновирани Компютри"] },
];

const normalizeText = (value) => String(value || "").trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();

const normalizeComparableValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Да" : "Не";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return normalizeText(value);
};

const collectFilterValues = (value) => {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectFilterValues(item));
  }
  if (typeof value === "boolean") {
    return [value ? "Да" : "Не"];
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  if (typeof value === "object") {
    return [JSON.stringify(value)];
  }
  const text = normalizeText(value);
  return text ? [text] : [];
};

const sortFilterValues = (values) => {
  return [...values].sort((first, second) => {
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const firstNumeric = !Number.isNaN(firstNumber) && first.trim() !== "";
    const secondNumeric = !Number.isNaN(secondNumber) && second.trim() !== "";

    if (firstNumeric && secondNumeric) {
      return firstNumber - secondNumber;
    }

    return first.localeCompare(second, "bg", { numeric: true, sensitivity: "base" });
  });
};

const mergeCategoryGroups = (groups = [], extraGroups = []) => {
  const map = new Map();

  [...groups, ...extraGroups].forEach((group, groupIndex) => {
    const title = normalizeText(group.title);
    if (!title) return;

    if (!map.has(title)) {
      map.set(title, {
        title,
        image: group.image || megaCategories[groupIndex % megaCategories.length]?.image || "/public-mega-menu/components.webp",
        items: new Set(),
      });
    }

    const current = map.get(title);
    if (!current.image && group.image) current.image = group.image;

    (group.items || []).forEach((item) => {
      const itemTitle = normalizeText(item);
      if (itemTitle) current.items.add(itemTitle);
    });
  });

  return Array.from(map.values()).map((group, index) => ({
    title: group.title,
    image: group.image || megaCategories[index % megaCategories.length]?.image || "/public-mega-menu/components.webp",
    items: sortFilterValues(Array.from(group.items)),
  }));
};

const extractValiFilters = (p) => {
  const sources = [
    p.filters,
    p.attributes,
    p.characteristics,
    p.specifications,
    p.properties,
    p.features,
    p.params,
    p.product_attributes,
    p.options,
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

const getFilter = (product, possibleKeys = []) => {
  const filters = product?.filters || {};
  const normalizedCandidates = possibleKeys.map((key) => normalizeKey(key));

  for (const [key, value] of Object.entries(filters)) {
    if (normalizedCandidates.includes(normalizeKey(key))) {
      return value;
    }
  }

  return undefined;
};

const estimateGpuTier = (gpuTitle = "") => {
  const t = gpuTitle.toLowerCase();

  if (t.includes("5090") || t.includes("4090")) return 10;
  if (t.includes("5080") || t.includes("4080") || t.includes("7900 xtx")) return 9;
  if (t.includes("5070") || t.includes("4070") || t.includes("7800 xt")) return 8;
  if (t.includes("5060") || t.includes("4060") || t.includes("7700 xt")) return 7;
  if (t.includes("3060") || t.includes("6600") || t.includes("7600")) return 6;
  if (t.includes("3050") || t.includes("1650") || t.includes("6400")) return 4;

  return 5;
};

const estimateCpuTier = (cpuTitle = "") => {
  const t = cpuTitle.toLowerCase();

  if (t.includes("ryzen 9") || t.includes("i9")) return 10;
  if (t.includes("ryzen 7") || t.includes("i7")) return 8;
  if (t.includes("ryzen 5") || t.includes("i5")) return 6;
  if (t.includes("ryzen 3") || t.includes("i3")) return 4;

  return 5;
};

const estimateGameWeight = (game = "") => {
  const g = game.toLowerCase();

  if (
    g.includes("cyberpunk") ||
    g.includes("starfield") ||
    g.includes("alan wake") ||
    g.includes("hogwarts")
  ) return 1.25;

  if (
    g.includes("gta") ||
    g.includes("warzone") ||
    g.includes("battlefield") ||
    g.includes("forza")
  ) return 1.0;

  if (
    g.includes("fortnite") ||
    g.includes("valorant") ||
    g.includes("cs2") ||
    g.includes("league") ||
    g.includes("minecraft")
  ) return 0.65;

  return 1.0;
};

const estimateFps = ({ cpuTitle, gpuTitle, game }) => {
  const gpuTier = estimateGpuTier(gpuTitle);
  const cpuTier = estimateCpuTier(cpuTitle);
  const gameWeight = estimateGameWeight(game);
  const base = ((gpuTier * 22) + (cpuTier * 8)) / gameWeight;

  return {
    low: Math.round(base * 1.25),
    medium: Math.round(base),
    high: Math.round(base * 0.72),
  };
};

const isCategoryMatch = (product, keywords = []) => {
  const haystack = `${product.mainCategory || ""} ${product.category || ""} ${product.title || ""} ${product.name || ""}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
};

const norm = (v = "") => String(v).toLowerCase().trim();

const productText = (p) =>
  norm([
    p?.title,
    p?.name,
    p?.category,
    p?.site_main_category,
    p?.site_sub_category,
    p?.manufacturer,
    p?.model,
  ].filter(Boolean).join(" "));

const normalizeSearchText = (value) => normalizeComparableValue(value).toLowerCase();

const getProductSubCategory = (product) => normalizeSearchText(
  product?.site_sub_category || product?.subCategory || product?.category
);

const getProductTypeText = (product) => normalizeSearchText(
  product?.type || product?.product_type || product?.kind || getFilter(product, ["Type", "Тип", "Product Type", "Продуктов тип"])
);

const getProductAttributeText = (product) => {
  const filters = product?.filters || {};
  const filterText = Object.entries(filters)
    .flatMap(([key, value]) => [key, ...collectFilterValues(value)])
    .join(" ");

  return normalizeSearchText([
    product?.attributes,
    product?.characteristics,
    product?.specs,
    product?.description,
    filterText,
  ].filter(Boolean).join(" "));
};

const getProductNameText = (product) => normalizeSearchText(`${product?.title || ""} ${product?.name || ""}`);
const getProductCategoryText = (product) => normalizeSearchText(
  `${product?.site_sub_category || ""} ${product?.category || ""}`
);
const getPrimaryProductName = (product) => norm(product?.title || product?.name || "");

const productHasExactSubCategory = (product, categories = []) => {
  const subCategory = getProductSubCategory(product);
  return categories.some((category) => subCategory === normalizeSearchText(category));
};

const productMatchesTypeOrAttributes = (product, keywords = []) => {
  const typeText = getProductTypeText(product);
  const attributeText = getProductAttributeText(product);
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeSearchText(keyword);
    return typeText.includes(normalizedKeyword) || attributeText.includes(normalizedKeyword);
  });
};

const productNameIncludes = (product, keywords = []) => {
  const nameText = getProductNameText(product);
  return keywords.some((keyword) => nameText.includes(normalizeSearchText(keyword)));
};

const productNameExcludes = (product, keywords = []) => {
  const nameText = getProductNameText(product);
  return keywords.some((keyword) => nameText.includes(normalizeSearchText(keyword)));
};

const CPU_SUBCATEGORIES = ["Процесори", "CPU", "Processors"];
const MOTHERBOARD_SUBCATEGORIES = ["Дънни платки", "Дънна платка", "Motherboards", "Mainboards"];
const RAM_SUBCATEGORIES = ["RAM памети", "RAM памет", "Оперативна памет", "Memory", "Desktop Memory"];
const STORAGE_SUBCATEGORIES = ["SSD / HDD", "SSD", "HDD", "Твърди дискове", "Hard Drives", "Storage", "NVMe"];

function getSocket(product) {
  const explicitSocket = normalizeSearchText(getFilter(product, [
    "CPU Socket",
    "Socket",
    "Сокет",
    "Процесорен сокет",
    "Processor Socket",
    "Socket Type",
  ]));
  const haystack = `${explicitSocket} ${getProductAttributeText(product)} ${getProductNameText(product)}`;

  const socketPatterns = [
    ["AM5", /\bam5\b/i],
    ["AM4", /\bam4\b/i],
    ["LGA1700", /\blga\s*1700\b|\b1700\b/i],
    ["LGA1851", /\blga\s*1851\b|\b1851\b/i],
    ["LGA1200", /\blga\s*1200\b|\b1200\b/i],
    ["LGA1151", /\blga\s*1151\b|\b1151\b/i],
    ["TR4", /\btr4\b/i],
    ["sTRX4", /\bstrx4\b/i],
  ];

  return socketPatterns.find(([, pattern]) => pattern.test(haystack))?.[0] || "";
}

function getRamType(product) {
  const explicitType = normalizeSearchText(getFilter(product, [
    "RAM Type",
    "Memory Type",
    "DDR",
    "Тип памет",
    "Памет",
    "Supported Memory",
  ]));
  const haystack = `${explicitType} ${getProductAttributeText(product)} ${getProductNameText(product)}`;

  if (/\bddr5\b/i.test(haystack)) return "DDR5";
  if (/\bddr4\b/i.test(haystack)) return "DDR4";
  if (/\bddr3\b/i.test(haystack)) return "DDR3";

  return "";
}

function getStorageType(product) {
  const haystack = `${getProductTypeText(product)} ${getProductAttributeText(product)} ${getProductNameText(product)}`;

  if (/\bnvme\b/i.test(haystack)) return "NVMe SSD";
  if (/\bm\.?2\b/i.test(haystack) && /\bsata\b/i.test(haystack)) return "M.2 SATA SSD";
  if (/\bhdd\b|\bhard\s*drive\b|твърд диск/i.test(haystack)) return "HDD";
  if (/\bssd\b/i.test(haystack) && /\bsata\b/i.test(haystack)) return "SATA SSD";
  if (/\bssd\b|\bsolid\s*state/i.test(haystack)) return "SSD";

  return "";
}

function isCpu(product) {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("процесор ") || productHasExactSubCategory(product, ["Процесори"]);
  const blocked = /видео\s*карта|videocard|graphics|gpu|дънна\s*платка|motherboard|mainboard|кутия|case|суич|switch|кабел|cable|адаптер|adapter|софтуер|software/i.test(text);

  return allowed && !blocked;
}

function isMotherboard(product) {
  const name = getPrimaryProductName(product);
  return name.startsWith("дънна платка ") || productHasExactSubCategory(product, ["Дънни платки"]);
}

function isRam(product) {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("памет ") || /\bddr[345]\b/i.test(text);
  const blocked = /видео\s*карта|videocard|graphics|gpu|дънна\s*платка|motherboard|mainboard|\bssd\b|\bhdd\b|твърд\s*диск|суич|switch/i.test(text);

  return allowed && !blocked;
}

function isGpu(product) {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("видео карта ");
  const blocked = /воден\s*блок|water\s*block|охлаждане|cooling|cooler|брекет|bracket|кабел|cable|софтуер|software/i.test(text);

  return allowed && !blocked;
}

function isStorage(product) {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const exactStorageCategory = productHasExactSubCategory(product, ["SSD / HDD", "SSD", "HDD", "Твърди дискове"]);
  const directDisk = name.startsWith("ssd ") || name.startsWith("твърд диск ") || name.startsWith("hdd ");
  const hasStorageInterface = /\bnvme\b|\bm\.?2\b|\bsata3\b/i.test(name);
  const isDiskContext = /\bssd\b|твърд\s*диск|\bhdd\b|\bhard\s*(disk|drive)\b/i.test(name);
  const blockedComputer = /настолен\s*компютър|готов\s*компютър|компютър|computer|desktop|workstation|мини\s*компютър|mini\s*pc|лаптоп|laptop|notebook/i.test(name);
  const blockedAccessory = /дънна\s*платка|motherboard|mainboard|скоба|bracket|калъф|case|enclosure|чекмедже|drawer|мултифункционално\s*устройство|multifunction|mfp|адаптер|adapter/i.test(text);
  const blocked = blockedComputer || blockedAccessory;

  return (exactStorageCategory || directDisk || (hasStorageInterface && isDiskContext)) && !blocked;
}

function isPsu(product) {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("захранващ блок ");
  const blocked = /захранващ\s*адаптер|power\s*adapter|\busb\b|hama|разклонител/i.test(text);

  return allowed && !blocked;
}

function isCase(product) {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("кутия ");
  const blocked = /кутийка|батерия|battery|\bdvd\b|кабел|cable|адаптер|adapter/i.test(text);

  return allowed && !blocked;
}

function isCooler(product) {
  const name = getPrimaryProductName(product);
  const text = productText(product);
  const allowed = name.startsWith("охладител ") || name.startsWith("водно охлаждане") || name.startsWith("вентилатор");
  const blocked = /воден\s*блок|water\s*block/i.test(text) && !/cpu|процесор/i.test(text);

  return allowed && !blocked;
}

const findMarkupPercent = (markups = [], mainCategory, subCategory) => {
  const match = markups.find((item) =>
    normalizeKey(item.main_category) === normalizeKey(mainCategory) &&
    normalizeKey(item.sub_category) === normalizeKey(subCategory)
  );
  return Number(match?.markup_percent || 0);
};

const SUPABASE_PAGE_SIZE = 1000;

const fetchAllSupabaseRows = async (buildQuery, pageSize = SUPABASE_PAGE_SIZE) => {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to).range(from, to);

    if (error) {
      return { data: rows, error };
    }

    const pageRows = data || [];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      return { data: rows, error: null };
    }

    from += pageSize;
  }
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

  if (explicitType === "discontinued") {
    return { label: "Вече не се предлага", type: "discontinued", canOrder: false };
  }

  if (explicitType === "out_of_stock" || statusNumber === 0) {
    return { label: "Няма наличност", type: "out_of_stock", canOrder: false };
  }

  if (explicitType === "ask_price" || statusNumber === 5) {
    return { label: "Попитай за цена", type: "ask_price", canOrder: false };
  }

  if (explicitType === "limited" || statusNumber === 2) {
    return { label: "Ограничена наличност (до 3 бр.)", type: "limited", canOrder: true };
  }

  if (
    explicitType === "on_the_way" ||
    text.includes("на път") ||
    text.includes("очаква") ||
    text.includes("preorder") ||
    text.includes("on the way") ||
    statusText.includes("на път") ||
    statusText.includes("очаква") ||
    statusNumber === 3
  ) {
    return {
      label: "На път",
      type: "on_the_way",
      canOrder: true,
    };
  }

  if (
    explicitType === "in_stock" ||
    text.includes("налич") ||
    text.includes("available") ||
    text.includes("in stock") ||
    statusNumber === 1 ||
    qty > 0
  ) {
    return {
      label: "В наличност",
      type: "in_stock",
      canOrder: true,
    };
  }


  if (explicitType === "order" || statusNumber === 4) {
    return { label: "По заявка (обади се)", type: "order", canOrder: true };
  }

  return {
    label: "С поръчка",
    type: "order",
    canOrder: true,
  };
};

const getValiStockStatus = (product) => getValiAvailability(product).label;

const isPromotionCurrentlyActive = (promotion, now = new Date()) => {
  if (!promotion?.is_active) return false;
  const startsAt = promotion.starts_at ? new Date(promotion.starts_at) : null;
  const endsAt = promotion.ends_at ? new Date(promotion.ends_at) : null;

  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
};

const findBestPromotion = (product, promotions = []) => {
  const now = new Date();
  const productIds = [product.id, product.valiId, product.localId].filter(Boolean).map((value) => String(value));

  let bestPromotion = null;
  let bestScore = -1;

  promotions.forEach((promotion) => {
    if (!isPromotionCurrentlyActive(promotion, now)) return;

    let score = -1;
    const promotionProductId = promotion.product_id ? String(promotion.product_id) : "";

    if (promotionProductId && productIds.includes(promotionProductId)) {
      score = 3;
    } else if (
      promotion.main_category &&
      promotion.sub_category &&
      normalizeKey(promotion.main_category) === normalizeKey(product.mainCategory) &&
      normalizeKey(promotion.sub_category) === normalizeKey(product.category)
    ) {
      score = 2;
    } else if (
      promotion.main_category &&
      normalizeKey(promotion.main_category) === normalizeKey(product.mainCategory)
    ) {
      score = 1;
    }

    if (score < 0) return;

    const discount = Number(promotion.discount_percent || 0);
    const currentDiscount = Number(bestPromotion?.discount_percent || 0);

    if (score > bestScore || (score === bestScore && discount > currentDiscount)) {
      bestScore = score;
      bestPromotion = promotion;
    }
  });

  return bestPromotion;
};

const fallbackProducts = [
  {
    id: 1,
    name: "VF Gaming Beast RTX 4060",
    category: "Gaming PC",
    price: 819,
    oldPrice: 919,
    rating: 4.9,
    stock: "В наличност",
    badge: "HOT",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80",
    specs: ["Ryzen 5", "RTX 4060 8GB", "16GB DDR4", "1TB NVMe"],
  },
  {
    id: 2,
    name: "VF Office Pro i5",
    category: "Компютри",
    price: 359,
    oldPrice: 409,
    rating: 4.7,
    stock: "В наличност",
    badge: "OFFICE",
    image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=80",
    specs: ["Intel i5", "16GB RAM", "512GB SSD", "Windows ready"],
  },
  {
    id: 3,
    name: "GeForce RTX 4060 8GB",
    category: "Видеокарти",
    price: 329,
    oldPrice: 189,
    rating: 4.9,
    stock: "Ограничено",
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80",
    specs: ["8GB GDDR6", "DLSS 3", "Ray Tracing", "Low power"],
  },
  {
    id: 4,
    name: "AMD Ryzen 7 5700X",
    category: "Процесори",
    price: 165,
    oldPrice: 189,
    rating: 4.8,
    stock: "В наличност",
    badge: "SALE",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80",
    specs: ["8 ядра", "16 нишки", "AM4", "Gaming/Work"],
  },
  {
    id: 5,
    name: "NVMe SSD 1TB Gen4",
    category: "SSD / HDD",
    price: 72,
    oldPrice: 87,
    rating: 4.9,
    stock: "В наличност",
    badge: "FAST",
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=80",
    specs: ["1TB", "M.2 NVMe", "PCIe Gen4", "Бързо зареждане"],
  },
  {
    id: 6,
    name: "Gaming Monitor 27” 165Hz",
    category: "Монитори",
    price: 199,
    oldPrice: 235,
    rating: 4.8,
    stock: "В наличност",
    badge: "165HZ",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
    specs: ["27 инча", "Full HD", "165Hz", "1ms"],
  },
  {
    id: 7,
    name: "Lenovo IdeaPad 15",
    category: "Лаптопи",
    price: 459,
    oldPrice: 509,
    rating: 4.7,
    stock: "По заявка",
    badge: "BEST",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
    specs: ["Core i5", "16GB RAM", "512GB SSD", "15.6 Full HD"],
  },
  {
    id: 8,
    name: "RGB Mechanical Keyboard",
    category: "Периферия",
    price: 39,
    oldPrice: 49,
    rating: 4.6,
    stock: "В наличност",
    badge: "RGB",
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1200&q=80",
    specs: ["Mechanical", "RGB", "BG/EN layout", "Gaming"],
  },
];

const categories = [
  { name: "Всички", icon: SlidersHorizontal },
  { name: "Gaming PC", icon: Gamepad2 },
  { name: "Компютри", icon: Cpu },
  { name: "Видео карти", icon: Server },
  { name: "Процесори", icon: Cpu },
  { name: "SSD / HDD", icon: HardDrive },
  { name: "Лаптопи", icon: Laptop },
  { name: "Монитори", icon: Monitor },
  { name: "Периферия", icon: Cable },
];

const megaCategories = [
  {
    title: "Компоненти",
    image: "/public-mega-menu/components.webp",
    items: [
      "Процесори",
      "Дънни платки",
      "Видео карти",
      "RAM памети",
      "SSD / HDD",
      "Захранвания",
      "Охладители",
      "Кутии",
      "Други компоненти",
    ],
  },
  {
    title: "Геймърски компютри",
    image: "/public-mega-menu/gaming-pc.webp",
    items: [
      "Готови конфигурации",
      "Реновирани компютри",
      "Персонализирани PC",
      "Промо комплекти",
      "Workstation",
    ],
  },
  {
    title: "Лаптопи",
    image: "/public-mega-menu/laptops.webp",
    items: [
      "Геймърски лаптопи",
      "Бизнес лаптопи",
      "Реновирани лаптопи",
      "Ултрабуци",
      "2 в 1 устройства",
      "Промо лаптопи",
    ],
  },
  {
    title: "Монитори",
    image: "/public-mega-menu/monitors.webp",
    items: [
      "Геймърски монитори",
      "IPS монитори",
      "VA монитори",
      "Извити монитори",
      "4K монитори",
      "Промо монитори",
    ],
  },
  {
    title: "Периферия",
    image: "/public-mega-menu/peripherals.webp",
    items: [
      "Клавиатури",
      "Мишки",
      "Слушалки",
      "Гейминг столове",
      "Микрофони",
      "Гейминг аксесоари",
    ],
  },
  {
    title: "Мрежово оборудване",
    image: "/public-mega-menu/network.webp",
    items: [
      "Рутери",
      "Суичове",
      "Wi-Fi адаптери",
      "Powerline адаптери",
      "Мрежови кабели",
      "Промо продукти",
    ],
  },
];

const getMegaCategoryImage = (title, index = 0) => {
  const fallbackCategory = megaCategories.find((category) => category.title === title);
  return fallbackCategory?.image || megaCategories[index % megaCategories.length]?.image || "/public-mega-menu/components.webp";
};

const buildDynamicMegaCategories = (valiProducts = []) => {
  const categoryMap = new Map();

  valiProducts.forEach((product) => {
    const mainCategory = String(product.site_main_category || "").trim();
    const subCategory = String(product.site_sub_category || "").trim();

    if (!mainCategory || !subCategory) return;

    if (!categoryMap.has(mainCategory)) {
      categoryMap.set(mainCategory, new Set());
    }

    categoryMap.get(mainCategory).add(subCategory);
  });

  const dynamicCategories = Array.from(categoryMap.entries()).map(([title, items], index) => ({
    title,
    image: getMegaCategoryImage(title, index),
    items: Array.from(items).sort((first, second) => first.localeCompare(second, "bg")),
  }));

  return mergeCategoryGroups(dynamicCategories.length > 0 ? dynamicCategories : megaCategories, MANUAL_CATEGORY_GROUPS);
};

const services = [
  { id:"diagnostics", icon:Wrench, title:"Диагностика", category:"Сервиз", image:"/services/diagnostics.png", price:"50€", note:"при отказан ремонт", altPrice:"25€", altNote:"ако клиентът желае да бъде извършен ремонт", text:"Проверка на хардуер, температури, захранване, RAM, SSD, видеокарта и общо състояние." },
  { id:"windows", icon:Monitor, title:"Инсталиране на Windows", category:"Софтуер", image:"/services/windows.png", price:"55€", note:"операционна система Windows", text:"Инсталация на Windows, базова настройка и подготовка на системата за работа." },
  { id:"pc-clean", icon:Fan, title:"Профилактика на настолен PC", category:"Профилактика", image:"/services/pc-clean.png", price:"32€", note:"настолен компютър", text:"Почистване на кутия, вентилатори, охлаждане и проверка на температури." },
  { id:"laptop-clean", icon:Laptop, title:"Профилактика на лаптоп", category:"Профилактика", image:"/services/laptop-clean.png", price:"39€", note:"лаптоп", text:"Разглобяване, почистване на охлаждане и смяна на термопаста при нужда." },
  { id:"ram", icon:MemoryStick, title:"Смяна / подмяна на RAM", category:"Ъпгрейд", image:"/services/ram.png", price:"10€", note:"RAM памет", text:"Монтаж или подмяна на RAM памет и базов тест за стабилност." },
  { id:"ssd", icon:HardDrive, title:"Смяна / подмяна на SSD", category:"Ъпгрейд", image:"/services/ssd.png", price:"20€", note:"SSD диск", text:"Монтаж или подмяна на SSD, проверка и подготовка за работа." },
  { id:"cpu", icon:Cpu, title:"Смяна на процесор", category:"Ъпгрейд", image:"/services/cpu.png", price:"30€", note:"към различен модел", altPrice:"15€", altNote:"подмяна на процесор", text:"Смяна на процесор, монтаж на охлаждане и проверка на температури." },
  { id:"gpu", icon:Server, title:"Смяна на видеокарта", category:"Ъпгрейд", image:"/services/gpu.png", price:"20.45€", note:"без инсталиране на драйвери", altPrice:"43.46€", altNote:"с включено инсталиране на драйвери", text:"Монтаж на видеокарта, проверка на захранване и тест на изображение." },
  { id:"motherboard", icon:Settings, title:"Смяна на дънна платка", category:"Хардуер", image:"/services/motherboard.png", price:"17.90€", note:"подмяна със същата, ако е възможно", altPrice:"25.56€", altNote:"смяна с друга / ъпгрейд", text:"Подмяна или ъпгрейд на дънна платка според съвместимостта на компонентите." },
  { id:"clone-ssd", icon:HardDrive, title:"Клониране HDD → SSD", category:"Данни", image:"/services/clone-ssd.png", price:"35.79€ – 51.13€", note:"според обема и сложността", text:"Прехвърляне на система и данни от стар HDD към нов SSD." },
  { id:"clone-hdd", icon:HardDrive, title:"Клониране HDD → HDD", category:"Данни", image:"/services/clone-hdd.png", price:"40.90€ – 61.36€", note:"според обема и сложността", text:"Клониране на диск към друг HDD с цел запазване на система и файлове." },
  { id:"games", icon:Gamepad2, title:"Инсталиране на игри", category:"Софтуер", image:"/services/games.png", price:"10.23€ – 23.52€", note:"зависи от играта и размера", text:"Инсталиране и базова настройка на игри според платформата и изискванията." },
  { id:"programs", icon:PackageCheck, title:"Инсталиране на програми", category:"Софтуер", image:"/services/programs.png", price:"5.11€ – 12.78€", note:"според програмата", text:"Инсталиране на основни програми, драйвери и приложения за работа." },
];


const partners = [
  {
    name: "Polycomp",
    logo: "POLYCOMP",
    logoSrc: "/partners/polycomp.svg",
    tag: "ICT дистрибутор",
    text: "Дистрибутор на ИКТ оборудване и потребителска техника.",
    url: "https://polycomp.bg/poly/home",
  },
  {
    name: "VALI Computers",
    logo: "VALI",
    logoSrc: "/partners/vali.svg",
    tag: "IT дистрибутор",
    text: "Широк асортимент от компютърни продукти, компоненти и решения.",
    url: "https://www.vali.bg/",
  },
  {
    name: "AdminBG",
    logo: "AdminBG",
    logoSrc: "/partners/adminbg.svg",
    tag: "Сервиз и части",
    text: "Специализиран сервиз и решения за компютърна поддръжка.",
    url: "https://adminbg.net/",
  },
  {
    name: "Katnis13",
    logo: "KATNIS13",
    logoSrc: "/partners/katnis13.svg",
    tag: "Счетоводство",
    text: "Счетоводни и бизнес услуги за фирмени клиенти.",
    url: "https://www.katnis13.com/",
  },
  {
    name: "TBI Bank",
    logo: "tbi bank",
    logoSrc: "/partners/tbibank.svg",
    tag: "Финансиране",
    text: "Партньор за покупки на изплащане и гъвкави финансови решения.",
    url: "https://tbibank.bg/",
  },
  {
    name: "Econt",
    logo: "ECONT",
    logoSrc: "/partners/econt.svg",
    tag: "Доставка",
    text: "Куриерски услуги и доставки до клиенти в цялата страна.",
    url: "https://www.econt.com/",
  },
];

const storeGallery = [
  "/store-gallery/store-01.jpg",
  "/store-gallery/store-02.jpg",
  "/store-gallery/store-03.jpg",
  "/store-gallery/store-04.jpg",
  "/store-gallery/store-05.jpg",
  "/store-gallery/store-06.jpg",
  "/store-gallery/store-07.jpg",
  "/store-gallery/store-08.jpg",
  "/store-gallery/store-09.jpg",
  "/store-gallery/store-10.jpg",
  "/store-gallery/store-11.jpg",
  "/store-gallery/store-12.jpg",
  "/store-gallery/store-13.jpg",
  "/store-gallery/store-14.jpg",
  "/store-gallery/store-15.jpg",
  "/store-gallery/store-16.jpg",
  "/store-gallery/store-17.jpg",
  "/store-gallery/store-18.jpg",
  "/store-gallery/store-19.jpg",
  "/store-gallery/store-20.jpg",
  "/store-gallery/store-21.jpg",
  "/store-gallery/store-22.jpg",
  "/store-gallery/store-23.jpg",
  "/store-gallery/store-24.jpg",
  "/store-gallery/store-25.jpg",
  "/store-gallery/store-26.jpg",
  "/store-gallery/store-27.jpg",
  "/store-gallery/store-28.jpg",
  "/store-gallery/store-29.jpg"
];

const mapsUrl = "https://share.google/E41TiRfxBr2f0zhbL";

const pcBuilderSteps = [
  { icon: Cpu, title: "Избери процесор", text: "Intel или AMD според бюджета и целта." },
  { icon: Server, title: "Избери видеокарта", text: "Gaming, streaming, работа или офис." },
  { icon: MemoryStick, title: "RAM и SSD", text: "Правилен баланс между скорост и капацитет." },
  { icon: Power, title: "Захранване и кутия", text: "Сигурност, охлаждане и бъдещ ъпгрейд." },
];



function AuthModal({ mode, onClose, onModeChange }) {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState("");

  const isRegister = mode === "register";

  const handleEmailAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthNotice("Попълни имейл и парола.");
      return;
    }

    setAuthLoading(true);
    setAuthNotice("");

    const result = isRegister
      ? await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: { full_name: authName.trim() || authEmail.trim() },
          },
        })
      : await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });

    setAuthLoading(false);

    if (result.error) {
      setAuthNotice(result.error.message);
      return;
    }

    setAuthNotice(isRegister ? "Регистрацията е успешна. Провери имейла си, ако Supabase изисква потвърждение." : "Успешен вход.");
    if (!isRegister) onClose();
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthNotice("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    setAuthLoading(false);

    if (error) {
      setAuthNotice(error.message);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close" onClick={onClose}><X size={18} /></button>

        <div className="auth-logo">
          <img src={LOGO_URL} alt="ВФ Компютри" />
        </div>

        <p className="section-label">Клиентски акаунт</p>
        <h2>{isRegister ? "Създай профил" : "Вход в профила"}</h2>
        <p className="auth-subtitle">
          {isRegister
            ? "Регистрирай се, за да следиш поръчки, заявки и любими продукти."
            : "Влез, за да използваш клиентски профил във ВФ Компютри."}
        </p>

        <button className="google-login" onClick={handleGoogleLogin} disabled={authLoading}>
          <span>G</span>
          Вход с Google
        </button>

        <div className="auth-divider"><span>или</span></div>

        {isRegister && (
          <input
            value={authName}
            onChange={(event) => setAuthName(event.target.value)}
            placeholder="Име"
          />
        )}

        <input
          type="email"
          value={authEmail}
          onChange={(event) => setAuthEmail(event.target.value)}
          placeholder="Имейл"
        />

        <input
          type="password"
          value={authPassword}
          onChange={(event) => setAuthPassword(event.target.value)}
          placeholder="Парола"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleEmailAuth();
          }}
        />

        {authNotice && <div className="notice">{authNotice}</div>}

        <button className="auth-submit" onClick={handleEmailAuth} disabled={authLoading}>
          {authLoading ? "Моля, изчакай..." : isRegister ? "Регистрация" : "Вход"}
        </button>

        <button className="auth-switch" onClick={() => onModeChange(isRegister ? "login" : "register")}>
          {isRegister ? "Вече имаш профил? Влез" : "Нямаш профил? Регистрирай се"}
        </button>
      </div>
    </div>
  );
}

function CookieConsent() {
  const [visible, setVisible] = useState(() => !localStorage.getItem("vf_cookie_consent"));
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(() => localStorage.getItem("vf_cookie_analytics") === "yes");

  const saveConsent = (accepted, analytics = false) => {
    localStorage.setItem("vf_cookie_consent", accepted ? "accepted" : "declined");
    localStorage.setItem("vf_cookie_analytics", analytics ? "yes" : "no");
    window.dispatchEvent(new CustomEvent("vf-analytics-consent", {
      detail: { allowed: Boolean(analytics) },
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <div>
        <b>Използваме бисквитки</b>
        <p>
          Използваме необходими бисквитки за работата на сайта и по желание аналитични бисквитки за подобряване на услугите.
        </p>

        {showSettings && (
          <label className="cookie-toggle">
            <input
              type="checkbox"
              checked={analyticsAllowed}
              onChange={(event) => setAnalyticsAllowed(event.target.checked)}
            />
            Разрешавам аналитични бисквитки
          </label>
        )}
      </div>

      <div className="cookie-actions">
        <button className="admin-secondary" onClick={() => setShowSettings((current) => !current)}>
          Настройки
        </button>
        <button className="admin-secondary" onClick={() => saveConsent(false, false)}>
          Отказвам
        </button>
        <button className="cookie-accept" onClick={() => saveConsent(true, showSettings ? analyticsAllowed : true)}>
          Приемам
        </button>
      </div>
    </div>
  );
}



function OrderDocumentsModal({ order, customerProfile, onClose }) {
  if (!order) return null;

  const invoiceNo = `VF-${String(order.id || Date.now()).padStart(6, "0")}`;
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const warrantyUntil = new Date(orderDate);
  warrantyUntil.setFullYear(warrantyUntil.getFullYear() + 2);

  const buyerName =
    customerProfile?.account_type === "company"
      ? customerProfile?.company_name || order.customer_name || "Клиент"
      : customerProfile?.full_name || order.customer_name || "Клиент";

  const buyerDetails =
    customerProfile?.account_type === "company"
      ? [
          customerProfile?.company_eik ? `ЕИК: ${customerProfile.company_eik}` : "",
          customerProfile?.company_vat ? `ДДС №: ${customerProfile.company_vat}` : "",
          customerProfile?.company_mol ? `МОЛ: ${customerProfile.company_mol}` : "",
          customerProfile?.billing_address ? `Адрес: ${customerProfile.billing_address}` : "",
        ].filter(Boolean).join(" • ")
      : [
          customerProfile?.phone || order.customer_phone ? `Телефон: ${customerProfile?.phone || order.customer_phone}` : "",
          customerProfile?.address || order.customer_address ? `Адрес: ${customerProfile?.address || order.customer_address}` : "",
        ].filter(Boolean).join(" • ");

  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total || 0);

  const printDocuments = () => {
    window.print();
  };

  return (
    <div className="docs-overlay" onClick={onClose}>
      <div className="docs-modal" onClick={(event) => event.stopPropagation()}>
        <div className="docs-actions no-print">
          <div>
            <p className="section-label">Автоматични документи</p>
            <h2>Документи за поръчка #{order.id}</h2>
            <p>Фактура, гаранционна карта и приемно-предавателен протокол.</p>
          </div>
          <div>
            <button className="profile-primary" onClick={printDocuments}>Печат / Запази PDF</button>
            <button className="admin-secondary" onClick={onClose}>Затвори</button>
          </div>
        </div>

        <div className="document-page">
          <header className="document-header">
            <div>
              <h1>ФАКТУРА</h1>
              <p>№ {invoiceNo}</p>
              <p>Дата: {orderDate.toLocaleDateString("bg-BG")}</p>
            </div>
            <div>
              <b>ВФ Компютри</b>
              <p>гр. Елхово, ул. Славянска №5</p>
              <p>Тел: 0876 126 326</p>
              <p>Имейл: v.f-computers@abv.bg</p>
            </div>
          </header>

          <section className="document-section">
            <h3>Получател</h3>
            <p><b>{buyerName}</b></p>
            <p>{buyerDetails || "Няма въведени допълнителни данни."}</p>
          </section>

          <table className="document-table">
            <thead>
              <tr>
                <th>Продукт</th>
                <th>Количество</th>
                <th>Ед. цена</th>
                <th>Сума</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="4">Продукти по поръчката</td></tr>
              ) : items.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(calculateGross(item.price))}</td>
                  <td>{formatPrice(calculateGross(Number(item.price || 0) * Number(item.quantity || 1)))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3">Общо</td>
                <td>{formatPrice(total)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="document-note">Документът е автоматично генериран от онлайн системата на ВФ Компютри.</p>
        </div>

        <div className="document-page">
          <header className="document-header">
            <div>
              <h1>ГАРАНЦИОННА КАРТА</h1>
              <p>Към поръчка #{order.id}</p>
            </div>
            <div>
              <b>ВФ Компютри</b>
              <p>Тел: 0876 126 326</p>
            </div>
          </header>

          <section className="document-section">
            <p><b>Клиент:</b> {buyerName}</p>
            <p><b>Дата на покупка:</b> {orderDate.toLocaleDateString("bg-BG")}</p>
            <p><b>Ориентировъчна гаранция до:</b> {warrantyUntil.toLocaleDateString("bg-BG")}</p>
            <p>Гаранцията е според конкретния продукт и условията на производителя/магазина.</p>
          </section>

          <table className="document-table">
            <thead><tr><th>Продукт</th><th>Гаранционен статус</th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td>Продукти по поръчката</td><td>Според продукта</td></tr>
              ) : items.map((item, index) => (
                <tr key={index}><td>{item.name}</td><td>Активна, според продукта</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="document-page">
          <header className="document-header">
            <div>
              <h1>ПРИЕМНО-ПРЕДАВАТЕЛЕН ПРОТОКОЛ</h1>
              <p>Към поръчка #{order.id}</p>
            </div>
            <div>
              <b>ВФ Компютри</b>
              <p>гр. Елхово</p>
            </div>
          </header>

          <section className="document-section">
            <p>Днес, {orderDate.toLocaleDateString("bg-BG")}, ВФ Компютри предава на клиента:</p>
            <p><b>{buyerName}</b></p>
            <p>следните стоки/услуги:</p>
          </section>

          <table className="document-table">
            <thead><tr><th>Описание</th><th>Количество</th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td>Продукти по поръчката</td><td>1</td></tr>
              ) : items.map((item, index) => (
                <tr key={index}><td>{item.name}</td><td>{item.quantity}</td></tr>
              ))}
            </tbody>
          </table>

          <div className="signatures">
            <div>Предал: ____________________</div>
            <div>Приел: ____________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerProfileModal({ session, onClose, onLogout }) {
  const user = session?.user;
  const [tab, setTab] = useState("profile");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [serviceTickets, setServiceTickets] = useState([]);
  const [profileForm, setProfileForm] = useState({
    account_type: "personal",
    full_name: user?.user_metadata?.full_name || "",
    phone: "",
    city: "",
    address: "",
    company_name: "",
    company_eik: "",
    company_vat: "",
    company_mol: "",
    billing_address: "",
  });
  const [serviceForm, setServiceForm] = useState({
    device: "",
    problem: "",
  });

  const loadProfile = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.from("customer_profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!error && data) {
      setProfileForm({
        account_type: data.account_type || "personal",
        full_name: data.full_name || user?.user_metadata?.full_name || "",
        phone: data.phone || "",
        city: data.city || "",
        address: data.address || "",
        company_name: data.company_name || "",
        company_eik: data.company_eik || "",
        company_vat: data.company_vat || "",
        company_mol: data.company_mol || "",
        billing_address: data.billing_address || "",
      });
    }
  };

  const loadOrders = async () => {
    if (!user?.id) return;
    setOrdersLoading(true);
    const { data, error } = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setOrdersLoading(false);
    if (error) {
      console.error(error);
      setOrders([]);
      return;
    }
    setOrders(data || []);
  };

  const loadServiceTickets = async () => {
    if (!user?.id) return;
    setServiceLoading(true);
    const { data, error } = await supabase.from("service_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setServiceLoading(false);
    if (error) {
      console.error(error);
      setServiceTickets([]);
      return;
    }
    setServiceTickets(data || []);
  };

  useEffect(() => {
    loadProfile();
    loadOrders();
    loadServiceTickets();
  }, [user?.id]);

  const updateProfileForm = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setProfileSaving(true);
    setProfileNotice("");

    const { error } = await supabase.from("customer_profiles").upsert({
      user_id: user.id,
      email: user.email,
      account_type: profileForm.account_type,
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      city: profileForm.city,
      address: profileForm.address,
      company_name: profileForm.company_name,
      company_eik: profileForm.company_eik,
      company_vat: profileForm.company_vat,
      company_mol: profileForm.company_mol,
      billing_address: profileForm.billing_address,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    setProfileSaving(false);

    if (error) {
      console.error(error);
      setProfileNotice("Не успях да запазя профила. Провери таблицата customer_profiles и policies.");
      return;
    }

    setProfileNotice("Профилът е запазен успешно.");
  };

  const createServiceTicket = async () => {
    if (!serviceForm.device.trim() || !serviceForm.problem.trim()) {
      setProfileNotice("Попълни устройство и описание на проблема.");
      return;
    }

    const { error } = await supabase.from("service_tickets").insert({
      user_id: user.id,
      customer_name: profileForm.full_name || user.email,
      phone: profileForm.phone,
      device: serviceForm.device,
      problem: serviceForm.problem,
      status: "Нова заявка",
    });

    if (error) {
      console.error(error);
      setProfileNotice("Не успях да създам сервизна заявка. Провери таблицата service_tickets и policies.");
      return;
    }

    setProfileNotice("Сервизната заявка е създадена успешно.");
    setServiceForm({ device: "", problem: "" });
    await loadServiceTickets();
  };

  const warrantyText = (order) => {
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) return "Гаранция според продукта";
    const warrantyUntil = new Date(created);
    warrantyUntil.setFullYear(warrantyUntil.getFullYear() + 2);
    return `Гаранция до ${warrantyUntil.toLocaleDateString("bg-BG")}`;
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
        <div className="profile-head">
          <div>
            <p className="section-label">Моят профил</p>
            <h2>{profileForm.full_name || user?.email}</h2>
            <p>{user?.email}</p>
          </div>
          <button className="profile-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="profile-tabs">
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Данни</button>
          <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Поръчки</button>
          <button className={tab === "warranty" ? "active" : ""} onClick={() => setTab("warranty")}>Гаранции</button>
          <button className={tab === "service" ? "active" : ""} onClick={() => setTab("service")}>Сервиз</button>
        </div>

        {profileNotice && <div className="notice profile-notice">{profileNotice}</div>}

        {tab === "profile" && (
          <div className="profile-panel">
            <div className="billing-type-switch">
              <button className={profileForm.account_type === "personal" ? "active" : ""} onClick={() => updateProfileForm("account_type", "personal")}>
                Физическо лице
              </button>
              <button className={profileForm.account_type === "company" ? "active" : ""} onClick={() => updateProfileForm("account_type", "company")}>
                Фирма / фактура
              </button>
            </div>

            <h3 className="profile-subtitle">Основни данни</h3>
            <div className="profile-grid">
              <label>Име и фамилия<input value={profileForm.full_name} onChange={(event) => updateProfileForm("full_name", event.target.value)} placeholder="Име и фамилия" /></label>
              <label>Телефон<input value={profileForm.phone} onChange={(event) => updateProfileForm("phone", event.target.value)} placeholder="Телефон" /></label>
              <label>Град<input value={profileForm.city} onChange={(event) => updateProfileForm("city", event.target.value)} placeholder="Град" /></label>
              <label>Адрес / офис на куриер<input value={profileForm.address} onChange={(event) => updateProfileForm("address", event.target.value)} placeholder="Адрес или офис на Еконт/Спиди" /></label>
            </div>

            {profileForm.account_type === "company" && (
              <>
                <h3 className="profile-subtitle">Фирмени данни за фактуриране</h3>
                <div className="profile-grid">
                  <label>Име на фирма<input value={profileForm.company_name} onChange={(event) => updateProfileForm("company_name", event.target.value)} placeholder="ВФ КОМПЮТРИ ООД" /></label>
                  <label>ЕИК / Булстат<input value={profileForm.company_eik} onChange={(event) => updateProfileForm("company_eik", event.target.value)} placeholder="ЕИК" /></label>
                  <label>ДДС номер<input value={profileForm.company_vat} onChange={(event) => updateProfileForm("company_vat", event.target.value)} placeholder="BG..." /></label>
                  <label>МОЛ<input value={profileForm.company_mol} onChange={(event) => updateProfileForm("company_mol", event.target.value)} placeholder="Материално отговорно лице" /></label>
                  <label className="profile-wide">Адрес за фактура<input value={profileForm.billing_address} onChange={(event) => updateProfileForm("billing_address", event.target.value)} placeholder="Адрес на фирмата за фактура" /></label>
                </div>
              </>
            )}

            <button className="profile-primary" onClick={saveProfile} disabled={profileSaving}>{profileSaving ? "Запазване..." : "Запази данните"}</button>
          </div>
        )}

        {tab === "orders" && (
          <div className="profile-panel">
            {ordersLoading ? <p className="profile-empty">Зареждане на поръчки...</p> : orders.length === 0 ? (
              <p className="profile-empty">Все още няма поръчки към този профил.</p>
            ) : (
              <div className="profile-list">
                {orders.map((order) => (
                  <div className="profile-row" key={order.id}>
                    <div>
                      <b>Поръчка #{order.id}</b>
                      <p>{order.created_at ? new Date(order.created_at).toLocaleString("bg-BG") : "Без дата"}</p>
                      <small>{Array.isArray(order.items) ? order.items.map((item) => `${item.name} x${item.quantity}`).join(", ") : "Продукти"}</small>
                    </div>
                    <strong>{formatPrice(order.total || 0)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "warranty" && (
          <div className="profile-panel">
            {orders.length === 0 ? <p className="profile-empty">Гаранциите ще се показват тук след първа поръчка.</p> : (
              <div className="profile-list">
                {orders.map((order) => (
                  <div className="profile-row" key={order.id}>
                    <div>
                      <b>Поръчка #{order.id}</b>
                      <p>{warrantyText(order)}</p>
                      <small>Ориентировъчно: 2 години гаранция според продукта.</small>
                    </div>
                    <span className="status-chip">Активна</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "service" && (
          <div className="profile-panel">
            <div className="service-create">
              <h3>Нова сервизна заявка</h3>
              <input value={serviceForm.device} onChange={(event) => setServiceForm((current) => ({ ...current, device: event.target.value }))} placeholder="Устройство: лаптоп, компютър, видеокарта..." />
              <textarea value={serviceForm.problem} onChange={(event) => setServiceForm((current) => ({ ...current, problem: event.target.value }))} placeholder="Опиши проблема..." />
              <button className="profile-primary" onClick={createServiceTicket}>Изпрати сервизна заявка</button>
            </div>
            <h3>Моите сервизни заявки</h3>
            {serviceLoading ? <p className="profile-empty">Зареждане...</p> : serviceTickets.length === 0 ? (
              <p className="profile-empty">Все още няма сервизни заявки.</p>
            ) : (
              <div className="profile-list">
                {serviceTickets.map((ticket) => (
                  <div className="profile-row" key={ticket.id}>
                    <div>
                      <b>{ticket.device}</b>
                      <p>{ticket.problem}</p>
                      <small>{ticket.created_at ? new Date(ticket.created_at).toLocaleString("bg-BG") : "Без дата"}</small>
                    </div>
                    <span className="status-chip">{ticket.status || "Нова заявка"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="profile-footer">
          <button className="admin-secondary" onClick={() => { loadOrders(); loadServiceTickets(); }}>Обнови</button>
          <button className="admin-danger" onClick={onLogout}>Изход</button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ onBack }) {
  const emptyForm = {
    catalog_number: "",
    title: "",
    category: "Gaming PC",
    price: "",
    stock: "1",
    description: "",
  };

  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("vf_admin_unlocked") === "yes");
  const [saving, setSaving] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [adminProducts, setAdminProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adminSearch, setAdminSearch] = useState("");

  const loadAdminProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setAdminNotice("Не успях да заредя продуктите. Провери Supabase policies.");
      console.error(error);
      return;
    }

    setAdminProducts(data || []);
  };

  useEffect(() => {
    if (unlocked) loadAdminProducts();
  }, [unlocked]);

  useEffect(() => {
    if (!imageFiles.length) {
      const existingImages = Array.isArray(editingProduct?.images)
        ? editingProduct.images
        : editingProduct?.image
          ? [editingProduct.image]
          : [];
      setImagePreviews(existingImages);
      return;
    }
    const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previewUrls);
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [imageFiles, editingProduct]);

  const unlock = () => {
    if (PUBLIC_ADMIN_DISABLED) {
      localStorage.removeItem("vf_admin_unlocked");
      setUnlocked(false);
      setAdminNotice("Публичният админ панел е изключен. Използвай VF Admin приложението.");
    }
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageFiles([]);
    setImagePreviews([]);
    setEditingProduct(null);
    setAdminNotice("");
  };

  const handleProductImagesSelect = (event) => {
    const selected = Array.from(event.target.files || []);
    const limited = selected.slice(0, 10);
    setImageFiles(limited);

    if (selected.length > 10) {
      setAdminNotice("Можеш да качиш максимум 10 снимки за един артикул.");
    } else {
      setAdminNotice("");
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setForm({
      catalog_number: product.catalog_number || "",
      title: product.title || "",
      category: product.category || "Gaming PC",
      price: String(product.price || ""),
      stock: String(product.stock ?? "1"),
      description: product.description || "",
    });
    setImageFiles([]);
    setImagePreviews(Array.isArray(product.images) ? product.images : product.image ? [product.image] : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadProductImages = async () => {
    if (!imageFiles.length) {
      return Array.isArray(editingProduct?.images)
        ? editingProduct.images
        : editingProduct?.image
          ? [editingProduct.image]
          : [];
    }

    const uploadedUrls = [];

    for (const imageFile of imageFiles.slice(0, 10)) {
      const safeName = imageFile.name.replaceAll(" ", "-").toLowerCase();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, imageFile, { upsert: false });

      if (uploadError) {
        console.error(uploadError);
        throw new Error("Грешка при качване на снимките. Провери Storage bucket и policies.");
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    return uploadedUrls;
  };

  const saveProduct = async () => {
    if (!form.title.trim() || !form.price) {
      setAdminNotice("Попълни поне име и цена.");
      return;
    }

    setSaving(true);
    setAdminNotice("");

    try {
      const imageUrls = await uploadProductImages();

      const payload = {
        title: form.title.trim(),
        catalog_number: form.catalog_number.trim() || null,
        description: form.description.trim(),
        price: Number(form.price),
        image: imageUrls[0] || "",
        images: imageUrls,
        category: form.category,
        stock: Number(form.stock || 0),
      };

      const result = editingProduct
        ? await supabase.from("products").update(payload).eq("id", editingProduct.id)
        : await supabase.from("products").insert(payload);

      if (result.error) throw result.error;

      setAdminNotice(editingProduct ? "Продуктът е обновен успешно." : "Продуктът е добавен успешно.");
      resetForm();
      await loadAdminProducts();
    } catch (error) {
      console.error(error);
      setAdminNotice(error.message || "Продуктът не беше записан. Провери RLS policy за products.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    const confirmDelete = window.confirm(`Сигурен ли си, че искаш да изтриеш "${product.title}"?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from("products").delete().eq("id", product.id);

    if (error) {
      console.error(error);
      setAdminNotice("Не успях да изтрия продукта. Провери delete policy в Supabase.");
      return;
    }

    setAdminNotice("Продуктът е изтрит.");
    await loadAdminProducts();
  };

  const filteredAdminProducts = adminProducts.filter((product) => {
    const text = `${product.catalog_number || ""} ${product.title || ""} ${product.category || ""} ${product.description || ""}`.toLowerCase();
    return text.includes(adminSearch.toLowerCase());
  });

  const totalStock = adminProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const totalValue = adminProducts.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);

  if (!unlocked) {
    return (
      <div className="admin-page">
        <div className="admin-login admin-login-pro">
          <div className="admin-login-logo">
            <img src={LOGO_URL} alt="ВФ Компютри" />
          </div>
          <h1>Админ панел</h1>
          <p>Въведи паролата, за да управляваш продуктите.</p>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Парола" />
          {adminNotice && <div className="notice">{adminNotice}</div>}
          <button onClick={unlock}>Вход</button>
          <button className="admin-secondary" onClick={onBack}>Към магазина</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-top admin-top-pro">
          <div>
            <p className="section-label">VF Admin Pro</p>
            <h1>Админ панел</h1>
            <p>Добавяй, редактирай и изтривай продукти от магазина.</p>
          </div>
          <div className="admin-actions">
            <button onClick={loadAdminProducts}>Обнови</button>
            <button className="admin-secondary" onClick={onBack}>Към магазина</button>
            <button className="admin-danger" onClick={() => { localStorage.removeItem("vf_admin_unlocked"); setUnlocked(false); }}>Изход</button>
          </div>
        </div>

        <div className="admin-stats">
          <div>
            <b>{adminProducts.length}</b>
            <span>продукта</span>
          </div>
          <div>
            <b>{totalStock}</b>
            <span>обща наличност</span>
          </div>
          <div>
            <b>{formatPrice(totalValue)}</b>
            <span>стойност по наличност</span>
          </div>
        </div>

        <div className="admin-grid admin-grid-pro">
          <div className="admin-card admin-editor-card">
            <div className="admin-card-title">
              <div>
                <h2>{editingProduct ? "Редакция на продукт" : "Нов продукт"}</h2>
                <p>{editingProduct ? `Редактираш: ${editingProduct.title}` : "Попълни данните и качи снимка."}</p>
              </div>
              {editingProduct && <button className="admin-secondary small" onClick={resetForm}>Нов продукт</button>}
            </div>

            <label>
              Име на продукта
              <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Пример: Gaming PC Ryzen 5 RTX 4060" />
            </label>

            <label>
              Каталожен номер
              <input value={form.catalog_number} onChange={(event) => updateForm("catalog_number", event.target.value)} placeholder="VF-P-000001" />
            </label>

            <label>
              Категория
              <select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                <option>Gaming PC</option>
                <option>Компютри</option>
                <option>Видеокарти</option>
                <option>Процесори</option>
                <option>SSD / HDD</option>
                <option>Лаптопи</option>
                <option>Монитори</option>
                <option>Периферия</option>
              </select>
            </label>

            <div className="admin-two">
              <label>
                Цена (€)
                <input type="number" value={form.price} onChange={(event) => updateForm("price", event.target.value)} placeholder="819" />
              </label>
              <label>
                Наличност
                <input type="number" value={form.stock} onChange={(event) => updateForm("stock", event.target.value)} placeholder="1" />
              </label>
            </div>

            <label>
              Описание / характеристики
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Ryzen 5, 16GB RAM, 1TB NVMe..." />
            </label>

            <label>
              Снимки на продукта / максимум 10
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleProductImagesSelect}
              />
            </label>

            {imagePreviews.length > 0 && (
              <div className="admin-image-preview-grid">
                {imagePreviews.map((preview, index) => (
                  <div className="admin-image-preview" key={`${preview}-${index}`}>
                    <img src={preview} alt={`Преглед на продукта ${index + 1}`} />
                    {index === 0 && <span>Основна</span>}
                  </div>
                ))}
              </div>
            )}

            {imageFiles.length > 0 && (
              <p className="admin-file">Избрани снимки: {imageFiles.map((file) => file.name).join(", ")}</p>
            )}
            {adminNotice && <div className="notice">{adminNotice}</div>}

            <button className="admin-save" onClick={saveProduct} disabled={saving}>
              {saving ? "Записване..." : editingProduct ? "Запази промените" : "Добави продукт"}
            </button>
          </div>

          <div className="admin-card admin-products-card">
            <div className="admin-products-head">
              <div>
                <h2>Продукти в базата</h2>
                <p>{filteredAdminProducts.length} показани</p>
              </div>
              <input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Търси продукт..." />
            </div>

            {filteredAdminProducts.length === 0 ? (
              <p className="admin-empty">Все още няма добавени продукти в базата.</p>
            ) : (
              <div className="admin-list admin-list-pro">
                {filteredAdminProducts.map((product) => (
                  <div className="admin-product-row admin-product-row-pro" key={product.id}>
                    {product.image ? <img src={product.image} alt={product.title} /> : <div className="admin-no-img">IMG</div>}
                    <div className="admin-product-info">
                      <b>{product.title}</b>
                      {product.catalog_number && <p>Каталожен №: {product.catalog_number}</p>}
                      <p>{product.category} • {formatPrice(product.price)} • наличност: {product.stock}</p>
                      {product.description && <small>{product.description}</small>}
                    </div>
                    <div className="admin-row-actions">
                      <button onClick={() => startEditProduct(product)}>Редакция</button>
                      <button className="delete" onClick={() => deleteProduct(product)}>Изтрий</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="admin-warning">
          <b>Важно:</b> Това е опростен админ панел. За по-висока сигурност следващата стъпка е Supabase Auth login.
        </div>
      </div>
    </div>
  );
}

const ProductPage = ({ products, addToCart, handleTbiCheckout, dynamicMegaCategories, cartCount, setCartOpen, userSession, openAuth, setProfileOpen, query, setQuery }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = products.find((p) => String(p.id) === id);

  const [selectedImage, setSelectedImage] = useState(0);

  useScrollTop(id);

  if (!product) {
    return (
      <>
      <SiteHeader dynamicMegaCategories={dynamicMegaCategories} cartCount={cartCount} setCartOpen={setCartOpen} userSession={userSession} openAuth={openAuth} setProfileOpen={setProfileOpen} query={query} setQuery={setQuery} />
      <div className="product-page-not-found">
        <h2>Продуктът не е намерен</h2>

        <button onClick={() => navigate("/")}>
          Назад
        </button>
      </div>
      </>
    );
  }

  const images = product.images?.length
    ? product.images
    : [product.image];
  const technicalSpecs = Object.entries(product.filters || {});

  return (
    <>
    <SiteHeader dynamicMegaCategories={dynamicMegaCategories} cartCount={cartCount} setCartOpen={setCartOpen} userSession={userSession} openAuth={openAuth} setProfileOpen={setProfileOpen} query={query} setQuery={setQuery} />
    <div className="product-page">

      <div className="container">

        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>

        <div className="product-page-grid">

          <ProductGallery
            images={images}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            productName={product.name}
          />

          <div className="product-page-info">

            <span className="product-page-category">
              {product.category}
            </span>

            <h1>{product.name}</h1>

            <div className="product-price-row">

  <div className="product-page-price">
    <b>{formatPrice(calculateGross(product.price))}</b>

    {Number(product.oldPrice || 0) > Number(product.price || 0) && (
      <del>
        {formatPrice(calculateGross(product.oldPrice))}
      </del>
    )}
  </div>

  <div className="product-page-actions-inline">

    <button
      disabled={product.canOrder === false}
      onClick={() => addToCart(product.id)}
    >
      {product.canOrder === false ? product.availabilityLabel || "Не е наличен" : "Добави в количката"}
    </button>

    <button
      className="tbi-btn"
      disabled={product.canOrder === false}
      onClick={() => handleTbiCheckout(product)}
    >
      Купи на изплащане
    </button>

  </div>

</div>

<p className="product-page-stock">
  {product.stock}
</p>

           <h2 className="product-specs-title">
  Технически характеристики
</h2>

<table className="product-specs-table">
  <tbody>
    {technicalSpecs.length > 0 ? technicalSpecs.map(([key, value]) => (
      <tr key={key}>
        <td>{key}</td>
        <td>{Array.isArray(value) ? value.join(", ") : normalizeComparableValue(value)}</td>
      </tr>
    )) : (
      <tr>
        <td colSpan="2">Няма въведени технически характеристики за този продукт.</td>
      </tr>
    )}
  </tbody>
</table>

            <div className="product-page-specs">
              {(product.specs || []).map((spec) => (
                <span key={spec}>
                  {spec}
                </span>
              ))}
            </div>

          </div>

        </div>

      </div>

    </div>
    </>
  );
};
function LoadingScreen() {
  return (
    <div className="vf-loading-screen">
      <div className="vf-loading-card">
        <img src={LOGO_URL} alt="ВФ Компютри" />
        <div className="vf-loading-ring" />
        <h2>Зареждане...</h2>
        <p>Подготвяме продуктите</p>
      </div>
    </div>
  );
}
function SiteHeader({ dynamicMegaCategories = megaCategories, cartCount = 0, setCartOpen, userSession, openAuth, setProfileOpen, query = "", setQuery = () => {} }) {
  const navigate = useNavigate();
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(null);
  const [searchTerm, setSearchTerm] = useState(query || "");
  const [visitorStats, setVisitorStats] = useState(null);
  const headerMegaCategories = dynamicMegaCategories?.length ? dynamicMegaCategories : megaCategories;
  useEffect(() => {
    let active = true;

    const loadVisitorStats = async (recordVisit = false) => {
      try {
        const response = await fetch("/api/catalog-categories?action=visitors", {
          method: recordVisit ? "POST" : "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setVisitorStats({
            today: Math.max(0, Number(data.today) || 0),
            month: Math.max(0, Number(data.month) || 0),
          });
        }
      } catch {
        // The storefront remains usable if statistics are temporarily unavailable.
      }
    };

    loadVisitorStats(localStorage.getItem("vf_cookie_analytics") === "yes");
    const onConsent = (event) => {
      if (event.detail?.allowed) loadVisitorStats(true);
    };
    window.addEventListener("vf-analytics-consent", onConsent);
    return () => {
      active = false;
      window.removeEventListener("vf-analytics-consent", onConsent);
    };
  }, []);

  const visitorCounter = visitorStats && (
    <div className="visitor-counter" title="Уникални посетители">
      <span className="visitor-live-dot" />
      <span>Днес: <b>{visitorStats.today.toLocaleString("bg-BG")}</b></span>
      <span>Този месец: <b>{visitorStats.month.toLocaleString("bg-BG")}</b></span>
    </div>
  );
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const value = searchTerm.trim();
    if (!value) return;
    setQuery(value);
    navigate(`/search?q=${encodeURIComponent(value)}`);
    setMobileOpen(false);
  };
  const navLinks = (
    <>
      <a href="/" onClick={() => setMobileOpen(false)}>Начало</a>
      <a href="/builder" onClick={() => setMobileOpen(false)}>Сглоби PC</a>
      <Link to="/software" onClick={() => setMobileOpen(false)}>Нашите софтуери</Link>
      <a href="/#services" onClick={() => setMobileOpen(false)}>Сервиз</a>
      <a href="/#about-store" onClick={() => setMobileOpen(false)}>За нас</a>
      <Link to="/warranty-check" onClick={() => setMobileOpen(false)}>Проверка на гаранция</Link>
      <Link to="/service-check" onClick={() => setMobileOpen(false)}>Проверка на ремонт</Link>
      <a href="/#partners" onClick={() => setMobileOpen(false)}>Партньори</a>
      <a href="/#contact" onClick={() => setMobileOpen(false)}>Контакти</a>
    </>
  );

  return (
    <>
      <header className="header">
        <div className="container header-shell">
          <div className="header-top">
            <a className="brand" href="/">
              <span className="logo-wrap">
                <img src={LOGO_URL} alt="ВФ Компютри" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                <Cpu className="fallback-logo" />
              </span>
              <span className="brand-text">
                <b>ВФ <em>Компютри</em></b>
                <small>ПРОДАЖБА • РЕМОНТ • ПОДДРЪЖКА</small>
              </span>
            </a>
            <form className="search-box" onSubmit={handleSearchSubmit}>
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearchSubmit(event);
                }}
                placeholder="Търси компютър, видеокарта, SSD..."
              />
              <button type="submit" aria-label="Търси"><Search size={16} /></button>
            </form>
            <div className="header-actions">
              <a className="phone-chip" href={`tel:${storeInfo.rawPhone}`}><Phone size={16} /> {storeInfo.phone}</a>
              {userSession ? (
                <button className="account-chip" onClick={() => setProfileOpen(true)} title="Моят профил">
                  <User size={16} />
                  <span>{userSession.user?.user_metadata?.full_name || userSession.user?.email?.split("@")[0] || "Профил"}</span>
                </button>
              ) : (
                <button className="account-chip" onClick={() => openAuth("login")}>
                  <User size={16} />
                  <span>Вход</span>
                </button>
              )}
              <button
                className="cart-button"
                onClick={() => {
                  setMobileOpen(false);
                  setCartOpen((prev) => !prev);
                }}
              >
                <ShoppingCart size={19} />
                {cartCount > 0 && <span>{cartCount}</span>}
              </button>
              <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}><Menu /></button>
            </div>
          </div>
          <div className="header-bottom">
            <button className="mega-menu-button" onClick={() => setMegaOpen((current) => !current)}>
              <Menu size={18} />
              Категории
            </button>
            <nav className="desktop-nav">
              {navLinks}
            </nav>
            {visitorCounter}
          </div>
        </div>
      </header>
      {megaOpen && (
        <MegaMenu
          categories={headerMegaCategories}
          onClose={() => setMegaOpen(false)}
        />
      )}
      {mobileOpen && (
        <div className="mobile-panel">
          <button className="mobile-close" onClick={() => setMobileOpen(false)}><X /></button>
          <div className="mobile-brand">ВФ <span>Компютри</span></div>
          {visitorCounter}
          <nav>{navLinks}</nav>
          <div className="mobile-categories">
            <h3>Категории</h3>
            {headerMegaCategories.map((category) => (
              <div className="mobile-category-group" key={category.title}>
                <button className="mobile-category-title" onClick={() => setMobileCategoryOpen(mobileCategoryOpen === category.title ? null : category.title)}>
                  {category.title}
                  <span>{mobileCategoryOpen === category.title ? "−" : "+"}</span>
                </button>
                {mobileCategoryOpen === category.title && (
                  <div className="mobile-subcategories">
                    {category.items.map((item) => (
                      <button key={item} onClick={() => { setMobileOpen(false); window.location.href = `/category/${encodeURIComponent(item)}`; }}>
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <a className="mobile-call" href={`tel:${storeInfo.rawPhone}`}>Обади се: {storeInfo.phone}</a>
          {userSession ? (
            <button className="mobile-auth" onClick={() => { setMobileOpen(false); setProfileOpen(true); }}>Моят профил</button>
          ) : (
            <button className="mobile-auth" onClick={() => { setMobileOpen(false); openAuth("login"); }}>Вход / Регистрация</button>
          )}
        </div>
      )}
    </>
  );
}

function SoftwarePage({ HeaderComponent, headerProps = {} }) {
  const browserInstallerUrl = "/software/V-F-Browser-Setup-2.8.4.exe";

  return (
    <div className="site software-page">
      <div className="rgb-bg" />
      <div className="scanline" />
      {HeaderComponent && <HeaderComponent {...headerProps} />}

      <main className="container software-shell">
        <section className="software-hero">
          <div>
            <p className="section-label">Нашите софтуери</p>
            <h1>V-F Browser</h1>
            <p>
              Бърз Chromium базиран браузър от ВФ Компютри с червено-черен дизайн,
              вграден AdBlock, управление на пароли, private прозорец, превод на страници
              и система за автоматични обновления.
            </p>
            <div className="software-actions">
              <a className="btn primary" href={browserInstallerUrl} download>
                <Download size={18} /> Изтегли V-F Browser
              </a>
              <a className="btn ghost" href={browserInstallerUrl}>
                <ExternalLink size={18} /> Отвори файла
              </a>
            </div>
          </div>

          <div className="software-card">
            <div className="software-card-head">
              <span className="live-dot" />
              V-F Browser Installer
            </div>
            <div className="software-logo">
              <img src={LOGO_URL} alt="V-F Browser" />
            </div>
            <div className="software-meta">
              <span>Версия</span><b>2.8.4</b>
              <span>Платформа</span><b>Windows x64</b>
              <span>Файл</span><b>V-F-Browser-Setup-2.8.4.exe</b>
            </div>
          </div>
        </section>

        <section className="software-features">
          <div><ShieldCheck /><b>Сигурност</b><span>HTTPS update проверки и checksum в браузъра.</span></div>
          <div><Zap /><b>Бърз старт</b><span>Оптимизиран Electron/Chromium build.</span></div>
          <div><PackageCheck /><b>Автоматични обновления</b><span>Подготвен за централизирани версии през Supabase.</span></div>
        </section>
      </main>
    </div>
  );
}

const CategoryPage = ({ products, addToCart, handleTbiCheckout, dynamicMegaCategories, cartCount, setCartOpen, userSession, openAuth, setProfileOpen, query, setQuery }) => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [selectedFilters, setSelectedFilters] = useState({});
  const [expandedFilters, setExpandedFilters] = useState({});
  const [filterSearch, setFilterSearch] = useState({});

  const decodedCategory = decodeURIComponent(categoryName);

  const categoryProducts = products.filter(
    (product) => product.category === decodedCategory || product.mainCategory === decodedCategory
  );

  const availableFilters = useMemo(() => {
    const map = {};

    categoryProducts.forEach((product) => {
      Object.entries(product.filters || {}).forEach(([key, rawValue]) => {
        const normalizedKey = normalizeText(key);
        const values = collectFilterValues(rawValue);

        if (!normalizedKey || values.length === 0) return;

        if (!map[normalizedKey]) {
          map[normalizedKey] = {};
        }

        values.forEach((value) => {
          const normalizedValue = normalizeText(value);
          if (!normalizedValue) return;
          map[normalizedKey][normalizedValue] = (map[normalizedKey][normalizedValue] || 0) + 1;
        });
      });
    });

    return Object.fromEntries(
      Object.entries(map)
        .sort(([first], [second]) => first.localeCompare(second, "bg", { sensitivity: "base" }))
        .map(([key, counts]) => [key, sortFilterValues(Object.keys(counts)).map((value) => ({ value, count: counts[value] }))])
    );
  }, [categoryProducts]);

  const filteredProducts = useMemo(() => {
    return categoryProducts.filter((product) => {
      return Object.entries(selectedFilters).every(([filterKey, selectedValues]) => {
        if (!selectedValues?.length) return true;

        const filterValue = (product.filters || {})[filterKey];
        if (filterValue === null || filterValue === undefined || filterValue === "") return false;

        const productValues = collectFilterValues(filterValue).map((value) => normalizeText(value));
        if (productValues.length === 0) return false;

        return selectedValues.some((value) => productValues.includes(value));
      });
    });
  }, [categoryProducts, selectedFilters]);

  useEffect(() => {
    setSelectedFilters({});
    setExpandedFilters({});
    setFilterSearch({});
  }, [decodedCategory]);

  const toggleFilterValue = (filterKey, value) => {
    setSelectedFilters((current) => {
      const currentValues = current[filterKey] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      if (nextValues.length === 0) {
        const next = { ...current };
        delete next[filterKey];
        return next;
      }

      return { ...current, [filterKey]: nextValues };
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    setExpandedFilters({});
    setFilterSearch({});
  };

  return (
  <>
    <SiteHeader
      dynamicMegaCategories={dynamicMegaCategories}
      cartCount={cartCount}
      setCartOpen={setCartOpen}
      userSession={userSession}
      openAuth={openAuth}
      setProfileOpen={setProfileOpen}
      query={query}
      setQuery={setQuery}
    />
    <div className="category-page">
      <div className="container products-section">

        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          ← Назад
        </button>

        <div className="section-head">
          <div>
            <p className="section-label">Категория</p>
            <h2>{decodedCategory}</h2>
          </div>
        </div>

        <div className="category-layout">
          <ProductFilters
            availableFilters={availableFilters}
            selectedFilters={selectedFilters}
            expandedFilters={expandedFilters}
            filterSearch={filterSearch}
            setFilterSearch={setFilterSearch}
            setExpandedFilters={setExpandedFilters}
            toggleFilterValue={toggleFilterValue}
            clearAllFilters={clearAllFilters}
          />

          <div className="products-area">
            <p className="products-count">
              Показани {filteredProducts.length} от {categoryProducts.length} продукта
            </p>

            <div className="product-grid">
          {categoryProducts.length === 0 ? (
            <p className="empty-products">
              Няма продукти в тази категория.
            </p>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard product={product} addToCart={addToCart} key={product.id} />
            ))
          )}
        </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};
function App() {
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    if (window.location.hash === "#admin") window.location.hash = "";
  }, []);

  const {
    cartItems,
    cartCount,
    cartSubtotal,
    cartVat,
    cartDelivery,
    cartGrandTotal,
    freeDeliveryThreshold,
    deliveryMin,
    deliveryMax,
    addToCart,
    updateQuantity,
    setCartOpen,
    setCheckoutOpen,
    setCartCustomItems,
    clearCart,
    setCartProducts,
    setCartDeliverySettings,
  } = useCart();
  const [page, setPage] = useState("store");
  const [userSession, setUserSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [profileOpen, setProfileOpen] = useState(false);
  const [documentOrder, setDocumentOrder] = useState(null);
  const [documentCustomer, setDocumentCustomer] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [dynamicMegaCategories, setDynamicMegaCategories] = useState(megaCategories);
  const [deliverySettings, setDeliverySettings] = useState(DEFAULT_DELIVERY_SETTINGS);
  const [categoryMarkups, setCategoryMarkups] = useState([]);
  const [promotionsData, setPromotionsData] = useState([]);
  const [partnersData, setPartnersData] = useState(partners);
  const [homepageSections, setHomepageSections] = useState([]);
  const homepageProductIdsKey = useMemo(() => (
    homepageSections
      .flatMap((section) => section.product_ids || [])
      .map((id) => String(id).replace(/^vali-/, ""))
      .filter(Boolean)
      .sort()
      .join(",")
  ), [homepageSections]);
  const [builderSelections, setBuilderSelections] = useState({
    cpu: "",
    motherboard: "",
    ram: "",
    gpu: "",
    storage: [createStorageSelectionRow()],
    psu: "",
    case: "",
    cooler: "",
  });
  const [builderGame, setBuilderGame] = useState("");
  const [builderPaymentMethod, setBuilderPaymentMethod] = useState("bank");
  const [builderNotice, setBuilderNotice] = useState("");
  const products = useMemo(() => {
    const sourceProducts = dbProducts.length > 0 ? dbProducts : fallbackProducts;

    return sourceProducts.map((product) => {
      const basePrice = Number(product.basePrice ?? product.originalPrice ?? product.price ?? 0);
      const publicPriceResolved = product.source === "vali" && product.publicPriceResolved;
      const markupPercent = product.source === "vali" && !publicPriceResolved
        ? findMarkupPercent(categoryMarkups, product.mainCategory, product.category)
        : 0;
      const priceAfterMarkup = publicPriceResolved
        ? Number(product.price || 0)
        : Number((basePrice * (1 + (markupPercent / 100))).toFixed(2));
      const originalPrice = publicPriceResolved
        ? Number(product.publicOldPrice ?? product.price ?? 0)
        : Number(product.source === "vali" ? priceAfterMarkup : basePrice);
      const promotion = publicPriceResolved ? null : findBestPromotion(product, promotionsData);
      const discountPercent = Number(promotion?.discount_percent || 0);
      const discountedPrice = publicPriceResolved
        ? Number(product.price || 0)
        : promotion
          ? Number((originalPrice * (1 - (discountPercent / 100))).toFixed(2))
          : Number(product.price ?? originalPrice);
      const hasPromotion = publicPriceResolved
        ? discountedPrice < originalPrice
        : Boolean(promotion) && discountedPrice < originalPrice;

      return {
        ...product,
        markupPercent,
        originalPrice,
        price: discountedPrice,
        oldPrice: hasPromotion ? originalPrice : Number(product.oldPrice ?? discountedPrice),
        promotion: hasPromotion ? promotion : null,
      };
    });
  }, [dbProducts, categoryMarkups, promotionsData]);

  const homepageProductSections = useMemo(() => {
    if (!homepageSections.length) return [];
    const productMap = new Map(products.map((product) => [String(product.id), product]));

    return homepageSections
      .filter((section) => section.is_active !== false)
      .map((section) => ({
        ...section,
        products: (section.product_ids || [])
          .map((id) => productMap.get(String(id)))
          .filter(Boolean)
          .slice(0, Number(section.limit || 8)),
      }))
      .filter((section) => section.products.length > 0);
  }, [homepageSections, products]);
  const showLoadingScreen = loadingProducts && dbProducts.length === 0;

  useEffect(() => {
    setCartProducts(products);
  }, [products, setCartProducts]);

  useEffect(() => {
    setCartDeliverySettings(deliverySettings);
  }, [deliverySettings, setCartDeliverySettings]);

  useEffect(() => {
    const onHashChange = () => setPage("store");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserSession(data.session || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session || null);
      if (session) setAuthOpen(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const logoutUser = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
    setProfileOpen(false);
  };

  useEffect(() => {
    const loadStoreMetadata = async () => {
      const [deliveryRes, markupsRes, promotionsRes, partnersRes, homepageRes] = await Promise.all([
        supabase.from("store_settings").select("*").eq("key", "delivery_settings").maybeSingle(),
        supabase.from("category_markups").select("*"),
        supabase.from("promotions").select("*").eq("is_active", true),
        supabase.from("partners").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("store_settings").select("*").eq("key", "homepage_product_sections").maybeSingle(),
      ]);

      if (!deliveryRes.error && deliveryRes.data?.value) {
        setDeliverySettings({ ...DEFAULT_DELIVERY_SETTINGS, ...(deliveryRes.data.value || {}) });
      } else {
        setDeliverySettings(DEFAULT_DELIVERY_SETTINGS);
      }

      if (!markupsRes.error && Array.isArray(markupsRes.data)) {
        setCategoryMarkups(markupsRes.data);
      }

      if (!promotionsRes.error && Array.isArray(promotionsRes.data)) {
        setPromotionsData(promotionsRes.data);
      }

      if (!partnersRes.error && Array.isArray(partnersRes.data) && partnersRes.data.length > 0) {
        setPartnersData(partnersRes.data.map((partner) => ({
          name: partner.name,
          logo: partner.logo || partner.name,
          logoSrc: partner.logo_src,
          tag: partner.tag,
          text: partner.text,
          url: partner.url,
        })));
      } else {
        setPartnersData(partners);
      }

      if (!homepageRes.error && Array.isArray(homepageRes.data?.value?.sections)) {
        setHomepageSections(homepageRes.data.value.sections);
      }
    };

    loadStoreMetadata();
  }, []);

  useEffect(() => {
    const loadValiCategories = async () => {
      try {
        const response = await fetch("/api/catalog-categories", {
          headers: { Accept: "application/json" },
        });
        const payload = response.ok ? await response.json() : null;
        if (Array.isArray(payload?.categories) && payload.categories.length > 0) {
          setDynamicMegaCategories(buildDynamicMegaCategories(payload.categories));
          return;
        }
      } catch {
        // A direct Supabase fallback keeps navigation working during API outages.
      }

      const { data, error } = await fetchAllSupabaseRows(() =>
        supabase
          .from("storefront_vali_products")
          .select("site_main_category, site_sub_category")
          .eq("show", true)
          .order("id", { ascending: true })
      );

      if (error) {
        console.error(error);
        setDynamicMegaCategories(megaCategories);
        return;
      }

      setDynamicMegaCategories(buildDynamicMegaCategories(data || []));
    };

    loadValiCategories();
  }, []);


  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoadingProducts(true);

      const normalizeLocalProduct = (product) => ({
        id: `local-${product.id}`,
        localId: product.id,
        catalog_number: product.catalog_number || "",
        name: product.title,
        title: product.title,
        model: product.model || "",
        manufacturer: product.manufacturer || product.brand || "",
        reference_number: product.reference_number || product.referenceNumber || "",
        barcode: product.barcode || "",
        mainCategory: product.main_category || product.mainCategory || product.category || "Компютри",
        category: product.category || "Компютри",
        price: Number(product.price || 0),
        oldPrice: Number(product.price || 0),
        originalPrice: Number(product.price || 0),
        basePrice: Number(product.price || 0),
        rating: 4.9,
        stock: Number(product.stock || 0) > 0 ? "В наличност" : "По заявка",
        stockStatus: Number(product.stock || 0) > 0 ? "В наличност" : "По заявка",
        stockQty: Number(product.stock || 0),
        badge: "NEW",
        image: Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : product.image || "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80",
        images: Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : product.image
            ? [product.image]
            : [],
        description: product.description || "",
        warranty: product.warranty || product.guarantee || null,
        filters: product.filters || product.specs || {},
        specs: product.description
          ? product.description.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 4)
          : ["ВФ Компютри", "Проверен продукт"],
        source: "local",
      });

      let activeMarkups = categoryMarkups;

      const normalizeValiProduct = (p) => {
        const filters = extractValiFilters(p);
        const basePrice = Number(p.public_price || 0);
        const markupPercent = 0;
        const finalPrice = basePrice;
        const title = getBgText(p.name) || p.model || "VALI продукт";
        const availability = getValiAvailability(p);
        const stockStatus = availability.label;

        return ({
        id: `vali-${p.id}`,
        valiId: p.id,
        catalog_number: p.catalog_number || "",
        title,
        name: title,
        model: p.model || "",
        manufacturer: p.manufacturer || p.brand || p.vendor || "",
        reference_number: p.reference_number || p.referenceNumber || p.sku || "",
        barcode: p.barcode || p.ean || "",
        mainCategory: p.site_main_category || "Други",
        category: p.site_sub_category || p.site_main_category || "Други",
        price: finalPrice,
        oldPrice: finalPrice,
        originalPrice: finalPrice,
        basePrice,
        markupPercent,
        publicOldPrice: Number(p.public_old_price || finalPrice),
        publicPriceResolved: true,
        stock: stockStatus,
        inStock: availability.type === "in_stock",
        availabilityType: availability.type,
        availabilityLabel: availability.label,
        canOrder: availability.canOrder,
        expectedDelivery: p.expected_delivery || p.raw?.expected_delivery || "",
        stockStatus,
        stockQty: Number(p.stock_quantity ?? p.raw?.stock_quantity ?? p.quantity ?? p.raw?.quantity ?? p.qty ?? p.raw?.qty ?? p.stock ?? p.raw?.stock ?? p.available_quantity ?? p.raw?.available_quantity ?? 0),
        warranty: p.warranty || p.raw?.warranty || null,
        image: p.images?.[0]?.href || p.image || "/placeholder.webp",
        images: p.images?.map((x) => x.href).filter(Boolean) || [],
        description: getBgText(p.description) || "",
        filters,
        specs: Object.entries(filters)
          .slice(0, 4)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`),
        source: "vali",
      });
      };

      const normalizeStoreProduct = (product) => {
        const price = Number(product.price || 0);
        const image = product.image || "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80";

        return {
          id: `store-${product.id}`,
          storeId: product.id,
          catalog_number: "",
          name: product.title,
          title: product.title,
          model: "",
          manufacturer: "VF Computers",
          reference_number: product.serial_number || "",
          barcode: "",
          mainCategory: product.category || "Аксесоари",
          category: product.sub_category || product.category || "Аксесоари",
          price,
          oldPrice: price,
          originalPrice: price,
          basePrice: price,
          rating: 4.9,
          stock: Number(product.stock || 0) > 0 ? "В наличност" : "По заявка",
          stockStatus: Number(product.stock || 0) > 0 ? "В наличност" : "По заявка",
          stockQty: Number(product.stock || 0),
          badge: product.condition || "VF",
          image,
          images: [image].filter(Boolean),
          description: product.description || product.note || "",
          warranty: null,
          filters: {},
          specs: [product.category, product.condition, product.serial_number].filter(Boolean).slice(0, 4),
          source: "store",
        };
      };

      const isCategoryRoute = currentPath.startsWith("/category/");
      const categoryRouteName = isCategoryRoute
        ? decodeURIComponent(currentPath.slice("/category/".length))
        : "";
      const requiresFullCatalog = currentPath === "/search"
        || currentPath.startsWith("/builder");
      const productRouteId = currentPath.startsWith("/product/")
        ? decodeURIComponent(currentPath.slice("/product/".length))
        : "";

      const loadValiProducts = async () => {
        if (isCategoryRoute && categoryRouteName) {
          const [mainCategoryRes, subCategoryRes] = await Promise.all([
            fetchAllSupabaseRows(() =>
              supabase
                .from("storefront_vali_products")
                .select(VALI_PRODUCT_SELECT)
                .eq("show", true)
                .eq("site_main_category", categoryRouteName)
                .order("id", { ascending: true })
            ),
            fetchAllSupabaseRows(() =>
              supabase
                .from("storefront_vali_products")
                .select(VALI_PRODUCT_SELECT)
                .eq("show", true)
                .eq("site_sub_category", categoryRouteName)
                .order("id", { ascending: true })
            ),
          ]);

          const unique = new Map();
          [...(mainCategoryRes.data || []), ...(subCategoryRes.data || [])].forEach((row) => {
            unique.set(String(row.id), row);
          });
          return {
            data: Array.from(unique.values()),
            error: mainCategoryRes.error || subCategoryRes.error,
          };
        }

        if (requiresFullCatalog) {
          return fetchAllSupabaseRows(() =>
            supabase
              .from("storefront_vali_products")
              .select(VALI_PRODUCT_SELECT)
              .eq("show", true)
              .order("id", { ascending: true })
          );
        }

        if (productRouteId.startsWith("vali-")) {
          const { data, error } = await supabase
            .from("storefront_vali_products")
            .select(VALI_PRODUCT_SELECT)
            .eq("show", true)
            .eq("id", productRouteId.slice("vali-".length))
            .maybeSingle();
          return { data: data ? [data] : [], error };
        }

        const featuredIds = homepageProductIdsKey.split(",").filter(Boolean);
        const featuredQuery = featuredIds.length > 0
          ? supabase
            .from("storefront_vali_products")
            .select(VALI_CARD_SELECT)
            .eq("show", true)
            .in("id", featuredIds)
          : Promise.resolve({ data: [], error: null });

        const [latestRes, featuredRes] = await Promise.all([
          supabase
            .from("storefront_vali_products")
            .select(VALI_CARD_SELECT)
            .eq("show", true)
            .order("id", { ascending: true })
            .limit(80),
          featuredQuery,
        ]);

        const error = latestRes.error || featuredRes.error;
        const unique = new Map();
        [...(latestRes.data || []), ...(featuredRes.data || [])].forEach((row) => {
          unique.set(String(row.id), row);
        });
        return { data: Array.from(unique.values()), error };
      };

      const [localRes, valiRes, markupsRes, storeRes] = await Promise.all([
        fetchAllSupabaseRows(() =>
          supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false })
        ),
        loadValiProducts(),
        supabase.from("category_markups").select("*"),
        supabase
          .from("physical_store_products")
          .select("*")
          .eq("show_on_site", true)
          .gt("stock", 0),
      ]);

      if (cancelled) return;

      if (!markupsRes.error && Array.isArray(markupsRes.data)) {
        activeMarkups = markupsRes.data;
        setCategoryMarkups(markupsRes.data);
      } else if (markupsRes.error) {
        console.error(markupsRes.error);
      }

      const localProducts = (localRes.data || []).map(normalizeLocalProduct);
      const valiProducts = (valiRes.data || []).map(normalizeValiProduct);
      const storeProducts = storeRes.error ? [] : (storeRes.data || []).map(normalizeStoreProduct);
      if (storeRes.error) {
        console.warn(storeRes.error);
      }

      const loadedProducts = [
        ...localProducts,
        ...storeProducts,
        ...valiProducts
      ];

      setDbProducts((current) => {
        if (requiresFullCatalog || isCategoryRoute) return loadedProducts;
        const merged = new Map(current.map((product) => [String(product.id), product]));
        loadedProducts.forEach((product) => merged.set(String(product.id), product));
        return Array.from(merged.values());
      });
      setLoadingProducts(false);

      if (localRes.error) {
        console.error(localRes.error);
      }

      if (valiRes.error) {
        console.error(valiRes.error);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [currentPath, homepageProductIdsKey]);

  const [activeCategory, setActiveCategory] = useState("Всички");
  const [query, setQuery] = useState("");
  const [tbiUrl, setTbiUrl] = useState("");
  const [showTbi, setShowTbi] = useState(false);
  const [tbiLoading, setTbiLoading] = useState(false);
  const [tbiProduct, setTbiProduct] = useState(null);
  const [tbiAvailable, setTbiAvailable] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(null);
  const [priceLimit, setPriceLimit] = useState(2000);
  const [notice, setNotice] = useState("");
  const [sendingBuilder, setSendingBuilder] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const orderIdempotencyKeyRef = React.useRef("");
  const [megaOpen, setMegaOpen] = useState(false);
const [activeMega, setActiveMega] = useState(megaCategories[0]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tbi", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled) setTbiAvailable(Boolean(data?.enabled));
      })
      .catch(() => {
        if (!cancelled) setTbiAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tbiAvailable && builderPaymentMethod === "tbi") {
      setBuilderPaymentMethod("bank");
    }
  }, [builderPaymentMethod, tbiAvailable]);

  useEffect(() => {
    if (!showTbi || !tbiUrl) return undefined;

    let tbiOrigin;
    try {
      tbiOrigin = new URL(tbiUrl).origin;
    } catch {
      setShowTbi(false);
      setNotice("TBI върна невалиден адрес за кандидатстване.");
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleTbiMessage = (event) => {
      if (event.origin !== tbiOrigin) return;

      let message = event.data;
      if (typeof message === "string") {
        try {
          message = JSON.parse(message);
        } catch {
          return;
        }
      }
      if (!message || !["close", "close_modal"].includes(message.command)) return;

      setShowTbi(false);
      setTbiUrl("");

      if (message.url) {
        try {
          const returnUrl = new URL(message.url, window.location.origin);
          if (returnUrl.origin === window.location.origin) {
            window.location.assign(returnUrl.toString());
            return;
          }
        } catch {
          // Invalid return URLs are ignored deliberately.
        }
      }
      setNotice("TBI кандидатстването е приключено. Статусът ще се обнови след потвърждение от банката.");
    };

    window.addEventListener("message", handleTbiMessage);
    return () => {
      window.removeEventListener("message", handleTbiMessage);
      document.body.style.overflow = previousOverflow;
    };
  }, [showTbi, tbiUrl]);
  const baseComponentPools = useMemo(() => ({
    cpu: products.filter(isCpu),
    motherboard: products.filter(isMotherboard),
    ram: products.filter(isRam),
    gpu: products.filter(isGpu),
    storage: products.filter(isStorage),
    psu: products.filter(isPsu),
    case: products.filter(isCase),
    cooler: products.filter(isCooler),
  }), [products]);

  const builderProducts = useMemo(() => ({
    cpu: baseComponentPools.cpu.find((product) => product.id === builderSelections.cpu) || null,
    motherboard: baseComponentPools.motherboard.find((product) => product.id === builderSelections.motherboard) || null,
    ram: baseComponentPools.ram.find((product) => product.id === builderSelections.ram) || null,
    gpu: baseComponentPools.gpu.find((product) => product.id === builderSelections.gpu) || null,
    storage: (builderSelections.storage || [])
      .map((row) => baseComponentPools.storage.find((product) => product.id === row.product))
      .filter(Boolean),
    psu: baseComponentPools.psu.find((product) => product.id === builderSelections.psu) || null,
    case: baseComponentPools.case.find((product) => product.id === builderSelections.case) || null,
    cooler: baseComponentPools.cooler.find((product) => product.id === builderSelections.cooler) || null,
  }), [baseComponentPools, builderSelections]);

  const selectedCpuSocket = getSocket(builderProducts.cpu);
  const selectedBoardSocket = getSocket(builderProducts.motherboard);
  const selectedBoardRamType = getRamType(builderProducts.motherboard);
  const selectedRamType = getRamType(builderProducts.ram);

  const componentPools = useMemo(() => ({
    ...baseComponentPools,
    cpu: selectedBoardSocket
      ? baseComponentPools.cpu.filter((product) => getSocket(product) === selectedBoardSocket)
      : baseComponentPools.cpu,
    motherboard: selectedCpuSocket
      ? baseComponentPools.motherboard.filter((product) => getSocket(product) === selectedCpuSocket)
      : baseComponentPools.motherboard,
    ram: selectedBoardRamType
      ? baseComponentPools.ram.filter((product) => getRamType(product) === selectedBoardRamType)
      : baseComponentPools.ram,
  }), [baseComponentPools, selectedBoardSocket, selectedCpuSocket, selectedBoardRamType]);

  const getCompatibilityIssue = (type, product) => {
    if (!product) return "";

    if (type === "motherboard" && selectedCpuSocket) {
      const socket = getSocket(product);
      if (socket && socket !== selectedCpuSocket) {
        return `Несъвместимо със сокет ${selectedCpuSocket}`;
      }
    }

    if (type === "cpu" && selectedBoardSocket) {
      const socket = getSocket(product);
      if (socket && socket !== selectedBoardSocket) {
        return `Несъвместимо със сокет ${selectedBoardSocket}`;
      }
    }

    if (type === "ram" && selectedBoardRamType) {
      const ramType = getRamType(product);
      if (ramType && ramType !== selectedBoardRamType) {
        return `Несъвместимо с ${selectedBoardRamType}`;
      }
    }

    if (type === "motherboard" && selectedRamType) {
      const ramType = getRamType(product);
      if (ramType && ramType !== selectedRamType) {
        return `Несъвместимо с ${selectedRamType}`;
      }
    }

    return "";
  };

  useEffect(() => {
    if (builderProducts.cpu && selectedBoardSocket && getCompatibilityIssue("cpu", builderProducts.cpu)) {
      setBuilderSelections((current) => ({ ...current, cpu: "", motherboard: "", ram: "" }));
      setBuilderNotice(`Избраният процесор беше изчистен. ${getCompatibilityIssue("cpu", builderProducts.cpu)}`);
      return;
    }

    if (builderProducts.motherboard && selectedCpuSocket && getCompatibilityIssue("motherboard", builderProducts.motherboard)) {
      setBuilderSelections((current) => ({ ...current, motherboard: "", ram: "" }));
      setBuilderNotice(`Избраната дънна платка беше изчистена. ${getCompatibilityIssue("motherboard", builderProducts.motherboard)}`);
      return;
    }

    if (builderProducts.ram && getCompatibilityIssue("ram", builderProducts.ram)) {
      setBuilderSelections((current) => ({ ...current, ram: "" }));
      setBuilderNotice(`Избраната RAM беше изчистена. ${getCompatibilityIssue("ram", builderProducts.ram)}`);
    }
  }, [builderProducts.cpu, builderProducts.motherboard, builderProducts.ram, selectedBoardSocket, selectedCpuSocket, selectedBoardRamType]);

  const updateBuilderSelection = (type, value) => {
    setBuilderSelections((current) => ({ ...current, [type]: value }));
    setBuilderNotice("");
  };

  const updateBuilderStorageSelection = (rowId, productId) => {
    setBuilderSelections((current) => ({
      ...current,
      storage: current.storage.map((row) => (
        row.id === rowId ? { ...row, product: productId } : row
      )),
    }));
    setBuilderNotice("");
  };

  const addBuilderStorageRow = () => {
    setBuilderSelections((current) => ({
      ...current,
      storage: [...current.storage, createStorageSelectionRow()],
    }));
  };

  const removeBuilderStorageRow = (rowId) => {
    setBuilderSelections((current) => ({
      ...current,
      storage: current.storage.filter((row) => row.id !== rowId),
    }));
  };

  const builderSelectedList = [
    builderProducts.cpu,
    builderProducts.motherboard,
    builderProducts.ram,
    builderProducts.gpu,
    ...builderProducts.storage,
    builderProducts.psu,
    builderProducts.case,
    builderProducts.cooler,
  ].filter(Boolean);
  const builderNetTotal = builderSelectedList.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const builderVatTotal = calculateVat(builderNetTotal);
  const builderGrossTotal = calculateGross(builderNetTotal);
  const builderDelivery = builderGrossTotal >= Number(deliverySettings.free_delivery_threshold || DEFAULT_DELIVERY_SETTINGS.free_delivery_threshold) || builderSelectedList.length === 0
    ? 0
    : Number(deliverySettings.default_delivery_price || DEFAULT_DELIVERY_SETTINGS.default_delivery_price);
  const builderGrandTotal = builderGrossTotal + builderDelivery;
  const fpsEstimate = builderProducts.cpu && builderProducts.gpu && builderGame.trim()
    ? estimateFps({ cpuTitle: builderProducts.cpu.name, gpuTitle: builderProducts.gpu.name, game: builderGame })
    : null;

  const addConfigurationToCart = () => {
    if (!builderProducts.cpu || !builderProducts.motherboard || !builderProducts.ram || !builderProducts.gpu) {
      setBuilderNotice("Избери поне процесор, дънна платка, RAM и видеокарта, за да добавиш конфигурацията.");
      return;
    }

    const builderPaymentLabel = builderPaymentMethod === "tbi"
      ? "На изплащане чрез TBI Bank"
      : "Предварително плащане по банков път";
    const customItem = {
      id: `config-${Date.now()}`,
      name: "Персонална PC конфигурация",
      title: "Персонална PC конфигурация",
      price: Number(builderNetTotal.toFixed(2)),
      oldPrice: Number(builderNetTotal.toFixed(2)),
      originalPrice: Number(builderNetTotal.toFixed(2)),
      image: builderProducts.case?.image || LOGO_URL,
      images: builderProducts.case?.images?.length ? builderProducts.case.images : [builderProducts.case?.image || LOGO_URL],
      category: "Персонални конфигурации",
      mainCategory: "Компютри",
      stock: "В наличност",
      stockStatus: "В наличност",
      quantity: 1,
      filters: {},
      specs: builderSelectedList.map((product) => product.name),
      parts: builderProducts,
      source: "config",
      is_custom_pc_build: true,
      payment_method: builderPaymentMethod,
      payment_label: builderPaymentLabel,
    };

    setCartCustomItems((current) => [...current, customItem]);
    setCartOpen(false);
    setCheckoutOpen(true);
    setBuilderNotice("Конфигурацията е готова за изпращане.");
  };

  const sendOrder = async (checkoutForm) => {
    const customerName = checkoutForm?.name?.trim();
    const phone = checkoutForm?.phone?.trim();
    const city = checkoutForm?.city?.trim();
    const address = checkoutForm?.address?.trim();
    const email = checkoutForm?.email?.trim();

    if (!customerName || !phone || !city || !address) {
      setNotice("Попълнете име, телефон, град и адрес.");
      return false;
    }

    if (!cartItems.length) {
      setNotice("Количката е празна.");
      return false;
    }

    let customerProfile = null;

    if (userSession?.user?.id) {
      const { data } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", userSession.user.id)
        .maybeSingle();

      customerProfile = data || null;
    }

    setSendingOrder(true);
    setNotice("");

    const isCustomPcBuildOrder = cartItems.some((item) => item.is_custom_pc_build || item.source === "config");
    const customPcBuildItem = cartItems.find((item) => item.is_custom_pc_build || item.source === "config");
    const customPaymentMethod = customPcBuildItem?.payment_method === "tbi" && !tbiAvailable
      ? "bank"
      : (customPcBuildItem?.payment_method || "bank");
    const resolvedPaymentMethod = isCustomPcBuildOrder ? customPaymentMethod : paymentMethod;
    const requestItems = cartItems.flatMap((item) => {
      const quantity = Number(item.quantity || 1);
      if (item.is_custom_pc_build || item.source === "config") {
        return Object.values(item.parts || {})
          .flatMap((part) => Array.isArray(part) ? part : [part])
          .filter(Boolean)
          .map((part) => ({
            product_id: part.id,
            catalog_number: part.catalog_number || undefined,
            quantity,
          }));
      }
      return [{
        product_id: item.id,
        catalog_number: item.catalog_number || undefined,
        quantity,
      }];
    });

    if (!orderIdempotencyKeyRef.current) {
      orderIdempotencyKeyRef.current = globalThis.crypto?.randomUUID?.().replaceAll("-", "_")
        || `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    let savedOrder;
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userSession?.access_token ? { Authorization: `Bearer ${userSession.access_token}` } : {}),
        },
        body: JSON.stringify({
          items: requestItems,
          customer_name: customerName,
          phone,
          email: email || undefined,
          city,
          delivery_address: address,
          payment_method: resolvedPaymentMethod,
          idempotency_key: orderIdempotencyKeyRef.current,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.order) {
        throw new Error(result?.error || "Поръчката не може да бъде създадена.");
      }
      savedOrder = result.order;
    } catch (error) {
      setSendingOrder(false);
      setNotice(error.message || "Поръчката не може да бъде създадена.");
      return false;
    }

    setSendingOrder(false);
    const orderToken = orderIdempotencyKeyRef.current;
    let emailWarning = "";

    try {
      const emailResponse = await fetch("/api/send-order-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: savedOrder.id,
          customerEmail: savedOrder.customer_email || email || "",
          orderToken,
        }),
      });
      const emailResult = await emailResponse.json().catch(() => null);

      if (!emailResponse.ok) {
        throw new Error(emailResult?.error || "Email send failed");
      }
    } catch (emailError) {
      console.error("ORDER EMAIL ERROR:", emailError);
      emailWarning = "Поръчката е записана, но email-ът не беше изпратен.";
    }

    setNotice(emailWarning || "Поръчката е изпратена успешно.");
    setDocumentOrder(savedOrder);
    setDocumentCustomer(customerProfile || {
      full_name: customerName,
      phone,
      address,
      account_type: "personal",
    });

    clearCart();
    orderIdempotencyKeyRef.current = "";
    setCartOpen(false);
    setCheckoutOpen(false);

    if (resolvedPaymentMethod === "tbi") {
      await handleTbiCheckout({
        orderId: savedOrder?.id,
        orderToken,
        displayName: `Поръчка ${savedOrder?.order_number || savedOrder?.id || ""}`,
      });
    }

    return true;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = activeCategory === "Всички" || product.category === activeCategory;
      const searchMatch = `${product.name} ${product.category} ${(product.specs || []).join(" ")} ${Object.keys(product.filters || {}).join(" ")}`.toLowerCase().includes(query.toLowerCase());
      const priceMatch = product.price <= priceLimit;
      return categoryMatch && searchMatch && priceMatch;
    });
  }, [products, activeCategory, query, priceLimit]);

  const handleTbiCheckout = async (target) => {
    try {
      if (!tbiAvailable) {
        setNotice("TBI финансирането временно не е налично.");
        return false;
      }
      setTbiLoading(true);
      setNotice("");
      const requestBody = target?.orderId
        ? { order_id: target.orderId, order_token: target.orderToken }
        : { product_id: target?.id, quantity: 1 };

      const response = await fetch("/api/tbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => null);

      setTbiLoading(false);

      if (response.ok && data?.url) {
        setTbiUrl(data.url);
        setTbiProduct({
          name: target?.displayName || target?.name || "Избрани продукти",
          price: Number(data.amount || 0),
          reference: data.reference,
        });
        setShowTbi(true);
        return true;
      } else {
        setNotice(data?.error || "TBI финансирането временно не е налично.");
        return false;
      }
    } catch {
      setTbiLoading(false);
      setNotice("Неуспешна връзка с TBI. Моля, опитайте отново.");
      return false;
    }
  };

  const openCartTbiCheckout = () => {
    setPaymentMethod("tbi");
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const navLinks = (
  <>
    <a href="/builder" onClick={() => setMobileOpen(false)}>Сглоби PC</a>
      <Link to="/software" onClick={() => setMobileOpen(false)}>Нашите софтуери</Link>
    <a href="#services" onClick={() => setMobileOpen(false)}>Сервиз</a>
    <a href="#about-store" onClick={() => setMobileOpen(false)}>За нас</a>
    <a href="#partners" onClick={() => setMobileOpen(false)}>Партньори</a>
    <a href="#contact" onClick={() => setMobileOpen(false)}>Контакти</a>
  </>
);

if (showLoadingScreen) {
  return <LoadingScreen />;
}

const headerProps = {
  dynamicMegaCategories,
  cartCount,
  setCartOpen,
  userSession,
  openAuth,
  setProfileOpen,
  query,
  setQuery,
};

  return (
  <>
  {notice && <div className="notice global-notice">{notice}</div>}
  <Suspense fallback={<LoadingScreen />}>
  <Routes>
    <Route
      path="/"
      element={
        <Home>
        <div className="site">
      <div className="rgb-bg" />
      <div className="scanline" />

      <SiteHeader dynamicMegaCategories={dynamicMegaCategories} cartCount={cartCount} setCartOpen={setCartOpen} userSession={userSession} openAuth={openAuth} setProfileOpen={setProfileOpen} query={query} setQuery={setQuery} />
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="badge"><Sparkles size={16} /> Premium Gaming Store • Елхово</p>
            <h1>Компютри и компоненти с <span>gaming</span> характер.</h1>
            <p className="lead">
              Онлайн магазин и сервиз за компютри, лаптопи, компоненти и custom gaming конфигурации.
              Получаваш консултация, сглобяване, тест и поддръжка.
            </p>
            <div className="hero-actions">
              <a href="#products" className="btn primary">Пазарувай сега</a>
              <Link to="/builder" className="btn ghost">Сглоби си PC</Link>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 /> Тествани системи</span>
              <span><ShieldCheck /> Гаранция</span>
              <span><Truck /> Доставка</span><span><Server /> Backend active</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="pc-card">
              <div className="pc-card-top">
                <span className="live-dot" /> VF Build Preview
              </div>
              <img
                src={getOptimizedImageUrl("https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1400&q=80", 1200, 80)}
                alt="Gaming PC"
                decoding="async"
                width="1200"
                height="800"
                onError={(event) => restoreOriginalImage(event, "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1400&q=80")}
              />
              <div className="performance">
                <div><Gauge /><b>FPS Ready</b><small>Gaming конфигурации</small></div>
                <div><Zap /><b>Fast Boot</b><small>NVMe SSD</small></div>
                <div><PackageCheck /><b>Tested</b><small>преди доставка</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container quick-stats">
        <div><b>24ч</b><span>бърза оферта</span></div>
        <div><b>100%</b><span>тестване преди предаване</span></div>
        <div><b>2 г.</b><span>гаранция според продукта</span></div>
        <div><b>0 €</b><span>консултация за конфигурация</span></div>
      </section>


      <section id="about-store" className="about-store-section">
        <div className="container about-store-grid">
          <div className="about-store-copy">
            <p className="section-label">За нас</p>
            <h2>За V F COMPUTERS</h2>
            <p>
              V F COMPUTERS е компютърен сервиз и магазин, създаден с идеята да предложи качествено обслужване,
              коректност и професионални решения за компютри, лаптопи и gaming конфигурации.
            </p>
            <p>
              Магазинът се намира в град Елхово, ул. „Славянска“ №5 и предлага диагностика, ремонт,
              профилактика, сглобяване на компютри, продажба на компоненти, инсталация на софтуер,
              ъпгрейди и поддръжка.
            </p>
            <p>
              Нашата цел е всеки клиент да получи лично отношение, бързо обслужване и надеждно решение
              за своята техника. Работим както с ежедневни компютърни конфигурации, така и с gaming системи,
              лаптопи и хардуерни компоненти.
            </p>

            <div className="about-store-actions">
              <a className="btn primary" href={mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={18} /> Отвори в Google Maps
              </a>
              <a className="btn ghost" href={`tel:${storeInfo.rawPhone}`}>
                <Phone size={18} /> Обади се
              </a>
            </div>

            <div className="about-store-info">
              <div><MapPin /><span>{storeInfo.address}</span></div>
              <div><Phone /><span>{storeInfo.phone}</span></div>
              <div><Mail /><span>{storeInfo.email}</span></div>
            </div>
          </div>

          <div className="about-store-showcase">
            <div className="showcase-main">
              <img src={storeGallery[0]} alt="Откриване на V F COMPUTERS" loading="lazy" />
              <span>Физически магазин в Елхово</span>
            </div>
            <div className="showcase-mini">
              {storeGallery.slice(1, 4).map((image, index) => (
                <img src={image} alt={`V F COMPUTERS магазин ${index + 1}`} key={image} loading="lazy" />
              ))}
            </div>
          </div>
        </div>

        <div className="container store-gallery-block">
          <div className="section-head">
            <div>
              <p className="section-label">Магазин и сервиз</p>
              <h2>Снимки от магазина</h2>
              <p className="gallery-lead">
                Реални кадри от откриването, витрините, компонентите и работната среда на V F COMPUTERS.
              </p>
            </div>
          </div>

          <div className="store-gallery-grid">
            {storeGallery.slice(0, 18).map((image, index) => (
              <a className={`store-gallery-card ${index === 0 || index === 3 ? "wide" : ""}`} href={image} target="_blank" rel="noreferrer" key={image}>
                <img src={image} alt={`V F COMPUTERS галерия ${index + 1}`} loading="lazy" />
                <span>{index + 1}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {homepageProductSections.map((section) => (
        <section className="container products-section" key={section.key}>
          <div className="section-head">
            <div>
              <p className="section-label">Избрани продукти</p>
              <h2>{section.title}</h2>
            </div>
          </div>

          <div className="product-grid">
            {section.products.map((product) => (
              <ProductCard
                key={`${section.key}-${product.id}`}
                product={product}
                addToCart={addToCart}
              />
            ))}
          </div>
        </section>
      ))}

      <section id="products" className="container products-section">
        <div className="section-head">
          <div>
            <p className="section-label">Каталог</p>
            <h2>Продукти и оферти</h2>
            {loadingProducts && <p className="loading-products">Зареждане на продукти от базата...</p>}
          </div>
          <div className="filter-card">
            <label>Макс. цена: <b>{priceLimit} €</b></label>
            <input type="range" min="80" max="2000" step="20" value={priceLimit} onChange={(event) => setPriceLimit(Number(event.target.value))} />
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.slice(0, 12).map((product) => (
            <Link
  to={`/product/${product.id}`}
  className="product-link"
  key={product.id}
>
  <article className="product-card">
              <div className="product-image">
                <img
                  src={getOptimizedImageUrl(product.image, 640)}
                  srcSet={getProductImageSrcSet(product.image)}
                  sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 280px"
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  width="640"
                  height="480"
                  onError={(event) => restoreOriginalImage(event, product.image)}
                />
                <span className="badge-product">{product.availabilityType === "on_the_way" ? "На път" : product.badge}</span>
                <button
                  className="wish"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  aria-label={`Добави ${product.name} в любими`}
                >
                  <Heart size={17} />
                </button>
                {product.images?.length > 1 && (
                  <div className="product-image-count">+{product.images.length - 1} снимки</div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div className="product-thumbs">
                  {product.images.slice(0, 5).map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openProductGallery(product, index);
                      }}
                    >
                      <img src={image} alt={`${product.name} снимка ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
              <div className="product-body">
                <div className="product-meta">
                  <span>{product.category}</span>
                  <span className="stars"><Star size={14} /> {product.rating}</span>
                </div>
                <h3>{product.name}</h3>
                <div className="specs">
                  <small>
  {product.description
    ? product.description.substring(0, 120) + "..."
    : "Натиснете за повече информация..."}
</small>
                </div>
                <p className="stock"><CheckCircle2 size={15} /> {product.availabilityLabel || product.stock}</p>
                <div className="product-buy">
                  <div>
                    <b>{formatPrice(calculateGross(product.price))}</b>
                    {Number(product.oldPrice || 0) > Number(product.price || 0) && (
                      <del>{formatPrice(calculateGross(product.oldPrice))}</del>
                    )}
                  </div>
                  <button
                    disabled={product.canOrder === false}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      addToCart(product.id);
                    }}
                  >
                    {product.canOrder === false ? "Не е наличен" : "Добави"}
                  </button>
                  {tbiAvailable && (
                    <button
                      className="tbi-btn"
                      disabled={product.canOrder === false}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleTbiCheckout(product);
                      }}
                    >
                      Купи на изплащане
                    </button>
                  )}
                </div>
              </div>
            </article>
</Link>
          ))}
        </div>
      </section>

      <section id="services" className="container services-section service-pricing-section">
        <div className="section-head services-pricing-head">
          <div>
            <p className="section-label">Услуги и цени</p>
            <h2>Ценоразпис</h2>
            <p className="services-pricing-lead">Професионални сервизни услуги за компютри, лаптопи, компоненти, софтуер и ъпгрейди. Цените са ориентировъчни и са посочени в евро.</p>
          </div>
          <a className="btn primary" href={`tel:${storeInfo.rawPhone}`}>Заяви услуга</a>
        </div>

        <div className="services-trust-row">
          <span><ShieldCheck size={17} /> Гаранция на услугата</span>
          <span><Gauge size={17} /> Тестване след ремонт</span>
          <span><Truck size={17} /> Прием и предаване</span>
          <span><Wrench size={17} /> Професионален сервиз</span>
        </div>

        <div className="service-price-grid">
          {services.map(({ icon: Icon, title, category, image, price, note, altPrice, altNote, text }) => (
            <article className="service-price-card" key={title}>
              <div className="service-price-image">
                <img src={image} alt={title} loading="lazy" />
                <span>{category}</span>
              </div>
              <div className="service-price-body">
                <div className="service-price-title"><Icon size={20} /><h3>{title}</h3></div>
                <p>{text}</p>
                <div className="service-price-main"><b>{price}</b><small>{note}</small></div>
                {altPrice && <div className="service-price-alt"><span>{altPrice}</span><small>{altNote}</small></div>}
              </div>
            </article>
          ))}
        </div>

        <div className="service-important-note">
          <b>Важно:</b>
          <span>Посочените цени са ориентировъчни. Крайната цена може да зависи от състоянието на устройството, сложността на ремонта и необходимите части.</span>
        </div>
      </section>

      <section className="ai-section">
        <div className="container ai-card">
          <div className="ai-icon"><Bot /></div>
          <div>
            <p className="section-label">AI Консултант</p>
            <h2>Помощ при избор на конфигурация</h2>
            <p>
              На следващ етап тук може да добавим AI чат, който пита клиента за бюджет, игри и нужди,
              след което предлага подходяща конфигурация.
            </p>
          </div>
          <a className="btn ghost" href={`mailto:${storeInfo.email}?subject=Искам консултация за компютър`}>Питай за оферта</a>
        </div>
      </section>


      <section id="partners" className="container partners-section">
        <div className="section-head partners-head">
          <div>
            <p className="section-label">Партньори</p>
            <h2>Нашите партньори</h2>
            <p className="partners-lead">Работим с надеждни доставчици, сервизни, финансови и логистични партньори, за да предлагаме по-добри продукти, услуги и обслужване.</p>
          </div>
        </div>
        <div className="partners-grid">
          {partnersData.map((partner) => (
            <a className="partner-card" href={partner.url} target="_blank" rel="noreferrer" key={partner.name} aria-label={`Отвори сайта на ${partner.name}`}>
              <div className={`partner-logo partner-logo-${partner.name.toLowerCase().replaceAll(" ", "-").replaceAll("13", "")}`}>{partner.logo}</div>
              <span className="partner-divider" />
              <div className="partner-body"><span>{partner.tag}</span><h3>{partner.name}</h3><p>{partner.text}</p></div>
              <div className="partner-action">Посети сайта <ExternalLink size={15} /></div>
            </a>
          ))}
        </div>
      </section>

      <Footer storeInfo={storeInfo} shippingSettings={deliverySettings} />

      <AIAssistant />

            {documentOrder && (
        <OrderDocumentsModal
          order={documentOrder}
          customerProfile={documentCustomer}
          onClose={() => setDocumentOrder(null)}
        />
      )}

      {profileOpen && userSession && (
        <CustomerProfileModal
          session={userSession}
          onClose={() => setProfileOpen(false)}
          onLogout={logoutUser}
        />
      )}

      {authOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onModeChange={setAuthMode}
        />
      )}

      <CookieConsent />

      {showTbi && (
        <div className="tbi-modal">
          <div className="tbi-modal-content">
            <div className="tbi-modal-head">
              <div>
                <b>TBI Bank — кандидатстване на изплащане</b>
                <p>{tbiProduct?.name || "Избрани продукти"} • {formatPrice(tbiProduct?.price || 0)}</p>
              </div>
              <button
                type="button"
                aria-label="Затвори TBI кандидатстването"
                onClick={() => {
                  setShowTbi(false);
                  setTbiUrl("");
                }}
              >
                ✕
              </button>
            </div>
            <iframe
              src={tbiUrl}
              title="TBI Bank кандидатстване за финансиране"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}

      {tbiLoading && (
        <div className="tbi-loading-overlay">
          <div>Свързване с TBI Bank...</div>
        </div>
      )}

        </div>
        </Home>
      }
    />
    <Route
      path="/builder"
      element={
        <>
          <SiteHeader dynamicMegaCategories={dynamicMegaCategories} cartCount={cartCount} setCartOpen={setCartOpen} userSession={userSession} openAuth={openAuth} setProfileOpen={setProfileOpen} query={query} setQuery={setQuery} />
          <BuilderPage
            pcBuilderSteps={pcBuilderSteps}
            componentPools={componentPools}
            builderSelections={builderSelections}
            updateBuilderSelection={updateBuilderSelection}
            updateBuilderStorageSelection={updateBuilderStorageSelection}
            addBuilderStorageRow={addBuilderStorageRow}
            removeBuilderStorageRow={removeBuilderStorageRow}
            getCompatibilityIssue={getCompatibilityIssue}
            builderGame={builderGame}
            setBuilderGame={setBuilderGame}
            builderPaymentMethod={builderPaymentMethod}
            setBuilderPaymentMethod={setBuilderPaymentMethod}
            tbiAvailable={tbiAvailable}
            builderSelectedList={builderSelectedList}
            builderNetTotal={builderNetTotal}
            builderVatTotal={builderVatTotal}
            builderDelivery={builderDelivery}
            builderGrandTotal={builderGrandTotal}
            builderProducts={builderProducts}
            fpsEstimate={fpsEstimate}
            builderNotice={builderNotice}
            addConfigurationToCart={addConfigurationToCart}
            deliverySettings={deliverySettings}
            deliveryMin={deliveryMin}
            deliveryMax={deliveryMax}
            storeInfo={storeInfo}
          />
        </>
      }
    />
    <Route
      path="/search"
      element={
        <SearchPage
          products={products}
          addToCart={addToCart}
          HeaderComponent={SiteHeader}
          headerProps={headerProps}
        />
      }
    />
    <Route
      path="/software"
      element={
        <SoftwarePage
          HeaderComponent={SiteHeader}
          headerProps={headerProps}
        />
      }
    />
    <Route
      path="/warranty-check"
      element={
        <WarrantyCheckPage
          HeaderComponent={SiteHeader}
          headerProps={headerProps}
        />
      }
    />
    <Route
      path="/service-check"
      element={
        <ServiceCheckPage
          HeaderComponent={SiteHeader}
          headerProps={headerProps}
        />
      }
    />
<Route
  path="/category/:categoryName"
  element={
    <CategoryRoutePage
      products={products}
      addToCart={addToCart}
      HeaderComponent={SiteHeader}
      headerProps={headerProps}
    />
  }
/>
    <Route
      path="/product/:id"
      element={
        <ProductPageRoute
          products={products}
          addToCart={addToCart}
          handleTbiCheckout={handleTbiCheckout}
          tbiAvailable={tbiAvailable}
          HeaderComponent={SiteHeader}
          headerProps={headerProps}
          loadingProducts={loadingProducts}
        />
      }
    />
  </Routes>
  </Suspense>

  <Suspense fallback={null}>
    <Cart
      deliveryProvider={deliverySettings.provider}
      tbiAvailable={tbiAvailable}
      onTbiCheckout={openCartTbiCheckout}
    />

    <Checkout
      paymentMethods={paymentMethods}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      bankInfo={bankInfo}
      sendOrder={sendOrder}
      sendingOrder={sendingOrder}
      tbiAvailable={tbiAvailable}
    />
  </Suspense>
  </>
);
}

createRoot(document.getElementById("root")).render(
  <CartProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </CartProvider>
);

