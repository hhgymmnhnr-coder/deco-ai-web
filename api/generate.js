const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HF_TOKEN);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { stylePrompt } = req.body;
  if (!stylePrompt) return res.status(400).json({ error: "stylePrompt est requis" });

  const fullPrompt = `${stylePrompt}. Interior design professional photography, beautiful lighting, high quality, realistic, no people, no text.`;

  try {
    const blob = await hf.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: fullPrompt,
      parameters: { num_inference_steps: 4, guidance_scale: 0 },
    });

    if (!blob || blob.size === 0) throw new Error("Image vide");

    const arrayBuffer = await blob.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    res.json({ imageUrl: `data:image/jpeg;base64,${base64Image}` });
  } catch (err) {
    console.error("[generate]", err.message);
    if (err.message.includes("503") || err.message.includes("loading"))
      return res.status(503).json({ error: "Modèle en chargement, réessaie dans 30 secondes." });
    res.status(500).json({ error: "Erreur génération : " + err.message });
  }
};
