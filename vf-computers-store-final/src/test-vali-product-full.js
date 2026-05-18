import "dotenv/config";

const base = process.env.VALI_API_BASE;
const token = process.env.VALI_API_TOKEN;
const id = 8455;

const urls = [
  `/products/${id}`,
  `/products/${id}/full`,
  `/products/full/${id}`,
  `/product/${id}`,
  `/product/${id}/full`,
  `/products?id=${id}`,
  `/products/${id}?include=full`,
  `/products/${id}?type=full`
];

for (const path of urls) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${base}${path}${sep}api_token=${token}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  const text = await res.text();

  console.log("\n---", path, "---");
  console.log("Status:", res.status);
  console.log(text.slice(0, 300));
}