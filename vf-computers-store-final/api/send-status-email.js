import {
  getOrderNumber,
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
    const order = req.body?.order || {};
    const status = String(req.body?.status || order.status || "").trim();
    const to = String(order.customer_email || "").trim();

    if (!to) {
      return sendJson(res, 200, { success: true, skipped: true, reason: "missing customer_email" });
    }

    if (!status) {
      return sendJson(res, 400, { error: "Missing status" });
    }

    const orderNumber = getOrderNumber(order);
    const subject = `Вашата поръчка е: ${status}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Вашата поръчка е: ${safeText(status)}</h2>
        <p>Здравейте, ${safeText(order.customer_name || "клиент")}.</p>
        <p>Статусът на поръчка <strong>${safeText(orderNumber)}</strong> беше променен.</p>
      </div>
    `;

    const info = await sendEmail({ to, subject, html });

    return sendJson(res, 200, { success: true, id: info.id });
  } catch (error) {
    console.error("SEND STATUS EMAIL ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Email send failed" });
  }
}
