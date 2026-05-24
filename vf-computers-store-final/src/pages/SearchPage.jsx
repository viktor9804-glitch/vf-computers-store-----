import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";

const normalizeSearch = (value) => String(value || "").trim().toLowerCase();

const getSearchText = (product) => {
  return [
    product.title,
    product.name,
    product.model,
    product.description,
    product.category,
    product.mainCategory,
    product.manufacturer,
    product.catalog_number,
    product.reference_number,
    product.barcode,
  ].map((value) => String(value || "")).join(" ");
};

export default function SearchPage({
  products,
  addToCart,
  HeaderComponent,
  headerProps,
}) {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const normalizedQuery = normalizeSearch(q);
  const Header = HeaderComponent;

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    return products.filter((product) => {
      const haystack = normalizeSearch(getSearchText(product));
      return terms.every((term) => haystack.includes(term));
    });
  }, [products, normalizedQuery]);

  return (
    <>
      {Header && <Header {...headerProps} query={q} />}
      <main className="search-page">
        <div className="container products-section">
          <div className="section-head">
            <div>
              <p className="section-label">Търсене</p>
              <h2>Резултати за: {q}</h2>
              <p className="search-results-count">Намерени {results.length} продукта</p>
            </div>
          </div>

          {results.length === 0 ? (
            <p className="empty-products">Няма намерени продукти.</p>
          ) : (
            <div className="product-grid">
              {results.map((product) => (
                <ProductCard product={product} addToCart={addToCart} key={product.id} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
