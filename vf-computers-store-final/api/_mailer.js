const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REPLY_TO = "v.f-computers@abv.bg";
const STORE_PHONE = "0876 126 326";
const SITE_URL = process.env.SITE_URL || "https://vf-computers-store.vercel.app";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const compact = (values) =>
  values.map((value) => String(value ?? "").trim()).filter(Boolean);

const numberValue = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const dateText = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const specsText = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
      .join(", ");
  }
  return String(value);
};

const normalizeImageUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^[a-z]:\\/i.test(value)) return "";
  if (value.startsWith("/src/assets/")) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${SITE_URL}${value}`;
  return `${SITE_URL}/${value}`;
};

export const money = (value) =>
  `${numberValue(value).toFixed(2)} €`;

export const getOrderNumber = (order) =>
  order?.order_number || order?.id || "нова поръчка";

export const getPaymentMethodText = (method) => {
  const value = String(method || "cod").toLowerCase();
  if (value === "cod") return "Наложен платеж";
  if (value === "bank") return "Банков превод";
  if (value === "tbi") return "TBI";
  return method || "-";
};

export const normalizeOrderItem = (item = {}) => {
  const quantity = numberValue(item.quantity ?? item.qty, 1);
  const unitPrice = numberValue(item.price ?? item.unit_price, 0);
  const catalogNumber = item.catalog_number || item.catalogNumber || item.catalogNo || item.catalog || "";
  const serial = compact([item.serial, item.serial_number, item.sku, item.barcode]).join(" / ");
  const warranty = item.warranty || item.warranty_months || "не е посочена";
  const characteristics = specsText(item.description || item.specs || item.characteristics || item.parts || "");
  const image = normalizeImageUrl(item.image || item.image_url || item.thumbnail || item.main_image || item.images?.[0] || "");

  return {
    name: item.title || item.name || item.product_name || "Продукт",
    image,
    catalogNumber,
    serial,
    quantity,
    unitPrice,
    warranty,
    characteristics,
    rowTotal: numberValue(item.total ?? item.line_total, unitPrice * quantity),
  };
};

export const getOrderTotals = (order) => {
  const items = Array.isArray(order?.items) ? order.items.map(normalizeOrderItem) : [];
  const itemsSubtotal = items.reduce((sum, item) => sum + item.rowTotal, 0);
  const subtotal = numberValue(order?.subtotal, itemsSubtotal);
  const vat = numberValue(order?.vat, subtotal * 0.2);
  const shipping = numberValue(order?.shipping ?? order?.delivery, 0);
  const total = numberValue(order?.total, subtotal + vat + shipping);

  return { items, subtotal, vat, shipping, total };
};

const orderItemsRows = (items) => {
  if (!items.length) {
    return `
      <tr>
        <td colspan="8" style="padding:18px;text-align:center;color:#6b7280;border-bottom:1px solid #e5e7eb;">
          Няма продукти
        </td>
      </tr>
    `;
  }

  return items.map((item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        ${item.image
          ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" width="72" height="72" style="width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid #333;background:#111;display:block;" />`
          : `<div style="width:72px;height:72px;border-radius:10px;border:1px solid #d1d5db;background:#f3f4f6;color:#6b7280;font-size:11px;line-height:72px;text-align:center;">няма снимка</div>`}
      </td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        <strong>${escapeHtml(item.name)}</strong>
        ${item.characteristics ? `<div style="margin-top:5px;color:#6b7280;font-size:12px;line-height:1.45;">${escapeHtml(item.characteristics)}</div>` : ""}
      </td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(item.catalogNumber || "-")}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(item.serial || "-")}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;text-align:center;">${item.quantity}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;text-align:right;">${money(item.unitPrice)}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(item.warranty)}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;text-align:right;"><strong>${money(item.rowTotal)}</strong></td>
    </tr>
  `).join("");
};

const totalsTable = ({ subtotal, vat, shipping, total }) => `
  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:18px;">
    <tr>
      <td style="padding:7px 0;color:#4b5563;">Междинна сума</td>
      <td style="padding:7px 0;text-align:right;font-weight:700;">${money(subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:7px 0;color:#4b5563;">ДДС</td>
      <td style="padding:7px 0;text-align:right;font-weight:700;">${money(vat)}</td>
    </tr>
    <tr>
      <td style="padding:7px 0;color:#4b5563;">Доставка</td>
      <td style="padding:7px 0;text-align:right;font-weight:700;">${shipping > 0 ? money(shipping) : "Безплатна"}</td>
    </tr>
    <tr>
      <td style="padding:13px 0 0;border-top:2px solid #ef4444;font-size:18px;font-weight:900;">Общо</td>
      <td style="padding:13px 0 0;border-top:2px solid #ef4444;text-align:right;font-size:22px;font-weight:900;color:#dc2626;">${money(total)}</td>
    </tr>
  </table>
`;

export const buildOrderEmailHtml = ({ order, introTitle, introText, status }) => {
  const orderNumber = getOrderNumber(order);
  const totals = getOrderTotals(order);
  const paymentMethod = getPaymentMethodText(order?.payment_method);
  const currentStatus = status || order?.status || "Приета";

  return `
    <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#f3f4f6;padding:0;margin:0;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" style="width:100%;max-width:880px;border-collapse:collapse;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 55px rgba(17,24,39,.12);">
              <tr>
                <td style="background:#111827;padding:28px 30px;color:#ffffff;">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#fca5a5;font-weight:900;">ВФ Компютри</div>
                  <div style="font-size:26px;font-weight:900;margin-top:7px;">${escapeHtml(introTitle)}</div>
                  <div style="height:4px;width:72px;background:#ef4444;border-radius:999px;margin-top:16px;"></div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 30px;">
                  <p style="margin:0 0 10px;font-size:17px;">Здравейте, <strong>${escapeHtml(order?.customer_name || "клиент")}</strong>,</p>
                  <p style="margin:0 0 22px;color:#4b5563;font-size:15px;line-height:1.6;">${escapeHtml(introText)}</p>

                  <table role="presentation" style="width:100%;border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;margin-bottom:22px;">
                    <tr>
                      <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;"><strong>Номер на поръчка</strong><br>${escapeHtml(orderNumber)}</td>
                      <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;"><strong>Статус</strong><br><span style="color:#dc2626;font-weight:900;">${escapeHtml(currentStatus)}</span></td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;"><strong>Дата</strong><br>${escapeHtml(dateText(order?.created_at))}</td>
                      <td style="padding:14px 16px;"><strong>Метод на плащане</strong><br>${escapeHtml(paymentMethod)}</td>
                    </tr>
                  </table>

                  <h3 style="margin:0 0 12px;font-size:18px;">Данни за доставка</h3>
                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                    ${[
                      ["Име", order?.customer_name],
                      ["Телефон", order?.customer_phone],
                      ["Email", order?.customer_email],
                      ["Град", order?.customer_city],
                      ["Адрес", order?.customer_address],
                      ["Коментар", order?.customer_comment],
                    ].map(([label, value]) => `
                      <tr>
                        <td style="width:155px;padding:7px 0;color:#6b7280;font-weight:700;">${label}</td>
                        <td style="padding:7px 0;">${escapeHtml(value || "-")}</td>
                      </tr>
                    `).join("")}
                  </table>

                  <h3 style="margin:0 0 12px;font-size:18px;">Продукти</h3>
                  <div style="overflow-x:auto;">
                    <table role="presentation" style="width:100%;min-width:840px;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                      <thead>
                        <tr style="background:#111827;color:#ffffff;">
                          <th align="left" style="padding:12px;">Снимка</th>
                          <th align="left" style="padding:12px;">Продукт</th>
                          <th align="left" style="padding:12px;">Кат. номер</th>
                          <th align="left" style="padding:12px;">SKU/сериен</th>
                          <th align="center" style="padding:12px;">Брой</th>
                          <th align="right" style="padding:12px;">Ед. цена</th>
                          <th align="left" style="padding:12px;">Гаранция</th>
                          <th align="right" style="padding:12px;">Общо</th>
                        </tr>
                      </thead>
                      <tbody>${orderItemsRows(totals.items)}</tbody>
                    </table>
                  </div>

                  ${totalsTable(totals)}
                </td>
              </tr>
              <tr>
                <td style="background:#111827;color:#d1d5db;padding:18px 30px;font-size:13px;line-height:1.6;">
                  <strong style="color:#ffffff;">ВФ Компютри</strong><br>
                  Телефон: <a href="tel:0876126326" style="color:#fca5a5;text-decoration:none;">${STORE_PHONE}</a><br>
                  При отговор на този email съобщението ще бъде изпратено към ${REPLY_TO}.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
};

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
