export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body || {};
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
      return res.status(400).json({ error: "Invalid conversation." });
    }

    const safeMessages = messages
      .filter((message) => message && typeof message.content === "string")
      .slice(-12)
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content.trim().slice(0, 1500),
      }))
      .filter((message) => message.content);

    if (safeMessages.length === 0) {
      return res.status(400).json({ error: "Message content is required." });
    }

    if (!geminiApiKey) {
      console.error("[AI assistant] Missing server environment variable GEMINI_API_KEY.", {
        endpoint: "/api/chat",
        expectedVariable: "GEMINI_API_KEY",
        viteVariablePresent: Boolean(process.env.VITE_GEMINI_API_KEY),
        note: "Gemini is called from the serverless API route, so the key must be configured as GEMINI_API_KEY in the server/Vercel environment. Do not rely on VITE_GEMINI_API_KEY for this endpoint.",
      });

      return res.status(500).json({
        error: "AI assistant is not configured: server environment variable GEMINI_API_KEY is missing.",
      });
    }

    const systemContext = `
Ти си AI асистент на онлайн магазина "ВФ Компютри" в България.
Отговаряй само на български език.
Бъди полезен, кратък, професионален и приятелски.

Магазинът се занимава с:
- продажба на компютри
- gaming конфигурации
- компютърни компоненти
- лаптопи
- монитори
- периферия
- сервиз и поддръжка
- диагностика, почистване, термопаста, Windows инсталация, ъпгрейди

Контакти:
Телефон: 0876 126 326
Имейл: v.f-computers@abv.bg
Адрес: гр. Елхово, ул. Славянска №5

Валута: евро (€).

Правила:
- Не измисляй наличности.
- Не обещавай точна цена без потвърждение от магазина.
- При custom PC попитай за бюджет, игри/програми, AMD/Intel и дали иска RGB/тиха работа.
- При сервиз попитай какъв е проблемът и насочи към диагностика.
- Отговаряй като продавач/сервизен консултант на ВФ Компютри.
`;

    const conversationText = safeMessages
      .map((message) => {
        const role = message.role === "user" ? "Клиент" : "Асистент";
        return `${role}: ${message.content}`;
      })
      .join("\n");

    const prompt = `${systemContext}\n\nРазговор:\n${conversationText}\n\nОтговори като асистент на ВФ Компютри:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 700,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[AI assistant] Gemini API error.", {
        status: response.status,
        message: data?.error?.message,
        code: data?.error?.code,
      });

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API error. Check GEMINI_API_KEY and Google AI Studio quota.",
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() ||
      "Не успях да генерирам отговор. Моля, опитай отново.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("[AI assistant] Server error while contacting Gemini.", error);
    return res.status(500).json({
      error: "Server error while contacting Gemini assistant.",
    });
  }
}
