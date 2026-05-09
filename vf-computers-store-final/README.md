# ВФ Компютри - V8 OpenAI Assistant

Добавен е истински OpenAI чат бот към сайта.

## Как работи
- В браузъра има floating бутон `AI Асистент`
- Сайтът изпраща въпросите към `/api/chat`
- `/api/chat` е Vercel serverless function
- API ключът се пази във Vercel Environment Variable `OPENAI_API_KEY`
- Ключът НЕ се вижда в браузъра

## Нужно във Vercel
Project → Settings → Environment Variables:

`OPENAI_API_KEY=sk-...`

След добавяне на ключа направи redeploy.

## Качване
Замени файловете в проекта, после:
GitHub Desktop → Commit → Push.

Vercel ще deploy-не автоматично.
