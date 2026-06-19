import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProductGallery from "../components/ProductGallery";
import { useScrollTop } from "../hooks/useScrollTop";
import { formatDisplayPrice } from "../utils/format";
import { normalizeComparableValue } from "../utils/text";

export default function Product({
  products,
  addToCart,
  handleTbiCheckout,
  tbiAvailable = false,
  HeaderComponent,
  headerProps,
  loadingProducts = false,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => String(p.id) === id);
  const [selectedImage, setSelectedImage] = useState(0);
  const Header = HeaderComponent;

  useScrollTop(id);

  if (!product && loadingProducts) {
    return (
      <>
        {Header && <Header {...headerProps} />}
        <div className="product-page-loading">
          <h2>Зареждане на продукта...</h2>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        {Header && <Header {...headerProps} />}
        <div className="product-page-not-found">
          <h2>Продуктът не е намерен</h2>
          <button onClick={() => navigate("/")}>Назад</button>
        </div>
      </>
    );
  }

  const images = product.images?.length ? product.images : [product.image];
  const technicalSpecs = Object.entries(product.filters || {});
  const warrantyText = product.warranty ? `${product.warranty} месеца` : "уточнява се при поръчка";

  return (
    <>
      {Header && <Header {...headerProps} />}
      <div className="product-page">
        <div className="container">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Назад
          </button>

          <div className="product-page-grid">
            <ProductGallery
              images={images}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              productName={product.name}
            />

            <div className="product-page-info">
              <span className="product-page-category">{product.category}</span>
              {product.availabilityType === "on_the_way" && (
                <span className="product-page-availability-badge">На път</span>
              )}
              {product.catalog_number && (
                <div className="product-catalog-number">Каталожен №: {product.catalog_number}</div>
              )}
              <h1>{product.name}</h1>

              <div className="product-price-row">
                <div className="product-page-price">
                  <b>{formatDisplayPrice(product.price)}</b>
                  {Number(product.oldPrice || 0) > Number(product.price || 0) && (
                    <del>{formatDisplayPrice(product.oldPrice)}</del>
                  )}
                </div>

                <div className="product-page-actions-inline">
                  <button onClick={() => addToCart(product.id)}>Добави в количката</button>
                  {tbiAvailable && (
                    <button className="tbi-btn" onClick={() => handleTbiCheckout(product)}>
                      Купи на изплащане
                    </button>
                  )}
                </div>
              </div>

              <p className="product-page-stock">{product.availabilityLabel || product.stock}</p>
              <div className="product-warranty">
                <b>Гаранция:</b> {warrantyText}
              </div>

              <h2 className="product-specs-title">Технически характеристики</h2>
              <table className="product-specs-table">
                <tbody>
                  {technicalSpecs.length > 0 ? technicalSpecs.map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{Array.isArray(value) ? value.join(", ") : normalizeComparableValue(value)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="2">Няма въведени технически характеристики за този продукт.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="product-page-specs">
                {(product.specs || []).map((spec) => (
                  <span key={spec}>{spec}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
