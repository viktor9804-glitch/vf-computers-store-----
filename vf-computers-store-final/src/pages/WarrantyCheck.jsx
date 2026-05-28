import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Search, ShieldCheck, X } from "lucide-react";
import { supabase } from "../supabaseClient";

const STATUS_LABELS = {
  active: "Активна",
  expired: "Изтекла",
  service: "В сервиз",
  rejected: "Отказана",
};

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("bg-BG").format(new Date(`${value}T00:00:00`));
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getDisplayStatus(warranty) {
  if (!warranty) return "active";
  if (warranty.status === "service" || warranty.status === "rejected") return warranty.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(`${warranty.warranty_until}T00:00:00`);
  return until < today ? "expired" : "active";
}

export default function WarrantyCheck({ HeaderComponent, headerProps = {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = normalizeCode(searchParams.get("code"));
  const [code, setCode] = useState(initialCode);
  const [warranty, setWarranty] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const displayStatus = useMemo(() => getDisplayStatus(warranty), [warranty]);

  async function checkWarranty(nextCode = code) {
    const normalizedCode = normalizeCode(nextCode);
    setWarranty(null);
    setMessage("");

    if (!normalizedCode) {
      setMessage("Въведете гаранционен код.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
  .from("warranties")
  .select(`
  *,
  warranty_items (*)
`)
  .or(
    `warranty_number.eq.${normalizedCode},public_code.eq.${normalizedCode},warranty_code.eq.${normalizedCode}`
  )
  .maybeSingle();

    setLoading(false);

    if (error) {
      setMessage("Възникна грешка при проверката. Опитайте отново.");
      return;
    }

    const found = data;
    if (!found) {
      setMessage("Не е намерена гаранция с този код");
      return;
    }

    setSearchParams({ code: normalizedCode });
    setWarranty(found);
  }

  useEffect(() => {
    if (initialCode) checkWarranty(initialCode);
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    checkWarranty();
  }

  return (
    <div className="site warranty-check-page">
      <div className="rgb-bg" />
      <div className="scanline" />
      {HeaderComponent && <HeaderComponent {...headerProps} />}

      <main className="container warranty-check-shell">
        <section className="warranty-check-hero">
          <p className="section-label">VF Computers</p>
          <h1>Проверка на гаранция</h1>
          <p>
            Въведете индивидуалния код от гаранционната карта, за да проверите
            срока и статуса на гаранцията.
          </p>
        </section>

        <section className="warranty-check-layout">
          <form className="warranty-check-form" onSubmit={handleSubmit}>
            <label htmlFor="warranty-code">Гаранционен код</label>
            <div className="warranty-code-input">
              <Search size={18} />
              <input
                id="warranty-code"
                placeholder="VF-WAR-2026-X7K9P2"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <button disabled={loading} type="submit">
              {loading ? "Проверка..." : "Провери"}
            </button>
          </form>

          <article className={`warranty-result-card ${warranty ? displayStatus : "empty"}`}>
            {!warranty && !message && (
              <>
                <ShieldCheck />
                <h2>Очаква се код</h2>
                <p>Кодът е отпечатан върху гаранционната карта.</p>
              </>
            )}

            {message && !warranty && (
              <>
                <X />
                <h2>{message}</h2>
              </>
            )}

            {warranty && (
              <>
                {displayStatus === "expired" ? <X /> : <CheckCircle2 />}
                <h2>{displayStatus === "expired" ? "Гаранцията е изтекла" : "Гаранцията е валидна"}</h2>
                <dl>
                  <div><dt>Гаранционен код:</dt><dd>{warranty.warranty_code}</dd></div>
                  <div><dt>Продукт:</dt><dd>{warranty.product_name || "-"}</dd></div>
                  <div><dt>Сериен номер:</dt><dd>{warranty.product_serial || "-"}</dd></div>
                  <div><dt>Дата на продажба:</dt><dd>{formatDate(warranty.sale_date)}</dd></div>
                  <div><dt>Гаранция до:</dt><dd>{formatDate(warranty.warranty_until)}</dd></div>
                  <div><dt>Статус:</dt><dd>{STATUS_LABELS[displayStatus] || displayStatus}</dd></div>
                </dl>
                {warranty.warranty_items?.length > 0 && (
  <div className="warranty-products">
    <h3>Продукти към гаранцията</h3>

    {warranty.warranty_items.map((item, index) => (
      <div
        key={index}
        style={{
          marginTop: "20px",
          padding: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h4>
          {index + 1}. {item.product_name || "Продукт"}
        </h4>

        <p><strong>Модел:</strong> {item.product_model || "-"}</p>
        <p><strong>Производител:</strong> {item.manufacturer || "-"}</p>
        <p><strong>Сериен номер:</strong> {item.serial_number || "-"}</p>
        <p><strong>Каталожен номер:</strong> {item.catalog_number || "-"}</p>
        <p><strong>Цена:</strong> {item.sale_price ? `${item.sale_price} €` : "-"}</p>
        <p><strong>Гаранция:</strong> {item.warranty_months || "-"} месеца</p>
        <p><strong>Гаранция до:</strong> {formatDate(item.warranty_end)}</p>
        <p><strong>Описание:</strong> {item.description || "-"}</p>
        <p><strong>Характеристики:</strong> {item.specifications || "-"}</p>
      </div>
    ))}
  </div>
)}
              </>
            )}
          </article>
        </section>

        <Link className="btn ghost warranty-back-link" to="/">Обратно към сайта</Link>
      </main>
    </div>
  );
}
