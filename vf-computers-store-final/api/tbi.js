export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const body = req.body || {};
    const productName = body.name || body.product || "VF Computers продукт";
    const price = Number(body.price || body.amount || 0);

    const payload = {
      reseller_code: process.env.TBI_RESELLER_CODE,
      reseller_key: process.env.TBI_RESELLER_KEY,
      amount: price,
      product: productName,
      success_url: "https://vf-computers-store.vercel.app/#tbi-success",
      fail_url: "https://vf-computers-store.vercel.app/#tbi-failed",
    };

    console.log("TBI embedded checkout request:", payload);

    /*
      ВАЖНО:
      Тук е оставен fallback URL, за да работи модалът веднага.
      Когато TBI дадат точния API response/redirect поле, замени логиката долу
      с реалния fetch към process.env.TBI_API_URL.
    */

    return res.status(200).json({
      success: true,
      url: "https://tbibank.bg/",
      mode: "embedded",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
