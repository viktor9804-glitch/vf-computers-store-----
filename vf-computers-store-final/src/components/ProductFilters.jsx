import React from "react";

export default function ProductFilters({
  availableFilters,
  selectedFilters,
  expandedFilters,
  filterSearch,
  setFilterSearch,
  setExpandedFilters,
  toggleFilterValue,
  clearAllFilters,
  availabilityOptions,
  selectedAvailability,
  toggleAvailability,
  priceRange,
  setPriceRange,
  priceBounds,
}) {
  return (
    <aside className="filters-sidebar">
      <div className="filters-head">
        <h3>Филтри</h3>
        <button className="filter-clear" onClick={clearAllFilters}>Изчисти всички</button>
      </div>

      <div className="filter-group">
        <div className="filter-title">Наличност</div>
        {availabilityOptions.map((option) => (
          <label className="filter-option" key={option.type}>
            <input
              type="checkbox"
              checked={selectedAvailability.includes(option.type)}
              onChange={() => toggleAvailability(option.type)}
            />
            <span>{option.label}</span>
            <b>({option.count})</b>
          </label>
        ))}
      </div>

      <div className="filter-group">
        <div className="filter-title">Цена</div>
        <div className="price-filter-inputs">
          <label>
            <span>От</span>
            <div className="price-filter-field">
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceRange.min}
                placeholder={String(priceBounds.min)}
                onChange={(event) => setPriceRange((current) => ({ ...current, min: event.target.value }))}
                aria-label="Минимална цена"
              />
              <b>€</b>
            </div>
          </label>
          <label>
            <span>До</span>
            <div className="price-filter-field">
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceRange.max}
                placeholder={String(priceBounds.max)}
                onChange={(event) => setPriceRange((current) => ({ ...current, max: event.target.value }))}
                aria-label="Максимална цена"
              />
              <b>€</b>
            </div>
          </label>
        </div>
        <p className="price-filter-hint">Диапазон в категорията: {priceBounds.min}–{priceBounds.max} €</p>
      </div>

      {Object.entries(availableFilters).map(([filterKey, options]) => {
        const searchValue = filterSearch[filterKey] || "";
        const visibleOptions = options.filter((option) =>
          option.value.toLowerCase().includes(searchValue.toLowerCase())
        );
        const isExpanded = Boolean(expandedFilters[filterKey]);
        const slicedOptions = isExpanded ? visibleOptions : visibleOptions.slice(0, 12);

        return (
          <div className="filter-group" key={filterKey}>
            <div className="filter-title">{filterKey}</div>
            {options.length > 12 && (
              <input
                className="filter-search"
                value={searchValue}
                onChange={(event) => setFilterSearch((current) => ({ ...current, [filterKey]: event.target.value }))}
                placeholder="Търси във филтъра..."
              />
            )}
            {slicedOptions.map((option) => (
              <label className="filter-option" key={`${filterKey}-${option.value}`}>
                <input
                  type="checkbox"
                  checked={(selectedFilters[filterKey] || []).includes(option.value)}
                  onChange={() => toggleFilterValue(filterKey, option.value)}
                />
                <span>{option.value}</span>
                <b>({option.count})</b>
              </label>
            ))}
            {visibleOptions.length > 12 && (
              <button
                className="filter-more"
                onClick={() => setExpandedFilters((current) => ({ ...current, [filterKey]: !current[filterKey] }))}
              >
                {isExpanded ? "Покажи по-малко" : "Покажи още"}
              </button>
            )}
          </div>
        );
      })}
    </aside>
  );
}
