import {
  buildOrderEmailHtml,
  getOrderNumber,
  loadOrderForConfirmation,
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
    const customerEmail = String(req.body?.customerEmail || "").trim();

    if (!customerEmail) {
      return sendJson(res, 200, { success: true, skipped: true, reason: "missing customer_email" });
    }

    const order = await loadOrderForConfirmation({
      orderId: req.body?.orderId,
      customerEmail,
    });
    const to = String(order.customer_email || "").trim();
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
    if (!error.status || error.status >= 500) {
      console.error("SEND ORDER EMAIL ERROR:", error);
    }
    return sendJson(res, error.status || 500, { error: error.message || "Email send failed" });
  }
}
