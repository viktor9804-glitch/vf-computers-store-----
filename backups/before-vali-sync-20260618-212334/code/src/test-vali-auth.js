import "dotenv/config";

const token = process.env.VALI_API_TOKEN;
const base = process.env.VALI_API_BASE;

const variants = [
  {
    name: "Authorization Bearer",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  },
  {
    name: "Authorization raw",
    headers: {
      Authorization: token,
      Accept: "application/json"
    }
  },
  {
    name: "X-API-KEY",
    headers: {
      "X-API-KEY": token,
      Accept: "application/json"
    }
  },
  {
    name: "X-Api-Key",
    headers: {
      "X-Api-Key": token,
      Accept: "application/json"
    }
  },
  {
    name: "api_token query",
    query: `?api_token=${token}`
  },
  {
    name: "token query",
    query: `?token=${token}`
  }
];

for (const variant of variants) {
  try {
    let url = `${base}/products?per_page=1&page=1`;

    if (variant.query) {
      url = `${base}/products${variant.query}&per_page=1&page=1`;
    }

    const res = await fetch(url, {
      headers: variant.headers || {
        Accept: "application/json"
      }
    });

    const text = await res.text();

    console.log("\n---", variant.name, "---");
    console.log("Status:", res.status);
    console.log(text.slice(0, 500));
  } catch (err) {
    console.log(variant.name, err.message);
  }
}