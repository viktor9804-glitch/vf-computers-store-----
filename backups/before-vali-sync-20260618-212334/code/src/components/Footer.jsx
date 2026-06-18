import React, { useCallback, useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { supabase } from "../lib/supabase";

const fallbackShippingSettings = {
  supplier: "Еконт",
  free_shipping_over: 250,
  min_shipping_price: 8,
  max_shipping_price: 20,
  default_shipping_price: 8,
};

export default function Footer({ storeInfo }) {
  const [shippingSettings, setShippingSettings] = useState(null);

  const reloadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("STORE SETTINGS LOAD ERROR", error);
      setShippingSettings(null);
      return;
    }

    setShippingSettings(data);
  }, []);

  useEffect(() => {
    reloadSettings();

    const channel = supabase
      .channel("store-settings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "store_settings",
        },
        reloadSettings
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reloadSettings]);

  const supplier = shippingSettings?.supplier || fallbackShippingSettings.supplier;
  const freeShipping = shippingSettings?.free_shipping_over || fallbackShippingSettings.free_shipping_over;
  const minPrice = shippingSettings?.min_shipping_price || fallbackShippingSettings.min_shipping_price;
  const maxPrice = shippingSettings?.max_shipping_price || fallbackShippingSettings.max_shipping_price;

  return (
    <footer id="contact" className="footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-logo">ВФ <span>Компютри</span></div>
          <p>Онлайн магазин за компютри, компоненти, лаптопи и сервизни услуги.</p>
          <div className="social-row">
            <span>Gaming</span>
            <span>Repair</span>
            <span>Hardware</span>
          </div>
        </div>
        <div className="contact-list">
          <a href={`tel:${storeInfo.rawPhone}`}><Phone /> {storeInfo.phone}</a>
          <a href={`mailto:${storeInfo.email}`}><Mail /> {storeInfo.email}</a>
          <p><MapPin /> {storeInfo.address}</p>
        </div>
        <div className="footer-box">
          <b>Плащане и доставка</b>
          <p>
            Наложен платеж, банков превод и плащане на място. {supplier}: Безплатна доставка над {freeShipping} €, иначе от {minPrice} € до {maxPrice} €
          </p>
        </div>
      </div>
    </footer>
  );
}
