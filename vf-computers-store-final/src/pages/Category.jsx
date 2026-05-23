import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import ProductFilters from "../components/ProductFilters";
import { collectFilterValues, normalizeText, sortFilterValues } from "../utils/text";

const PRODUCTS_PER_PAGE = 50;

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
  const [page, setPage] = useState(1);

  const decodedCategory = decodeURIComponent(categoryName);

  const categoryProducts = products.filter(
    (product) => product.category === decodedCategory || product.mainCategory === decodedCategory
  );

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
      return Object.entries(selectedFilters).every(([filterKey, selectedValues]) => {
        if (!selectedValues?.length) return true;

        const filterValue = (product.filters || {})[filterKey];
        if (filterValue === null || filterValue === undefined || filterValue === "") return false;

        const productValues = collectFilterValues(filterValue).map((value) => normalizeText(value));
        if (productValues.length === 0) return false;

        return selectedValues.some((value) => productValues.includes(value));
      });
    });
  }, [categoryProducts, selectedFilters]);

  useEffect(() => {
    setSelectedFilters({});
    setExpandedFilters({});
    setFilterSearch({});
    setPage(1);
  }, [decodedCategory]);

  useEffect(() => {
    setPage(1);
  }, [selectedFilters]);

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
