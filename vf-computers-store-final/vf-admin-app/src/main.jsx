import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LogIn,
  LogOut,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
  Pencil,
  Save,
  ImagePlus,
  ShoppingBag,
  Wrench,
  ShieldCheck,
  X,
  Truck,
  Percent,
  Users,
  Tags,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import "./style.css";

const STORAGE_BUCKET = "product-images";
const ORDER_STATUSES = ["Приета", "Обработва се", "Изпратена", "Отказана"];
const STATUS_EMAIL_STATUSES = new Set(["Обработва се", "Изпратена"]);
const EMAIL_API_BASE = import.meta.env.VITE_EMAIL_API_BASE || "https://vf-computers-store.vercel.app";

const emptyOrderForm = {
  order_number: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_city: "",
  customer_address: "",
  customer_comment: "",
  payment_method: "cod",
  payment_status: "pending",
  status: "Приета",
};

const DEFAULT_DELIVERY_SETTINGS = {
  provider: "Еконт",
  free_delivery_threshold: 200,
  delivery_min: 8,
  delivery_max: 20,
  default_delivery_price: 8,
};

const MANUAL_CATEGORY_GROUPS = [
  { title: "Лаптопи", items: ["Реновирани Лаптопи"] },
  { title: "Компютри", items: ["Реновирани Компютри"] },
];

const MANUAL_MARKUP_PAIRS = [
  { main_category: "Компютри", sub_category: "Реновирани Компютри" },
  { main_category: "Лаптопи", sub_category: "Реновирани Лаптопи" },
];

const DEFAULT_PARTNERS = [
  {
    name: "VALI Computers",
    logo: "VALI",
    logo_src: "/partners/vali.svg",
    tag: "IT дистрибутор",
    text: "Широк асортимент от компютърни продукти, компоненти и решения.",
    url: "https://www.vali.bg/",
    is_active: true,
    sort_order: 1,
  },
  {
    name: "Polycomp",
    logo: "POLYCOMP",
    logo_src: "/partners/polycomp.svg",
    tag: "ICT дистрибутор",
    text: "Дистрибутор на ИКТ оборудване и потребителска техника.",
    url: "https://polycomp.bg/poly/home",
    is_active: true,
    sort_order: 2,
  },
  {
    name: "AdminBG",
    logo: "AdminBG",
    logo_src: "/partners/adminbg.svg",
    tag: "Сервиз и части",
    text: "Специализиран сервиз и решения за компютърна поддръжка.",
    url: "https://adminbg.net/",
    is_active: true,
    sort_order: 3,
  },
  {
    name: "Katnis13",
    logo: "KATNIS13",
    logo_src: "/partners/katnis13.svg",
    tag: "Счетоводство",
    text: "Счетоводни и бизнес услуги за фирмени клиенти.",
    url: "https://www.katnis13.com/",
    is_active: true,
    sort_order: 4,
  },
  {
    name: "TBI Bank",
    logo: "tbi bank",
    logo_src: "/partners/tbibank.svg",
    tag: "Финансиране",
    text: "Партньор за покупки на изплащане.",
    url: "https://tbibank.bg/",
    is_active: true,
    sort_order: 5,
  },
  {
    name: "Econt",
    logo: "ECONT",
    logo_src: "/partners/econt.svg",
    tag: "Доставка",
    text: "Куриерски услуги и доставки.",
    url: "https://www.econt.com/",
    is_active: true,
    sort_order: 6,
  },
];

const emptyProductForm = {
  title: "",
  mainCategory: "Компютри",
  category: "Реновирани Компютри",
  price: "",
  stock: "1",
  description: "",
  socket: "",
  ramType: "",
  chipset: "",
  formFactor: "",
  watts: "",
  gpuChipset: "",
  memory: "",
  capacity: "",
  frequency: "",
  hidden: false,
};

const emptyPartnerForm = {
  name: "",
  logo: "",
  logo_src: "",
  tag: "",
  text: "",
  url: "",
  is_active: true,
  sort_order: 0,
};

const emptyPromotionForm = {
  title: "",
  description: "",
  discount_percent: 0,
  main_category: "",
  sub_category: "",
  product_id: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

const formatPrice = (value) =>
  new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("bg-BG") : "-";

const getOrderNumber = (order) => order?.order_number || order?.id || "-";

const getOrderItems = (order) => Array.isArray(order?.items) ? order.items : [];

const getOrderItemsText = (order) => {
  const items = getOrderItems(order);
  if (!items.length) return "Няма продукти";
  return items.map((item) => `${item.name || item.title || "Продукт"} x${Number(item.quantity || 1)}`).join(", ");
};

const normalizeText = (value) => String(value || "").trim();

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

const extractValiImages = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((img) => {
        if (!img) return "";

        if (typeof img === "string") {
          return img;
        }

        if (typeof img === "object") {
          return (
            img.href ||
            img.url ||
            img.image ||
            img.src ||
            img.path ||
            ""
          );
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return extractValiImages(parsed);
    } catch {
      return value ? [value] : [];
    }
  }

  if (typeof value === "object") {
    return extractValiImages([value]);
  }

  return [];
};

const buildGroupedCategories = (rows = []) => {
  const grouped = new Map();

  [...rows, ...MANUAL_CATEGORY_GROUPS.flatMap((group) => group.items.map((item) => ({
    site_main_category: group.title,
    site_sub_category: item,
  })))].forEach((row) => {
    const mainCategory = normalizeText(row.site_main_category);
    const subCategory = normalizeText(row.site_sub_category);

    if (!mainCategory) return;

    const safeSubCategory = subCategory || mainCategory;

    if (!grouped.has(mainCategory)) {
      grouped.set(mainCategory, new Set());
    }

    grouped.get(mainCategory).add(safeSubCategory);
  });

  return Array.from(grouped.entries())
    .sort(([first], [second]) => first.localeCompare(second, "bg"))
    .map(([title, items]) => ({
      title,
      items: Array.from(items).sort((first, second) => first.localeCompare(second, "bg")),
    }));
};

const buildMarkupPairs = (rows = []) => {
  const pairsMap = new Map();

  (rows || []).forEach((row) => {
    const main = normalizeText(row.site_main_category) || "Други";
    const sub = normalizeText(row.site_sub_category) || normalizeText(row.site_main_category) || "Други";

    if (!main || !sub) return;

    const key = `${main}|||${sub}`;
    if (!pairsMap.has(key)) {
      pairsMap.set(key, {
        main_category: main,
        sub_category: sub,
      });
    }
  });

  MANUAL_MARKUP_PAIRS.forEach((pair) => {
    const key = `${pair.main_category}|||${pair.sub_category}`;
    if (!pairsMap.has(key)) {
      pairsMap.set(key, pair);
    }
  });

  return Array.from(pairsMap.values()).sort((first, second) => {
    const mainCompare = first.main_category.localeCompare(second.main_category, "bg");
    if (mainCompare !== 0) return mainCompare;
    return first.sub_category.localeCompare(second.sub_category, "bg");
  });
};

const buildLocalFilters = (form) => {
  const entries = [
    ["Socket", form.socket],
    ["RAM Type", form.ramType],
    ["Chipset", form.chipset],
    ["Form Factor", form.formFactor],
    ["Wattage", form.watts],
    ["GPU Chipset", form.gpuChipset],
    ["Memory", form.memory],
    ["Capacity", form.capacity],
    ["Frequency", form.frequency],
  ];

  return Object.fromEntries(entries.filter(([, value]) => normalizeText(value)));
};

async function uploadImages(files) {
  const uploaded = [];

  for (const file of files) {
    const safeName = file.name.replaceAll(" ", "-").toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    uploaded.push(data.publicUrl);
  }

  return uploaded;
}

async function loadValiCategoryRows() {
  console.log("ADMIN SUPABASE URL:", supabase.supabaseUrl);

  const { data, error } = await supabase
    .from("vali_products")
    .select("site_main_category,site_sub_category,show")
    .limit(50000);

  if (error) {
    console.error("VALI LOAD ERROR", error);
    return { data: [], error };
  }

  const valid = (data || []).filter((row) => {
    const main = String(row.site_main_category || "").trim();

    return (
      row.show !== false &&
      main.length > 0
    );
  });

  console.log("VALI TOTAL:", data?.length || 0);
  console.log("VALI VALID:", valid.length);
  console.log("VALI SAMPLE:", valid.slice(0, 5));

  return {
    data: valid,
    error: null,
  };
}

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("products");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [orderSaving, setOrderSaving] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [orderToast, setOrderToast] = useState("");
  const seenOrderIdsRef = useRef(new Set());
  const [tickets, setTickets] = useState([]);
  const [groupedCategories, setGroupedCategories] = useState(buildGroupedCategories());
  const [deliveryForm, setDeliveryForm] = useState(DEFAULT_DELIVERY_SETTINGS);
  const [markups, setMarkups] = useState([]);
  const [markupInputs, setMarkupInputs] = useState({});
  const [markupPairs, setMarkupPairs] = useState([]);
  const [markupsLoading, setMarkupsLoading] = useState(false);
  const [markupsError, setMarkupsError] = useState("");
  const [partners, setPartners] = useState([]);
  const [partnersUsingFallback, setPartnersUsingFallback] = useState(false);
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);
  const [partnerEditingId, setPartnerEditingId] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm);
  const [promotionEditingId, setPromotionEditingId] = useState(null);
  const [warranties, setWarranties] = useState([]);
  const [warrantiesUsingOrdersFallback, setWarrantiesUsingOrdersFallback] = useState(false);
  const [warrantyInputs, setWarrantyInputs] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProductForm);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const categoryOptions = useMemo(() => groupedCategories.map((group) => group.title), [groupedCategories]);
  const subcategoryOptions = useMemo(() => {
    return groupedCategories.find((group) => group.title === form.mainCategory)?.items || [];
  }, [groupedCategories, form.mainCategory]);
  const promotionSubcategoryOptions = useMemo(() => {
    return groupedCategories.find((group) => group.title === promotionForm.main_category)?.items || [];
  }, [groupedCategories, promotionForm.main_category]);

  const loadProducts = async () => {
    const [localResult, valiResult, overridesResult] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("vali_products").select("*").limit(50000),
      supabase.from("vali_product_overrides").select("*"),
    ]);

    if (localResult.error) {
      console.error(localResult.error);
      setNotice("Не успях да заредя локалните продукти.");
      return;
    }

    if (valiResult.error) {
      console.error(valiResult.error);
      setNotice(`VALI ERROR: ${valiResult.error.message || valiResult.error}. Показани са само локалните продукти.`);
    }

    if (overridesResult.error) {
      console.error(overridesResult.error);
      setNotice(`VALI OVERRIDES ERROR: ${overridesResult.error.message || overridesResult.error}. Локалните VALI редакции няма да се приложат.`);
    }

    const overridesByValiId = new Map(
      (overridesResult.data || []).map((override) => [String(override.vali_id), override])
    );

    const valiProducts = (valiResult.data || []).flatMap((p) => {
      const override = overridesByValiId.get(String(p.id));
      if (override?.hidden === true) return [];

      const images = extractValiImages(p.images);
      const originalTitle = getBgText(p.name) || getBgText(p.model) || "VALI продукт";
      const originalDescription = getBgText(p.description) || "";
      const originalPrice = Number(p.price_partner || p.price_client || 0);
      const effectiveImage = override?.custom_image || images[0] || "";

      return {
        id: `vali-${p.id}`,
        vali_id: p.id,
        override_id: override?.id || null,
        title: override?.custom_title || originalTitle,
        description: override?.custom_description || originalDescription,
        price: Number(override?.custom_price ?? originalPrice),
        stock: p.show === true || p.status === 1 ? 1 : 0,
        image: effectiveImage,
        images: effectiveImage ? [effectiveImage, ...images.filter((image) => image !== effectiveImage)] : images,
        category: p.site_sub_category || p.site_main_category || "Други",
        main_category: p.site_main_category || "Други",
        hidden: Boolean(override?.hidden),
        source: "vali",
      };
    });

    setProducts([...(localResult.data || []), ...valiProducts]);
  };

  const playOrderNotification = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);
    } catch (error) {
      console.warn("Order notification sound skipped:", error);
    }
  };

  const loadOrders = async ({ notify = false } = {}) => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setNotice(error.message || "Не успях да заредя поръчките.");
      return;
    }

    const nextOrders = data || [];
    const nextIds = new Set(nextOrders.map((order) => String(order.id)));
    const previousIds = seenOrderIdsRef.current;

    if (notify && previousIds.size > 0) {
      const freshOrders = nextOrders.filter((order) => !previousIds.has(String(order.id)));
      if (freshOrders.length > 0) {
        setNewOrdersCount((count) => count + freshOrders.length);
        setOrderToast(`Нова поръчка: ${getOrderNumber(freshOrders[0])}`);
        playOrderNotification();
        window.setTimeout(() => setOrderToast(""), 5000);
      }
    }

    seenOrderIdsRef.current = nextIds;
    setOrders(nextOrders);
  };

  const loadTickets = async () => {
    const { data } = await supabase.from("service_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
  };

  const loadCategories = async () => {
    const { data, error } = await loadValiCategoryRows();

    console.log("ADMIN VALI CATEGORY ROWS:", data.length);
    console.log("ADMIN GROUPED CATEGORIES:", buildGroupedCategories(data).length);

    if (error && (!data || data.length === 0)) {
      console.error(error);
      setGroupedCategories(buildGroupedCategories());
      setNotice(`VALI ERROR: ${error.message || error}. VALI категориите не се заредиха. Показани са само ръчните категории.`);
      return;
    }

    setGroupedCategories(buildGroupedCategories(data || []));
  };

  const loadDeliverySettings = async () => {
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("key", "delivery_settings")
      .maybeSingle();

    if (error || !data?.value) {
      setDeliveryForm(DEFAULT_DELIVERY_SETTINGS);
      return;
    }

    setDeliveryForm({ ...DEFAULT_DELIVERY_SETTINGS, ...(data.value || {}) });
  };

  const loadMarkups = async () => {
    setMarkupsLoading(true);
    setMarkupsError("");

    const [{ data, error }, { data: markupsData, error: markupsErrorData }] = await Promise.all([
      loadValiCategoryRows(),
      supabase.from("category_markups").select("*"),
    ]);

    console.log("ADMIN VALI CATEGORY ROWS:", data.length);
    console.log("ADMIN MARKUP PAIRS:", buildMarkupPairs(data).length);

    if (error && (!data || data.length === 0)) {
      console.error(error);
      setMarkupPairs(buildMarkupPairs([]));
      setMarkups([]);
      if (buildMarkupPairs([]).length === 0) {
        setMarkupsError(`VALI ERROR: ${error.message || error}`);
      }
      setNotice(`VALI ERROR: ${error.message || error}`);
      setMarkupsLoading(false);
      return;
    }

    if (markupsErrorData) {
      console.warn(markupsErrorData);
      setMarkups([]);
    } else {
      setMarkups(markupsData || []);
    }

    setMarkupPairs(buildMarkupPairs(data || []));
    setMarkupsLoading(false);
  };

  const loadPartners = async () => {
    const { data, error } = await supabase.from("partners").select("*").order("sort_order", { ascending: true });
    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) {
        console.warn(error);
      }
      setPartners(DEFAULT_PARTNERS);
      setPartnersUsingFallback(true);
      return;
    }

    setPartners(data || []);
    setPartnersUsingFallback(false);
  };

  const loadWarranties = async () => {
    const { data, error } = await supabase.from("warranties").select("*").order("created_at", { ascending: false });
    if (error) {
      console.warn(error);
      setWarranties([]);
      setWarrantiesUsingOrdersFallback(true);
      return;
    }

    setWarranties(data || []);
    setWarrantiesUsingOrdersFallback(false);
  };

  const loadPromotions = async () => {
    const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setPromotions([]);
      return;
    }

    setPromotions(data || []);
  };

  const loadAll = async () => {
    await Promise.all([
      loadProducts(),
      loadOrders(),
      loadTickets(),
      loadCategories(),
      loadDeliverySettings(),
      loadMarkups(),
      loadPartners(),
      loadPromotions(),
      loadWarranties(),
    ]);
  };

  useEffect(() => {
    if (session) {
      loadAll();
    }
  }, [session]);

  useEffect(() => {
    if (!session) return undefined;
    const timer = window.setInterval(() => {
      loadOrders({ notify: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    const nextInputs = {};
    markupPairs.forEach((pair) => {
      const key = `${pair.main_category}||${pair.sub_category}`;
      const existing = markups.find((markup) => markup.main_category === pair.main_category && markup.sub_category === pair.sub_category);
      nextInputs[key] = String(existing?.markup_percent ?? 0);
    });
    setMarkupInputs(nextInputs);
  }, [markupPairs, markups]);

  useEffect(() => {
    const matchingGroup = groupedCategories.find((group) => group.title === form.mainCategory);
    if (!matchingGroup || matchingGroup.items.length === 0) return;
    if (!matchingGroup.items.includes(form.category)) {
      setForm((current) => ({ ...current, category: matchingGroup.items[0] }));
    }
  }, [groupedCategories, form.mainCategory, form.category]);

  useEffect(() => {
    if (!imageFiles.length) {
      const existingProduct = products.find((product) => product.id === editingId);
      const existingImages = Array.isArray(existingProduct?.images)
        ? existingProduct.images
        : existingProduct?.image
          ? [existingProduct.image]
          : [];
      setImagePreviews(existingImages);
      return;
    }

    const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previewUrls);
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [imageFiles, editingId, products]);

  const login = async () => {
    setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setNotice("Грешен имейл или парола. Създай админ потребител в Supabase Auth.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const openOrder = (order) => {
    setSelectedOrder(order);
    setOrderForm({
      order_number: order.order_number || "",
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
      customer_email: order.customer_email || "",
      customer_city: order.customer_city || "",
      customer_address: order.customer_address || "",
      customer_comment: order.customer_comment || "",
      payment_method: order.payment_method || "cod",
      payment_status: order.payment_status || "pending",
      status: order.status || "Приета",
    });
  };

  const updateOrderForm = (field, value) => {
    setOrderForm((current) => ({ ...current, [field]: value }));
  };

  const sendStatusEmail = async (order, status) => {
    const response = await fetch(`${EMAIL_API_BASE}/api/send-status-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: { ...order, status }, status }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || "Email send failed");
    }
  };

  const saveOrder = async () => {
    if (!selectedOrder) return;
    if (!orderForm.customer_name || !orderForm.customer_phone || !orderForm.customer_city || !orderForm.customer_address) {
      setNotice("Попълни име, телефон, град и адрес за поръчката.");
      return;
    }

    setOrderSaving(true);
    setNotice("");

    const previousStatus = selectedOrder.status || "Приета";
    const payload = {
      customer_name: orderForm.customer_name,
      customer_phone: orderForm.customer_phone,
      customer_email: orderForm.customer_email || null,
      customer_city: orderForm.customer_city,
      customer_address: orderForm.customer_address,
      customer_comment: orderForm.customer_comment || null,
      payment_method: orderForm.payment_method || "cod",
      payment_status: orderForm.payment_status || "pending",
      status: orderForm.status || "Приета",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", selectedOrder.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      setNotice(error.message || "Не успях да запазя поръчката.");
      setOrderSaving(false);
      return;
    }

    const saved = data || { ...selectedOrder, ...payload };
    setSelectedOrder(saved);
    setOrders((current) => current.map((order) => order.id === saved.id ? saved : order));

    if (previousStatus !== saved.status && STATUS_EMAIL_STATUSES.has(saved.status)) {
      try {
        await sendStatusEmail(saved, saved.status);
        setNotice("Поръчката е запазена и клиентът получи email за статуса.");
      } catch (emailError) {
        console.error("STATUS EMAIL ERROR:", emailError);
        setNotice(`Поръчката е запазена, но email-ът за статус не беше изпратен: ${emailError.message}`);
      }
    } else {
      setNotice("Поръчката е запазена.");
    }

    setOrderSaving(false);
  };

  const deleteOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Да изтрия ли поръчка ${getOrderNumber(selectedOrder)}?`)) return;

    setOrderSaving(true);
    const { error } = await supabase.from("orders").delete().eq("id", selectedOrder.id);
    setOrderSaving(false);

    if (error) {
      console.error(error);
      setNotice(error.message || "Не успях да изтрия поръчката.");
      return;
    }

    setOrders((current) => current.filter((order) => order.id !== selectedOrder.id));
    setSelectedOrder(null);
    setOrderForm(emptyOrderForm);
    setNotice("Поръчката е изтрита.");
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleProductImagesSelect = (event) => {
    const selected = Array.from(event.target.files || []).slice(0, 10);
    setImageFiles(selected);
    if ((event.target.files || []).length > 10) {
      setNotice("Можеш да качиш максимум 10 снимки за един артикул.");
    }
  };

  const resetProductForm = () => {
    setEditingId(null);
    setImageFiles([]);
    setImagePreviews([]);
    setForm(emptyProductForm);
  };

  const saveProduct = async () => {
    if (!normalizeText(form.title) || !normalizeText(form.price)) {
      setNotice("Попълни поне име и цена.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const existing = products.find((product) => product.id === editingId);
      let uploadedImages = [];
      if (imageFiles.length > 0) {
        uploadedImages = await uploadImages(imageFiles);
      } else {
        uploadedImages = Array.isArray(existing?.images)
          ? existing.images
          : existing?.image
            ? [existing.image]
            : [];
      }

      if (existing?.source === "vali") {
        const overridePayload = {
          vali_id: existing.vali_id,
          custom_title: normalizeText(form.title) || null,
          custom_description: normalizeText(form.description) || null,
          custom_price: Number(form.price || 0),
          custom_image: uploadedImages[0] || null,
          hidden: Boolean(form.hidden),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("vali_product_overrides")
          .upsert(overridePayload, { onConflict: "vali_id" });

        if (error) throw error;

        setNotice("VALI продуктът е записан като локална редакция.");
        resetProductForm();
        await loadProducts();
        return;
      }

      const basePayload = {
        title: normalizeText(form.title),
        description: form.description,
        price: Number(form.price || 0),
        stock: Number(form.stock || 0),
        image: uploadedImages[0] || "",
        images: uploadedImages,
        category: form.category,
        main_category: form.mainCategory,
        filters: buildLocalFilters(form),
      };

      const runWrite = (payload) => (
        editingId
          ? supabase.from("products").update(payload).eq("id", editingId)
          : supabase.from("products").insert(payload)
      );

      let result = await runWrite(basePayload);

      if (result.error && /main_category/i.test(result.error.message || "")) {
        const fallbackPayload = { ...basePayload };
        delete fallbackPayload.main_category;
        result = await runWrite(fallbackPayload);
      }

      if (result.error && /filters/i.test(result.error.message || "")) {
        const fallbackPayload = { ...basePayload };
        delete fallbackPayload.filters;
        delete fallbackPayload.main_category;
        result = await runWrite(fallbackPayload);
      }

      if (result.error) throw result.error;

      setNotice(editingId ? "Продуктът е обновен успешно." : "Продуктът е добавен успешно.");
      resetProductForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      setNotice(error.message || "Не успях да запиша продукта.");
    } finally {
      setSaving(false);
    }
  };

  const startEditProduct = (product) => {
    const inferredMainCategory =
      product.main_category ||
      groupedCategories.find((group) => group.items.includes(product.category))?.title ||
      "Компютри";
    const filters = product.filters || {};

    setEditingId(product.id);
    setImageFiles([]);
    setForm({
      title: product.title || "",
      mainCategory: inferredMainCategory,
      category: product.category || groupedCategories.find((group) => group.title === inferredMainCategory)?.items?.[0] || "",
      price: String(product.price || ""),
      stock: String(product.stock ?? "1"),
      description: product.description || "",
      socket: filters.Socket || "",
      ramType: filters["RAM Type"] || "",
      chipset: filters.Chipset || "",
      formFactor: filters["Form Factor"] || "",
      watts: filters.Wattage || "",
      gpuChipset: filters["GPU Chipset"] || "",
      memory: filters.Memory || "",
      capacity: filters.Capacity || "",
      frequency: filters.Frequency || "",
      hidden: Boolean(product.hidden),
    });
  };

  const restoreValiOriginal = async (product) => {
    if (product.source !== "vali") return;

    const { error } = await supabase
      .from("vali_product_overrides")
      .delete()
      .eq("vali_id", product.vali_id);

    if (error) {
      console.error(error);
      setNotice("Не успях да възстановя VALI оригинала.");
      return;
    }

    setNotice("VALI оригиналът е възстановен.");
    if (editingId === product.id) resetProductForm();
    await loadProducts();
  };

  const deleteProduct = async (product) => {
    if (product.source === "vali") {
      setNotice("VALI продукт - управлява се от VALI синхронизацията.");
      return;
    }

    if (!window.confirm(`Да изтрия ли "${product.title}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      console.error(error);
      setNotice("Не успях да изтрия продукта.");
      return;
    }
    await loadProducts();
  };

  const saveDeliverySettings = async () => {
    const payload = {
      key: "delivery_settings",
      value: {
        provider: deliveryForm.provider,
        free_delivery_threshold: Number(deliveryForm.free_delivery_threshold || 0),
        delivery_min: Number(deliveryForm.delivery_min || 0),
        delivery_max: Number(deliveryForm.delivery_max || 0),
        default_delivery_price: Number(deliveryForm.default_delivery_price || 0),
      },
    };

    const { error } = await supabase.from("store_settings").upsert(payload, { onConflict: "key" });
    if (error) {
      console.error(error);
      setNotice("Не успях да запиша настройките за доставка.");
      return;
    }

    setNotice("Настройките за доставка са запазени.");
  };

  const saveMarkup = async (mainCategory, subCategory) => {
    const key = `${mainCategory}||${subCategory}`;
    const payload = {
      main_category: mainCategory,
      sub_category: subCategory,
      markup_percent: Number(markupInputs[key] || 0),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("category_markups").upsert(payload, {
      onConflict: "main_category,sub_category",
    });

    if (error) {
      console.error(error);
      setNotice("Не успях да запиша надценката.");
      return;
    }

    setNotice(`Надценката за ${subCategory} е запазена.`);
    await loadMarkups();
  };

  const seedDefaultPartners = async () => {
    const { error } = await supabase.from("partners").upsert(
      DEFAULT_PARTNERS.map((partner) => ({
        ...partner,
      })),
      { onConflict: "name" }
    );

    if (error) {
      console.error(error);
      setNotice("Липсва таблица partners. Пусни SQL скрипта.");
      return;
    }

    setNotice("Стандартните партньори са качени в Supabase.");
    await loadPartners();
  };

  const resetPartnerForm = () => {
    setPartnerForm(emptyPartnerForm);
    setPartnerEditingId(null);
  };

  const savePartner = async () => {
    const payload = {
      ...partnerForm,
      sort_order: Number(partnerForm.sort_order || 0),
      is_active: Boolean(partnerForm.is_active),
    };

    const action = partnerEditingId
      ? supabase.from("partners").update(payload).eq("id", partnerEditingId)
      : supabase.from("partners").insert(payload);
    const { error } = await action;

    if (error) {
      console.error(error);
      setNotice("Не успях да запиша партньора.");
      return;
    }

    setNotice("Партньорът е запазен.");
    resetPartnerForm();
    await loadPartners();
  };

  const startEditPartner = (partner) => {
    setPartnerEditingId(partner.id);
    setPartnerForm({
      name: partner.name || "",
      logo: partner.logo || "",
      logo_src: partner.logo_src || "",
      tag: partner.tag || "",
      text: partner.text || "",
      url: partner.url || "",
      is_active: Boolean(partner.is_active),
      sort_order: Number(partner.sort_order || 0),
    });
  };

  const removePartner = async (partner) => {
    const { error } = await supabase.from("partners").delete().eq("id", partner.id);
    if (error) {
      console.error(error);
      setNotice("Не успях да изтрия партньора.");
      return;
    }
    await loadPartners();
  };

  const resetPromotionForm = () => {
    setPromotionForm(emptyPromotionForm);
    setPromotionEditingId(null);
  };

  const savePromotion = async () => {
    const payload = {
      ...promotionForm,
      discount_percent: Number(promotionForm.discount_percent || 0),
      main_category: normalizeText(promotionForm.main_category) || null,
      sub_category: normalizeText(promotionForm.sub_category) || null,
      product_id: normalizeText(promotionForm.product_id) || null,
      starts_at: normalizeText(promotionForm.starts_at) || null,
      ends_at: normalizeText(promotionForm.ends_at) || null,
      is_active: Boolean(promotionForm.is_active),
    };

    const action = promotionEditingId
      ? supabase.from("promotions").update(payload).eq("id", promotionEditingId)
      : supabase.from("promotions").insert(payload);
    const { error } = await action;

    if (error) {
      console.error(error);
      setNotice("Не успях да запиша промоцията.");
      return;
    }

    setNotice("Промоцията е запазена.");
    resetPromotionForm();
    await loadPromotions();
  };

  const startEditPromotion = (promotion) => {
    setPromotionEditingId(promotion.id);
    setPromotionForm({
      title: promotion.title || "",
      description: promotion.description || "",
      discount_percent: Number(promotion.discount_percent || 0),
      main_category: promotion.main_category || "",
      sub_category: promotion.sub_category || "",
      product_id: promotion.product_id || "",
      starts_at: promotion.starts_at ? String(promotion.starts_at).slice(0, 16) : "",
      ends_at: promotion.ends_at ? String(promotion.ends_at).slice(0, 16) : "",
      is_active: Boolean(promotion.is_active),
    });
  };

  const removePromotion = async (promotion) => {
    const { error } = await supabase.from("promotions").delete().eq("id", promotion.id);
    if (error) {
      console.error(error);
      setNotice("Не успях да изтрия промоцията.");
      return;
    }
    await loadPromotions();
  };

  const saveWarrantyRecord = async (record) => {
    const input = warrantyInputs[record.id] || {};
    const months = Number(input.warranty_months || record.warranty_months || 24);
    const startsAt = record.created_at ? new Date(record.created_at) : new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + months);

    const payload = {
      order_id: record.order_id || null,
      customer_name: record.customer_name || "",
      phone: record.phone || "",
      product_name: record.product_name || "",
      serial_number: input.serial_number || "",
      warranty_months: months,
      starts_at: startsAt.toISOString().slice(0, 10),
      ends_at: endsAt.toISOString().slice(0, 10),
      status: input.status || "Активна",
      notes: input.notes || "",
    };

    const action = String(record.id).startsWith("order-")
      ? supabase.from("warranties").insert(payload)
      : supabase.from("warranties").update(payload).eq("id", record.id);

    const { error } = await action;
    if (error) {
      console.error(error);
      setNotice("Липсва таблица warranties. Пусни SQL скрипта.");
      return;
    }

    setNotice("Гаранцията е запазена.");
    await loadWarranties();
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const text = `${product.title || ""} ${product.category || ""} ${product.main_category || ""} ${product.description || ""}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });
  }, [products, query]);

  const warrantyRecords = useMemo(() => {
    if (!warrantiesUsingOrdersFallback && warranties.length > 0) {
      return warranties.map((record) => ({
        id: record.id,
        order_id: record.order_id,
        customer_name: record.customer_name,
        phone: record.phone,
        created_at: record.created_at || record.starts_at,
        total: null,
        product_name: record.product_name,
        serial_number: record.serial_number || "",
        warranty_months: Number(record.warranty_months || 24),
        status: record.status || "Активна",
        notes: record.notes || "",
      }));
    }

    return orders.map((order) => ({
      id: `order-${order.id}`,
      order_id: order.id,
      customer_name: order.customer_name || "Клиент",
      phone: order.customer_phone || "",
      created_at: order.created_at,
      total: order.total,
      product_name: Array.isArray(order.items) ? order.items.map((item) => item.name).join(", ") : "Няма продукти",
      serial_number: "",
      warranty_months: 24,
      status: order.created_at && new Date(order.created_at) > new Date(new Date().setMonth(new Date().getMonth() - 24)) ? "Активна" : "Изтекла",
      notes: "",
    }));
  }, [orders, warranties, warrantiesUsingOrdersFallback]);

  useEffect(() => {
    const nextInputs = {};
    warrantyRecords.forEach((record) => {
      nextInputs[record.id] = {
        serial_number: record.serial_number || "",
        warranty_months: String(record.warranty_months || 24),
        status: record.status || "Активна",
        notes: record.notes || "",
      };
    });
    setWarrantyInputs(nextInputs);
  }, [warrantyRecords]);

  const editingProduct = products.find((product) => product.id === editingId);

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="logo-box">VF</div>
          <h1>VF Admin App</h1>
          <p>Отделно приложение за управление на магазина, доставката, надценките, промоциите и партньорите.</p>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Админ имейл" />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Парола" />
          {notice && <div className="notice">{notice}</div>}
          <button onClick={login}><LogIn size={18} />Вход</button>
          <small>Достъп само за потребители, създадени в Supabase Auth.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-box">VF</div>
          <div>
            <b>VF Admin</b>
            <span>Control Center</span>
          </div>
        </div>

        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><PackagePlus />Продукти</button>
        <button className={tab === "delivery" ? "active" : ""} onClick={() => setTab("delivery")}><Truck />Доставка</button>
        <button className={tab === "markups" ? "active" : ""} onClick={() => setTab("markups")}><Percent />Надценки</button>
        <button className={tab === "promotions" ? "active" : ""} onClick={() => setTab("promotions")}><Tags />Промоции</button>
        <button className={tab === "partners" ? "active" : ""} onClick={() => setTab("partners")}><Users />Партньори</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => { setTab("orders"); setNewOrdersCount(0); }}>
          <ShoppingBag />Поръчки
          {newOrdersCount > 0 && <span className="nav-badge">{newOrdersCount}</span>}
        </button>
        <button className={tab === "service" ? "active" : ""} onClick={() => setTab("service")}><Wrench />Сервиз</button>
        <button className={tab === "warranty" ? "active" : ""} onClick={() => setTab("warranty")}><ShieldCheck />Гаранции</button>

        <div className="spacer" />
        <button className="logout" onClick={logout}><LogOut />Изход</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Админ приложение</h1>
            <p>Категориите, надценките, промоциите и доставката са вързани към публичния сайт.</p>
          </div>
          <button onClick={loadAll}><RefreshCw size={18} />Обнови</button>
        </header>

        {notice && <div className="notice wide">{notice}</div>}
        {orderToast && <div className="order-toast">{orderToast}</div>}

        {tab === "products" && (
          <>
            <section className="form-card">
              <div className="section-title">
                <h2>{editingId ? "Редакция на продукт" : "Нов продукт"}</h2>
                {editingId && <button className="clear-btn" onClick={resetProductForm}><X size={16} />Отказ</button>}
              </div>

              <div className="form-grid">
                <label>Име на продукта<input value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></label>
                <label>Основна категория
                  <select value={form.mainCategory} onChange={(event) => updateForm("mainCategory", event.target.value)}>
                    {categoryOptions.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label>Подкатегория
                  <select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                    {subcategoryOptions.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label>Цена (€)<input type="number" value={form.price} onChange={(event) => updateForm("price", event.target.value)} /></label>
                <label>Наличност<input type="number" value={form.stock} onChange={(event) => updateForm("stock", event.target.value)} /></label>
                <label>
                  Скрит продукт
                  <input type="checkbox" checked={Boolean(form.hidden)} onChange={(event) => updateForm("hidden", event.target.checked)} />
                </label>
                <label>Socket<input value={form.socket} onChange={(event) => updateForm("socket", event.target.value)} /></label>
                <label>RAM тип<input value={form.ramType} onChange={(event) => updateForm("ramType", event.target.value)} /></label>
                <label>Чипсет<input value={form.chipset} onChange={(event) => updateForm("chipset", event.target.value)} /></label>
                <label>Form factor<input value={form.formFactor} onChange={(event) => updateForm("formFactor", event.target.value)} /></label>
                <label>Мощност<input value={form.watts} onChange={(event) => updateForm("watts", event.target.value)} /></label>
                <label>GPU чип<input value={form.gpuChipset} onChange={(event) => updateForm("gpuChipset", event.target.value)} /></label>
                <label>Памет<input value={form.memory} onChange={(event) => updateForm("memory", event.target.value)} /></label>
                <label>Капацитет<input value={form.capacity} onChange={(event) => updateForm("capacity", event.target.value)} /></label>
                <label>Честота<input value={form.frequency} onChange={(event) => updateForm("frequency", event.target.value)} /></label>
                <label className="wide">Описание<textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></label>
                <label className="wide file-label"><ImagePlus />Снимки / максимум 10<input type="file" accept="image/*" multiple onChange={handleProductImagesSelect} /></label>
                {imagePreviews.length > 0 && (
                  <div className="admin-image-preview-grid wide">
                    {imagePreviews.map((preview, index) => (
                      <div className="admin-image-preview" key={`${preview}-${index}`}>
                        <img src={preview} alt={`Преглед ${index + 1}`} />
                        {index === 0 && <span>Основна</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="save-btn" onClick={saveProduct} disabled={saving}>
                <Save size={18} />
                {saving ? "Записване..." : editingId ? "Запази промените" : "Добави продукт"}
              </button>
              {editingProduct?.source === "vali" && (
                <button className="clear-btn" onClick={() => restoreValiOriginal(editingProduct)}>
                  <RefreshCw size={16} />
                  Възстанови VALI оригинал
                </button>
              )}
            </section>

            <section className="list-card">
              <div className="list-head">
                <div>
                  <h2>Локални продукти</h2>
                  <p>{filteredProducts.length} показани</p>
                </div>
                <div className="search-box">
                  <Search size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси продукт..." />
                </div>
              </div>

              <div className="product-list">
                {filteredProducts.length === 0 ? (
                  <p className="empty">Няма локални продукти.</p>
                ) : filteredProducts.map((product) => (
                  <div className="product-row" key={product.id}>
                    {(Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image)
                      ? <img src={Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image} alt={product.title} />
                      : <div className="no-img">IMG</div>}
                    <div className="info">
                      <b>{product.title}</b>
                      <p>{product.main_category || "Без основна"} • {product.category} • {formatPrice(product.price)}</p>
                      <small>{product.description}</small>
                    </div>
                    <div className="row-actions">
                      {product.source === "vali" ? (
                        <>
                          <button onClick={() => startEditProduct(product)}><Pencil size={16} />Редакция</button>
                          {product.override_id && (
                            <button className="clear-btn" onClick={() => restoreValiOriginal(product)}><RefreshCw size={16} />Възстанови VALI оригинал</button>
                          )}
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditProduct(product)}><Pencil size={16} />Редакция</button>
                          <button className="danger" onClick={() => deleteProduct(product)}><Trash2 size={16} />Изтрий</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "delivery" && (
          <section className="form-card">
            <div className="section-title"><h2>Доставка</h2></div>
            <div className="form-grid">
              <label>Доставчик<input value={deliveryForm.provider} onChange={(event) => setDeliveryForm((current) => ({ ...current, provider: event.target.value }))} /></label>
              <label>Безплатна доставка над (€)<input type="number" value={deliveryForm.free_delivery_threshold} onChange={(event) => setDeliveryForm((current) => ({ ...current, free_delivery_threshold: event.target.value }))} /></label>
              <label>Минимална цена (€)<input type="number" value={deliveryForm.delivery_min} onChange={(event) => setDeliveryForm((current) => ({ ...current, delivery_min: event.target.value }))} /></label>
              <label>Максимална цена (€)<input type="number" value={deliveryForm.delivery_max} onChange={(event) => setDeliveryForm((current) => ({ ...current, delivery_max: event.target.value }))} /></label>
              <label>Начислявана цена по подразбиране (€)<input type="number" value={deliveryForm.default_delivery_price} onChange={(event) => setDeliveryForm((current) => ({ ...current, default_delivery_price: event.target.value }))} /></label>
            </div>
            <button className="save-btn" onClick={saveDeliverySettings}><Save size={18} />Запази настройките</button>
          </section>
        )}

        {tab === "markups" && (
          <section className="list-card">
            <div className="section-title"><h2>Надценки по подкатегории</h2></div>
            {markupsLoading ? (
              <p className="empty">Зареждане на категории...</p>
            ) : markupsError ? (
              <p className="empty">{markupsError}</p>
            ) : (
            <div className="settings-list">
              {markupPairs.map((pair) => {
                const key = `${pair.main_category}||${pair.sub_category}`;
                return (
                  <div className="settings-row" key={key}>
                    <div>
                      <b>{pair.main_category}</b>
                      <p>{pair.sub_category}</p>
                    </div>
                    <input
                      type="number"
                      value={markupInputs[key] || "0"}
                      onChange={(event) => setMarkupInputs((current) => ({ ...current, [key]: event.target.value }))}
                    />
                    <button onClick={() => saveMarkup(pair.main_category, pair.sub_category)}><Save size={16} />Запази</button>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        )}

        {tab === "promotions" && (
          <>
            <section className="form-card">
              <div className="section-title">
                <h2>{promotionEditingId ? "Редакция на промоция" : "Нова промоция"}</h2>
                {promotionEditingId && <button className="clear-btn" onClick={resetPromotionForm}><X size={16} />Отказ</button>}
              </div>
              <div className="form-grid">
                <label>Заглавие<input value={promotionForm.title} onChange={(event) => setPromotionForm((current) => ({ ...current, title: event.target.value }))} /></label>
                <label>Отстъпка (%)<input type="number" value={promotionForm.discount_percent} onChange={(event) => setPromotionForm((current) => ({ ...current, discount_percent: event.target.value }))} /></label>
                <label>Основна категория
                  <select value={promotionForm.main_category} onChange={(event) => setPromotionForm((current) => ({ ...current, main_category: event.target.value, sub_category: "" }))}>
                    <option value="">Без ограничение</option>
                    {categoryOptions.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label>Подкатегория
                  <select value={promotionForm.sub_category} onChange={(event) => setPromotionForm((current) => ({ ...current, sub_category: event.target.value }))}>
                    <option value="">Без ограничение</option>
                    {promotionSubcategoryOptions.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label>Product ID<input value={promotionForm.product_id} onChange={(event) => setPromotionForm((current) => ({ ...current, product_id: event.target.value }))} placeholder="local-5 или vali-123" /></label>
                <label>Начало<input type="datetime-local" value={promotionForm.starts_at} onChange={(event) => setPromotionForm((current) => ({ ...current, starts_at: event.target.value }))} /></label>
                <label>Край<input type="datetime-local" value={promotionForm.ends_at} onChange={(event) => setPromotionForm((current) => ({ ...current, ends_at: event.target.value }))} /></label>
                <label>Активна
                  <select value={promotionForm.is_active ? "yes" : "no"} onChange={(event) => setPromotionForm((current) => ({ ...current, is_active: event.target.value === "yes" }))}>
                    <option value="yes">Да</option>
                    <option value="no">Не</option>
                  </select>
                </label>
                <label className="wide">Описание<textarea value={promotionForm.description} onChange={(event) => setPromotionForm((current) => ({ ...current, description: event.target.value }))} /></label>
              </div>
              <button className="save-btn" onClick={savePromotion}><Save size={18} />Запази промоцията</button>
            </section>

            <section className="list-card">
              <h2>Промоции</h2>
              <div className="product-list">
                {promotions.length === 0 ? <p className="empty">Няма промоции.</p> : promotions.map((promotion) => (
                  <div className="product-row" key={promotion.id}>
                    <div className="no-img">%</div>
                    <div className="info">
                      <b>{promotion.title}</b>
                      <p>{promotion.discount_percent}% • {promotion.main_category || "Всички"} • {promotion.sub_category || "Всички"}</p>
                      <small>{promotion.description}</small>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => startEditPromotion(promotion)}><Pencil size={16} />Редакция</button>
                      <button className="danger" onClick={() => removePromotion(promotion)}><Trash2 size={16} />Изтрий</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "partners" && (
          <>
            <section className="form-card">
              <div className="section-title">
                <h2>{partnerEditingId ? "Редакция на партньор" : "Нов партньор"}</h2>
                {partnerEditingId && <button className="clear-btn" onClick={resetPartnerForm}><X size={16} />Отказ</button>}
              </div>
              <div className="form-grid">
                <label>Име<input value={partnerForm.name} onChange={(event) => setPartnerForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label>Лого текст<input value={partnerForm.logo} onChange={(event) => setPartnerForm((current) => ({ ...current, logo: event.target.value }))} /></label>
                <label>Лого URL<input value={partnerForm.logo_src} onChange={(event) => setPartnerForm((current) => ({ ...current, logo_src: event.target.value }))} /></label>
                <label>Tag<input value={partnerForm.tag} onChange={(event) => setPartnerForm((current) => ({ ...current, tag: event.target.value }))} /></label>
                <label>URL<input value={partnerForm.url} onChange={(event) => setPartnerForm((current) => ({ ...current, url: event.target.value }))} /></label>
                <label>Sort order<input type="number" value={partnerForm.sort_order} onChange={(event) => setPartnerForm((current) => ({ ...current, sort_order: event.target.value }))} /></label>
                <label>Активен
                  <select value={partnerForm.is_active ? "yes" : "no"} onChange={(event) => setPartnerForm((current) => ({ ...current, is_active: event.target.value === "yes" }))}>
                    <option value="yes">Да</option>
                    <option value="no">Не</option>
                  </select>
                </label>
                <label className="wide">Описание<textarea value={partnerForm.text} onChange={(event) => setPartnerForm((current) => ({ ...current, text: event.target.value }))} /></label>
              </div>
              <button className="save-btn" onClick={savePartner}><Save size={18} />Запази партньора</button>
            </section>

            <section className="list-card">
              <div className="section-title">
                <div>
                  <h2>Партньори</h2>
                  <p>
                    {partnersUsingFallback
                      ? "Показани са стандартните партньори, защото Supabase няма данни или таблицата липсва."
                      : "Партньорите се зареждат от Supabase."}
                  </p>
                </div>
                <button className="clear-btn" onClick={seedDefaultPartners}>
                  <Save size={16} />
                  Качи стандартните партньори в Supabase
                </button>
              </div>
              <div className="product-list">
                {partners.length === 0 ? <p className="empty">Няма партньори.</p> : partners.map((partner) => (
                  <div className="product-row" key={partner.id}>
                    {partner.logo_src ? <img src={partner.logo_src} alt={partner.name} /> : <div className="no-img">{partner.logo || "LOGO"}</div>}
                    <div className="info">
                      <b>{partner.name}</b>
                      <p>{partner.tag} • {partner.is_active ? "Активен" : "Скрит"}</p>
                      <small>{partner.text}</small>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => startEditPartner(partner)}><Pencil size={16} />Редакция</button>
                      <button className="danger" onClick={() => removePartner(partner)}><Trash2 size={16} />{partner.id ? "Изтрий" : "Скрий"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "orders" && (
          <>
            <section className="list-card">
              <div className="section-title">
                <div>
                  <h2>Поръчки</h2>
                  <p>Пълни данни, статуси и управление на клиентски поръчки.</p>
                </div>
                <button className="clear-btn" onClick={() => loadOrders()}><RefreshCw size={16} />Обнови</button>
              </div>
              <div className="orders-list">
                {orders.length === 0 ? <p className="empty">Няма поръчки.</p> : orders.map((order) => (
                  <div className="order-card" key={order.id}>
                    <div className="order-card-head">
                      <div>
                        <b>{getOrderNumber(order)}</b>
                        <span>{formatDateTime(order.created_at)}</span>
                      </div>
                      <span className={`status-pill ${String(order.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                        {order.status || "Приета"}
                      </span>
                    </div>
                    <div className="order-grid">
                      <p><strong>Клиент:</strong> {order.customer_name || "-"}</p>
                      <p><strong>Телефон:</strong> {order.customer_phone || "-"}</p>
                      <p><strong>Email:</strong> {order.customer_email || "-"}</p>
                      <p><strong>Град:</strong> {order.customer_city || "-"}</p>
                      <p><strong>Адрес:</strong> {order.customer_address || "-"}</p>
                      <p><strong>Плащане:</strong> {order.payment_method || "-"} / {order.payment_status || "pending"}</p>
                      <p><strong>Общо:</strong> {formatPrice(order.total || 0)}</p>
                      <p><strong>Продукти:</strong> {getOrderItemsText(order)}</p>
                      {order.customer_comment && <p className="wide"><strong>Коментар:</strong> {order.customer_comment}</p>}
                    </div>
                    <div className="row-actions">
                      <button onClick={() => openOrder(order)}><Pencil size={16} />Отвори</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {selectedOrder && (
              <div className="admin-modal-backdrop" onClick={() => setSelectedOrder(null)}>
                <section className="admin-modal" onClick={(event) => event.stopPropagation()}>
                  <div className="section-title">
                    <div>
                      <h2>Поръчка {getOrderNumber(selectedOrder)}</h2>
                      <p>{formatDateTime(selectedOrder.created_at)}</p>
                    </div>
                    <button className="clear-btn" onClick={() => setSelectedOrder(null)}><X size={16} />Затвори</button>
                  </div>

                  <div className="form-grid">
                    <label>Номер на поръчка<input value={orderForm.order_number || getOrderNumber(selectedOrder)} readOnly /></label>
                    <label>Статус
                      <select value={orderForm.status} onChange={(event) => updateOrderForm("status", event.target.value)}>
                        {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <label>Име на клиент<input value={orderForm.customer_name} onChange={(event) => updateOrderForm("customer_name", event.target.value)} /></label>
                    <label>Телефон<input value={orderForm.customer_phone} onChange={(event) => updateOrderForm("customer_phone", event.target.value)} /></label>
                    <label>Email<input value={orderForm.customer_email} onChange={(event) => updateOrderForm("customer_email", event.target.value)} /></label>
                    <label>Град<input value={orderForm.customer_city} onChange={(event) => updateOrderForm("customer_city", event.target.value)} /></label>
                    <label className="wide">Адрес<input value={orderForm.customer_address} onChange={(event) => updateOrderForm("customer_address", event.target.value)} /></label>
                    <label>Метод на плащане<input value={orderForm.payment_method} onChange={(event) => updateOrderForm("payment_method", event.target.value)} /></label>
                    <label>Статус на плащане<input value={orderForm.payment_status} onChange={(event) => updateOrderForm("payment_status", event.target.value)} /></label>
                    <label className="wide">Коментар<textarea value={orderForm.customer_comment} onChange={(event) => updateOrderForm("customer_comment", event.target.value)} /></label>
                  </div>

                  <div className="order-items-box">
                    <h3>Продукти</h3>
                    {getOrderItems(selectedOrder).length === 0 ? <p>Няма продукти.</p> : getOrderItems(selectedOrder).map((item, index) => (
                      <div className="order-item-row" key={`${item.id || item.name || "item"}-${index}`}>
                        <span>{item.name || item.title || "Продукт"}</span>
                        <b>x{Number(item.quantity || 1)}</b>
                        <strong>{formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                      </div>
                    ))}
                    <div className="order-total-row">
                      <span>Обща сума</span>
                      <strong>{formatPrice(selectedOrder.total || 0)}</strong>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button className="save-btn" disabled={orderSaving} onClick={saveOrder}><Save size={18} />{orderSaving ? "Запазване..." : "Запази промени"}</button>
                    <button className="danger-action" disabled={orderSaving} onClick={deleteOrder}><Trash2 size={18} />Изтрий поръчката</button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}

        {tab === "service" && (
          <section className="list-card">
            <h2>Сервизни заявки</h2>
            <div className="product-list">
              {tickets.length === 0 ? <p className="empty">Няма сервизни заявки.</p> : tickets.map((ticket) => (
                <div className="product-row" key={ticket.id}>
                  <div className="no-img">SV</div>
                  <div className="info">
                    <b>{ticket.device}</b>
                    <p>{ticket.customer_name} • {ticket.phone} • {ticket.status}</p>
                    <small>{ticket.problem}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "warranty" && (
          <section className="list-card">
            <div className="section-title">
              <div>
                <h2>Гаранции</h2>
                <p>{warrantiesUsingOrdersFallback ? "Поръчки с гаранция" : "Гаранционни записи"}</p>
              </div>
            </div>
            <div className="product-list">
              {warrantyRecords.length === 0 ? (
                <p className="empty">Няма намерени поръчки/гаранции.</p>
              ) : warrantyRecords.map((record) => {
                const input = warrantyInputs[record.id] || {};

                return (
                  <div className="product-row" key={record.id}>
                    <div className="no-img">GW</div>
                    <div className="info">
                      <b>{record.customer_name || "Клиент"}</b>
                      <p>
                        #{record.order_id || "-"} • {record.phone || "Без телефон"} •{" "}
                        {record.created_at ? new Date(record.created_at).toLocaleDateString("bg-BG") : "Без дата"}
                        {record.total != null ? ` • ${formatPrice(record.total)}` : ""}
                      </p>
                      <small>{record.product_name || "Няма продукти"}</small>
                      <div className="form-grid" style={{ marginTop: 12 }}>
                        <label>
                          Сериен номер
                          <input
                            value={input.serial_number || ""}
                            onChange={(event) =>
                              setWarrantyInputs((current) => ({
                                ...current,
                                [record.id]: {
                                  ...current[record.id],
                                  serial_number: event.target.value,
                                },
                              }))
                            }
                          />
                        </label>
                        <label>
                          Гаранция месеци
                          <select
                            value={input.warranty_months || "24"}
                            onChange={(event) =>
                              setWarrantyInputs((current) => ({
                                ...current,
                                [record.id]: {
                                  ...current[record.id],
                                  warranty_months: event.target.value,
                                },
                              }))
                            }
                          >
                            <option value="12">12</option>
                            <option value="24">24</option>
                            <option value="36">36</option>
                          </select>
                        </label>
                        <label>
                          Статус
                          <select
                            value={input.status || "Активна"}
                            onChange={(event) =>
                              setWarrantyInputs((current) => ({
                                ...current,
                                [record.id]: {
                                  ...current[record.id],
                                  status: event.target.value,
                                },
                              }))
                            }
                          >
                            <option value="Активна">Активна</option>
                            <option value="Изтекла">Изтекла</option>
                          </select>
                        </label>
                        <label className="wide">
                          Бележки
                          <textarea
                            value={input.notes || ""}
                            onChange={(event) =>
                              setWarrantyInputs((current) => ({
                                ...current,
                                [record.id]: {
                                  ...current[record.id],
                                  notes: event.target.value,
                                },
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => saveWarrantyRecord(record)}><Save size={16} />Запази</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
