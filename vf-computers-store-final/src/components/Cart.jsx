import React from "react";
import { CreditCard, Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatDisplayPrice, formatPrice } from "../utils/format";

export default function Cart({ deliveryProvider, handleTbiCheckout }) {
  const {
    cartOpen,
    setCartOpen,
    cartItems,
    cartCount,
    cartSubtotal,
    cartVat,
    cartDelivery,
    cartGrandTotal,
    deliveryMin,
    deliveryMax,
    updateQuantity,
    setCheckoutOpen,
  } = useCart();

  if (!cartOpen) return null;

  const hasCustomPcBuild = cartItems.some((item) => item.is_custom_pc_build || item.source === "config");
  const customPcBuildItem = cartItems.find((item) => item.is_custom_pc_build || item.source === "config");
  const customPcPaymentLabel = customPcBuildItem?.payment_label || "Предварително плащане по банков път";
  const cartProductsTotalWithVat = cartSubtotal + cartVat;

  return (
    <div className="overlay" onClick={() => setCartOpen(false)}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3>Количка</h3>
            <p>{cartCount} продукта</p>
          </div>
          <button onClick={() => setCartOpen(false)}><X size={18} /></button>
        </div>
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-cart">Количката е празна.</div>
          ) : (
            cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div className="cart-item-body">
                  <b>{item.name}</b>
                  {item.availabilityLabel && <small>{item.availabilityLabel}</small>}
                  <p>{formatDisplayPrice(item.price, { isGross: item.isGross })}</p>
                  <div className="qty">
                    <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                    <button className="trash" onClick={() => updateQuantity(item.id, -item.quantity)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="drawer-total">
          <p><span>Стойност на продуктите</span><b>{formatPrice(cartProductsTotalWithVat)}</b></p>
          <div className="cart-vat-row"><span>Доставка с {deliveryProvider}</span><b>{cartDelivery === 0 ? "Безплатна" : `от ${formatPrice(deliveryMin)} до ${formatPrice(deliveryMax)} / начислени ${formatPrice(cartDelivery)}`}</b></div>
          <div className="cart-total-row"><span>Общо</span><b>{formatPrice(cartGrandTotal)}</b></div>
          {hasCustomPcBuild && <p className="cart-payment-note">Плащане: {customPcPaymentLabel}</p>}
          <button disabled={!cartItems.length} onClick={() => setCheckoutOpen(true)}>
            {hasCustomPcBuild ? "Изпрати заявка за конфигурация" : "Завърши поръчката"}
          </button>
          {!hasCustomPcBuild && (
            <button
              className="drawer-tbi-btn"
              disabled={!cartItems.length}
              onClick={() => handleTbiCheckout({
                name: cartItems.map((item) => item.name).join(", "),
                price: cartGrandTotal,
                isGross: true,
              })}
            >
              <CreditCard size={17} />
              Купи количката на изплащане с TBI
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
