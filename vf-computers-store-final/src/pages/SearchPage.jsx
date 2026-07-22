import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { matchesCatalogSearchText, normalizeCatalogSearch } from "../lib/catalogSearch";

const PRODUCTS_PER_PAGE = 50;

const getSearchValues = (product) => (
  [
    product.title,
    product.name,
    product.model,
    product.category,
    product.mainCategory,
    product.manufacturer,
    product.catalog_number,
    product.reference_number,
  ]
);

export default function SearchPage({
  products,
  addToCart,
  HeaderComponent,
  headerProps,
  loadingProducts = false,
}) {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const normalizedQuery = normalizeCatalogSearch(q);
  const Header = HeaderComponent;
  const [page, setPage] = useState(1);

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    return products.filter((product) => matchesCatalogSearchText(getSearchValues(product), normalizedQuery));
  }, [products, normalizedQuery]);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(results.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleResults = results.slice(
    (safePage - 1) * PRODUCTS_PER_PAGE,
    safePage * PRODUCTS_PER_PAGE
  );

  return (
    <>
      {Header && <Header {...headerProps} query={q} />}
      <main className="search-page">
        <div className="container products-section">
          <div className="section-head">
            <div>
              <p className="section-label">Търсене</p>
              <h2>Резултати за: {q}</h2>
              <p className="search-results-count">
                {loadingProducts ? "Търсим в целия каталог…" : `Намерени ${results.length} продукта`}
              </p>
            </div>
          </div>

          {loadingProducts ? (
            <p className="empty-products">Зареждаме всички резултати…</p>
          ) : results.length === 0 ? (
            <p className="empty-products">Няма намерени продукти.</p>
          ) : (
            <div className="product-grid">
              {visibleResults.map((product) => (
                <ProductCard product={product} addToCart={addToCart} key={product.id} />
              ))}
            </div>
          )}

          {results.length > PRODUCTS_PER_PAGE && (
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
      </main>
    </>
  );
}
