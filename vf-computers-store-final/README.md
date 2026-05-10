# ВФ Компютри - V12 User Login + Google Auth + Cookie Consent

## Добавено
- Вход с имейл и парола
- Регистрация с имейл и парола
- Вход с Google акаунт
- Профил бутон в менюто
- Изход от профила
- Cookie consent banner

## Supabase настройки

Email login:
Supabase → Authentication → Providers → Email → Enable

Google login:
Supabase → Authentication → Providers → Google → Enable

Redirect URL за Google Cloud:
https://qmuflwekhqqcfykayjdx.supabase.co/auth/v1/callback

Supabase → Authentication → URL Configuration:
Site URL:
https://vf-computers-store.vercel.app

Additional Redirect URLs:
https://vf-computers-store.vercel.app/**

## Orders user_id

Ако искаш поръчките да пазят потребител:

```sql
alter table orders
add column if not exists user_id uuid;
```

## Качване

Замени файловете → GitHub Desktop → Commit → Push → Vercel Deploy.
