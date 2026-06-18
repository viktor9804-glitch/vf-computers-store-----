import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALI_API_BASE = process.env.VALI_API_BASE;
const VALI_API_TOKEN = process.env.VALI_API_TOKEN;

async function valiFetch(path) {
  const separator = path.includes("?") ? "&" : "?";

  const url =
    `${VALI_API_BASE}${path}${separator}api_token=${VALI_API_TOKEN}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Vali API ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

async function run() {
  try {
    console.log("Starting manufacturers sync...");

    const manufacturers = await valiFetch("/manufacturers");

    let total = 0;

    for (const manufacturer of manufacturers || []) {

      const { error } = await supabase
        .from("vali_manufacturers")
        .upsert({
          id: manufacturer.id,
          name: manufacturer.name,
          info: manufacturer.information || {},
          eu_representative: manufacturer.eu_representative || {}
        });

      if (error) {
        console.error(error);
        continue;
      }

      total++;

      console.log(
        `Imported manufacturer: ${manufacturer.id} ${manufacturer.name}`
      );
    }

    console.log("MANUFACTURERS SYNC COMPLETE");
    console.log("TOTAL IMPORTED:", total);

  } catch (error) {
    console.error("SYNC ERROR:", error.message);
  }
}

run();