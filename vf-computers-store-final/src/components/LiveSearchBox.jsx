import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadCatalogSearchIndex, searchCatalog } from "../lib/catalogSearch";
import { getOptimizedImageUrl, restoreOriginalImage } from "../utils/images";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DELAY = 180;

const formatSearchPrice = (value) => new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function LiveSearchBox({
  className = "search-box",
  query = "",
  setQuery = () => {},
  searchProducts = [],
  onNavigate = () => {},
}) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const requestIdRef = useRef(0);
  const [searchTerm, setSearchTerm] = useState(query || "");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setSearchTerm(query || "");
  }, [query]);

  useEffect(() => {
    const startPreload = () => loadCatalogSearchIndex().catch(() => {});
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(startPreload, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(idleId);
    }
    const timeoutId = window.setTimeout(startPreload, 700);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const value = searchTerm.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (value.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      setFailed(false);
      setActiveIndex(-1);
      setOpen(false);
      return undefined;
    }

    setOpen(true);
    setLoading(true);
    setFailed(false);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await searchCatalog(value, searchProducts, 6);
        if (requestIdRef.current !== requestId) return;
        setResults(response.items);
        setTotal(response.total);
        setActiveIndex(-1);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        console.error("Live catalog search failed", error);
        setResults([]);
        setTotal(0);
        setFailed(true);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, searchProducts]);

  useEffect(() => {
    const handleOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, []);

  const openFullResults = () => {
    const value = searchTerm.trim();
    if (!value) return;
    setQuery(value);
    setOpen(false);
    onNavigate();
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const openProduct = (product) => {
    setOpen(false);
    onNavigate();
    navigate(`/product/${encodeURIComponent(product.id)}`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      openProduct(results[activeIndex]);
      return;
    }
    openFullResults();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      openProduct(results[activeIndex]);
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    }
  };

  const showPanel = open && searchTerm.trim().length >= MIN_QUERY_LENGTH;

  return (
    <form className={`${className} live-search-root`} onSubmit={handleSubmit} ref={rootRef}>
      <Search size={18} />
      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        onFocus={() => {
          if (searchTerm.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Търси компютър, видеокарта, SSD..."
        aria-label="Търси продукти"
        aria-autocomplete="list"
        aria-expanded={showPanel}
      />
      <button type="submit" aria-label="Търси"><Search size={16} /></button>

      {showPanel && (
        <div className="live-search-panel" role="listbox" aria-label="Предложения за продукти">
          {!loading && !failed && total > 0 && (
            <button type="button" className="live-search-all" onClick={openFullResults}>
              Виж всички <b>{total.toLocaleString("bg-BG")}</b> резултата
            </button>
          )}

          {loading && <div className="live-search-message">Търсим в целия каталог…</div>}
          {!loading && failed && <div className="live-search-message error">Търсенето временно не е достъпно.</div>}
          {!loading && !failed && total === 0 && <div className="live-search-message">Няма намерени продукти.</div>}

          {!loading && results.map((product, index) => (
            <button
              type="button"
              className={`live-search-item${activeIndex === index ? " active" : ""}`}
              key={product.id}
              role="option"
              aria-selected={activeIndex === index}
              onClick={() => openProduct(product)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="live-search-thumb">
                <img
                  src={getOptimizedImageUrl(product.image, 96, 70)}
                  alt=""
                  loading="lazy"
                  onError={(event) => restoreOriginalImage(event, product.image)}
                />
              </span>
              <span className="live-search-copy">
                <b>{product.title}</b>
                <small>{[product.manufacturer, product.model, product.referenceNumber].filter(Boolean).join(" • ")}</small>
                <em className={`search-availability ${product.availabilityType}`}>{product.availabilityLabel}</em>
              </span>
              <strong>{product.availabilityType === "ask_price" ? "Запитване" : formatSearchPrice(product.price)}</strong>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
