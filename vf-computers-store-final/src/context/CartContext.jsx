import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const VAT_RATE = 0.20;

const calculateVat = (net) => Number(net || 0) * VAT_RATE;
const calculateGross = (net) => Number(net || 0) * (1 + VAT_RATE);

const DEFAULT_DELIVERY_SETTINGS = {
  provider: "Еконт",
  free_delivery_threshold: 200,
  delivery_min: 8,
  delivery_max: 20,
  default_delivery_price: 8,
};

export function CartProvider({ children }) {
  const [products, setCartProducts] = useState([]);
  const [deliverySettings, setCartDeliverySettings] = useState(DEFAULT_DELIVERY_SETTINGS);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vf_cart") || "{}");
    } catch {
      return {};
    }
  });
  const [cartCustomItems, setCartCustomItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("vf_cart", JSON.stringify(cart));
  }, [cart]);

  const standardCartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find((item) => String(item.id) === String(id));
        return product ? { ...product, quantity } : null;
      })
      .filter(Boolean);
  }, [cart, products]);

  const cartItems = useMemo(
    () => [...standardCartItems, ...cartCustomItems],
    [standardCartItems, cartCustomItems]
  );

  const cartCount = cartItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const cartVat = calculateVat(cartSubtotal);
  const cartTotal = calculateGross(cartSubtotal);
  const freeDeliveryThreshold = Number(
    deliverySettings.free_delivery_threshold || DEFAULT_DELIVERY_SETTINGS.free_delivery_threshold
  );
  const deliveryMin = Number(deliverySettings.delivery_min || DEFAULT_DELIVERY_SETTINGS.delivery_min);
  const deliveryMax = Number(deliverySettings.delivery_max || DEFAULT_DELIVERY_SETTINGS.delivery_max);
  const defaultDeliveryPrice = Number(
    deliverySettings.default_delivery_price || DEFAULT_DELIVERY_SETTINGS.default_delivery_price
  );
  const cartDelivery =
    cartTotal >= freeDeliveryThreshold || cartItems.length === 0
      ? 0
      : defaultDeliveryPrice;
  const cartGrandTotal = cartTotal + cartDelivery;

  const addToCart = (productOrId) => {
    const id = String(productOrId?.id || productOrId?.valiId || productOrId?.vali_id || productOrId);
    if (!id) return;

    setCart((current) => ({ ...current, [id]: Number(current[id] || 0) + 1 }));
    setCartOpen(true);
  };

  const updateQuantity = (id, amount) => {
    if (String(id).startsWith("config-")) {
      setCartCustomItems((current) => {
        return current
          .map((item) => item.id === id ? { ...item, quantity: Number(item.quantity || 1) + amount } : item)
          .filter((item) => Number(item.quantity || 1) > 0);
      });
      return;
    }

    setCart((current) => {
      const nextQuantity = (current[id] || 0) + amount;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: nextQuantity };
    });
  };

  const clearCart = () => {
    setCart({});
    setCartCustomItems([]);
  };

  const value = {
    cart,
    setCart,
    cartCustomItems,
    setCartCustomItems,
    cartOpen,
    setCartOpen,
    checkoutOpen,
    setCheckoutOpen,
    cartItems,
    cartCount,
    cartSubtotal,
    cartVat,
    cartTotal,
    cartDelivery,
    cartGrandTotal,
    freeDeliveryThreshold,
    deliveryMin,
    deliveryMax,
    addToCart,
    updateQuantity,
    clearCart,
    setCartProducts,
    setCartDeliverySettings,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
