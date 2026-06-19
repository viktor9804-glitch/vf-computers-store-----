import React from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { formatDisplayPrice, formatPrice } from "../utils/format";
import { normalizeComparableValue } from "../utils/text";
import { getOptimizedImageUrl, restoreOriginalImage } from "../utils/images";

const getProductImage = (product) => {
  const firstImage = Array.isArray(product?.images) ? product.images[0] : "";
  if (typeof firstImage === "string" && firstImage) return firstImage;
  return firstImage?.href || product?.image || "/VF_logo_header.webp";
};

const getProductDetails = (product) => {
  const filters = product?.filters;
  const filterDetails = filters && typeof filters === "object" && !Array.isArray(filters)
    ? Object.entries(filters)
      .map(([key, value]) => [key, normalizeComparableValue(value)])
      .filter(([, value]) => value)
    : [];

  if (filterDetails.length > 0) return filterDetails.slice(0, 4);

  return (product?.specs || [])
    .map((spec) => normalizeComparableValue(spec))
    .filter(Boolean)
    .slice(0, 4)
    .map((spec) => {
      const separatorIndex = spec.indexOf(":");
      return separatorIndex > 0
        ? [spec.slice(0, separatorIndex), spec.slice(separatorIndex + 1).trim()]
        : ["Характеристика", spec];
    });
};

function SelectedComponentPreview({ label, product }) {
  const details = getProductDetails(product);

  return (
    <article className="builder-component-preview">
      <div className="builder-component-image">
        <img
          src={getOptimizedImageUrl(getProductImage(product), 480, 76)}
          alt={product.name || label}
          loading="lazy"
          decoding="async"
          width="480"
          height="360"
          onError={(event) => {
            if (event.currentTarget.dataset.originalFallback !== "true") {
              restoreOriginalImage(event, getProductImage(product));
              return;
            }
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/VF_logo_header.webp";
          }}
        />
      </div>
      <div className="builder-component-info">
        <span className="builder-component-type">{label}</span>
        <h4>{product.name || product.title}</h4>
        <div className="builder-component-meta">
          <strong>{formatDisplayPrice(product.price)}</strong>
          <span>{product.availabilityLabel || product.stock || "По заявка"}</span>
        </div>
        {details.length > 0 && (
          <dl className="builder-component-specs">
            {details.map(([key, value], index) => (
              <div key={`${key}-${index}`}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="builder-component-extra">
          {product.catalog_number && <span>Код: {product.catalog_number}</span>}
          {product.warranty && <span>Гаранция: {normalizeComparableValue(product.warranty)}</span>}
        </div>
      </div>
    </article>
  );
}

export default function BuilderPage({
  pcBuilderSteps,
  componentPools,
  builderSelections,
  updateBuilderSelection,
  updateBuilderStorageSelection,
  addBuilderStorageRow,
  removeBuilderStorageRow,
  getCompatibilityIssue,
  builderGame,
  setBuilderGame,
  builderPaymentMethod,
  setBuilderPaymentMethod,
  tbiAvailable = false,
  builderSelectedList,
  builderNetTotal,
  builderVatTotal,
  builderDelivery,
  builderGrandTotal,
  builderProducts,
  fpsEstimate,
  builderNotice,
  addConfigurationToCart,
  deliverySettings,
  deliveryMin,
  deliveryMax,
  storeInfo,
}) {
  const builderProductsTotalWithVat = builderNetTotal + builderVatTotal;
  const selectedComponentCards = [
    ["Процесор", builderProducts.cpu],
    ["Дънна платка", builderProducts.motherboard],
    ["RAM памет", builderProducts.ram],
    ["Видео карта", builderProducts.gpu],
    ...(builderProducts.storage || []).map((product, index) => [
      index === 0 ? "Основен SSD / HDD" : `Допълнителен SSD / HDD ${index}`,
      product,
    ]),
    ["Захранване", builderProducts.psu],
    ["Кутия", builderProducts.case],
    ["Охлаждане", builderProducts.cooler],
  ].filter(([, product]) => Boolean(product));
  const builderPaymentLabel = builderPaymentMethod === "tbi"
    ? "На изплащане чрез TBI Bank"
    : "Предварително плащане по банков път";
  const builderPaymentText = builderPaymentMethod === "tbi"
    ? "След записване на поръчката ще се отвори защитената TBI заявка за финансиране."
    : "Конфигурациите, сглобени чрез 'Сглоби PC', се изпълняват само след предварително плащане по банков път. След изпращане на заявката ще се свържем с вас за потвърждение и банкови данни.";

  return (
    <section id="builder" className="builder-section">
      <div className="container builder-layout">
        <div className="builder-intro">
          <p className="section-label">Custom Build</p>
          <h2>Сглоби си компютър</h2>
          <p className="lead">
            Избери реални налични компоненти от каталога и ще заключим несъвместимите варианти вместо теб.
          </p>
          <div className="builder-steps compact">
            {pcBuilderSteps.map(({ icon: Icon, title, text }) => (
              <div className="builder-step" key={title}>
                <Icon />
                <div>
                  <b>{title}</b>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pc-builder-form">
          <div className="form-head">
            <div>
              <h3>Конфигуратор на PC</h3>
            </div>
            <Sparkles />
          </div>

          <div className="builder-form-grid">
            <label>
              1. Процесор
              <select value={builderSelections.cpu} onChange={(event) => updateBuilderSelection("cpu", event.target.value)}>
                <option value="">Избери процесор</option>
                {componentPools.cpu.map((product) => {
                  const issue = getCompatibilityIssue("cpu", product);
                  return <option key={product.id} value={product.id} disabled={Boolean(issue)}>{product.name}{issue ? ` - ${issue}` : ""}</option>;
                })}
              </select>
            </label>
            <label>
              2. Дънна платка
              <select value={builderSelections.motherboard} onChange={(event) => updateBuilderSelection("motherboard", event.target.value)}>
                <option value="">Избери дънна платка</option>
                {componentPools.motherboard.map((product) => {
                  const issue = getCompatibilityIssue("motherboard", product);
                  return <option key={product.id} value={product.id} disabled={Boolean(issue)}>{product.name}{issue ? ` - ${issue}` : ""}</option>;
                })}
              </select>
            </label>
            <label>
              3. RAM памет
              <select value={builderSelections.ram} onChange={(event) => updateBuilderSelection("ram", event.target.value)}>
                <option value="">Избери RAM</option>
                {componentPools.ram.map((product) => {
                  const issue = getCompatibilityIssue("ram", product);
                  return <option key={product.id} value={product.id} disabled={Boolean(issue)}>{product.name}{issue ? ` - ${issue}` : ""}</option>;
                })}
              </select>
            </label>
            <label>
              4. Видео карта
              <select value={builderSelections.gpu} onChange={(event) => updateBuilderSelection("gpu", event.target.value)}>
                <option value="">Избери видеокарта</option>
                {componentPools.gpu.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              5. SSD / HDD
              <div className="storage-selection-list">
                {builderSelections.storage.map((row, index) => (
                  <div className="storage-selection-row" key={row.id}>
                    <div>
                      <span>{index === 0 ? "Основен SSD / HDD" : "Допълнителен SSD / HDD"}</span>
                      <select value={row.product || ""} onChange={(event) => updateBuilderStorageSelection(row.id, event.target.value)}>
                        <option value="">Избери устройство</option>
                        {componentPools.storage.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                    {index > 0 && (
                      <button className="storage-remove" type="button" onClick={() => removeBuilderStorageRow(row.id)}>
                        <Trash2 size={15} />
                        Премахни
                      </button>
                    )}
                  </div>
                ))}
                <button className="storage-add" type="button" onClick={addBuilderStorageRow}>
                  <Plus size={16} />
                  Добави допълнително SSD / HDD
                </button>
              </div>
            </label>
            <label>
              6. Захранване
              <select value={builderSelections.psu} onChange={(event) => updateBuilderSelection("psu", event.target.value)}>
                <option value="">Избери захранване</option>
                {componentPools.psu.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>
            <label>
              7. Кутия
              <select value={builderSelections.case} onChange={(event) => updateBuilderSelection("case", event.target.value)}>
                <option value="">Избери кутия</option>
                {componentPools.case.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>
            <label>
              8. Охлаждане
              <select value={builderSelections.cooler} onChange={(event) => updateBuilderSelection("cooler", event.target.value)}>
                <option value="">Избери охлаждане</option>
                {componentPools.cooler.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              Примерен FPS - моля въведете игра
              <input value={builderGame} onChange={(event) => setBuilderGame(event.target.value)} placeholder="Въведете игра, например GTA V, CS2, Fortnite..." />
            </label>
          </div>

          {selectedComponentCards.length > 0 && (
            <section className="builder-selected-section" aria-live="polite">
              <div className="builder-selected-head">
                <b>Избрани компоненти</b>
                <span>Първа снимка и основни характеристики</span>
              </div>
              <div className="builder-selected-components">
                {selectedComponentCards.map(([label, product]) => (
                  <SelectedComponentPreview
                    key={`${label}-${product.id}`}
                    label={label}
                    product={product}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="builder-preview">
            <b>Обобщение на конфигурацията:</b>
            <p>{builderSelectedList.length ? builderSelectedList.map((product) => product.name).join(" • ") : "Все още няма избрани компоненти."}</p>
            <p>Стойност на продуктите: {formatPrice(builderProductsTotalWithVat)}</p>
            <p>Доставка с {deliverySettings.provider}: {builderDelivery === 0 ? "Безплатна" : `от ${formatPrice(deliveryMin)} до ${formatPrice(deliveryMax)} / начислени ${formatPrice(builderDelivery)}`}</p>
            <p>Общо: {formatPrice(builderGrandTotal)}</p>
            <p>Плащане: {builderPaymentLabel}</p>
          </div>

          <div className="builder-preview payment-required">
            <b>Начин на плащане</b>
            <div className="payment-options">
              <label className={`payment-option ${builderPaymentMethod === "bank" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="builder-payment"
                  value="bank"
                  checked={builderPaymentMethod === "bank"}
                  onChange={() => setBuilderPaymentMethod("bank")}
                />
                <div>
                  <b>Предварително плащане по банков път</b>
                </div>
              </label>
              {tbiAvailable && (
                <label className={`payment-option ${builderPaymentMethod === "tbi" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="builder-payment"
                    value="tbi"
                    checked={builderPaymentMethod === "tbi"}
                    onChange={() => setBuilderPaymentMethod("tbi")}
                  />
                  <div>
                    <b>На изплащане чрез TBI Bank</b>
                  </div>
                </label>
              )}
            </div>
            <p>{builderPaymentText}</p>
          </div>

          <div className="builder-preview">
            <b>Примерен FPS</b>
            {!builderProducts.cpu || !builderProducts.gpu ? (
              <p>Изберете процесор и видеокарта, за да изчислим примерен FPS.</p>
            ) : !builderGame.trim() ? (
              <p>Въведи игра, за да покажем ориентировъчни стойности.</p>
            ) : (
              <>
                <p>Ниски настройки: {fpsEstimate?.low} FPS</p>
                <p>Средни настройки: {fpsEstimate?.medium} FPS</p>
                <p>Високи настройки: {fpsEstimate?.high} FPS</p>
              </>
            )}
            <p>Това е ориентировъчна оценка, не гарантиран FPS.</p>
            <p>Стойностите са приблизителни и зависят от драйвери, резолюция, охлаждане и настройки.</p>
          </div>

          {builderNotice && <div className="notice">{builderNotice}</div>}

          <div className="builder-actions">
            <button className="btn primary" onClick={addConfigurationToCart}>Изпрати заявка за конфигурация</button>
            <a className="btn ghost" href={`tel:${storeInfo.rawPhone}`}>Обади се</a>
          </div>
        </div>
      </div>
    </section>
  );
}
