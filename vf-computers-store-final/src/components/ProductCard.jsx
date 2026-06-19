import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { formatDisplayPrice } from "../utils/format";
import { getOptimizedImageUrl, getProductImageSrcSet, restoreOriginalImage } from "../utils/images";

export default function ProductCard({ product, addToCart }) {
  return (
    <Link to={`/product/${product.id}`} className="product-link">
      <article className="product-card">
        <div className="product-image">
          <img
            src={getOptimizedImageUrl(product.image, 640)}
            srcSet={getProductImageSrcSet(product.image)}
            sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 280px"
            alt={product.name}
            loading="lazy"
            decoding="async"
            width="640"
            height="480"
            onError={(event) => restoreOriginalImage(event, product.image)}
          />
          {product.availabilityType === "on_the_way" && (
            <span className="badge-product availability-badge">На път</span>
          )}
        </div>

        <div className="product-body">
          <div className="product-meta">
            <span>{product.category}</span>
          </div>

          {product.catalog_number && (
            <div className="catalog-number">Каталожен №: {product.catalog_number}</div>
          )}

          <h3>{product.name}</h3>

          <p className="stock">
            <CheckCircle2 size={15} />
            {product.availabilityLabel || product.stock}
          </p>

          <div className="product-buy">
            <div>
              <b>{formatDisplayPrice(product.price)}</b>
              {Number(product.oldPrice || 0) > Number(product.price || 0) && (
                <del>{formatDisplayPrice(product.oldPrice)}</del>
              )}
            </div>

            <button
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
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
