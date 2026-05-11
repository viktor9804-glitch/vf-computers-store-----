# ВФ Компютри - V26 Product Gallery 10 Images

## Какво е добавено
- Админ панелът позволява избор до 10 снимки за един артикул.
- Първата снимка автоматично става основна.
- Всички снимки се записват в `images`.
- Продуктът показва миниатюри и `+X снимки`.
- При клик върху снимка се отваря gallery preview.

## Задължително в Supabase
В SQL Editor изпълни:

```sql
alter table products add column if not exists images jsonb default '[]'::jsonb;
```

## Копирай
- `src/main.jsx`
- `src/style.css`

## Важно
Не заменяй `api/`, ако чат ботът работи.
