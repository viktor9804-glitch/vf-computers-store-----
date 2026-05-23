export const normalizeText = (value) => String(value || "").trim();

export const normalizeComparableValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Да" : "Не";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return normalizeText(value);
};

export const collectFilterValues = (value) => {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectFilterValues(item));
  }
  if (typeof value === "boolean") {
    return [value ? "Да" : "Не"];
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  if (typeof value === "object") {
    return [JSON.stringify(value)];
  }
  const text = normalizeText(value);
  return text ? [text] : [];
};

export const sortFilterValues = (values) => {
  return [...values].sort((first, second) => {
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const firstNumeric = !Number.isNaN(firstNumber) && first.trim() !== "";
    const secondNumeric = !Number.isNaN(secondNumber) && second.trim() !== "";

    if (firstNumeric && secondNumeric) {
      return firstNumber - secondNumber;
    }

    return first.localeCompare(second, "bg", { numeric: true, sensitivity: "base" });
  });
};
