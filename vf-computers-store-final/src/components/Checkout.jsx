import React from "react";
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
  const { checkoutOpen, setCheckoutOpen, cartGrandTotal } = useCart();

  if (!checkoutOpen) return null;

  return (
    <div className="overlay checkout-overlay" onClick={() => setCheckoutOpen(false)}>
      <div className="checkout-modal" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3>Финализиране на поръчка</h3>
            <p>Демо форма. Следващ етап: реални поръчки към имейл и база данни.</p>
          </div>
          <button onClick={() => setCheckoutOpen(false)}><X size={18} /></button>
        </div>
        <form className="checkout-form">
          <input placeholder="Име и фамилия" />
          <input placeholder="Телефон" />
          <input placeholder="Имейл" />
          <input placeholder="Град" />
          <input className="wide" placeholder="Адрес или офис на куриер" />
          <textarea className="wide" placeholder="Коментар към поръчката" />
        </form>

        <div className="payment-box">
          <div className="payment-title">
            <CreditCard />
            <div>
              <b>Метод на плащане</b>
              <p>Избери как клиентът ще плати поръчката.</p>
            </div>
          </div>

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
              <p>След изпращане на поръчката ще се отвори прозорецът за TBI кандидатстване.</p>
            </div>
          )}
        </div>

        <div className="checkout-summary">
          <CreditCard />
          <span>Обща сума: <b>{formatPrice(cartGrandTotal)}</b></span>
        </div>
        <button className="send-order" onClick={sendOrder} disabled={sendingOrder}>
          {sendingOrder
            ? "Изпращане..."
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
