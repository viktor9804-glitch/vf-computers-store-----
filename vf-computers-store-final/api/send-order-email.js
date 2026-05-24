import {
  buildOrderEmailHtml,
  getOrderNumber,
  sendEmail,
  sendJson,
  setCors,
} from "./_mailer.js";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const order = req.body?.order || req.body || {};
    const to = String(order.customer_email || "").trim();

    if (!to) {
      return sendJson(res, 200, { success: true, skipped: true, reason: "missing customer_email" });
    }

    const orderNumber = getOrderNumber(order);
    const subject = `Потвърждение на поръчка №${orderNumber} - ВФ Компютри`;
    const html = buildOrderEmailHtml({
      order: { ...order, status: order.status || "Приета" },
      introTitle: `Поръчка №${orderNumber}`,
      introText: "Вашата поръчка е приета.",
      status: "Приета",
    });

    const info = await sendEmail({ to, subject, html });

    return sendJson(res, 200, { success: true, id: info.id });
  } catch (error) {
    console.error("SEND ORDER EMAIL ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Email send failed" });
  }
}
