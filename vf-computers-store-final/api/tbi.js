export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      amount,
      product,
      customerName,
      customerEmail,
      customerPhone,
    } = req.body;

    const payload = {
      reseller_code: process.env.TBI_RESELLER_CODE,
      reseller_key: process.env.TBI_RESELLER_KEY,

      amount,
      product,

      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },

      success_url:
        "https://vf-computers-store.vercel.app/#tbi-success",

      fail_url:
        "https://vf-computers-store.vercel.app/#tbi-failed",
    };

    const response = await fetch(
      process.env.TBI_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}