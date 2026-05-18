import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {

    console.log("Starting parameter extraction...");

    const { data: products, error } = await supabase
      .from("vali_products")
      .select("id, raw");

    if (error) throw error;

    let totalParameters = 0;
    let totalOptions = 0;

    for (const product of products || []) {

      const parameters = product.raw?.parameters || [];

      for (const parameter of parameters) {

        const { error: paramError } = await supabase
          .from("vali_parameters")
          .upsert({
            id: parameter.parameter_id,
            name_bg:
              parameter.parameter_name?.find(x => x.language_code === "bg")?.text || "",
            name_en:
              parameter.parameter_name?.find(x => x.language_code === "en")?.text || "",
            raw: parameter
          });

        if (paramError) {
          console.error(paramError);
          continue;
        }

        totalParameters++;

        if (parameter.option_id) {

          const { error: optionError } = await supabase
            .from("vali_parameter_options")
            .upsert({
              id: parameter.option_id,
              parameter_id: parameter.parameter_id,
              name_bg:
                parameter.option_name?.find(x => x.language_code === "bg")?.text || "",
              name_en:
                parameter.option_name?.find(x => x.language_code === "en")?.text || "",
              raw: parameter
            });

          if (!optionError) {
            totalOptions++;
          }
        }
      }
    }

    console.log("PARAMETERS EXTRACTION COMPLETE");
    console.log("TOTAL PARAMETERS:", totalParameters);
    console.log("TOTAL OPTIONS:", totalOptions);

  } catch (error) {
    console.error("SYNC ERROR:", error.message);
  }
}

run();