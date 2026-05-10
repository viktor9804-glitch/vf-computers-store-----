# ВФ Компютри - V15 TBI Embedded Checkout

Добавено:
- бутон „Купи на изплащане“ на всеки продукт
- бутон за TBI в количката
- TBI се отваря в модален прозорец вътре в сайта
- `/api/tbi.js` използва Vercel Environment Variables

## Vercel Environment Variables
Трябва да са добавени:
- TBI_RESELLER_CODE
- TBI_RESELLER_KEY
- TBI_ENCRYPTION_KEY
- TBI_API_URL

## Важно
В момента `/api/tbi.js` връща fallback URL към TBI, за да работи embedded прозорецът.
За пълна production интеграция трябва точният API response от TBI/Fusion Pay.
