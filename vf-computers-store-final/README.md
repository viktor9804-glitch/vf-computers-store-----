# ВФ Компютри - V10 Gemini Assistant

Тази версия заменя OpenAI chatbot-а с Gemini AI от Google AI Studio.

## Нужно във Vercel

Project → Settings → Environment Variables:

`GEMINI_API_KEY=AIza...`

След добавяне на ключа направи Redeploy.

## Как работи

- Сайтът показва floating AI асистент.
- Въпросите отиват към `/api/chat`.
- `/api/chat` използва `GEMINI_API_KEY` от Vercel.
- Ключът НЕ се вижда в браузъра.

## Качване

1. Разархивирай ZIP файла.
2. Замени файловете в проекта.
3. GitHub Desktop → Commit → Push.
4. Vercel ще deploy-не автоматично.
5. Ако ключът е добавен след deploy — направи Redeploy.
