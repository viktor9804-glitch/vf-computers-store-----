# ВФ Компютри - V11 Admin Pro Panel

Добавен е подобрен админ панел.

## Ново
- по-добър дизайн
- статистика за продуктите
- преглед на снимката преди качване
- редакция на продукти
- изтриване на продукти
- търсене в админ панела
- подобрен AI chat text wrapping

## Важно за Supabase policies

За редакция и триене добави тези policies в Supabase SQL Editor:

```sql
create policy "public can update products"
on products
for update
to anon
using (true)
with check (true);

create policy "public can delete products"
on products
for delete
to anon
using (true);
```

Ако даде `already exists`, значи policy вече е създадена.

## Качване

Замени файловете в проекта, после:
GitHub Desktop → Commit → Push → Vercel Deploy.
