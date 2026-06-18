import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import ProductFilters from "../components/ProductFilters";
import { calculateDisplayPrice } from "../utils/format";
import { collectFilterValues, normalizeText, sortFilterValues } from "../utils/text";

const PRODUCTS_PER_PAGE = 50;
const AVAILABILITY_OPTIONS = [
  { type: "in_stock", label: "В наличност" },
  { type: "out_of_stock", label: "Няма наличност" },
  { type: "limited", label: "Ограничена наличност (до 3 бр.)" },
  { type: "on_the_way", label: "На път" },
  { type: "order", label: "По заявка (обади се)" },
];

const resolveAvailabilityType = (product = {}) => {
  if (product.availabilityType) return product.availabilityType;

  const label = normalizeText(product.availabilityLabel || product.stockStatus || product.stock).toLowerCase();

  if (label.includes("няма наличност")) return "out_of_stock";
  if (label.includes("огранич")) return "limited";
  if (label.includes("на път") || label.includes("очаква")) return "on_the_way";
  if (label.includes("по заявка") || label.includes("поръчка")) return "order";
  if (label.includes("в наличност")) return "in_stock";

  return "";
};

export default function Category({
  products,
  addToCart,
  HeaderComponent,
  headerProps,
}) {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [selectedFilters, setSelectedFilters] = useState({});
  const [expandedFilters, setExpandedFilters] = useState({});
  const [filterSearch, setFilterSearch] = useState({});
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [page, setPage] = useState(1);

  const decodedCategory = decodeURIComponent(categoryName);

  const categoryProducts = products.filter(
    (product) => product.category === decodedCategory || product.mainCategory === decodedCategory
  );

  const availabilityOptions = useMemo(() => {
    const counts = categoryProducts.reduce((result, product) => {
      const type = resolveAvailabilityType(product);
      if (type) result[type] = (result[type] || 0) + 1;
      return result;
    }, {});

    return AVAILABILITY_OPTIONS.map((option) => ({
      ...option,
      count: counts[option.type] || 0,
    }));
  }, [categoryProducts]);

  const priceBounds = useMemo(() => {
    const prices = categoryProducts
      .map((product) => calculateDisplayPrice(product.price))
      .filter((price) => Number.isFinite(price) && price >= 0);

    if (prices.length === 0) return { min: 0, max: 0 };

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [categoryProducts]);

  const availableFilters = useMemo(() => {
    const map = {};

    categoryProducts.forEach((product) => {
      Object.entries(product.filters || {}).forEach(([key, rawValue]) => {
        const normalizedKey = normalizeText(key);
        const values = collectFilterValues(rawValue);

        if (!normalizedKey || values.length === 0) return;

        if (!map[normalizedKey]) {
          map[normalizedKey] = {};
        }

        values.forEach((value) => {
          const normalizedValue = normalizeText(value);
          if (!normalizedValue) return;
          map[normalizedKey][normalizedValue] = (map[normalizedKey][normalizedValue] || 0) + 1;
        });
      });
    });

    return Object.fromEntries(
      Object.entries(map)
        .sort(([first], [second]) => first.localeCompare(second, "bg", { sensitivity: "base" }))
        .map(([key, counts]) => [key, sortFilterValues(Object.keys(counts)).map((value) => ({ value, count: counts[value] }))])
    );
  }, [categoryProducts]);

  const filteredProducts = useMemo(() => {
    return categoryProducts.filter((product) => {
      const productAvailability = resolveAvailabilityType(product);
      if (selectedAvailability.length > 0 && !selectedAvailability.includes(productAvailability)) {
        return false;
      }

      const productPrice = calculateDisplayPrice(product.price);
      const minPrice = priceRange.min === "" ? null : Number(priceRange.min);
      const maxPrice = priceRange.max === "" ? null : Number(priceRange.max);

      if (minPrice !== null && Number.isFinite(minPrice) && productPrice < minPrice) return false;
      if (maxPrice !== null && Number.isFinite(maxPrice) && productPrice > maxPrice) return false;

      return Object.entries(selectedFilters).every(([filterKey, selectedValues]) => {
        if (!selectedValues?.length) return true;

        const filterValue = (product.filters || {})[filterKey];
        if (filterValue === null || filterValue === undefined || filterValue === "") return false;

        const productValues = collectFilterValues(filterValue).map((value) => normalizeText(value));
        if (productValues.length === 0) return false;

        return selectedValues.some((value) => productValues.includes(value));
      });
    });
  }, [categoryProducts, selectedAvailability, priceRange, selectedFilters]);

  useEffect(() => {
    setSelectedFilters({});
    setExpandedFilters({});
    setFilterSearch({});
    setSelectedAvailability([]);
    setPriceRange({ min: "", max: "" });
    setPage(1);
  }, [decodedCategory]);

  useEffect(() => {
    setPage(1);
  }, [selectedFilters, selectedAvailability, priceRange]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice(
    (safePage - 1) * PRODUCTS_PER_PAGE,
    safePage * PRODUCTS_PER_PAGE
  );

  const toggleFilterValue = (filterKey, value) => {
    setSelectedFilters((current) => {
      const currentValues = current[filterKey] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      if (nextValues.length === 0) {
        const next = { ...current };
        delete next[filterKey];
        return next;
      }

      return { ...current, [filterKey]: nextValues };
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    setExpandedFilters({});
    setFilterSearch({});
    setSelectedAvailability([]);
    setPriceRange({ min: "", max: "" });
  };

  const toggleAvailability = (type) => {
    setSelectedAvailability((current) => (
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    ));
  };

  const Header = HeaderComponent;

  return (
    <>
      {Header && <Header {...headerProps} />}
      <div className="category-page">
        <div className="container products-section">
          <button className="back-button" onClick={() => navigate("/")}>
            ← Назад
          </button>

          <div className="section-head">
            <div>
              <p className="section-label">Категория</p>
              <h2>{decodedCategory}</h2>
            </div>
          </div>

          <div className="category-layout">
            <ProductFilters
              availableFilters={availableFilters}
              selectedFilters={selectedFilters}
              expandedFilters={expandedFilters}
              filterSearch={filterSearch}
              setFilterSearch={setFilterSearch}
              setExpandedFilters={setExpandedFilters}
              toggleFilterValue={toggleFilterValue}
              clearAllFilters={clearAllFilters}
              availabilityOptions={availabilityOptions}
              selectedAvailability={selectedAvailability}
              toggleAvailability={toggleAvailability}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              priceBounds={priceBounds}
            />

            <div className="products-area">
              <p className="products-count">
                Показани {visibleProducts.length} от {filteredProducts.length} продукта
              </p>

              <div className="product-grid">
                {categoryProducts.length === 0 ? (
                  <p className="empty-products">
                    Няма продукти в тази категория.
                  </p>
                ) : filteredProducts.length === 0 ? (
                  <p className="empty-products">
                    Няма продукти, отговарящи на избраните филтри.
                  </p>
                ) : (
                  visibleProducts.map((product) => (
                    <ProductCard product={product} addToCart={addToCart} key={product.id} />
                  ))
                )}
              </div>

              {filteredProducts.length > PRODUCTS_PER_PAGE && (
                <div className="category-pagination">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={safePage <= 1}
                  >
                    Предишна
                  </button>
                  <span>Страница {safePage} от {totalPages}</span>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={safePage >= totalPages}
                  >
                    Следваща
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
