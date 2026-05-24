const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REPLY_TO = "v.f-computers@abv.bg";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const money = (value) =>
  `${Number(value || 0).toFixed(2)} лв.`;

export const formatItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "<li>Няма продукти</li>";
  }

  return items
    .map((item) => {
      const name = escapeHtml(item.name || item.title || "Продукт");
      const quantity = Number(item.quantity || 1);
      const price = money(item.price || 0);
      return `<li>${name} x ${quantity} - ${price}</li>`;
    })
    .join("");
};

export const getOrderNumber = (order) =>
  order?.order_number || order?.id || "нова поръчка";

export const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "VF Computers <onboarding@resend.dev>",
      to,
      subject,
      html,
      reply_to: REPLY_TO,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || result?.error || `Resend error ${response.status}`);
  }

  return result;
};

export const sendJson = (res, status, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
};

export const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export const safeText = escapeHtml;
