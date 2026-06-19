# VF-COMPUTERS — Пълен технически одит

**Дата на одита:** 18.06.2026 г.  
**Одитирана директория:** `E:\sait\vf-computers-store-final\vf-computers-store-final`  
**Обхват:** storefront, Vercel API функции, Supabase интеграция и SQL миграции, VALI синхронизация, desktop/mobile admin приложение, build и runtime поведение.  
**Статус на документа:** технически одит, без промени по приложението и без създаване на реални поръчки.

---

## 0. Резюме за ръководството

VF-COMPUTERS е функционален и визуално развит MVP/предпродукционен онлайн магазин. Реално са изградени продуктов каталог, динамични категории, търсене, филтри, пагинация, продуктови страници, количка, checkout, клиентски профили, гаранционна и сервизна проверка, PC конфигуратор, AI асистент, VALI синхронизация и отделно админ приложение. Storefront и admin production build-овете завършват успешно.

Проектът обаче **не е готов за безопасно обслужване на реални клиенти без корекции**. Най-сериозните причини са:

1. Поръчките се формират и остойностяват изцяло в браузъра. Публичният клиент изпраща `items`, единични цени, ДДС, доставка и крайна сума директно към Supabase. RLS допуска публично създаване на поръчка, без сървърно преизчисляване и проверка на каталожните цени.
2. Storefront зарежда целия каталог от над 11 000 продукта в браузъра чрез последователни заявки по 1000 реда и държи целия интерфейс зад fullscreen loader. При тест директно отваряне на продукт loader-ът остана активен над 3 секунди; пълното съдържание се появи едва след продължително изчакване.
3. Live Supabase проверката показва несъответствие между код, SQL файлове и реално приложени права/таблици. `store_settings`, `promotions`, `partners` връщат 401 за anon, `physical_store_products` връща 404, докато storefront очаква да ги чете публично.
4. TBI интеграцията е placeholder — endpoint-ът не извиква TBI API и връща общия адрес `https://tbibank.bg/` независимо от продукта/сумата.
5. SEO е основно статично за SPA: липсват sitemap, robots.txt, canonical, `og:image`, Twitter cards, структурирани данни и динамични title/description за продукт/категория. Неизвестен URL също връща SPA shell без 404 екран.
6. Няма автоматизирани unit/integration/E2E тестове, ESLint/статичен quality gate или CI конфигурация. Има известни dependency уязвимости.

**Обща оценка:** силен функционален прототип с реални интеграции, но с критичен server-side validation дефицит, тежко клиентско зареждане и непоследователна production конфигурация.

---

## 1. Методология и ограничения

Извършени проверки:

- статична инспекция на всички приложни, API, SQL, sync и конфигурационни файлове;
- production build на storefront и admin приложението;
- `npm audit --omit=dev` и за двата проекта;
- live read-only проверки към конфигурирания Supabase REST endpoint с публичния publishable key;
- статистика върху видимия VALI каталог;
- runtime проверка с браузър на `vite preview` при desktop, tablet и mobile viewport;
- проверка на начална страница, каталог, продукт, количка, checkout и ключови маршрути;
- проверка на текущите Windows Scheduled Tasks и VALI sync логове.

Ограничения:

- не са използвани администраторски credentials и не е тествана реална admin сесия;
- не е създавана тестова поръчка в production базата;
- не е изпращан email и не е стартирана реална TBI заявка;
- SQL файловете показват намерението на схемата, но не доказват сами кои миграции и в какъв ред са изпълнени; live anon проверката е използвана като допълнително доказателство;
- няма предоставен staging environment с изолирана база, поради което destructive тестове не са извършвани.

---

## 2. Обща структура

### 2.1 Архитектура

Проектът е monorepo-подобна директория с два JavaScript клиента и Vercel serverless API:

```text
vf-computers-store-final/
├─ src/                    React storefront
├─ api/                    Vercel serverless функции
├─ public/                 статични изображения и installers
├─ scripts/                VALI scheduler/runner PowerShell
├─ *.sql                   Supabase schema/RLS миграции
├─ vf-admin-app/           отделен React + Electron + Capacitor admin
└─ dist/                   storefront production build
```

Основният поток е:

```text
Browser SPA → Supabase JS/PostgREST → Supabase PostgreSQL
           ↘ /api/* (Vercel) → Resend / Gemini / Supabase service role
Scheduled Tasks → VALI API → Supabase service role → vali_* таблици
Admin desktop/mobile → Supabase Auth + PostgREST/Storage
```

### 2.2 Технологии

- React и React DOM;
- React Router 7;
- Vite 8;
- Supabase JS 2 / PostgreSQL / RLS / Storage / Auth;
- Vercel serverless functions;
- Resend email API;
- Gemini 2.5 Flash за свободен AI чат;
- Electron за Windows admin;
- Capacitor Android за mobile admin wrapper;
- Lucide React icons;
- PowerShell Scheduled Tasks за VALI sync.

### 2.3 Организация на компонентите

Положителни страни:

- route-level lazy loading за Category, Product, Search, Builder, Warranty, ServiceCheck, Cart, Checkout, Footer и AI Assistant;
- отделен `CartContext` и малки reusable компоненти за карти, галерия и филтри;
- помощни `utils/format.js` и `utils/text.js`.

Проблеми:

- `src/main.jsx` е **3938 реда / ~154 KB** и съдържа едновременно routing, authentication, продуктов mapping, промоции, ценова логика, checkout, документи, header, част от admin код, homepage и TBI;
- `src/style.css` е **3463 реда / ~100 KB**, с повторени/натрупани блокове и много breakpoint-и;
- `vf-admin-app/src/main.jsx` е **1805 реда / ~75 KB** — целият admin domain е в един компонент;
- има три Supabase client entry точки (`src/supabaseClient.js`, `src/lib/supabaseClient.js`, `src/lib/supabase.js`), две от които са индиректни/дублиращи;
- в public storefront все още има недостъпен legacy `AdminPanel`, контролиран с `PUBLIC_ADMIN_DISABLED = true` — dead code, което увеличава сложността;
- има архивен source dump `src/оригинален код за сайта + логиката.txt`, backup admin файл и два празни файла „Нов Текстов документ.txt“.

### 2.4 API организация

API е разделено по endpoint:

- `/api/send-order-email` — потвърждение на поръчка;
- `/api/send-status-email` — admin status email;
- `/api/chat` и `/api/ai-build-pc` — AI;
- `/api/tbi` — текущо placeholder;
- `_mailer.js` и `_aiBuildPcCore.js` — shared server logic.

Плюс е, че service-role key е използван само server-side и HTML за email се escape-ва. Минус е липсата на общ middleware за rate limiting, request size limit, schema validation, telemetry и унифицирани error responses.

---

## 3. Навигация

### 3.1 Главно меню и подменюта

Работят:

- Начало, Сглоби PC, Софтуери, Сервиз, За нас, Гаранция, Ремонт, Партньори, Контакти;
- desktop mega menu;
- mobile accordion категории;
- динамични основни категории/подкатегории от `vali_products`;
- fallback ръчни категории при грешка.

Desktop, tablet и mobile тестът не показа хоризонтален overflow. При 390 px се активира mobile menu и продуктовата grid става една колона; при 768 px са две колони; при 1440 px са четири.

### 3.2 Breadcrumbs

Breadcrumb навигация липсва. Product и Category имат само бутон „Назад“, който не дава йерархия `Начало → Категория → Подкатегория → Продукт` и е по-слаб за SEO и accessibility.

### 3.3 Вътрешни линкове

- проверените hash anchors `services`, `about-store`, `partners`, `contact`, `products` съществуват;
- няма празни `<a>` елементи на началната страница;
- част от навигацията използва обикновени `<a href>` вместо React Router `Link`, което причинява пълен reload и повторно изтегляне на каталога;
- mobile category използва `window.location.href`, също с пълен reload;
- няма catch-all `*` route и потребителски 404 компонент; произволен URL остава празен SPA route след тежкото начално зареждане.

### 3.4 Счупени линкове

В проверения локален build основните вътрешни route и asset адреси от началната страница се зареждат, а 68-те видими изображения нямаха runtime load error. Ограничения:

- Vercel rewrite връща `/` за всеки адрес, което маскира истински 404;
- външните партньорски сайтове не са надеждна част от приложението и следва да се следят автоматизирано;
- Google Maps е short/share URL и е по-добре да се замени със стабилен Maps place URL.

---

## 4. Продуктов каталог

### 4.1 Зареждане

Каталогът обединява:

1. локални `products`;
2. `physical_store_products`;
3. `vali_products`;
4. fallback demo products при празна DB.

Проблемът е, че storefront зарежда **всички редове** чрез `fetchAllSupabaseRows()`, а после филтрира, търси, сортира и пагинира в браузъра. Live каталогът е 11 268 VALI реда, 11 080 с `show=true`. Това е нефункционално мащабиране за production.

Началният екран е блокиран, докато `loadProducts()` приключи. Паралелно се изпълнява отделно пълно зареждане само за категориите, т.е. едни и същи продуктови редове се обхождат повече от веднъж.

### 4.2 Данни и изображения

Live статистика за `vali_products`:

| Показател | Резултат |
|---|---:|
| Общо записи | 11 268 |
| Видими | 11 080 |
| Основни категории | 30 |
| Подкатегории | 220 |
| Без main/sub category | 10 |
| Без partner price > 0 | 24 |
| Без barcode | 266 |
| Без model | 1382 |
| Без warranty | **11 268** |
| Дублирани редове по непразен barcode | 4 |
| Дублирани reference number | 0 |

Изображенията се четат от JSON `images`; началната страница lazy-load-ва 47 от 68 изображения. Има fallback към външен Unsplash URL и към `/placeholder.webp`, но `public/placeholder.webp` не съществува — продукт без VALI image може да покаже счупена снимка. По време на конкретния runtime тест видимите 68 изображения бяха валидни.

### 4.3 Характеристики и филтри

- VALI параметрите се преобразуват във `filters` JSON;
- филтри има по наличност, минимална/максимална цена и динамични характеристики;
- избраните стойности в един filter group са OR, а между различни групи са AND — разумно поведение;
- налични са counts и search вътре във филтър;
- при смяна на категорията state се reset-ва.

Рискове:

- всички агрегации се изчисляват върху масив от хиляди продукти на клиента;
- няма URL state за филтри, цена, sort и page — филтрираният изглед не може да се сподели/индексира;
- няма кеширане/виртуализация;
- `availableFilters` зависи от непоследователна структура на JSON параметрите.

### 4.4 Търсене

Търсенето работи case-insensitive по title/name/model/description/category/manufacturer/catalog/reference/barcode. Всички термини трябва да присъстват. Пагинацията е 50 резултата.

Недостатъци:

- client-side linear scan на целия каталог;
- няма typo tolerance, stemming на български, ranking, highlighting или suggestions;
- няма debounce/autocomplete;
- няма server-side full text/trigram index;
- search query не променя meta title/description.

### 4.5 Сортиране и пагинация

- Category и Search имат client-side пагинация по 50;
- началната страница показва само първите 12 след filter;
- **липсва потребителски контрол за сортиране** по цена, име, наличност, популярност или новост;
- пагинацията не е server-side и не намалява transfer/memory cost.

### 4.6 Наличности и гаранции

VALI status mapping поддържа in stock, limited, on the way, order, ask price, discontinued и out of stock. Неналичните продукти правилно disable-ват Add/TBI в UI.

Критичен data-quality проблем е, че всички 11 268 live VALI реда са без `warranty`. Така storefront и поръчката не могат надеждно да пренесат гаранцията. Локалните два продукта съдържат гаранционна информация в описание/поле, но подходът не е унифициран.

---

## 5. Количка и поръчки

### 5.1 Количка

Работят:

- добавяне, увеличаване, намаляване и премахване;
- count badge;
- persist на стандартните product IDs в `localStorage`;
- custom PC cart items;
- VAT, delivery и grand total;
- блокиране на checkout при празна количка.

Провереният продукт се добави, drawer се отвори и показа очаквана сума. Checkout modal показа COD, bank transfer и TBI избори.

Проблеми:

- custom PC items не се persist-ват при reload;
- cart пази само ID/quantity и зависи целият каталог да бъде повторно зареден, преди да покаже редовете;
- няма max quantity спрямо stock;
- няма reserve/stock recheck;
- много icon-only cart бутони нямат accessible name;
- body scroll lock/focus trap/ESC поведение не е ясно имплементирано за всички overlays.

### 5.2 Суми, ДДС и безплатна доставка

Кодът третира продуктовите `price` стойности като net, добавя 20% VAT и сравнява gross total с прага за безплатна доставка. Това работи вътрешно за текущия mapping, но именуването е объркващо и има риск някой source да подаде gross цена.

Има production несъответствие:

- fallback в CartContext/main: free delivery threshold **200 €**;
- Footer fallback текст: free delivery threshold **250 €**;
- live `store_settings` връща 401 за anon, така че динамичната стойност не достига надеждно до storefront.

### 5.3 Финализиране на поръчка

Checkout валидира само наличие на име, телефон, град и адрес. Email е optional. Липсват:

- schema validation и max lengths;
- формат на телефон/email;
- checkbox за общи условия/политика за лични данни;
- shipping method/office selector;
- server-side recalculation;
- idempotency key;
- anti-bot/rate limit;
- transaction/stock decrement.

Най-сериозният дефект е trust boundary: браузърът изпраща `subtotal`, `vat`, `shipping`, `total`, продуктови цени и наличност. Публичната order insert policy проверява само `user_id`, не сумите. Нападател може да извика Supabase REST директно и да създаде поръчка с манипулирана цена/съдържание.

Допълнително storefront използва `.insert(...).select()`, докато anon няма select policy върху orders. Това трябва да се integration-тества на staging: PostgREST може да не върне създадения ред/ID и UI да отчете грешка или email flow да остане без order ID.

### 5.4 Имейли

Плюсове:

- email се генерира server-side;
- service-role key не влиза в клиента;
- customer HTML полета се escape-ват;
- order confirmation изисква съвпадение между order ID и записания customer email;
- status email проверява валиден Supabase token и membership в `admin_users`.

Рискове:

- няма rate limiting; endpoint-ът за confirmation може да се използва за повторно изпращане при известни ID + email;
- email няма queue/retry/outbox; неуспехът само връща warning;
- order се clear-ва от cart дори при email failure;
- няма webhook/event log за Resend delivery/bounce;
- ако email липсва, изпращането тихо се skip-ва;
- няма template tests.

### 5.5 TBI

`api/tbi.js` валидира само `price > 0`, създава неизползван payload и винаги връща общата начална страница на TBI. Няма подписана заявка, реален application URL, callback/webhook, payment state reconciliation или връзка с order ID. UI текстът „защитена система“ създава очакване за интеграция, която в момента не съществува.

---

## 6. Потребителски интерфейс и accessibility

### 6.1 Дизайн

Дизайнът е последователен dark gaming стил, с ясна червена акцентна система, добри card компоненти, sticky header, визуално развити hero/about/services/partners секции и консистентни модали. Реалните магазинни снимки и продуктовите галерии създават доверие.

Слабости:

- началната страница е много дълга (~9919 px при 1280×720);
- sticky header, overlays, chatbot и cookie banner имат множество високи `z-index` стойности и потенциал за конфликт;
- анимиран/blur background и много backdrop filters са скъпи на по-слаби мобилни GPU;
- липсва `prefers-reduced-motion` стратегия;
- някои текстове са 10–11 px;
- homepage съдържа текст, че AI чат „може да бъде добавен на следващ етап“, въпреки че плаващ AI Assistant вече съществува — UX несъответствие.

### 6.2 Responsive

Проверени viewport-и:

| Viewport | Меню | Product grid | Horizontal overflow |
|---|---|---|---|
| 390×844 | mobile | 1 колона | не |
| 768×1024 | mobile | 2 колони | не |
| 1440×900 | desktop | 4 колони | не |

Responsive основата е добра. Admin има един основен breakpoint при 900 px; на малък екран sidebar става цял блок над съдържанието, което е функционално, но не оптимално за много admin секции.

### 6.3 Accessibility

Плюсове:

- `lang="bg"`;
- смислен H1 на начална и продуктова страница;
- повечето изображения имат alt;
- формите използват placeholder-и, а admin често обвива input в label.

Проблеми от runtime проверката:

- 20 видими/DOM button елемента без accessible name на началната страница с отворени cart/checkout състояния;
- 2 form controls без label/ARIA label;
- icon-only close, plus, minus, delete, mobile menu и cart бутони са често без `aria-label`;
- modals/drawers нямат доказан `role="dialog"`, `aria-modal`, focus trap и focus return;
- CSS премахва outline на полета без систематичен `:focus-visible` replacement;
- няма skip-to-content link;
- filter heading започва от H3 без общо H1 на category page (category title е H2).

---

## 7. Производителност

### 7.1 Build размери

Storefront production build:

| Asset | Raw | Gzip |
|---|---:|---:|
| React chunk | 223.72 KB | 71.76 KB |
| Supabase chunk | 199.49 KB | 51.10 KB |
| Main JS | 93.47 KB | 26.55 KB |
| CSS | 81.40 KB | 15.55 KB |
| Icons | 18.40 KB | 7.14 KB |
| Lazy route chunks | ~1.9–11 KB всеки | ~1–3.4 KB |

Initial JS е приблизително 536 KB raw / 157 KB gzip без lazy chunks. Code splitting работи, но Supabase + React са значим initial cost.

Admin build:

- JS 440.38 KB raw / 123.59 KB gzip;
- CSS 13.55 KB raw / 3.10 KB gzip;
- няма code splitting по admin tab.

### 7.2 Заявки и data transfer

По код началният storefront прави приблизително:

- 5 metadata заявки;
- ~12 paginated заявки за category projection върху 11k продукта;
- ~12 paginated заявки за пълния VALI projection;
- заявки за local products, markups и physical products;
- отделна Footer заявка за `store_settings`.

Така една cold load може да надхвърли 30 HTTP заявки само към Supabase, преди изображенията. Реалният payload включва описания, изображения и filters за 11 080 продукта и е много по-важен проблем от JS bundle-а.

### 7.3 Статични файлове

`public/` е **552.84 MB**. Шест версии на V-F Browser installer са по ~90.31 MB и всички са tracked в Git. Само последната се използва от UI. Това:

- увеличава clone/deploy време и repository history;
- може да надхвърля hosting limits;
- не дава CDN versioning/checksum/signature metadata;
- прави всеки build artifact ненужно тежък.

Logo е ~0.87 MB, service PNG файловете са до ~0.5 MB. Има SVG алтернативи, но UI сочи PNG. Галерията е lazy-loaded, което е положително.

### 7.4 Render/CPU

- mapping на всички продукти и преизчисляване на promotions/markup в `useMemo` е O(n × promotions);
- category filter maps и search сканират целия масив;
- full arrays се държат едновременно в `dbProducts`, `products`, cart lookup и derived lists;
- header/footer се дублират по routes;
- admin зарежда до 50 000 VALI реда и всички management domains веднага след login, независимо от активния tab;
- orders polling на 30 секунди изтегля целия order list.

### 7.5 Основни оптимизации

1. Server-side pagination/filter/sort чрез PostgREST RPC/view или собствен catalog API.
2. Отделни category/aggregate endpoints; не зареждайте продуктите за изграждане на меню.
3. React Query/SWR с cache, stale time, request deduplication и error states.
4. Product detail endpoint по ID, без предварително целия каталог.
5. DB индекси за `show`, categories, price, status, reference/barcode и search vector/trigram.
6. WebP/AVIF responsive images, width/height, thumbnail pipeline и CDN.
7. Преместване на installers в release/object storage и запазване само на актуалната версия.
8. Lazy loading на admin tabs и server-side paginated tables.

---

## 8. SEO

### 8.1 Налични елементи

- `<html lang="bg">`;
- общ title и meta description;
- OG title/description/type;
- един H1 на начална и продуктова страница;
- четими category/product URL-и в рамките на SPA.

### 8.2 Липси и проблеми

- няма `public/robots.txt`;
- няма `public/sitemap.xml`;
- няма canonical;
- няма `og:image`, `og:url`, locale и site name;
- няма Twitter card metadata;
- няма JSON-LD за Organization/LocalBusiness/Product/BreadcrumbList/WebSite search;
- title/description не се променят по route — продукт, категория, search, warranty и service имат homepage title;
- SPA няма SSR/SSG/prerender; crawler без JS вижда само shell;
- product IDs са технически (`/product/vali-219`, `/product/local-14`), без slug;
- category route използва URL-encoded display label, което е нестабилно при преименуване;
- няма breadcrumbs;
- unknown route няма реално 404 съдържание/status;
- Vercel catch-all rewrite включва и потенциални несъществуващи assets/routes и маскира грешки;
- homepage product title hierarchy е приемлива, но category/search използват H2 вместо H1.

### 8.3 SEO препоръка

За e-commerce каталог с 11k продукта най-добрият път е SSR/SSG framework или prerender service, стабилни slug URL-и, dynamic metadata, sitemap index и Product schema. Минималният вариант е React Helmet + генериран sitemap + prerender на категории/продукти, но пълният SSR е по-надежден.

---

## 9. Сигурност

### 9.1 Supabase и RLS

Положително:

- има централен `admin_users` allowlist и `is_admin()` security-definer helper;
- `supabase-admin-security.sql` ограничава admin CRUD с `public.is_admin()`;
- customer orders/profile/service tickets са ограничени по `auth.uid()`;
- service functions се преобразуват към security invoker и anon execute се revoke-ва в security migration.

Критичен operational риск:

- по-старите SQL файлове са опасно permissive: `supabase-orders-standard.sql` разрешава select/update/delete на **всеки authenticated user**; `supabase-service-protocols.sql` разрешава CRUD на всеки authenticated и execute на security-definer upsert/delete дори на anon;
- сигурността зависи `supabase-admin-security.sql` да бъде изпълнен **последен и успешно**;
- няма migration framework/ledger, който да гарантира реда;
- `vf-admin-app/supabase-admin-expansion.sql` също дава manage права на всеки authenticated user, ако се изпълни след security migration.

Live anon резултати:

- публично четими: products (2), vali_products (11 268), vali_categories (261), category_markups (161), warranties (1), service_protocol_public (1);
- защитени с 401: orders (връща 0 rows по RLS), service_protocols, admin_users, customer_profiles, store_settings, promotions, partners и някои VALI auxiliary таблици;
- липсваща/неexposed `physical_store_products`: 404.

Това показва, че част от RLS работи, но storefront permissions не съвпадат с приложния код.

### 9.2 Admin достъп

Admin UI приема **всяка валидна Supabase Auth сесия** и не проверява `admin_users` преди показване на Control Center. Ако RLS е правилно приложен, CRUD ще бъде отказан, но неадминистратор вижда UI и предизвиква множество заявки/грешки. Ако стара permissive policy е върната, същият потребител получава реален admin достъп.

Необходимо е след login да се извика server/RPC `is_admin()` и при false да се sign-out/deny-не UI. RLS остава задължителната последна защита.

### 9.3 Ключове и secrets

- Supabase publishable key е hardcoded в два client файла. Това само по себе си е нормално; сигурността трябва да е в RLS.
- `.env` и `.env.local` са игнорирани и не са tracked; `.env.example` е единственият tracked env файл.
- service role, VALI token, Resend и SMTP стойности са налични локално, но не са отпечатани в доклада и не се виждат в tracked source.
- Vite `VITE_*` променливите винаги са публични; никога не трябва да съдържат service-role/VALI/Resend secrets.

### 9.4 XSS/Injection

- React escaping намалява stored/reflected XSS риска; не е намерен `dangerouslySetInnerHTML`/`eval` в приложния код;
- email HTML използва `escapeHtml`;
- Supabase query builder използва параметризирани операции, затова директен SQL injection риск е нисък;
- въпреки това URL-и за изображения/партньори се съхраняват и рендерират от DB; трябва allowlist за `http/https` и безопасни домейни;
- customer текстове се съхраняват без строг size/schema validation и могат да причинят log/UI/email abuse;
- AI endpoint приема публични заявки и няма rate limit/abuse control, което може да генерира разход;
- TBI/chat/API endpoints нямат explicit CORS/security headers/request-size guards.

### 9.5 Dependency audit

Storefront:

- 1 high finding за Vite 8.0.13; fix е 8.0.16.

Admin:

- high: `form-data` CRLF injection;
- high: Vite issue;
- moderate: `tar` parser/file smuggling;
- общо 3 findings.

Vite finding-ите са основно dev-server exposure, но трябва да се обновят. Electron/Capacitor supply-chain и installer signing също трябва да се разгледат преди разпространение.

### 9.6 Други security липси

- няма Content-Security-Policy;
- няма HSTS/Permissions-Policy/Referrer-Policy конфигурация в repo;
- няма CAPTCHA/rate limiting за auth, order, chat и public checks;
- public warranty/service lookup codes трябва да са достатъчно random и rate-limited;
- няма audit log за admin промени;
- няма MFA enforcement за администратори;
- няма documented backup/restore и key rotation процедура.

---

## 10. База данни

### 10.1 Идентифицирани таблици/обекти

От code/SQL/live API:

- `products`, `vali_products`, `vali_categories`;
- `vali_product_images`, `vali_product_categories`, `vali_manufacturers`;
- `vali_parameters`, `vali_parameter_options`;
- `category_markups`, `vali_product_overrides`;
- `store_settings`, `promotions`, `partners`;
- `orders`, `customer_profiles`;
- `warranties`;
- `service_tickets`, `service_protocols`, `service_protocol_counter`, `service_protocol_public` view;
- `physical_store_products`, `physical_store_sales` по SQL/admin, но live storefront endpoint за първата липсва;
- `admin_users`.

### 10.2 Индекси и връзки

Налични в repo:

- PK/unique на order ID/order number;
- sequence и trigger за order number;
- unique catalog number index за products/vali_products;
- index за `vali_products.availability_type`;
- FK admin user → auth.users;
- FK orders.user_id → auth.users;
- FK physical sales → physical products.

Липсващи/недоказани индекси за критичните storefront заявки:

- `vali_products(show, id)`;
- `(site_main_category, site_sub_category, show)`;
- price/status/availability;
- `orders(user_id, created_at desc)`;
- `service_tickets(user_id, created_at desc)`;
- `customer_profiles(user_id)` unique;
- warranty public code/serial lookup;
- promotion active/start/end/category/product;
- trigram/FTS index за търсене.

### 10.3 Дублиране и модел

- продуктови image/category отношения съществуват и като normalised tables, и като JSON/колони в `vali_products`;
- local, VALI и physical store продукти използват различни модели, нормализирани ad hoc в клиента;
- гаранцията се среща като `warranty`, `warranty_months`, `guarantee`, order item snapshot и отделна warranties таблица;
- category path се дублира в `site_main_category`, `site_sub_category`, `site_category_path` и relation table;
- admin fallback превръща order в warranty record, което смесва продажба с гаранционен lifecycle.

### 10.4 Неефективни заявки

- select `*` в admin за продукти/поръчки;
- client fetch на всички VALI rows;
- дублирана заявка за category projection;
- admin `.limit(50000)` без pagination;
- polling на всички orders на 30 секунди вместо realtime/updated_since;
- VALI relations sync прави delete/insert per product и вероятно N+1 операции;
- categories/manufacturers scripts upsert-ват по един ред вместо batch;
- няма transaction около multi-step sync.

### 10.5 Препоръка за DB управление

Въведете Supabase CLI migrations с timestamp, schema dump и CI drift check. Обединете permissive миграциите в безопасна baseline migration и добавете автоматични RLS tests за anon, ordinary authenticated и admin роли.

---

## 11. VALI интеграция

### 11.1 Реализирано

- full products sync с pagination и upsert;
- бърз price/status/show sync;
- stale products се маркират `show=false`, `status=0`;
- category import и mapping;
- manufacturers import;
- parameters/options extraction;
- product-category и product-image relations;
- product full-detail update;
- lock directory срещу едновременни sync процеси;
- monthly logs;
- Scheduled Task: availability на 15 минути и full ежедневно в 03:00;
- `VALI_SYNC_DRY_RUN` за двата основни sync процеса.

### 11.2 Operational резултат

- availability task: `Ready`, последно изпълнение 18.06.2026 22:05, result 0;
- лог: 11 080 fetched/updated, 188 deactivated stale, 0 new products requiring full sync;
- full task: няма реално успешно минало изпълнение; показва placeholder last-run дата 30.11.1999 и non-zero task result до първото изпълнение.

### 11.3 Проблеми

- гаранциите не се импортват ефективно: 100% от live VALI rows са без warranty;
- fast sync използва token в query string без `encodeURIComponent`, докато full sync го encode-ва;
- различни scripts използват различно env име (`SUPABASE_URL` срещу `VITE_SUPABASE_URL`);
- част от scripts нямат explicit env validation преди `createClient`;
- няма retry с exponential backoff, timeout/AbortController или handling на 429;
- няма alert при failed scheduled task;
- няма atomic sync batch/version; storefront може да чете междинно състояние;
- няма referential cleanup/soft-delete политика за categories/images;
- relations/category/manufacturer/parameter scripts не са включени в `package.json` full workflow; `sync:vali:full` сочи само `sync-vali-products.js`;
- няма contract tests за VALI API schema;
- full sync scheduler зависи от конкретен Windows machine/user и локални `.env` secrets.

### 11.4 Препоръка

Изградете един orchestrator: categories → manufacturers → full products → relations/images → parameters → validation → publish sync version. Изпълнявайте го в надежден job runner/CI/Edge Function с secret store, retries, metrics и alerting. Fast sync трябва да update-ва само price/stock и да записва `synced_at`/source version.

---

## 12. Админ панел

### 12.1 Функционалност

Реализирани секции:

- login/logout;
- local и VALI product management/overrides;
- image upload и gallery preview;
- delivery settings;
- category markups;
- promotions;
- partners;
- order list/edit/delete/status email;
- service tickets;
- warranties;
- order notification polling;
- Electron Windows build и Capacitor Android wrapper.

### 12.2 Стабилност и рискове

- build е успешен;
- admin зарежда всички domains и до 50k products веднага след login;
- няма loading/error state per panel и optimistic/concurrency control;
- product image upload няма client/server size, MIME, dimension и malware validation;
- storage filename sanitization заменя само spaces; не нормализира всички опасни знаци;
- няма cleanup на orphan images при edit/delete;
- няма role check в UI — всяка Auth сесия влиза в Control Center;
- delete actions разчитат на `window.confirm`, но audit trail липсва;
- orders се poll-ват на 30 s вместо Supabase Realtime;
- warranty fallback към orders е conceptually неточен;
- няма dashboard-level permissions/roles/read-only staff;
- desktop app сочи production email API по default и може неволно да променя production от development build;
- няма auto-update, code signing/notarization стратегия или secure Electron hardening отчет;
- Android директория съдържа собствен nested `.git`, което усложнява version control; root вижда целия `vf-admin-app/android/` като untracked.

### 12.3 Надценки

Markup lookup работи по main/sub category и се прилага върху `price_partner || price_client`. Рискове:

- при липса/401 на category_markups storefront може да остане с 0% markup;
- няма min margin, rounding policy и audit history;
- client-side изчислената продажна цена не е authoritative;
- promotion се прилага след markup в клиента;
- няма effective date/version и preview before publish.

Надценката и крайната цена трябва да се материализират/изчисляват server-side и да се snapshot-ват с версия в order.

---

## 13. Код и технически дълг

### 13.1 Лоши практики/сложност

- monolithic components;
- business logic в UI;
- hardcoded store/bank/contact/payment/service text;
- hardcoded production URL-и;
- множество fallback-и, които прикриват schema/permission грешки;
- console logging на admin Supabase URL, VALI totals и samples;
- дублирана pricing/VAT логика;
- смесване на net/gross semantics;
- `latest` dependency ranges за ключови пакети — непредвидими builds;
- липса на TypeScript/schema types;
- няма central config/env validation.

### 13.2 Дублиран/неползван код

- legacy storefront AdminPanel при `PUBLIC_ADMIN_DISABLED`;
- duplicated product card markup в homepage и `ProductCard`;
- дублирани Supabase client modules;
- `src/оригинален код за сайта + логиката.txt` и admin backup source;
- duplicate empty text files;
- шест installer версии, само една използвана;
- локални constants и DB-backed settings се дублират.

### 13.3 Потенциални грешки

- `/placeholder.webp` липсва;
- loading може да остане безкрайно: ако promise/exception възникне преди `setLoadingProducts(false)`, няма `finally`;
- ако DB е частично недостъпна, fallback demo продукти могат да изглеждат като реална оферта;
- category exact-match по display string е крехък;
- cart ID collision е малко вероятен, но lookup е само string ID върху смесени sources;
- глобален notice няма auto-dismiss и може да припокрива UI;
- TBI response не се проверява с `response.ok` преди JSON/use;
- email JSON parse и DB/email flow не са idempotent;
- `orderPayload.created_at` се подава от клиента;
- public check endpoints показват detail по code без rate limit;
- unknown route няма fallback.

### 13.4 TODO/незавършени области

Няма много формални `TODO`, но функционално незавършени са:

- TBI реална интеграция;
- AI homepage copy;
- full VALI scheduled run и warranty import;
- production-grade SEO;
- tests/CI/observability;
- database migration discipline;
- server-authoritative checkout.

### 13.5 Quality automation

- няма `test` script;
- няма ESLint/Prettier config;
- няма unit/component/E2E framework;
- двата `test-vali-*` файла са ad hoc API diagnostic scripts, не automated suite;
- няма CI workflow;
- няма coverage, bundle budget, Lighthouse CI или migration tests.

---

## 14. Критични проблеми по важност

### Критично

| ID | Проблем | Въздействие | Действие |
|---|---|---|---|
| C-01 | Поръчката и крайната цена са client-authoritative | Манипулирани цени, ДДС, доставка, артикули и статус; финансов риск | Поръчка само през server endpoint/RPC, който чете каталога, проверява stock и преизчислява всичко в transaction |
| C-02 | Конфликтни permissive SQL миграции | Всеки authenticated или дори anon може да получи admin/service права при грешен migration order | Консолидирана migration baseline, незабавен live policy audit и автоматични role tests |

### Висок приоритет

| ID | Проблем | Въздействие |
|---|---|---|
| H-01 | Целият каталог 11k+ се зарежда в браузъра и блокира UI | Бавен first load, голям transfer/memory, лош mobile UX |
| H-02 | Live Supabase permissions/schema не съвпадат с storefront | Settings/promotions/partners не работят, physical products липсват, silent fallback |
| H-03 | TBI е placeholder | Няма реално финансиране въпреки UI твърденията |
| H-04 | Всички VALI продукти са без warranty | Непълна продуктова/поръчкова/гаранционна информация |
| H-05 | Admin UI допуска всяка Auth сесия; сигурността зависи изцяло от RLS | Риск при policy drift; объркващ unauthorized UI |
| H-06 | Няма rate limiting за order/email/chat/public lookup | Spam, email/API abuse, разход за Gemini/Resend |
| H-07 | Няма tests/CI и миграционни проверки | Висок regression и security drift риск |
| H-08 | Dependency high vulnerabilities | Dev/admin supply-chain и request handling риск |

### Среден приоритет

| ID | Проблем |
|---|---|
| M-01 | SPA SEO без dynamic metadata, sitemap, robots, schema, canonical |
| M-02 | Няма server-side pagination/filter/sort/search |
| M-03 | Няма sorting UI |
| M-04 | Несъответствие free delivery 200/250 € |
| M-05 | `.insert().select()` при anon без order select policy трябва да се валидира |
| M-06 | 552.84 MB public assets и шест tracked installers |
| M-07 | Monolithic storefront/admin компоненти |
| M-08 | Accessibility: unnamed buttons, unlabeled controls, modal focus |
| M-09 | Няма admin audit log/MFA/roles |
| M-10 | Няма email queue/retry/webhook observability |
| M-11 | Full VALI scheduled task още няма успешно изпълнение |
| M-12 | Неизвестни URL-и нямат 404 route/status |

### Нисък приоритет

| ID | Проблем |
|---|---|
| L-01 | Липсват breadcrumbs |
| L-02 | Част от текстовете са 10–11 px |
| L-03 | Няма reduced-motion настройка |
| L-04 | Dead/backup/empty source файлове |
| L-05 | Дублирани Supabase clients и markup |
| L-06 | External fallback images и липсващ placeholder asset |
| L-07 | Client filters/page не се пазят в URL |

---

## 15. Конкретни препоръки и roadmap

### Фаза 0 — незабавно, преди реални поръчки (1–3 дни)

1. Спрете/маркирайте checkout като тестов, докато C-01 не е решен.
2. Направете live RLS export и проверете всички policies/grants/functions със Supabase CLI.
3. Revoke-нете старите permissive policies и anon execute върху service functions.
4. Създайте `create_order(payload)` server endpoint/RPC:
   - приема само product ID + quantity + customer/shipping fields;
   - чете price/markup/promotion/stock server-side;
   - валидира status/show/quantity;
   - изчислява subtotal/VAT/shipping/total;
   - записва immutable item snapshots;
   - връща order number;
   - използва idempotency key и transaction.
5. Добавете rate limiting на order, email, chat, warranty и service lookup.
6. Скрийте TBI като „Очаквайте скоро“ или завършете реалния договор/API; не redirect-вайте подвеждащо.
7. Update Vite ≥8.0.16 и dependency fixes за admin.

### Фаза 1 — стабилизиране (1–2 седмици)

1. Server-side catalog API/RPC с `page`, `pageSize`, category, filters, availability, min/max price и sort.
2. Product detail fetch по stable ID/slug.
3. Category aggregate endpoint за меню/filter counts.
4. Уеднаквете `store_settings`, `promotions`, `partners`, `physical_store_products` schema/RLS и премахнете silent fallback за production.
5. Уеднаквете pricing semantics (`net_price`, `vat_rate`, `gross_price`) и threshold 200/250.
6. Поправете VALI warranty mapping и направете data validation report след sync.
7. Интеграционни тестове за cart → server order → email outbox на staging.
8. Admin check `is_admin()` преди render, MFA за admin и audit log.
9. Error monitoring (Sentry/OpenTelemetry), structured server logs и uptime/sync alerts.

### Фаза 2 — качество и UX (2–4 седмици)

1. Разделете `main.jsx` по features: catalog, pricing, checkout, auth, profile, builder, documents.
2. Разделете admin по route/tab и lazy load.
3. TypeScript + Zod schemas за API/DB payloads.
4. Vitest/React Testing Library + Playwright E2E.
5. CI: install, lint, typecheck, tests, build, npm audit policy, migration/RLS tests.
6. Accessibility pass: names, labels, dialogs, focus, keyboard, contrast, reduced motion.
7. Sorting, URL-persisted filters/page, skeletons и non-blocking partial load.
8. Responsive image pipeline и CDN.
9. Преместете installers в GitHub Releases/Supabase Storage/S3, публикувайте SHA-256 и digital signature.

### Фаза 3 — SEO и production hardening (2–4 седмици)

1. SSR/SSG или prerender за product/category pages.
2. Stable slugs и 301 стратегия.
3. Dynamic title/description/OG/canonical.
4. robots.txt, sitemap index и Product/LocalBusiness/Breadcrumb JSON-LD.
5. Реален 404 route/status.
6. CSP, HSTS, Referrer-Policy, Permissions-Policy и secure headers.
7. Backup/restore drill, secret rotation, staging/prod separation.
8. Load test с 10k+ products и concurrent checkout.

---

## 16. Оценка

| Показател | Оценка | Обосновка |
|---|---:|---|
| Дизайн | **8/10** | Отличима и последователна визуална система, реални responsive layouts; accessibility и page density искат работа |
| Функционалност | **6/10** | Много features са изградени, но TBI е placeholder, sorting липсва и production settings са частично недостъпни |
| Сигурност | **3/10** | Добра посока с admin allowlist/RLS и server secrets, но order trust boundary и конфликтните SQL миграции са критични |
| SEO | **3/10** | Има базови meta/H1, но липсват почти всички e-commerce/SPA production SEO механизми |
| Производителност | **4/10** | Bundle-ът е приемлив, но full catalog client fetch е основен blocker; public assets са 553 MB |
| Структура на кода | **4/10** | Има компоненти/lazy routes, но основните файлове са монолити, без types/tests/CI и с много дублиране |
| Готовност за реални клиенти | **4/10** | Подходящ за демо/контролиран pilot след security guard; не и за свободен production checkout |

**Средна ориентировъчна оценка: 4.6/10.**

---

## 17. Какво е завършено

- визуално завършен responsive storefront;
- live Supabase продуктова база с 11k+ VALI записи;
- категории, mega menu, product cards и detail pages;
- изображения и галерии;
- наличности и disable на неналични продукти;
- filters, search и pagination;
- cart/checkout UI и payment method UX;
- customer authentication/profile/order history code;
- warranties/service public check pages;
- PC builder и AI assistant;
- order/status email server functions;
- отделно admin приложение с основните management domains;
- Electron/Capacitor wrappers;
- VALI fast sync scheduler с успешно текущо изпълнение;
- production builds.

## 18. Какво липсва

- server-authoritative checkout и stock/price validation;
- доказано безопасна, versioned DB migration state;
- server-side catalog pagination/search/sort;
- реална TBI integration;
- гаранционни данни за VALI;
- стабилни production permissions за settings/promotions/partners/physical products;
- tests, CI, staging и observability;
- SEO infrastructure;
- rate limits/security headers/admin MFA/audit;
- email queue/retry;
- production asset/release strategy.

---

## 19. Крайно заключение

Проектът е над нивото на визуален прототип: има реална база, реален distributor sync, отделен admin, работещ build и широк набор от клиентски функции. Това е значителна функционална основа и приблизително **65–75% от видимото продуктово/UX преживяване** е реализирано.

До надеждна production версия обаче остава най-трудната част — не още екрани, а authoritative backend, права, performance, quality gates и operational контрол. В текущия вид приложението е подходящо за демонстрация, вътрешно тестване и ограничен pilot без доверие в автоматичното остойностяване. Не е подходящо поръчка да се приема като финансово валидна без ръчна проверка.

При фокусирана работа най-важният production минимум може да се постигне за около **3–6 седмици**, ако първо се затворят C-01/C-02, каталогът стане server-paginated, production schema/RLS се уеднаквят и се добавят integration tests. Пълна SEO, accessibility, observability и operational зрялост вероятно изисква **6–10 седмици** според екипа и TBI договорната интеграция.

Най-важните следващи стъпки са, в този ред:

1. server-side order creation и price/stock validation;
2. live RLS/schema audit и консолидирани миграции;
3. server-side catalog pagination/product endpoint;
4. поправка на production settings permissions и VALI warranties;
5. скриване или реално завършване на TBI;
6. staging + automated checkout/RLS tests + CI;
7. rate limits, admin MFA/audit и monitoring;
8. dynamic SEO/SSR и asset optimization.

След тези стъпки VF-COMPUTERS може да се превърне от богат MVP в надежден e-commerce продукт, без да се преправя визуалната основа от нулата.

---

## 20. Проверочен протокол

| Проверка | Резултат |
|---|---|
| Storefront `npm run build` | успешно |
| Admin `npm run build` | успешно |
| Storefront dependency audit | 1 high |
| Admin dependency audit | 2 high, 1 moderate |
| Desktop 1440×900 | без horizontal overflow, 4-column grid |
| Tablet 768×1024 | без horizontal overflow, 2-column grid |
| Mobile 390×844 | без horizontal overflow, 1-column grid |
| Cart add/open | успешно |
| Checkout modal/payment choices | успешно, без submit към DB |
| Видими начални изображения | 68 total, 0 broken в теста |
| Hash navigation targets | всички проверени target-и съществуват |
| VALI availability scheduled task | последно изпълнение успешно |
| VALI full scheduled task | още няма успешно реално изпълнение |
| Email | code/security inspection; не е изпращан реален email |
| TBI | установен placeholder endpoint |
| Admin CRUD | code/build/RLS inspection; не е използвана admin сесия |

