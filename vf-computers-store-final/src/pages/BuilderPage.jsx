import React from "react";
import { Sparkles } from "lucide-react";
import { formatPrice } from "../utils/format";

export default function BuilderPage({
  pcBuilderSteps,
  componentPools,
  builderSelections,
  updateBuilderSelection,
  getCompatibilityIssue,
  builderGame,
  setBuilderGame,
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
              <p>Компонентите са синхронизирани с наличните локални и VALI продукти.</p>
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
            <label>
              5. SSD / HDD
              <select value={builderSelections.storage} onChange={(event) => updateBuilderSelection("storage", event.target.value)}>
                <option value="">Избери устройство</option>
                {componentPools.storage.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
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

          <div className="builder-preview">
            <b>Обобщение на конфигурацията:</b>
            <p>{builderSelectedList.length ? builderSelectedList.map((product) => product.name).join(" • ") : "Все още няма избрани компоненти."}</p>
            <p>Междинна сума: {formatPrice(builderNetTotal)} без ДДС</p>
            <p>ДДС 20%: {formatPrice(builderVatTotal)}</p>
            <p>Доставка с {deliverySettings.provider}: {builderDelivery === 0 ? "Безплатна" : `от ${formatPrice(deliveryMin)} до ${formatPrice(deliveryMax)} / начислени ${formatPrice(builderDelivery)}`}</p>
            <p>Общо: {formatPrice(builderGrandTotal)} с ДДС</p>
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
            <button className="btn primary" onClick={addConfigurationToCart}>Добави конфигурацията в количката</button>
            <a className="btn ghost" href={`tel:${storeInfo.rawPhone}`}>Обади се</a>
          </div>
        </div>
      </div>
    </section>
  );
}
