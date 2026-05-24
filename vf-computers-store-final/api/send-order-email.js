import {
  formatItems,
  getOrderNumber,
  money,
  safeText,
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
    const subject = `Поръчка ${orderNumber} е приета`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Поръчката е изпратена успешно.</h2>
        <p>Здравейте, ${safeText(order.customer_name || "клиент")}.</p>
        <p>Получихме Вашата поръчка <strong>${safeText(orderNumber)}</strong>.</p>
        <p><strong>Статус:</strong> ${safeText(order.status || "Приета")}</p>
        <p><strong>Метод на плащане:</strong> ${safeText(order.payment_method || "cod")}</p>
        <p><strong>Град:</strong> ${safeText(order.customer_city || "")}</p>
        <p><strong>Адрес:</strong> ${safeText(order.customer_address || "")}</p>
        ${order.customer_comment ? `<p><strong>Коментар:</strong> ${safeText(order.customer_comment)}</p>` : ""}
        <h3>Продукти</h3>
        <ul>${formatItems(order.items)}</ul>
        <p><strong>Обща сума:</strong> ${money(order.total)}</p>
      </div>
    `;

    const info = await sendEmail({ to, subject, html });

    return sendJson(res, 200, { success: true, id: info.id });
  } catch (error) {
    console.error("SEND ORDER EMAIL ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Email send failed" });
  }
}
