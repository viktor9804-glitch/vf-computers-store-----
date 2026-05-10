# ВФ Компютри - V14 Business Billing + Auto Documents

## Добавено
- Профил: физическо лице или фирма
- Фирмени данни за фактуриране:
  - име на фирма
  - ЕИК / Булстат
  - ДДС номер
  - МОЛ
  - адрес за фактура
- При поръчка сайтът автоматично генерира:
  - фактура
  - гаранционна карта
  - приемно-предавателен протокол
- Документите могат да се отпечатат или запазят като PDF през браузъра

## Важно
Това са автоматични шаблони. За официално счетоводно използване е добре да ги прегледа счетоводител.

## SQL за Supabase

Пусни това в Supabase SQL Editor:

```sql
alter table customer_profiles
add column if not exists account_type text default 'personal',
add column if not exists company_name text,
add column if not exists company_eik text,
add column if not exists company_vat text,
add column if not exists company_mol text,
add column if not exists billing_address text;

alter table orders
add column if not exists user_id uuid,
add column if not exists invoice_requested boolean default false,
add column if not exists billing_data jsonb;
```

Ако още не си пускал V13 SQL, първо пусни V13 SQL от стария README.
