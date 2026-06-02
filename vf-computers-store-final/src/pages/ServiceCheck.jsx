import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, PackageSearch, Search, ShieldCheck, Wrench, X } from "lucide-react";
import { supabase } from "../supabaseClient";

const STATUS_LABELS = {
  accepted: "Приет",
  diagnostics: "Диагностика",
  in_progress: "Ремонтът е започнат",
  waiting_part: "Чака част",
  ready: "Готов за вземане",
  delivered: "Предаден",
  cancelled: "Отказан",
};

const STATUS_ICONS = {
  accepted: Clock,
  diagnostics: Search,
  in_progress: Wrench,
  waiting_part: PackageSearch,
  ready: CheckCircle2,
  delivered: CheckCircle2,
  cancelled: X,
};

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value, currency = "EUR") {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value} ${currency}`;
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function ServiceCheck({ HeaderComponent, headerProps = {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = normalizeCode(searchParams.get("code"));
  const [code, setCode] = useState(initialCode);
  const [protocol, setProtocol] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const status = protocol?.status || "accepted";
  const StatusIcon = useMemo(() => STATUS_ICONS[status] || ShieldCheck, [status]);

  async function checkService(nextCode = code) {
    const normalizedCode = normalizeCode(nextCode);
    setProtocol(null);
    setMessage("");

    if (!normalizedCode) {
      setMessage("Въведете сервизен код.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("service_protocol_public")
      .select("*")
      .eq("public_code", normalizedCode)
      .maybeSingle();
    setLoading(false);

    if (error) {
      setMessage("Възникна грешка при проверката. Опитайте отново.");
      return;
    }

    if (!data) {
      setMessage("Няма намерен сервизен протокол с този код.");
      return;
    }

    setSearchParams({ code: normalizedCode });
    setProtocol(data);
  }

  useEffect(() => {
    if (initialCode) checkService(initialCode);
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    checkService();
  }

  return (
    <div className="site warranty-check-page service-check-page">
      <div className="rgb-bg" />
      <div className="scanline" />
      {HeaderComponent && <HeaderComponent {...headerProps} />}

      <main className="container warranty-check-shell">
        <section className="warranty-check-hero">
          <p className="section-label">VF Computers</p>
          <h1>Проверка на сервизен протокол</h1>
          <p>
            Въведете индивидуалния код от сервизния протокол, за да видите текущия статус,
            извършените дейности и сумата за плащане.
          </p>
        </section>

        <section className="warranty-check-layout">
          <form className="warranty-check-form" onSubmit={handleSubmit}>
            <label htmlFor="service-code">Сервизен код</label>
            <div className="warranty-code-input">
              <Search size={18} />
              <input
                id="service-code"
                placeholder="VF-SVC-2026-K7F9Q2M4"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <button disabled={loading} type="submit">
              {loading ? "Проверка..." : "Провери"}
            </button>
          </form>

          <article className={`warranty-result-card service-result-card ${protocol ? status : "empty"}`}>
            {!protocol && !message && (
              <>
                <ShieldCheck />
                <h2>Очаква се код</h2>
                <p>Кодът е отпечатан върху сервизния протокол и не е пореден номер.</p>
              </>
            )}

            {message && !protocol && (
              <>
                <X />
                <h2>{message}</h2>
              </>
            )}

            {protocol && (
              <>
                <StatusIcon />
                <h2>{STATUS_LABELS[status] || status}</h2>
                <dl>
                  <div><dt>Сервизен код:</dt><dd>{protocol.public_code}</dd></div>
                  <div><dt>Устройство:</dt><dd>{[protocol.device_type, protocol.brand, protocol.model].filter(Boolean).join(" ") || "-"}</dd></div>
                  <div><dt>Сериен номер:</dt><dd>{protocol.serial_number || "-"}</dd></div>
                  <div><dt>Приет на:</dt><dd>{formatDateTime(protocol.accepted_at)}</dd></div>
                  <div><dt>Последна промяна:</dt><dd>{formatDateTime(protocol.updated_at)}</dd></div>
                  <div><dt>Статус:</dt><dd>{STATUS_LABELS[status] || status}</dd></div>
                  <div><dt>Какво е правено:</dt><dd>{protocol.public_work_summary || "-"}</dd></div>
                  <div><dt>Цена:</dt><dd>{formatMoney(protocol.public_total_price, protocol.currency || "EUR")}</dd></div>
                </dl>
              </>
            )}
          </article>
        </section>

        <Link className="btn ghost warranty-back-link" to="/">Обратно към сайта</Link>
      </main>
    </div>
  );
}
