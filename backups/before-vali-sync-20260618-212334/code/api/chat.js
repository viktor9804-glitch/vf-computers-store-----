import {
  buildPcOffer,
  extractPcBuildParams,
  formatBuildOfferForChat,
} from "./_aiBuildPcCore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const incomingHistory = Array.isArray(body.history) ? body.history : [];
    const message =
      typeof body.message === "string"
        ? body.message
        : Array.isArray(body.messages)
          ? body.messages.at(-1)?.content || ""
          : "";

    const legacyMessages = Array.isArray(body.messages) ? body.messages : [];
    const combinedMessages =
      incomingHistory.length > 0
        ? [...incomingHistory, { role: "user", content: message }]
        : legacyMessages.length > 0
          ? legacyMessages
          : [{ role: "user", content: message }];

    const safeMessages = combinedMessages
      .filter((item) => item && typeof item.content === "string")
      .slice(-16)
      .map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content.trim().slice(0, 1500),
      }))
      .filter((item) => item.content);

    if (safeMessages.length === 0) {
      return res.status(400).json({ error: "Message content is required." });
    }

    const buildParams = extractPcBuildParams({
      message: message || safeMessages.at(-1)?.content || "",
      history: incomingHistory.length > 0 ? incomingHistory : safeMessages.slice(0, -1),
    });

    if (buildParams.missingBudget) {
      return res.status(200).json({
        reply:
          "Разбрах, че търсите компютърна конфигурация. Какъв е бюджетът в евро? Мога да съобразя и игри, RGB и AMD/Intel предпочитание.",
      });
    }

    if (buildParams.shouldBuild) {
      const offer = await buildPcOffer({
        ...buildParams,
        history: incomingHistory,
      });

      return res.status(200).json({
        reply: formatBuildOfferForChat(offer),
        offer,
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error("[AI assistant] Missing server environment variable GEMINI_API_KEY.", {
        endpoint: "/api/chat",
        expectedVariable: "GEMINI_API_KEY",
      });

      return res.status(500).json({
        error: "AI assistant is not configured: server environment variable GEMINI_API_KEY is missing.",
      });
    }

    const systemContext = `
Ти си AI асистент на онлайн магазина "ВФ Компютри" в България.
Отговаряй само на български език.
Бъди полезен, кратък, професионален и приятелски.

Магазинът се занимава с продажба на компютри, gaming конфигурации, компоненти, лаптопи, монитори, периферия, сервиз и поддръжка.

Контакти:
Телефон: 0876 126 326
Имейл: v.f-computers@abv.bg
Адрес: гр. Елхово, ул. Славянска №5

Валута: евро (€).

Правила:
- Не измисляй продукти, наличности, цени или линкове.
- При custom PC, gaming PC или конкретна конфигурация backend-ът вече трябва да използва реалния продуктов endpoint. Ако тук няма върната оферта, попитай за бюджет, игри/програми, AMD/Intel и RGB.
- При сервиз попитай какъв е проблемът и насочи към диагностика.
- Отговаряй като продавач/сервизен консултант на ВФ Компютри.
`;

    const conversationText = safeMessages
      .map((item) => `${item.role === "user" ? "Клиент" : "Асистент"}: ${item.content}`)
      .join("\n");

    const prompt = `${systemContext}\n\nРазговор:\n${conversationText}\n\nОтговори като асистент на ВФ Компютри:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
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
        .trim() || "Не успях да генерирам отговор. Моля, опитайте отново.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("[AI assistant] Server error.", error);
    return res.status(500).json({
      error: "Server error while contacting AI assistant.",
    });
  }
}
