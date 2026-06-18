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
}) {
  if (Object.keys(availableFilters).length === 0) return null;

  return (
    <aside className="filters-sidebar">
      <div className="filters-head">
        <h3>Филтри</h3>
        <button className="filter-clear" onClick={clearAllFilters}>Изчисти всички</button>
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
