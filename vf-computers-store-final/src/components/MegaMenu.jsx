import React from "react";

export default function MegaMenu({ categories, onClose }) {
  return (
    <div className="mega-menu-overlay" onClick={onClose}>
      <div className="mega-menu-panel mega-menu-grid" onClick={(event) => event.stopPropagation()}>
        {categories.map((category) => (
          <div className="mega-menu-column" key={category.title}>
            <img className="mega-bg" src={category.image} alt={category.title} />
            <div className="mega-content">
              <h2>{category.title}</h2>
              <ul>
                {category.items.slice(0, 10).map((item) => (
                  <li key={item} onClick={() => { onClose(); window.location.href = `/category/${encodeURIComponent(item)}`; }}>
                    {item}
                  </li>
                ))}
                {category.items.length > 10 && (
                  <li className="mega-view-all" onClick={() => { onClose(); window.location.href = `/category/${encodeURIComponent(category.title)}`; }}>
                    Виж всички →
                  </li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
