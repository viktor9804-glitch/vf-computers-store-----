import nodemailer from "nodemailer";

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

export const createTransport = () => {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.abv.bg",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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
