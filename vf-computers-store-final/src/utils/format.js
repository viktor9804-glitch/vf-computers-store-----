export const formatPrice = (value) => {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

export const calculateDisplayPrice = (value) => Number(value || 0) * 1.2;

export const formatDisplayPrice = (value) => formatPrice(calculateDisplayPrice(value));
