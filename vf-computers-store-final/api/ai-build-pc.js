import { buildPcOffer } from "./_aiBuildPcCore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      budget,
      useCase = "",
      games = [],
      rgbPreference = false,
      cpuPreference = "",
      history = [],
    } = req.body || {};

    const offer = await buildPcOffer({
      budget,
      useCase,
      games: Array.isArray(games) ? games : [games].filter(Boolean),
      rgbPreference,
      cpuPreference,
      history,
    });

    return res.status(200).json(offer);
  } catch (error) {
    console.error("[AI build PC] Failed to build configuration.", error);
    return res.status(500).json({
      error: "Не успях да създам конфигурация от наличните продукти.",
    });
  }
}
