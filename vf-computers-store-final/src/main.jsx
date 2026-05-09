
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Cpu, Monitor, Laptop, HardDrive, Gamepad2, Search, ShoppingCart, Menu, X,
  Star, Heart, ShieldCheck, Truck, Wrench, Phone, Mail, MapPin, Minus, Plus,
  Trash2, CreditCard, Sparkles, Zap, Settings, CheckCircle2, PackageCheck,
  User, SlidersHorizontal, ChevronDown, Bot, Gauge, Server, MemoryStick,
  Cable, Fan, Power, Send
} from "lucide-react";
import "./style.css";

const LOGO_URL = "/VF_logo_1.png";

const storeInfo = {
  name: "ВФ Компютри",
  phone: "0876 126 326",
  rawPhone: "0876126326",
  email: "v.f-computers@abv.bg",
  address: "гр. Елхово, ул. Славянска №5",
};

const products = [
  {
    id: 1,
    name: "VF Gaming Beast RTX 4060",
    category: "Gaming PC",
    price: 1599,
    oldPrice: 1799,
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
    price: 699,
    oldPrice: 799,
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
    price: 649,
    oldPrice: 729,
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
    price: 319,
    oldPrice: 369,
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
    price: 139,
    oldPrice: 169,
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
    price: 389,
    oldPrice: 459,
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
    price: 899,
    oldPrice: 999,
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
    price: 79,
    oldPrice: 99,
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
  { name: "Видеокарти", icon: Server },
  { name: "Процесори", icon: Cpu },
  { name: "SSD / HDD", icon: HardDrive },
  { name: "Лаптопи", icon: Laptop },
  { name: "Монитори", icon: Monitor },
  { name: "Периферия", icon: Cable },
];

const services = [
  { icon: Wrench, title: "Диагностика", text: "Проверка на хардуер, температури, захранване, RAM, SSD и видеокарта." },
  { icon: Fan, title: "Профилактика", text: "Почистване, смяна на термопаста и оптимизация на охлаждане." },
  { icon: Settings, title: "Инсталация", text: "Windows, драйвери, програми, BIOS настройки и оптимизация." },
  { icon: MemoryStick, title: "Ъпгрейд", text: "RAM, SSD, CPU, GPU, захранване, кутия и охлаждане." },
];

const pcBuilderSteps = [
  { icon: Cpu, title: "Избери процесор", text: "Intel или AMD според бюджета и целта." },
  { icon: Server, title: "Избери видеокарта", text: "Gaming, streaming, работа или офис." },
  { icon: MemoryStick, title: "RAM и SSD", text: "Правилен баланс между скорост и капацитет." },
  { icon: Power, title: "Захранване и кутия", text: "Сигурност, охлаждане и бъдещ ъпгрейд." },
];

function App() {
  const [activeCategory, setActiveCategory] = useState("Всички");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [priceLimit, setPriceLimit] = useState(2000);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = activeCategory === "Всички" || product.category === activeCategory;
      const searchMatch = `${product.name} ${product.category} ${product.specs.join(" ")}`.toLowerCase().includes(query.toLowerCase());
      const priceMatch = product.price <= priceLimit;
      return categoryMatch && searchMatch && priceMatch;
    });
  }, [activeCategory, query, priceLimit]);

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

  const navLinks = (
    <>
      <a href="#products" onClick={() => setMobileOpen(false)}>Продукти</a>
      <a href="#builder" onClick={() => setMobileOpen(false)}>Сглоби PC</a>
      <a href="#services" onClick={() => setMobileOpen(false)}>Сервиз</a>
      <a href="#contact" onClick={() => setMobileOpen(false)}>Контакти</a>
    </>
  );

  return (
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

          <nav className="desktop-nav">{navLinks}</nav>

          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси компютър, видеокарта, SSD..." />
          </div>

          <div className="header-actions">
            <a className="phone-chip" href={`tel:${storeInfo.rawPhone}`}><Phone size={16} /> {storeInfo.phone}</a>
            <button className="cart-button" onClick={() => setCartOpen(true)}>
              <ShoppingCart size={19} />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}><Menu /></button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-panel">
          <button className="mobile-close" onClick={() => setMobileOpen(false)}><X /></button>
          <div className="mobile-brand">ВФ <span>Компютри</span></div>
          <nav>{navLinks}</nav>
          <a className="mobile-call" href={`tel:${storeInfo.rawPhone}`}>Обади се: {storeInfo.phone}</a>
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
              <span><Truck /> Доставка</span>
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
        <div><b>0 лв.</b><span>консултация за конфигурация</span></div>
      </section>

      <section id="products" className="container products-section">
        <div className="section-head">
          <div>
            <p className="section-label">Каталог</p>
            <h2>Продукти и оферти</h2>
          </div>
          <div className="filter-card">
            <label>Макс. цена: <b>{priceLimit} лв.</b></label>
            <input type="range" min="80" max="2000" step="20" value={priceLimit} onChange={(event) => setPriceLimit(Number(event.target.value))} />
          </div>
        </div>

        <div className="category-strip">
          {categories.map(({ name, icon: Icon }) => (
            <button key={name} className={activeCategory === name ? "active" : ""} onClick={() => setActiveCategory(name)}>
              <Icon size={20} />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                <img src={product.image} alt={product.name} loading="lazy" />
                <span className="badge-product">{product.badge}</span>
                <button className="wish"><Heart size={17} /></button>
              </div>
              <div className="product-body">
                <div className="product-meta">
                  <span>{product.category}</span>
                  <span className="stars"><Star size={14} /> {product.rating}</span>
                </div>
                <h3>{product.name}</h3>
                <div className="specs">
                  {product.specs.map((spec) => <small key={spec}>{spec}</small>)}
                </div>
                <p className="stock"><CheckCircle2 size={15} /> {product.stock}</p>
                <div className="product-buy">
                  <div>
                    <b>{product.price} лв.</b>
                    <del>{product.oldPrice} лв.</del>
                  </div>
                  <button onClick={() => addToCart(product.id)}>Добави</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="builder" className="builder-section">
        <div className="container builder-grid">
          <div>
            <p className="section-label">Custom Build</p>
            <h2>Сглоби си компютър</h2>
            <p className="lead">
              Изпрати заявка за конфигурация според бюджет, игри и нужди. Ще получиш оферта с правилно подбрани части.
            </p>
            <div className="builder-actions">
              <a className="btn primary" href={`mailto:${storeInfo.email}?subject=Заявка за custom PC конфигурация`}>Изпрати заявка</a>
              <a className="btn ghost" href={`tel:${storeInfo.rawPhone}`}>Обади се</a>
            </div>
          </div>
          <div className="builder-steps">
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
      </section>

      <section id="services" className="container services-section">
        <div className="section-head">
          <div>
            <p className="section-label">Сервиз</p>
            <h2>Ремонт и поддръжка</h2>
          </div>
          <a className="btn primary" href={`tel:${storeInfo.rawPhone}`}>Заяви сервиз</a>
        </div>
        <div className="service-grid">
          {services.map(({ icon: Icon, title, text }) => (
            <div className="service-card" key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
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

      <button className="floating-chat" onClick={() => window.location.href = `mailto:${storeInfo.email}?subject=Въпрос от сайта`}>
        <Send size={18} />
        <span>Питай ни</span>
      </button>

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
                      <p>{item.price} лв.</p>
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
              <p><span>Междинна сума</span><b>{subtotal} лв.</b></p>
              <p><span>Доставка</span><b>{delivery === 0 ? "Безплатна" : `${delivery} лв.`}</b></p>
              <h3><span>Общо</span><b>{total} лв.</b></h3>
              <button disabled={!cartItems.length} onClick={() => setCheckoutOpen(true)}>Завърши поръчката</button>
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
              <select className="wide">
                <option>Наложен платеж</option>
                <option>Банков превод</option>
                <option>Плащане на място</option>
              </select>
              <textarea className="wide" placeholder="Коментар към поръчката" />
            </form>
            <div className="checkout-summary">
              <CreditCard />
              <span>Обща сума: <b>{total} лв.</b></span>
            </div>
            <button className="send-order">Изпрати поръчка</button>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
