# ВФ Компютри - V6 Simple Admin Panel

Добавен е прост админ панел на адрес:

`https://vf-computers-store.vercel.app/#admin`

## Парола
По подразбиране:
`vfadmin123`

Можеш да я смениш в `src/main.jsx`:
```js
const ADMIN_PASSWORD = "vfadmin123";
```

## Какво може админ панелът
- добавяне на продукт
- категория
- цена
- наличност
- описание
- качване на снимка
- показване на последните продукти

## Важно: Supabase Storage

В Supabase трябва да създадеш bucket:

Storage → New bucket:
- Name: `product-images`
- Public bucket: ON

## SQL policies

В SQL Editor изпълни:

```sql
create policy "public can insert products"
on products
for insert
to anon
with check (true);

create policy "public can read products"
on products
for select
to anon
using (true);

create policy "public can upload product images"
on storage.objects
for insert
to anon
with check (bucket_id = 'product-images');

create policy "public can read product images"
on storage.objects
for select
to anon
using (bucket_id = 'product-images');
```

## Качване
Замени файловете в проекта, после:
GitHub Desktop → Commit → Push.
