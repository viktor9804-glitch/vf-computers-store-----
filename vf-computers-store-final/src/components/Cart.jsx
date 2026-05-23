import React from "react";
import { CreditCard, Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../utils/format";

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
                  <p>{formatPrice(item.price)}</p>
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
          <p><span>Междинна сума</span><b>{formatPrice(cartSubtotal)} <span className="vat-note">без 20% ДДС</span></b></p>
          <div className="cart-vat-row"><span>ДДС 20%</span><b>{formatPrice(cartVat)}</b></div>
          <div className="cart-vat-row"><span>Доставка с {deliveryProvider}</span><b>{cartDelivery === 0 ? "Безплатна" : `от ${formatPrice(deliveryMin)} до ${formatPrice(deliveryMax)} / начислени ${formatPrice(cartDelivery)}`}</b></div>
          <div className="cart-total-row"><span>Общо</span><b>{formatPrice(cartGrandTotal)}</b></div>
          <button disabled={!cartItems.length} onClick={() => setCheckoutOpen(true)}>Завърши поръчката</button>
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
        </div>
      </aside>
    </div>
  );
}
