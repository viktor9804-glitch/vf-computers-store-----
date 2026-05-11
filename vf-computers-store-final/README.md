# ВФ Компютри - V25 Admin Multiple Product Images

Добавено:
- Админ панелът качва няколко снимки за един продукт.
- Първата снимка става основна.
- Записва:
  - image = първата снимка
  - images = всички снимки като масив
- В продуктовата карта показва `+X снимки`.

Важно в Supabase:
Изпълни SQL:

```sql
alter table products add column if not exists images jsonb default '[]'::jsonb;
```

Копирай:
- `src/main.jsx`
- `src/style.css`

Не заменяй `api/`.
