export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [] } = req.body || {};

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing in Vercel Environment Variables." });
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

Когато клиент пита за конфигурация:
- попитай за бюджет
- попитай за игри/програми
- попитай дали иска AMD или Intel
- препоръчай разумно
- насочи го към секция "Сглоби си компютър"

Когато клиент пита за сервиз:
- попитай какъв е проблемът
- предложи диагностика
- насочи към телефон или посещение на адреса

Не измисляй наличности. Ако не си сигурен, кажи да се свърже с магазина.
Не обещавай точна цена без потвърждение от магазина.
`;

    const input = [
      { role: "system", content: systemContext },
      ...messages.slice(-12),
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input,
        temperature: 0.4,
        max_output_tokens: 700,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(response.status).json({ error: data?.error?.message || "OpenAI API error" });
    }

    const text =
      data.output_text ||
      data.output?.flatMap((item) => item.content || [])
        ?.map((content) => content.text || "")
        ?.join("") ||
      "Не успях да генерирам отговор. Моля, опитай отново.";

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error while contacting AI assistant." });
  }
}
