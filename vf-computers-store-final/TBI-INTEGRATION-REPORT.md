# TBI Integration Report — VF-COMPUTERS

Дата: 18.06.2026  
Статус: имплементирана server-side регистрация по предоставения PHP плъгин; необходими са Supabase migration, реални merchant credentials и потвърждение от TBI за production/callback договора.

## 1. Анализ на `tbi_custom_php.zip`

Архивът беше намерен в `C:\Users\PC\Downloads\tbi_custom_php.zip`, проверен за опасни traversal пътища и разархивиран само във временна audit директория. Демонстрационните ключове от архива не са копирани в проекта.

### Структура

| Файл | Роля |
|---|---|
| `Cryptor.php` | AES-256-CTR криптиране/декриптиране |
| `index.php` | примерна начална страница |
| `index_product.php` | примерна заявка за единичен продукт |
| `index_cart.php` | примерна заявка за количка |
| `index_checkout.php` | checkout пример и customer данни |
| `script.js` | iframe/postMessage поведение |
| `style.css` | demo стилове |

### Установен протокол

1. Създава се JSON payload с `orderid`, `currency`, customer/address полета, `items`, `successRedirectURL` и `failRedirectURL`.
2. Всеки item съдържа `name`, `description`, `qty`, `price`, `sku`, `category`, `imagelink`.
3. `encryption_key` се хешира със SHA-256 до 32-байтов binary key.
4. Генерира се случаен 16-байтов IV.
5. JSON текстът се криптира с AES-256-CTR.
6. Изпращаната стойност е `base64(IV || ciphertext)`.
7. HTTP заявката е JSON POST с:

```json
{
  "reseller_code": "...",
  "reseller_key": "...",
  "data": "<encrypted payload>"
}
```

8. Demo endpoint-ът е `https://beta.tbibank.support/api/RegisterApplication`.
9. При успех API връща JSON поле `url`; това е application/redirect URL-ът, който трябва да се отвори за клиента.
10. Demo JavaScript зарежда URL-а в iframe и приема postMessage само от beta origin.

### Какво не присъства в архива

- production API URL;
- callback URL поле в registration payload-а;
- callback request schema и официални имена на status полетата;
- отделен HMAC/signature алгоритъм;
- доказателство, че AES-CTR payload-ът сам по себе си е автентикиран;
- production redirect allowlist;
- официални minimum/maximum amount и scheme правила.

Следователно production URL не е предположен. Callback endpoint-ът е реализиран защитено по същия encrypted envelope, но exact callback договорът и начинът за регистриране на callback URL трябва да бъдат потвърдени от TBI преди production включване.

## 2. Променени и добавени файлове

| Файл | Промяна |
|---|---|
| `api/_tbi.js` | общ server-side config, Supabase client, pricing, payload, AES crypto, TBI HTTP заявка, validation, rate limiting и safe errors |
| `api/tbi.js` | реален GET capability check и POST registration endpoint вместо placeholder redirect |
| `api/tbi-callback.js` | защитен callback endpoint, status reconciliation и private audit log |
| `api/_tbi.test.js` | криптографски vector/round-trip и callback status тестове |
| `supabase-tbi-integration.sql` | таблица, constraints, индекси, RLS и grants |
| `.env.example` | server-only TBI конфигурация без реални secrets |
| `src/main.jsx` | capability check, безопасна API заявка само с ID, redirect modal и custom-build flow |
| `src/components/Cart.jsx` | TBI бутон само при активна конфигурация; не изпраща цена |
| `src/components/Checkout.jsx` | условен TBI payment method и fallback |
| `src/pages/Product.jsx` | условен TBI бутон |
| `src/pages/BuilderPage.jsx` | условен TBI метод и реален application flow |
| `package.json` | `npm run test:tbi` |

## 3. Environment variables

Задължителни server-side variables:

```dotenv
TBI_RESELLER_CODE=
TBI_RESELLER_KEY=
TBI_ENCRYPTION_KEY=
TBI_SUCCESS_URL=https://your-domain.example/tbi/success
TBI_FAIL_URL=https://your-domain.example/tbi/fail
TBI_CALLBACK_URL=https://your-domain.example/api/tbi-callback
TBI_MODE=test
```

Endpoint variables:

```dotenv
# По желание в test; default е endpoint-ът от PHP плъгина.
TBI_TEST_API_URL=https://beta.tbibank.support

# Задължително при production; точната стойност се получава от TBI.
TBI_API_URL=
```

Сървърът използва също:

```dotenv
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`VITE_SUPABASE_URL` може да служи само като URL fallback. `SUPABASE_SERVICE_ROLE_KEY` и всички TBI variables никога не трябва да имат `VITE_` prefix. Те трябва да бъдат зададени в secret manager-а на hosting средата, не в Git и не в client `.env`.

## 4. Registration flow

1. Frontend извиква `GET /api/tbi`.
2. Отговорът съдържа само `enabled` и `mode`, без credentials. Ако конфигурацията липсва, TBI контролите се скриват.
3. За директен продукт frontend изпраща `product_id` и `quantity`; за checkout — само `order_id`.
4. Server endpoint-ът отхвърля допълнителни полета. `price`, `amount`, `total` и item payload от браузъра не се приемат.
5. С service-role Supabase client се зареждат реалните catalog rows.
6. За VALI се използва `price_partner`, а при липса — `price_client`; прилагат се server-side category markup и активна промоция.
7. За всички catalog източници се начислява 20% ДДС според текущата ценова логика на сайта.
8. Доставката се пресмята от `store_settings.delivery_settings`; fallback е безплатна над 200 EUR и 8 EUR под прага.
9. При order checkout всички артикули се зареждат наново по ID. Записаните в order JSON цени не се trust-ват. PC конфигурациите се разгъват до реалните component IDs.
10. Генерира се уникален reference `VF-TBI-<timestamp>-<random>`.
11. Payload-ът се криптира по PHP алгоритъма и се изпраща към `/api/RegisterApplication`.
12. При валиден HTTPS URL той се записва в `tbi_applications` и се връща на frontend-а.
13. Клиентът вижда summary modal и сам отваря TBI URL-а в нов защитен прозорец.

За един `order_id` не се позволява второ активно `pending/approved` заявление. При повторен request вече създаденият redirect URL се връща идемпотентно.

## 5. Callback flow

`POST /api/tbi-callback`:

1. приема ограничен до 64 KB request;
2. проверява `reseller_code` и `reseller_key` с timing-safe сравнение;
3. изисква encrypted `data` и го декриптира със server-only `TBI_ENCRYPTION_KEY`;
4. намира application по merchant reference;
5. ако callback съдържа amount, сверява го с записаната server-side сума с толеранс 0.01;
6. нормализира резултата до `pending`, `approved`, `rejected`, `cancelled` или `error`;
7. не допуска късен callback да върне terminal status назад;
8. пази до 20 callback audit записа, включително encrypted raw data и redacted/decrypted representation;
9. обновява `orders.payment_status`, когато application е свързано с order;
10. не връща raw response или customer данни към storefront-а.

`reseller_key`, token/secret/password/key полета се redacted-ват преди запис. Таблицата няма anon/authenticated read policy.

## 6. Supabase migration

Преди включване трябва да се изпълни `supabase-tbi-integration.sql` в правилния production project. Тя създава:

- `tbi_applications.id`;
- `order_id` с FK към `orders`;
- `product_id` за direct-product заявления;
- уникален `tbi_reference`;
- ограничен `status` enum чрез CHECK;
- `amount`, `redirect_url`, `response_data`;
- `created_at`, `updated_at`;
- индекси за order и status/time;
- partial unique index срещу дублирани активни заявления;
- RLS и revoke за `anon`/`authenticated`.

Достъпът е само чрез server endpoint със service role. Ако admin панелът трябва да показва TBI заявления, препоръчителният вариант е отделен authenticated server endpoint с admin authorization, а не public RLS policy.

## 7. Защити

- никакви TBI secrets във frontend source или bundle;
- никакви реални secrets в `.env.example` или Git;
- allowlist на входните registration полета;
- catalog price, ДДС, промоция и доставка само server-side;
- валидирани product ID, quantity, availability, URL и размер на request;
- HTTPS-only config и redirect URLs;
- 15-second timeout към TBI;
- безопасни client errors без upstream response dump;
- логове само с internal error code/status, без credentials;
- private callback response storage;
- best-effort in-memory rate limit: 10 registration requests/10 min/IP и 60 callback requests/10 min/IP;
- terminal callback state protection и idempotent order registration.

In-memory rate limiter-ът е полезна първа защита, но при serverless multi-instance deployment не е глобален. За production трябва distributed limiter чрез platform firewall, Redis/Upstash или API gateway.

## 8. Тестове и резултат

Изпълнени проверки:

```text
npm run test:tbi  -> 4/4 PASS
npm run build     -> PASS
node --check      -> PASS за трите server модула
git diff --check  -> PASS
```

Криптографският тест използва фиксиран IV и очакван ciphertext vector, генериран по установения PHP формат. Проверени са decrypt round-trip, status mapping, exact credential comparison и защита от terminal status downgrade.

Направена е и browser проверка при липсващи TBI env variables:

- storefront се зарежда;
- няма console errors;
- няма видими TBI/„изплащане“ бутони.

Не е изпращана реална beta/production application заявка, защото в проекта няма одобрени TBI merchant credentials и подобен тест би създал външен финансов application record.

## 9. Test и production режим

### Test

1. Изпълнете migration-а в test Supabase project.
2. Задайте test credentials и публични HTTPS success/fail/callback URLs.
3. Задайте `TBI_MODE=test`.
4. Оставете default `TBI_TEST_API_URL` или използвайте URL, даден от TBI.
5. Deploy-нете server functions; обикновен Vite dev server сам не изпълнява `/api` functions.
6. Проверете `GET /api/tbi` — трябва да върне `enabled: true`.
7. Създайте checkout order с тестов продукт и продължете към TBI sandbox.
8. Проверете `tbi_applications` и callback status transitions.
9. Изпратете повторно същия `order_id` и потвърдете, че се връща същото pending URL.
10. Тествайте success, reject, cancel, timeout и malformed callback сценарии.

### Production

Production не трябва да се активира преди писмено/техническо потвърждение от TBI на следните точки:

- точен `TBI_API_URL`;
- production credentials;
- callback registration механизъм — merchant portal или payload поле;
- callback envelope, authentication, status и amount полета;
- допустими redirect domains;
- EUR support и price/VAT очаквания;
- delivery като отделен item;
- `promo`/`scheme_id` правила и amount ограничения.

След потвърждението се задава `TBI_MODE=production`, попълва се `TBI_API_URL` и се изпълнява end-to-end acceptance test с TBI.

## 10. Остатъчни рискове

### Високи

1. Callback договорът липсва в плъгина. Endpoint-ът е готов по логиката на encrypted envelope, но може да изисква адаптация към официалния TBI callback schema.
2. AES-256-CTR осигурява поверителност, но не и самостоятелна cryptographic authenticity. В момента callback authenticity разчита и на merchant credentials; TBI трябва да потвърди дали има допълнителен HMAC/signature механизъм.
3. Production URL не е предоставен. Нарочно няма fallback към предположен production host.

### Средни

1. Rate limiting-ът е per-instance и не замества distributed защита.
2. Storefront все още записва order-а през Supabase client. TBI endpoint-ът не trust-ва цените му, но цялостният checkout би бил по-сигурен като server-side order endpoint.
3. Catalog pricing зависи от наличността на `category_markups`, `promotions` и product tables; при DB/schema drift заявката fail-ва затворено.
4. Registration може да е създадена upstream точно когато локалното записване на redirect URL се провали. Нужна е operational reconciliation процедура с TBI reference.

### Ниски

1. Callback audit history е ограничена до последните 20 отговора, за да няма неограничен JSON растеж.
2. Direct-product application може да няма customer данни; плъгинът ги показва като optional, но TBI трябва да потвърди дали конкретният merchant договор ги изисква.

## 11. Заключение

Placeholder поведението `https://tbibank.bg/` е премахнато. Кодът вече изгражда application payload от server-verified catalog/order данни, криптира го по предоставения официален PHP пример, извиква registration API и връща реалния application URL. Frontend не изпраща trusted цена и не съдържа TBI secrets.

Интеграцията е технически готова за sandbox acceptance след migration и secret configuration. Тя не следва да се обявява за production-certified, докато TBI не предостави/потвърди production endpoint-а и callback спецификацията. Това е последната външна зависимост, а не липсваща placeholder логика в проекта.
