import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "../utils/format";

export default function ProductCard({ product, addToCart }) {
  return (
    <Link to={`/product/${product.id}`} className="product-link">
      <article className="product-card">
        <div className="product-image">
          <img src={product.image} alt={product.name} loading="lazy" />
        </div>

        <div className="product-body">
          <div className="product-meta">
            <span>{product.category}</span>
          </div>

          <h3>{product.name}</h3>

          <p className="stock">
            <CheckCircle2 size={15} />
            {product.stock}
          </p>

          <div className="product-buy">
            <div>
              <b>{formatPrice(product.price)} <span className="vat-note">без 20% ДДС</span></b>
              {Number(product.oldPrice || 0) > Number(product.price || 0) && (
                <del>{formatPrice(product.oldPrice)}</del>
              )}
            </div>

            <button
              onClick={(event) => {
                event.preventDefault();
                addToCart(product.id);
              }}
            >
              Добави
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
