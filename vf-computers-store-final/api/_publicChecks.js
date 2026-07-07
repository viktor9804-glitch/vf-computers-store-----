import { ApiError, text } from "./_serverSecurity.js";

const WARRANTY_CODE_PATTERN = /^VF-(?:WAR|WARRANTY)-[A-Z0-9]{4,12}(?:-[A-Z0-9]{4,16}){1,3}$/;
const SERVICE_CODE_PATTERN = /^VF-SVC-[A-Z0-9]{4,12}(?:-[A-Z0-9]{4,16}){1,3}$/;

const normalizeCode = (value) => text(value, 80).toUpperCase().replace(/\s+/g, "");

function validateCode(value, pattern) {
  const code = normalizeCode(value);
  if (!pattern.test(code)) {
    throw new ApiError(404, "RECORD_NOT_FOUND", "Няма намерен запис с този код.");
  }
  return code;
}

export const validateWarrantyCode = (value) => validateCode(value, WARRANTY_CODE_PATTERN);
export const validateServiceCode = (value) => validateCode(value, SERVICE_CODE_PATTERN);

const firstValue = (row, keys) => {
  for (const key of keys) {
    if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== "") {
      return row[key];
    }
  }
  return null;
};

export function toPublicWarranty(row) {
  return {
    warranty_code: firstValue(row, ["warranty_code", "public_code", "warranty_number"]),
    product_name: firstValue(row, ["product_name", "product_model"]),
    product_model: firstValue(row, ["product_model"]),
    product_brand: firstValue(row, ["product_brand", "product_manufacturer"]),
    warranty_start: firstValue(row, ["warranty_start", "warranty_start_date", "sale_date", "starts_at"]),
    warranty_end: firstValue(row, ["warranty_end", "warranty_end_date", "warranty_until", "ends_at"]),
    warranty_months: firstValue(row, ["warranty_months"]),
    status: firstValue(row, ["status"]) || "active",
    warranty_items: Array.isArray(row?.warranty_items)
      ? row.warranty_items.map((item) => ({
          product_name: firstValue(item, ["product_name", "product_model"]),
          product_model: firstValue(item, ["product_model"]),
          manufacturer: firstValue(item, ["manufacturer"]),
          warranty_months: firstValue(item, ["warranty_months"]),
          warranty_end: firstValue(item, ["warranty_end"]),
        }))
      : [],
  };
}

export function toPublicService(row) {
  const publicServices = Array.isArray(row.public_services)
    ? row.public_services
        .map((item) => ({
          name: text(item?.name, 160),
          scanned_at: item?.scanned_at || null,
          price: Number.isFinite(Number(item?.price)) ? Number(item.price) : null,
        }))
        .filter((item) => item.name)
    : [];

  return {
    public_code: row.public_code,
    device_type: row.device_type || null,
    brand: row.brand || null,
    model: row.model || null,
    status: row.status || "accepted",
    public_work_summary: row.public_work_summary || null,
    public_services: publicServices,
    public_total_price: Number.isFinite(Number(row.public_total_price)) ? Number(row.public_total_price) : null,
    currency: row.currency || "EUR",
    updated_at: row.updated_at || null,
    completed_at: row.completed_at || null,
  };
}
