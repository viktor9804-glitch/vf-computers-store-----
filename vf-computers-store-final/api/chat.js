export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body || {};
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel Environment Variables.",
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

    const conversationText = messages
      .slice(-12)
      .map((message) => {
        const role = message.role === "user" ? "Клиент" : "Асистент";
        return `${role}: ${message.content}`;
      })
      .join("\n");

    const prompt = `${systemContext}

Разговор:
${conversationText}

Отговори като асистент на ВФ Компютри:`;

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
      console.error("Gemini API error:", data);
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
    console.error("Gemini assistant server error:", error);
    return res.status(500).json({
      error: "Server error while contacting Gemini assistant.",
    });
  }
}
