import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate
} from "react-router-dom";

import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Cpu, Monitor, Laptop, HardDrive, Gamepad2, Search, ShoppingCart, Menu, X,
  Star, Heart, ShieldCheck, Truck, Wrench, Phone, Mail, MapPin, Minus, Plus,
  Trash2, CreditCard, Sparkles, Zap, Settings, CheckCircle2, PackageCheck,
  User, SlidersHorizontal, ChevronDown, Bot, Gauge, Server, MemoryStick,
  Cable, Fan, Power, Send, ExternalLink
} from "lucide-react";
import { supabase } from "./supabaseClient";
import "./style.css";

const LOGO_URL = "/VF_logo_1.png";

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

const ADMIN_PASSWORD = "vfadmin123"; // Смени тази парола след като качиш сайта.
const STORAGE_BUCKET = "product-images";

const formatPrice = (value) => {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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
      "Хард дискове и SSD",
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
          customerProfile?.phone || order.phone ? `Телефон: ${customerProfile?.phone || order.phone}` : "",
          customerProfile?.address ? `Адрес: ${customerProfile.address}` : "",
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
                  <td>{formatPrice(item.price)}</td>
                  <td>{formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</td>
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
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("vf_admin_unlocked", "yes");
      setUnlocked(true);
      setAdminNotice("");
    } else {
      setAdminNotice("Грешна парола.");
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
    const text = `${product.title || ""} ${product.category || ""} ${product.description || ""}`.toLowerCase();
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

const ProductPage = ({ products, addToCart, handleTbiCheckout }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = products.find((p) => String(p.id) === id);

  const [selectedImage, setSelectedImage] = useState(0);

useEffect(() => {
  window.scrollTo({
    top: 0,
    behavior: "instant",
  });
}, [id]);

  if (!product) {
    return (
      <div className="product-page-not-found">
        <h2>Продуктът не е намерен</h2>

        <button onClick={() => navigate("/")}>
          Назад
        </button>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images
    : [product.image];

  return (
    <div className="product-page">

      <div className="container">

        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>

        <div className="product-page-grid">

          <div className="product-page-gallery">

            <div className="product-page-thumbs">
              {images.map((image, index) => (
                <button
                  key={index}
                  className={selectedImage === index ? "active" : ""}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>

            <div className="product-page-main-image">
              <img
                src={images[selectedImage]}
                alt={product.name}
              />
            </div>

          </div>

          <div className="product-page-info">

            <span className="product-page-category">
              {product.category}
            </span>

            <h1>{product.name}</h1>

            <div className="product-price-row">

  <div className="product-page-price">
    <b>{formatPrice(product.price)}</b>

    <del>
      {formatPrice(product.oldPrice)}
    </del>
  </div>

  <div className="product-page-actions-inline">

    <button
      onClick={() => addToCart(product.id)}
    >
      Добави в количката
    </button>

    <button
      className="tbi-btn"
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
{product.specs?.componentType === "cpu" && (
  <div className="product-extra-specs">

    <p><b>Платформа:</b> {product.specs.platform}</p>

    <p><b>Серия:</b> {product.specs.series}</p>

    <p><b>Socket:</b> {product.specs.socket}</p>

    <p><b>Ядра:</b> {product.specs.cores}</p>

    <p><b>Нишки:</b> {product.specs.threads}</p>

    <p><b>Base Clock:</b> {product.specs.baseClock} GHz</p>

    <p><b>Boost Clock:</b> {product.specs.boostClock} GHz</p>

    <p><b>TDP:</b> {product.specs.tdp}W</p>

    <p><b>Вградена графика:</b> {product.specs.integratedGraphics}</p>

  </div>
)}
  <tbody>
    {product.description
      ?.split(".")
      .filter((line) => line.trim() !== "")
      .map((line, index) => {
        const parts = line.split(":");

        return (
          <tr key={index}>
            <td>{parts[0]}</td>
            <td>{parts.slice(1).join(":")}</td>
          </tr>
        );
      })}
  </tbody>
</table>

            <div className="product-page-specs">
              {product.specList.map((spec) => (
                <span key={spec}>
                  {spec}
                </span>
              ))}
            </div>

          </div>

        </div>

      </div>

    </div>
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
const CategoryPage = ({ products, addToCart, handleTbiCheckout }) => {
  const { categoryName } = useParams();
  const navigate = useNavigate();

  const [megaOpen, setMegaOpen] = useState(false);

  const decodedCategory = decodeURIComponent(categoryName);

  const categoryProducts = products.filter(
    (product) => product.category === decodedCategory
  );

  return (
  <>
    <header className="header">
      <div className="container header-inner">

        <a className="brand" href="/">
          <span className="logo-wrap">
            <img src={LOGO_URL} alt="ВФ Компютри" />
            <Cpu className="fallback-logo" />
          </span>

          <span className="brand-text">
            <b>ВФ <em>Компютри</em></b>
            <small>Продажба • Ремонт • Поддръжка</small>
          </span>
        </a>

        <nav className="desktop-nav">

  <button
    className="mega-menu-button"
    onClick={() => setMegaOpen((current) => !current)}
  >
    <Menu size={18} />
    Категории
  </button>

  <a href="/">Начало</a>
  <a href="/#builder">Сглоби PC</a>
  <a href="/#services">Сервиз</a>
  <a href="/#about">За нас</a>
  <a href="/#partners">Партньори</a>
  <a href="/#contact">Контакти</a>

</nav>

      </div>
    </header>
{megaOpen && (
  <div className="mega-menu-overlay" onClick={() => setMegaOpen(false)}>
    <div
      className="mega-menu-panel mega-menu-grid"
      onClick={(event) => event.stopPropagation()}
    >

      {megaCategories.map((category) => (
        <div className="mega-menu-column" key={category.title}>

          <img
            className="mega-bg"
            src={category.image}
            alt={category.title}
          />

          <div className="mega-content">

            <h2>{category.title}</h2>

            <ul>
              {category.items.map((item) => (
                <li
                  key={item}
                  onClick={() => {
                    setMegaOpen(false);
                    window.location.href = `/category/${encodeURIComponent(item)}`;
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>

          </div>

        </div>
      ))}

    </div>
  </div>
)}
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

        <div className="product-grid">
          {categoryProducts.length === 0 ? (
            <p className="empty-products">
              Няма продукти в тази категория.
            </p>
          ) : (
            categoryProducts.map((product) => (
              <Link
                to={`/product/${product.id}`}
                className="product-link"
                key={product.id}
              >
                <article className="product-card">

                  <div className="product-image">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                    />
                  </div>

                  <div className="product-body">

                    <div className="product-meta">
                      <span>{product.category}</span>
                    </div>

                    <h3>{product.name}</h3>

                    <p className="stock">
                      <CheckCircle2 size={15} />
                      {product.stock}
                    </p>

                    <div className="product-buy">

                      <div>
                        <b>{formatPrice(product.price)}</b>
                      </div>

                      <button
                        onClick={(event) => {
                          event.preventDefault();
                          addToCart(product.id);
                        }}
                      >
                        Добави
                      </button>

                    </div>

                  </div>

                </article>
              </Link>
            ))
          )}
        </div>

      </div>
    </div>
    </>
  );
};
function App() {
  useEffect(() => {
    if (window.location.hash === "#admin") window.location.hash = "";
  }, []);
  const [page, setPage] = useState("store");
  const [userSession, setUserSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [profileOpen, setProfileOpen] = useState(false);
  const [documentOrder, setDocumentOrder] = useState(null);
  const [documentCustomer, setDocumentCustomer] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const products = dbProducts.length > 0 ? dbProducts : fallbackProducts;
const showLoadingScreen = loadingProducts && dbProducts.length === 0;

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
    const loadProducts = async () => {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      setLoadingProducts(false);

      if (!error && data && data.length > 0) {
        setDbProducts(data.map((product) => ({
          id: product.id,
          name: product.title,
          category: product.category || "Компютри",
          price: Number(product.price || 0),
          oldPrice: Number(product.price || 0),
          rating: 4.9,
          stock: Number(product.stock || 0) > 0 ? "В наличност" : "По заявка",
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

specs: product.specs || {},

specList: product.description
  ? product.description.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 4)
  : ["ВФ Компютри", "Проверен продукт"],
        })));
      }
    };

    loadProducts();
  }, []);

  const [activeCategory, setActiveCategory] = useState("Всички");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [tbiUrl, setTbiUrl] = useState("");
  const [showTbi, setShowTbi] = useState(false);
  const [tbiLoading, setTbiLoading] = useState(false);
  const [tbiProduct, setTbiProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(null);
  const [priceLimit, setPriceLimit] = useState(2000);
  const [notice, setNotice] = useState("");
  const [sendingBuilder, setSendingBuilder] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
const [activeMega, setActiveMega] = useState(megaCategories[0]);
  const [aiMessages, setAiMessages] = useState([
    {
      role: "assistant",
      content: "Здравей! Аз съм AI асистентът на ВФ Компютри. Мога да помогна с избор на компютър, компоненти, сервиз или custom конфигурация.",
    },
  ]);
  const [builder, setBuilder] = useState({
    name: "",
    phone: "",
    budget: "750-1000 €",
    platform: "Няма значение",
    gpu: "Gaming 1080p",
    ram: "16GB",
    storage: "1TB NVMe",
    usage: "Gaming",
    games: "",
    notes: "",
  });

  const updateBuilder = (field, value) => {
    setBuilder((current) => ({ ...current, [field]: value }));
  };

  const sendBuilderRequest = async () => {
    if (!builder.name.trim() || !builder.phone.trim()) {
      setNotice("Моля, въведи име и телефон за връзка.");
      return;
    }

    setSendingBuilder(true);
    setNotice("");

    const { error } = await supabase.from("pc_requests").insert({
      name: builder.name,
      phone: builder.phone,
      budget: builder.budget,
      platform: builder.platform,
      gpu: builder.gpu,
      ram: builder.ram,
      storage: builder.storage,
      usage: builder.usage,
      games: builder.games,
      notes: builder.notes,
    });

    setSendingBuilder(false);

    if (error) {
      setNotice("Заявката не беше записана. Провери RLS policy в Supabase.");
      console.error(error);
      return;
    }

    setNotice("Заявката е изпратена успешно! Ще се свържем с теб.");
    setBuilder({
      name: "",
      phone: "",
      budget: "750-1000 €",
      platform: "Няма значение",
      gpu: "Gaming 1080p",
      ram: "16GB",
      storage: "1TB NVMe",
      usage: "Gaming",
      games: "",
      notes: "",
    });
  };

  const sendOrder = async () => {
    let customerProfile = null;

    if (userSession?.user?.id) {
      const { data } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", userSession.user.id)
        .maybeSingle();

      customerProfile = data || null;
    }

    const defaultName = customerProfile?.account_type === "company"
      ? customerProfile?.company_name
      : customerProfile?.full_name;

    const customerName = defaultName || window.prompt("Име и фамилия / фирма за поръчката:");
    const phone = customerProfile?.phone || window.prompt("Телефон за връзка:");

    if (!customerName || !phone) {
      setNotice("Поръчката не е изпратена — липсва име или телефон.");
      return;
    }

    setSendingOrder(true);
    setNotice("");

    const payload = {
      customer_name: customerName,
      phone,
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
      user_id: userSession?.user?.id || null,
      invoice_requested: customerProfile?.account_type === "company",
      billing_data: customerProfile ? {
        account_type: customerProfile.account_type,
        full_name: customerProfile.full_name,
        company_name: customerProfile.company_name,
        company_eik: customerProfile.company_eik,
        company_vat: customerProfile.company_vat,
        company_mol: customerProfile.company_mol,
        billing_address: customerProfile.billing_address,
        address: customerProfile.address,
      } : null,
      payment_method: paymentMethod,
      payment_status:
        paymentMethod === "bank"
          ? "Очаква банков превод"
          : paymentMethod === "tbi"
            ? "Очаква TBI одобрение"
            : "Наложен платеж",
      order_status: "Нова поръчка",
      bank_transfer_details:
        paymentMethod === "bank"
          ? {
              bank: bankInfo.bank,
              iban: bankInfo.iban,
              holder: bankInfo.holder,
            }
          : null,
    };

    const { data: savedOrder, error } = await supabase
      .from("orders")
      .insert(payload)
      .select("*")
      .single();

    setSendingOrder(false);

    if (error) {
      setNotice("Поръчката не беше записана. Провери RLS policy в Supabase.");
      console.error(error);
      return;
    }

    setNotice(
      paymentMethod === "bank"
        ? "Поръчката е изпратена успешно! Очакваме банков превод."
        : paymentMethod === "tbi"
          ? "Поръчката е създадена. Продължи към TBI Bank за кандидатстване."
          : "Поръчката е изпратена успешно! Документите са генерирани."
    );
    setDocumentOrder(savedOrder || { ...payload, id: Date.now(), created_at: new Date().toISOString() });
    setDocumentCustomer(customerProfile || {
      full_name: customerName,
      phone,
      account_type: "personal",
    });

    if (paymentMethod === "tbi") {
      handleTbiCheckout({
        name: cartItems.map((item) => item.name).join(", "),
        price: total,
      });
    }

    setCart({});
    setCartOpen(false);
    setCheckoutOpen(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = activeCategory === "Всички" || product.category === activeCategory;
      const searchMatch = `${product.name} ${product.category} ${product.specs.join(" ")}`.toLowerCase().includes(query.toLowerCase());
      const priceMatch = product.price <= priceLimit;
      return categoryMatch && searchMatch && priceMatch;
    });
  }, [products, activeCategory, query, priceLimit]);

  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => {
      const product = products.find((item) => item.id === Number(id));
      return product ? { ...product, quantity } : null;
    })
    .filter(Boolean);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = subtotal >= 1000 || subtotal === 0 ? 0 : 8;
  const total = subtotal + delivery;

  const addToCart = (id) => {
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
    setCartOpen(true);
  };

  const handleTbiCheckout = async (product) => {
    try {
      setTbiLoading(true);

      const response = await fetch("/api/tbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
        }),
      });

      const data = await response.json();

      setTbiLoading(false);

      if (data.url) {
        setTbiUrl(data.url);
        setTbiProduct(product);
        setShowTbi(true);
      } else {
        alert("TBI връзката не е налична.");
      }
    } catch (err) {
      setTbiLoading(false);
      console.error(err);
      alert("Грешка при TBI заявката.");
    }
  };

  const updateQuantity = (id, amount) => {
    setCart((current) => {
      const nextQuantity = (current[id] || 0) + amount;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: nextQuantity };
    });
  };

  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const nextMessages = [...aiMessages, { role: "user", content: text }];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI assistant error");
      }

      setAiMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error(error);
      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "В момента AI асистентът не може да отговори. Провери дали GEMINI_API_KEY е добавен във Vercel и дали сайтът е redeploy-нат.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const navLinks = (
  <>
    <a href="#builder" onClick={() => setMobileOpen(false)}>Сглоби PC</a>
    <a href="#services" onClick={() => setMobileOpen(false)}>Сервиз</a>
    <a href="#about-store" onClick={() => setMobileOpen(false)}>За нас</a>
    <a href="#partners" onClick={() => setMobileOpen(false)}>Партньори</a>
    <a href="#contact" onClick={() => setMobileOpen(false)}>Контакти</a>
  </>
);

if (showLoadingScreen) {
  return <LoadingScreen />;
}

  return (
  <Routes>
    <Route
      path="/"
      element={
        <div className="site">
      <div className="rgb-bg" />
      <div className="scanline" />

      <header className="header">
        <div className="container header-inner">
          <a className="brand" href="#">
            <span className="logo-wrap">
              <img src={LOGO_URL} alt="ВФ Компютри" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              <Cpu className="fallback-logo" />
            </span>
            <span className="brand-text">
              <b>ВФ <em>Компютри</em></b>
              <small>Продажба • Ремонт • Поддръжка</small>
            </span>
          </a>

          <nav className="desktop-nav">
  <button
    className="mega-menu-button"
    onClick={() => setMegaOpen((current) => !current)}
  >
    <Menu size={18} />
    Категории
  </button>

  {navLinks}
</nav>

          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси компютър, видеокарта, SSD..." />
          </div>

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
            <button className="cart-button" onClick={() => setCartOpen(true)}>
              <ShoppingCart size={19} />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}><Menu /></button>
          </div>
        </div>
      </header>
{megaOpen && (
  <div className="mega-menu-overlay" onClick={() => setMegaOpen(false)}>
    <div
      className="mega-menu-panel mega-menu-grid"
      onClick={(event) => event.stopPropagation()}
    >

      {megaCategories.map((category) => (
        <div className="mega-menu-column" key={category.title}>

          <img
            className="mega-bg"
            src={category.image}
            alt={category.title}
          />

          <div className="mega-content">

            <h2>{category.title}</h2>

            <ul>
              {category.items.map((item) => (
                <li
                  key={item}
                 onClick={() => {
  setMegaOpen(false);
  window.location.href = `/category/${encodeURIComponent(item)}`;
}}
                >
                  {item}
                </li>
              ))}
            </ul>

          </div>

        </div>
      ))}

    </div>
  </div>
)}
      {mobileOpen && (
  <div className="mobile-panel">
    <button className="mobile-close" onClick={() => setMobileOpen(false)}><X /></button>

    <div className="mobile-brand">ВФ <span>Компютри</span></div>

    <nav>{navLinks}</nav>

    <div className="mobile-categories">
  <h3>Категории</h3>

  {megaCategories.map((category) => (
    <div className="mobile-category-group" key={category.title}>
      <button
        className="mobile-category-title"
        onClick={() =>
          setMobileCategoryOpen(
            mobileCategoryOpen === category.title ? null : category.title
          )
        }
      >
        {category.title}
        <span>{mobileCategoryOpen === category.title ? "−" : "+"}</span>
      </button>

      {mobileCategoryOpen === category.title && (
        <div className="mobile-subcategories">
          {category.items.map((item) => (
            <button
              key={item}
              onClick={() => {
                setMobileOpen(false);
                window.location.href = `/category/${encodeURIComponent(item)}`;
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  ))}
</div>

    <a className="mobile-call" href={`tel:${storeInfo.rawPhone}`}>
      Обади се: {storeInfo.phone}
    </a>

    {userSession ? (
      <button className="mobile-auth" onClick={() => { setMobileOpen(false); setProfileOpen(true); }}>
        Моят профил
      </button>
    ) : (
      <button className="mobile-auth" onClick={() => { setMobileOpen(false); openAuth("login"); }}>
        Вход / Регистрация
      </button>
    )}
  </div>
)}

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
              <a href="#builder" className="btn ghost">Сглоби си PC</a>
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
              <img src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1400&q=80" alt="Gaming PC" />
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
          {filteredProducts.map((product) => (
            <Link
  to={`/product/${product.id}`}
  className="product-link"
  key={product.id}
>
  <article className="product-card">
              <div className="product-image">
                <img src={product.image} alt={product.name} loading="lazy" />
                <span className="badge-product">{product.badge}</span>
                <button className="wish" onClick={(event) => event.stopPropagation()}><Heart size={17} /></button>
                {product.images?.length > 1 && (
                  <div className="product-image-count">+{product.images.length - 1} снимки</div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div className="product-thumbs">
                  {product.images.slice(0, 5).map((image, index) => (
                    <button key={`${image}-${index}`} onClick={() => openProductGallery(product, index)}>
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
                <p className="stock"><CheckCircle2 size={15} /> {product.stock}</p>
                <div className="product-buy">
                  <div>
                    <b>{formatPrice(product.price)}</b>
                    <del>{formatPrice(product.oldPrice)}</del>
                  </div>
                  <button onClick={() => addToCart(product.id)}>Добави</button>
                  <button
                    className="tbi-btn"
                    onClick={() => handleTbiCheckout(product)}
                  >
                    Купи на изплащане
                  </button>
                </div>
              </div>
            </article>
</Link>
          ))}
        </div>
      </section>

      <section id="builder" className="builder-section">
        <div className="container builder-layout">
          <div className="builder-intro">
            <p className="section-label">Custom Build</p>
            <h2>Сглоби си компютър</h2>
            <p className="lead">
              Попълни кратка заявка и ще получиш оферта за конфигурация според бюджет, игри, програми и бъдещи ъпгрейди.
            </p>
            <div className="builder-steps compact">
              {pcBuilderSteps.map(({ icon: Icon, title, text }) => (
                <div className="builder-step" key={title}>
                  <Icon />
                  <div>
                    <b>{title}</b>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pc-builder-form">
            <div className="form-head">
              <div>
                <h3>Заявка за custom PC</h3>
                <p>Данните ще се подготвят като имейл към {storeInfo.email}</p>
              </div>
              <Sparkles />
            </div>

            <div className="builder-form-grid">
              <label>
                Име
                <input value={builder.name} onChange={(event) => updateBuilder("name", event.target.value)} placeholder="Вашето име" />
              </label>
              <label>
                Телефон
                <input value={builder.phone} onChange={(event) => updateBuilder("phone", event.target.value)} placeholder="Телефон за връзка" />
              </label>
              <label>
                Бюджет
                <select value={builder.budget} onChange={(event) => updateBuilder("budget", event.target.value)}>
                  <option>до 500 €</option>
                  <option>500-750 €</option>
                  <option>750-1000 €</option>
                  <option>1000-1500 €</option>
                  <option>над 1500 €</option>
                </select>
              </label>
              <label>
                Платформа
                <select value={builder.platform} onChange={(event) => updateBuilder("platform", event.target.value)}>
                  <option>Няма значение</option>
                  <option>AMD Ryzen</option>
                  <option>Intel Core</option>
                </select>
              </label>
              <label>
                Видеокарта / цел
                <select value={builder.gpu} onChange={(event) => updateBuilder("gpu", event.target.value)}>
                  <option>Офис / без външна видеокарта</option>
                  <option>Gaming 1080p</option>
                  <option>Gaming 1440p</option>
                  <option>Streaming</option>
                  <option>Работа / монтаж / AI</option>
                </select>
              </label>
              <label>
                RAM памет
                <select value={builder.ram} onChange={(event) => updateBuilder("ram", event.target.value)}>
                  <option>16GB</option>
                  <option>32GB</option>
                  <option>64GB</option>
                  <option>Не знам, препоръчайте</option>
                </select>
              </label>
              <label>
                SSD
                <select value={builder.storage} onChange={(event) => updateBuilder("storage", event.target.value)}>
                  <option>512GB NVMe</option>
                  <option>1TB NVMe</option>
                  <option>2TB NVMe</option>
                  <option>SSD + HDD</option>
                </select>
              </label>
              <label>
                Предназначение
                <select value={builder.usage} onChange={(event) => updateBuilder("usage", event.target.value)}>
                  <option>Gaming</option>
                  <option>Офис</option>
                  <option>Училище / работа</option>
                  <option>Видео монтаж</option>
                  <option>Streaming</option>
                  <option>AI / тежка работа</option>
                </select>
              </label>
              <label className="wide">
                Игри или програми
                <input value={builder.games} onChange={(event) => updateBuilder("games", event.target.value)} placeholder="Пример: CS2, GTA V, LoL, Photoshop, AutoCAD..." />
              </label>
              <label className="wide">
                Допълнителни бележки
                <textarea value={builder.notes} onChange={(event) => updateBuilder("notes", event.target.value)} placeholder="RGB, тиха работа, Wi-Fi, бяла кутия, бъдещ ъпгрейд..." />
              </label>
            </div>

            <div className="builder-preview">
              <b>Обобщение:</b>
              <p>{builder.budget} • {builder.platform} • {builder.gpu} • {builder.ram} • {builder.storage}</p>
            </div>

            {notice && <div className="notice">{notice}</div>}

            <div className="builder-actions">
              <button className="btn primary" onClick={sendBuilderRequest} disabled={sendingBuilder}>{sendingBuilder ? "Изпращане..." : "Изпрати заявка"}</button>
              <a className="btn ghost" href={`tel:${storeInfo.rawPhone}`}>Обади се</a>
            </div>
          </div>
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
          {partners.map((partner) => (
            <a className="partner-card" href={partner.url} target="_blank" rel="noreferrer" key={partner.name} aria-label={`Отвори сайта на ${partner.name}`}>
              <div className={`partner-logo partner-logo-${partner.name.toLowerCase().replaceAll(" ", "-").replaceAll("13", "")}`}>{partner.logo}</div>
              <span className="partner-divider" />
              <div className="partner-body"><span>{partner.tag}</span><h3>{partner.name}</h3><p>{partner.text}</p></div>
              <div className="partner-action">Посети сайта <ExternalLink size={15} /></div>
            </a>
          ))}
        </div>
      </section>

      <footer id="contact" className="footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-logo">ВФ <span>Компютри</span></div>
            <p>Онлайн магазин за компютри, компоненти, лаптопи и сервизни услуги.</p>
            <div className="social-row">
              <span>Gaming</span>
              <span>Repair</span>
              <span>Hardware</span>
            </div>
          </div>
          <div className="contact-list">
            <a href={`tel:${storeInfo.rawPhone}`}><Phone /> {storeInfo.phone}</a>
            <a href={`mailto:${storeInfo.email}`}><Mail /> {storeInfo.email}</a>
            <p><MapPin /> {storeInfo.address}</p>
          </div>
          <div className="footer-box">
            <b>Плащане и доставка</b>
            <p>Наложен платеж, банков превод и плащане на място. Онлайн плащане, Еконт и Спиди могат да се добавят в следващ етап.</p>
          </div>
        </div>
      </footer>

      <button className="floating-chat" onClick={() => setAiOpen(true)}>
        <Bot size={18} />
        <span>AI Асистент</span>
      </button>

      {aiOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-head">
            <div>
              <b>AI Асистент</b>
              <p>ВФ Компютри • онлайн помощник</p>
            </div>
            <button onClick={() => setAiOpen(false)}><X size={18} /></button>
          </div>

          <div className="ai-chat-body">
            {aiMessages.map((message, index) => (
              <div
                key={index}
                className={`ai-message ${message.role === "user" ? "user" : "assistant"}`}
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                }}
              >
                {message.content}
              </div>
            ))}

            {aiLoading && (
              <div
                className="ai-message assistant"
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                }}
              >
                Мисля...
              </div>
            )}
          </div>

          <div className="ai-quick-actions">
            <button onClick={() => setAiInput("Искам gaming компютър до 1000 евро")}>Gaming PC</button>
            <button onClick={() => setAiInput("Имам проблем с лаптопа, какво да направя?")}>Сервиз</button>
            <button onClick={() => setAiInput("Помогни ми да избера видеокарта")}>Видеокарта</button>
          </div>

          <div className="ai-chat-input">
            <input
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendAiMessage();
              }}
              placeholder="Напиши въпрос..."
            />
            <button onClick={sendAiMessage} disabled={aiLoading}><Send size={17} /></button>
          </div>
        </div>
      )}

      
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
          <div className="tbi-redirect-card">
            <button className="tbi-redirect-close" onClick={() => setShowTbi(false)}>✕</button>

            <div className="tbi-bank-mark">TBI Bank</div>
            <h2>Купи на изплащане</h2>
            <p className="tbi-redirect-lead">
              Заявката ще продължи в защитената система на TBI Bank.
              Това е нормално, защото банката не позволява формата да се зарежда вътре в друг сайт.
            </p>

            <div className="tbi-summary-box">
              <div>
                <span>Продукт / поръчка</span>
                <b>{tbiProduct?.name || "Избрани продукти"}</b>
              </div>
              <div>
                <span>Сума</span>
                <b>{formatPrice(tbiProduct?.price || 0)}</b>
              </div>
              <div>
                <span>Примерна вноска</span>
                <b>от {formatPrice((Number(tbiProduct?.price || 0) / 24).toFixed(0))} / мес.</b>
              </div>
            </div>

            <div className="tbi-info-list">
              <span>✓ Бърза онлайн заявка</span>
              <span>✓ Защитена страница на TBI Bank</span>
              <span>✓ Връщане към магазина след заявката</span>
            </div>

            <div className="tbi-redirect-actions">
              <button
                className="tbi-continue"
                onClick={() => {
                  window.open(tbiUrl, "_blank", "noopener,noreferrer");
                  setShowTbi(false);
                }}
              >
                Продължи към TBI Bank
              </button>
              <button className="tbi-cancel" onClick={() => setShowTbi(false)}>
                Отказ
              </button>
            </div>

            <small>
              ВФ Компютри не съхранява банкови данни. Одобрението и условията се обработват от TBI Bank.
            </small>
          </div>
        </div>
      )}

      {tbiLoading && (
        <div className="tbi-loading-overlay">
          <div>Свързване с TBI Bank...</div>
        </div>
      )}

      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <h3>Количка</h3>
                <p>{cartCount} продукта</p>
              </div>
              <button onClick={() => setCartOpen(false)}><X size={18} /></button>
            </div>
            <div className="cart-items">
              {cartItems.length === 0 ? (
                <div className="empty-cart">Количката е празна.</div>
              ) : (
                cartItems.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <img src={item.image} alt={item.name} />
                    <div className="cart-item-body">
                      <b>{item.name}</b>
                      <p>{formatPrice(item.price)}</p>
                      <div className="qty">
                        <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                        <button className="trash" onClick={() => updateQuantity(item.id, -item.quantity)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="drawer-total">
              <p><span>Междинна сума</span><b>{formatPrice(subtotal)}</b></p>
              <p><span>Доставка</span><b>{delivery === 0 ? "Безплатна" : formatPrice(delivery)}</b></p>
              <h3><span>Общо</span><b>{formatPrice(total)}</b></h3>
              <button disabled={!cartItems.length} onClick={() => setCheckoutOpen(true)}>Завърши поръчката</button>
              <button
                className="drawer-tbi-btn"
                disabled={!cartItems.length}
                onClick={() => handleTbiCheckout({
                  name: cartItems.map((item) => item.name).join(", "),
                  price: total,
                })}
              >
                Купи количката на изплащане с TBI
              </button>
            </div>
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="overlay checkout-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <h3>Финализиране на поръчка</h3>
                <p>Демо форма. Следващ етап: реални поръчки към имейл и база данни.</p>
              </div>
              <button onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
            </div>
            <form className="checkout-form">
              <input placeholder="Име и фамилия" />
              <input placeholder="Телефон" />
              <input placeholder="Имейл" />
              <input placeholder="Град" />
              <input className="wide" placeholder="Адрес или офис на куриер" />
              <textarea className="wide" placeholder="Коментар към поръчката" />
            </form>

            <div className="payment-box">
              <div className="payment-title">
                <CreditCard />
                <div>
                  <b>Метод на плащане</b>
                  <p>Избери как клиентът ще плати поръчката.</p>
                </div>
              </div>

              <div className="payment-options">
                {paymentMethods.map((method) => (
                  <label
                    className={`payment-option ${paymentMethod === method.id ? "active" : ""}`}
                    key={method.id}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                    />
                    <div>
                      <span>{method.badge}</span>
                      <b>{method.title}</b>
                      <p>{method.text}</p>
                    </div>
                  </label>
                ))}
              </div>

              {paymentMethod === "bank" && (
                <div className="bank-transfer-box">
                  <b>Данни за банков превод</b>
                  <p><span>Банка:</span> {bankInfo.bank}</p>
                  <p><span>Титуляр:</span> {bankInfo.holder}</p>
                  <p><span>IBAN:</span> {bankInfo.iban}</p>
                  <p><span>BIC:</span> {bankInfo.bic}</p>
                  <p><span>Основание:</span> Поръчка № ще се генерира след изпращане</p>
                  <small>{bankInfo.note}</small>
                </div>
              )}

              {paymentMethod === "tbi" && (
                <div className="tbi-payment-box">
                  <b>TBI Bank - покупка на изплащане</b>
                  <p>След изпращане на поръчката ще се отвори прозорецът за TBI кандидатстване.</p>
                </div>
              )}
            </div>

            <div className="checkout-summary">
              <CreditCard />
              <span>Обща сума: <b>{formatPrice(total)}</b></span>
            </div>
            <button className="send-order" onClick={sendOrder} disabled={sendingOrder}>
              {sendingOrder
                ? "Изпращане..."
                : paymentMethod === "bank"
                  ? "Изпрати поръчка с банков превод"
                  : paymentMethod === "tbi"
                    ? "Продължи към TBI"
                    : "Изпрати поръчка с наложен платеж"}
            </button>
          </div>
        </div>
      )}
        </div>
      }
    />
<Route
  path="/category/:categoryName"
  element={
    <CategoryPage
      products={products}
      addToCart={addToCart}
      handleTbiCheckout={handleTbiCheckout}
    />
  }
/>
    <Route
      path="/product/:id"
      element={
        <ProductPage
          products={products}
          addToCart={addToCart}
          handleTbiCheckout={handleTbiCheckout}
        />
      }
    />
  </Routes>
);
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
