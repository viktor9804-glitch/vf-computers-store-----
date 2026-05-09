
import React from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

function App(){
return <div className="app">
<header className="top">
<div className="logo">ВФ <span>Компютри</span></div>
<nav>
<a>Начало</a><a>Продукти</a><a>Сервиз</a><a>Контакти</a>
</nav>
</header>

<section className="hero">
<div>
<p className="badge">Gaming • Сервиз • Конфигурации</p>
<h1>Следващо поколение <span>онлайн магазин</span></h1>
<p className="lead">Продажба и ремонт на компютри, лаптопи и gaming конфигурации.</p>
<div className="buttons">
<button>Пазарувай</button>
<button className="secondary">Сервиз</button>
</div>
</div>
<div className="hero-card">
<h3>ВФ Компютри</h3>
<p>гр. Елхово • 0876126326</p>
</div>
</section>

<section className="grid">
{["Видео карти","Gaming PC","SSD NVMe","RAM","Монитори","Лаптопи"].map(x=>
<div className="card" key={x}>
<h3>{x}</h3>
<p>Професионални компоненти и конфигурации.</p>
<button>Разгледай</button>
</div>)}
</section>

<footer>
<p>ВФ Компютри © 2026</p>
<p>v.f-computers@abv.bg</p>
</footer>
</div>
}

createRoot(document.getElementById("root")).render(<App/>)
