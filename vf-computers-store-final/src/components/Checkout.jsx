import React, { useEffect, useState } from "react";
import { CreditCard, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../utils/format";

export default function Checkout({
  paymentMethods,
  paymentMethod,
  setPaymentMethod,
  bankInfo,
  sendOrder,
  sendingOrder,
}) {
  const { checkoutOpen, setCheckoutOpen, cartGrandTotal, cartItems } = useCart();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    comment: "",
  });
  const [checkoutError, setCheckoutError] = useState("");
  const hasCustomPcBuild = cartItems.some((item) => item.is_custom_pc_build || item.source === "config");
  const customPcBuildItem = cartItems.find((item) => item.is_custom_pc_build || item.source === "config");
  const customPcPaymentMethod = customPcBuildItem?.payment_method || "bank";
  const customPcPaymentLabel = customPcBuildItem?.payment_label || "Предварително плащане по банков път";
  const customPcPaymentText = customPcPaymentMethod === "tbi"
    ? "Заявката ще бъде обработена като покупка на изплащане чрез TBI Bank. След изпращане ще се свържем с вас за потвърждение и оформяне на финансирането."
    : "След изпращане на заявката ще се свържем с вас за потвърждение и банкови данни.";

  useEffect(() => {
    if (hasCustomPcBuild && paymentMethod !== customPcPaymentMethod) {
      setPaymentMethod(customPcPaymentMethod);
      return;
    }

    if (!hasCustomPcBuild && paymentMethod === "bank_transfer_required") {
      setPaymentMethod("cod");
    }
  }, [customPcPaymentMethod, hasCustomPcBuild, paymentMethod, setPaymentMethod]);

  if (!checkoutOpen) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setCheckoutError("");
  };

  const handleSendOrder = async () => {
    const requiredFields = [
      ["name", "име"],
      ["phone", "телефон"],
      ["city", "град"],
      ["address", "адрес"],
    ];
    const missing = requiredFields.find(([field]) => !form[field].trim());

    if (missing) {
      setCheckoutError(`Моля, попълнете ${missing[1]}.`);
      return;
    }

    const sent = await sendOrder(form);
    if (sent) {
      setForm({
        name: "",
        phone: "",
        email: "",
        city: "",
        address: "",
        comment: "",
      });
      setCheckoutError("");
    }
  };

  return (
    <div className="overlay checkout-overlay" onClick={() => setCheckoutOpen(false)}>
      <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3>Финализиране на поръчка</h3>
            <p>Попълнете данните за доставка и начин на плащане.</p>
          </div>
          <button onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
        </div>
        <form className="checkout-form" onSubmit={(event) => event.preventDefault()}>
          <input placeholder="Име и фамилия" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          <input placeholder="Телефон" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          <input placeholder="Имейл" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          <input placeholder="Град" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          <input className="wide" placeholder="Адрес или офис на куриер" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
          <textarea className="wide" placeholder="Коментар към поръчката" value={form.comment} onChange={(event) => updateField("comment", event.target.value)} />
        </form>
        {checkoutError && <div className="notice checkout-error">{checkoutError}</div>}

        <div className="payment-box">
          <div className="payment-title">
            <CreditCard />
            <div>
              <b>Метод на плащане</b>
              <p>{hasCustomPcBuild ? "Избраният метод от PC конфигуратора ще бъде добавен към заявката." : "Избери как клиентът ще плати поръчката."}</p>
            </div>
          </div>

          {hasCustomPcBuild ? (
            <div className="payment-options">
              <div className="payment-option active locked">
                <div>
                  <span>Избрано</span>
                  <b>{customPcPaymentLabel}</b>
                  <p>{customPcPaymentText}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="payment-options">
              {paymentMethods.map((method) => (
                <label
                  className={`payment-option ${paymentMethod === method.id ? "active" : ""}`}
                  key={method.id}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                  <div>
                    <span>{method.badge}</span>
                    <b>{method.title}</b>
                    <p>{method.text}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {paymentMethod === "bank" && (
            <div className="bank-transfer-box">
              <b>Данни за банков превод</b>
              <p><span>Банка:</span> {bankInfo.bank}</p>
              <p><span>Титуляр:</span> {bankInfo.holder}</p>
              <p><span>IBAN:</span> {bankInfo.iban}</p>
              <p><span>BIC:</span> {bankInfo.bic}</p>
              <p><span>Основание:</span> Поръчка № ще се генерира след изпращане</p>
              <small>{bankInfo.note}</small>
            </div>
          )}

          {paymentMethod === "tbi" && (
            <div className="tbi-payment-box">
              <b>TBI Bank - покупка на изплащане</b>
              <p>{hasCustomPcBuild ? customPcPaymentText : "След изпращане на поръчката ще се отвори прозорецът за TBI кандидатстване."}</p>
            </div>
          )}
        </div>

        <div className="checkout-summary">
          <CreditCard />
          <span>Обща сума: <b>{formatPrice(cartGrandTotal)}</b>{hasCustomPcBuild ? ` • Плащане: ${customPcPaymentLabel}` : ""}</span>
        </div>
        <button className="send-order" onClick={handleSendOrder} disabled={sendingOrder}>
          {sendingOrder
            ? "Изпращане..."
            : hasCustomPcBuild
              ? "Изпрати заявка за конфигурация"
            : paymentMethod === "bank"
              ? "Изпрати поръчка с банков превод"
              : paymentMethod === "tbi"
                ? "Продължи към TBI"
                : "Изпрати поръчка с наложен платеж"}
        </button>
      </div>
    </div>
  );
}
