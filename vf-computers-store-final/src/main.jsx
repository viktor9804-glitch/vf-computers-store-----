
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Cpu, Monitor, Laptop, HardDrive, Gamepad2, Search, ShoppingCart, Menu, Star, Heart, ShieldCheck, Truck, Wrench, Phone, Mail, MapPin, Minus, Plus, Trash2, CreditCard } from "lucide-react";
import "./style.css";

const LOGO_URL = "/VF_logo_1.png";

const storeInfo = {
  name: "ВФ Компютри",
  phone: "0876 126 326",
  rawPhone: "0876126326",
  email: "v.f-computers@abv.bg",
  address: "гр. Елхово, ул. Славянска №5",
};

const categories = [
  { name: "Всички", icon: Menu },
  { name: "Компютри", icon: Cpu },
  { name: "Компоненти", icon: HardDrive },
  { name: "Лаптопи", icon: Laptop },
  { name: "Монитори", icon: Monitor },
  { name: "Гейминг", icon: Gamepad2 },
];

const products = [
  { id: 1, name: "Gaming PC Ryzen 5 / RTX 4060", category: "Компютри", price: 1599, oldPrice: 1799, rating: 4.9, badge: "Хит", image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80", specs: "Ryzen 5, RTX 4060, 16GB RAM, 1TB NVMe SSD" },
  { id: 2, name: "AMD Ryzen 7 5700X", category: "Компоненти", price: 319, oldPrice: 369, rating: 4.8, badge: "Промо", image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80", specs: "8 ядра, 16 нишки, AM4, отличен за gaming и работа" },
  { id: 3, name: "GeForce RTX 4060 8GB", category: "Компоненти", price: 649, oldPrice: 729, rating: 4.9, badge: "Нов", image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80", specs: "8GB GDDR6, DLSS 3, Ray Tracing" },
  { id: 4, name: "Лаптоп Lenovo IdeaPad 15", category: "Лаптопи", price: 899, oldPrice: 999, rating: 4.7, badge: "Оферта", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80", specs: "Intel Core i5, 16GB RAM, 512GB SSD, 15.6 Full HD" },
  { id: 5, name: "Gaming Monitor 27” 165Hz", category: "Монитори", price: 389, oldPrice: 459, rating: 4.8, badge: "Gaming", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80", specs: "27 инча, Full HD, 165Hz, 1ms, FreeSync" },
  { id: 6, name: "RGB Gaming Keyboard", category: "Гейминг", price: 79, oldPrice: 99, rating: 4.6, badge: "RGB", image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1200&q=80", specs: "Механична клавиатура, RGB подсветка" },
  { id: 7, name: "NVMe SSD 1TB Gen4", category: "Компоненти", price: 139, oldPrice: 169, rating: 4.9, badge: "Бърз", image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=80", specs: "1TB M.2 NVMe, PCIe Gen4" },
  { id: 8, name: "Офис компютър комплект", category: "Компютри", price: 699, oldPrice: 799, rating: 4.7, badge: "Офис", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=80", specs: "Intel i5, 16GB RAM, 512GB SSD" },
];

const services = [
  "Сглобяване на компютър по поръчка",
  "Диагностика и ремонт на компютри и лаптопи",
  "Почистване и смяна на термопаста",
  "Инсталация на Windows, драйвери и програми",
  "Ъпгрейд на RAM, SSD, видеокарта и процесор",
  "Консултация за gaming и офис конфигурации",
];

function App() {
  const [activeCategory, setActiveCategory] = useState("Всички");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const filteredProducts = useMemo(() => products.filter(p => 
    (activeCategory === "Всички" || p.category === activeCategory) &&
    `${p.name} ${p.specs}`.toLowerCase().includes(query.toLowerCase())
  ), [activeCategory, query]);

  const cartItems = Object.entries(cart).map(([id, quantity]) => {
    const product = products.find(p => p.id === Number(id));
    return product ? { ...product, quantity } : null;
  }).filter(Boolean);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = subtotal >= 1000 || subtotal === 0 ? 0 : 8;
  const total = subtotal + delivery;

  const addToCart = id => { setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 })); setCartOpen(true); };
  const updateQuantity = (id, amount) => setCart(c => {
    const nextQuantity = (c[id] || 0) + amount;
    if (nextQuantity <= 0) { const n = { ...c }; delete n[id]; return n; }
    return { ...c, [id]: nextQuantity };
  });

  return <div className="site">
    <header className="header">
      <div className="container header-inner">
        <div className="brand">
          <img src={LOGO_URL} alt="ВФ Компютри" />
          <div><b>ВФ <span>Компютри</span></b><small>Продажба • Ремонт • Поддръжка</small></div>
        </div>
        <nav><a href="#products">Продукти</a><a href="#services">Сервиз</a><a href="#contact">Контакти</a></nav>
        <div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Търси продукт..." /></div>
        <button className="cart-btn" onClick={()=>setCartOpen(true)}><ShoppingCart size={19}/>{cartCount>0 && <em>{cartCount}</em>}</button>
      </div>
    </header>

    <section className="hero">
      <div className="container hero-grid">
        <div>
          <p className="pill">Онлайн магазин + сервиз в гр. Елхово</p>
          <h1>Компютри, компоненти и сервиз от <span>ВФ Компютри</span></h1>
          <p className="lead">Готови gaming и офис конфигурации, лаптопи, монитори, SSD, RAM, видеокарти и професионална поддръжка.</p>
          <div className="actions"><a href="#products" className="btn">Пазарувай сега</a><a href="#services" className="btn alt">Заяви сервиз</a></div>
        </div>
        <div className="hero-card">
          <img src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1400&q=80" />
          <div className="stats"><div><b>24ч</b><small>бърза оферта</small></div><div><b>100%</b><small>тествани системи</small></div><div><b>2 г.</b><small>гаранция*</small></div></div>
        </div>
      </div>
    </section>

    <section className="container benefits">
      {[ [Truck,"Доставка","С куриер или взимане от място."], [ShieldCheck,"Гаранция","Продукти с гаранция и тест."], [Wrench,"Сервиз","Ремонт, профилактика и ъпгрейд."] ].map(([Icon,t,txt]) => 
        <div className="benefit" key={t}><Icon/><div><b>{t}</b><p>{txt}</p></div></div>)}
    </section>

    <main id="products" className="container products">
      <p className="section-label">Каталог</p><h2>Продукти и оферти</h2>
      <div className="categories">{categories.map(({name, icon: Icon}) => <button key={name} onClick={()=>setActiveCategory(name)} className={activeCategory===name?"active":""}><Icon/><span>{name}</span></button>)}</div>
      <div className="grid">{filteredProducts.map(p => <article className="product" key={p.id}>
        <div className="img"><img src={p.image}/><strong>{p.badge}</strong><button><Heart size={17}/></button></div>
        <div className="content"><div className="row"><small>{p.category}</small><small className="rating"><Star size={14}/>{p.rating}</small></div><h3>{p.name}</h3><p>{p.specs}</p><div className="buy"><div><b>{p.price} лв.</b><del>{p.oldPrice} лв.</del></div><button onClick={()=>addToCart(p.id)}>Добави</button></div></div>
      </article>)}</div>
    </main>

    <section id="services" className="services"><div className="container service-grid"><div><p className="section-label">Сервиз</p><h2>Ремонт и поддръжка</h2><p className="lead">Диагностика, профилактика, ремонт и ъпгрейд на компютри и лаптопи.</p><a className="btn" href={`tel:${storeInfo.rawPhone}`}>Обади се за сервиз</a></div><div>{services.map(s => <p className="service" key={s}><Wrench size={18}/>{s}</p>)}</div></div></section>

    <footer id="contact"><div className="container footer-grid"><div><b className="footer-logo">ВФ <span>Компютри</span></b><p>Онлайн магазин за компютри, компоненти, лаптопи и сервизни услуги.</p></div><div><p><Phone/> {storeInfo.phone}</p><p><Mail/> {storeInfo.email}</p><p><MapPin/> {storeInfo.address}</p></div><div className="pay"><b>Начини на плащане</b><p>Наложен платеж, банков превод и плащане на място. Онлайн плащане с карта може да се добави.</p></div></div></footer>

    {cartOpen && <div className="overlay" onClick={()=>setCartOpen(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><h3>Количка</h3><p>{cartCount} продукта</p></div><button onClick={()=>setCartOpen(false)}>Затвори</button></div>
      <div className="cart-items">{cartItems.length===0 ? <p className="empty">Количката е празна.</p> : cartItems.map(item => <div className="cart-item" key={item.id}><img src={item.image}/><div><b>{item.name}</b><p>{item.price} лв.</p><div className="qty"><button onClick={()=>updateQuantity(item.id,-1)}><Minus size={14}/></button><span>{item.quantity}</span><button onClick={()=>updateQuantity(item.id,1)}><Plus size={14}/></button><button className="trash" onClick={()=>updateQuantity(item.id,-item.quantity)}><Trash2 size={15}/></button></div></div></div>)}</div>
      <div className="total"><p><span>Междинна сума</span><b>{subtotal} лв.</b></p><p><span>Доставка</span><b>{delivery===0?"Безплатна":`${delivery} лв.`}</b></p><h3><span>Общо</span><b>{total} лв.</b></h3><button disabled={!cartItems.length} onClick={()=>setCheckoutOpen(true)}>Завърши поръчката</button></div>
    </aside></div>}

    {checkoutOpen && <div className="overlay top" onClick={()=>setCheckoutOpen(false)}><div className="checkout" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><h3>Финализиране на поръчка</h3><p>Демо форма — следва свързване с база данни и имейл.</p></div><button onClick={()=>setCheckoutOpen(false)}>X</button></div><div className="form"><input placeholder="Име и фамилия"/><input placeholder="Телефон"/><input placeholder="Имейл"/><input placeholder="Град"/><input className="wide" placeholder="Адрес или офис на куриер"/><select className="wide"><option>Наложен платеж</option><option>Банков превод</option><option>Плащане на място</option></select><textarea className="wide" placeholder="Коментар към поръчката"/></div><p className="checkout-total"><CreditCard/> Обща сума: <b>{total} лв.</b></p><button className="send">Изпрати поръчка</button></div></div>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
