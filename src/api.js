import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

const STYLE_DESCRIPTIONS = {
  scandinave: "Scandinavian minimalist with light wood, white, soft grey, natural textiles",
  artdeco: "Art Deco with geometric lines, brass gold, velvet, marble",
  industriel: "Urban industrial with raw steel, reclaimed wood, exposed brick",
  boheme: "Bohemian eclectic with warm colors, plants, ethnic textiles, rattan",
  minimaliste: "Pure minimalist with neutral palette, clean lines, zero clutter",
  japandi: "Japandi wabi-sabi with dark wood, earthy neutrals, simple craftsmanship",
  contemporain: "Contemporary elegant with clean lines, mixed materials, sober palette",
};

const SHOP_LINKS = (keywords) => ({
  ikea: `https://www.ikea.com/fr/fr/search/?q=${encodeURIComponent(keywords)}`,
  amazon: `https://www.amazon.fr/s?k=${encodeURIComponent(keywords)}`,
  maisonsduMonde: `https://www.maisonsdumonde.com/FR/fr/search?q=${encodeURIComponent(keywords)}`,
  googleShopping: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(keywords)}`,
});

export async function analyzeRoom({ imageBase64, imageMediaType, style, roomType }) {
  const styleDesc = STYLE_DESCRIPTIONS[style] || style;
  const mediaType = imageMediaType || "image/jpeg";

  // Étape 1 : analyse visuelle
  const visionRes = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: 300,
    temperature: 0.3,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
        { type: "text", text: `Describe this ${roomType} in 2 sentences. Then write a detailed Stable Diffusion prompt (50+ words) to redecorate it in ${styleDesc} style. Format: DESCRIPTION: ... PROMPT: ...` },
      ],
    }],
  });

  const visionText = visionRes.choices[0].message.content.trim();
  const descMatch = visionText.match(/DESCRIPTION:\s*(.+?)(?=PROMPT:|$)/s);
  const promptMatch = visionText.match(/PROMPT:\s*(.+)/s);
  const analysis = descMatch ? descMatch[1].trim() : `${roomType} analysé.`;
  const stylePrompt = promptMatch ? promptMatch[1].trim() : `Beautiful ${styleDesc} interior`;

  // Étape 2 : recommandations JSON
  const jsonRes = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2000,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are an interior design expert. Always respond with valid JSON only." },
      { role: "user", content: `Generate 6 furniture/decor items for a ${roomType} in ${styleDesc} style. Return JSON: {"items":[{"category":"one of: Canapé,Table,Lampe,Tapis,Coussin,Plante,Étagère,Miroir,Tableau,Rideau","name":"French product name","description":"why it fits (French)","budgetMin":50,"budgetMax":300,"searchKeywords":"2-3 French keywords"}]}` },
    ],
  });

  const parsed = JSON.parse(jsonRes.choices[0].message.content.trim());
  const items = (parsed.items || []).map((item) => ({
    ...item,
    links: SHOP_LINKS(item.searchKeywords || item.name),
  }));

  return { analysis, stylePrompt, items };
}

export async function generateImage({ stylePrompt }) {
  const fullPrompt = `${stylePrompt}, interior design professional photography, beautiful lighting, high quality, realistic, no people, no text`;

  // Pollinations.ai — gratuit, sans clé API, retourne directement une URL image
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=768&height=512&nologo=true&seed=${Date.now()}`;

  // On vérifie que l'image est accessible
  const res = await fetch(url);
  if (!res.ok) throw new Error("Impossible de générer l'image");

  return url;
}
