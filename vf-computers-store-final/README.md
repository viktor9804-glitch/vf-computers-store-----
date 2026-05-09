# ВФ Компютри - V5 Backend Integration

Тази версия е свързана със Supabase.

## Какво е добавено
- Supabase client
- PC Builder заявките се записват в `pc_requests`
- Поръчките от количката се записват в `orders`
- Подготовка за admin panel и реални продукти

## Важно: RLS policies в Supabase

След като таблиците са с RLS, трябва да добавиш policies за публично записване на заявки и поръчки.

В Supabase → SQL Editor → New Query, изпълни:

```sql
create policy "public can insert pc requests"
on pc_requests
for insert
to anon
with check (true);

create policy "public can insert orders"
on orders
for insert
to anon
with check (true);

create policy "public can read products"
on products
for select
to anon
using (true);
```

## Качване
Замени файловете в `vf-computers-store-final`, после:
GitHub Desktop → Commit → Push.

Vercel ще обнови сайта автоматично.
