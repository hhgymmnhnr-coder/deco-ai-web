// Appels directs aux APIs via fetch — pas de SDK, 100% compatible navigateur

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

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

async function groqFetch(model, messages, options = {}) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.3, ...options }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq error ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export async function analyzeRoom({ imageBase64, imageMediaType, style, roomType }) {
  if (!GROQ_KEY) throw new Error("Clé Groq manquante. Vérifie les secrets GitHub.");

  const styleDesc = STYLE_DESCRIPTIONS[style] || style;
  const mediaType = imageMediaType || "image/jpeg";

  // Étape 1 : analyse visuelle
  const visionText = await groqFetch(
    "meta-llama/llama-4-scout-17b-16e-instruct",
    [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
        { type: "text", text: `Describe this ${roomType} in 2 sentences. Then write a detailed Stable Diffusion prompt (50+ words) to redecorate it in ${styleDesc} style. Format:\nDESCRIPTION: ...\nPROMPT: ...` },
      ],
    }]
  );

  const descMatch = visionText.match(/DESCRIPTION:\s*(.+?)(?=PROMPT:|$)/s);
  const promptMatch = visionText.match(/PROMPT:\s*(.+)/s);
  const analysis = descMatch ? descMatch[1].trim() : `${roomType} analysé.`;
  const stylePrompt = promptMatch ? promptMatch[1].trim() : `Beautiful ${styleDesc} interior`;

  // Étape 2 : recommandations JSON
  const jsonText = await groqFetch(
    "llama-3.3-70b-versatile",
    [
      { role: "system", content: "You are an interior design expert. Always respond with valid JSON only, no markdown." },
      { role: "user", content: `Generate 6 furniture/decor items for a ${roomType} in ${styleDesc} style. Return JSON only: {"items":[{"category":"one of: Canapé,Table,Lampe,Tapis,Coussin,Plante,Étagère,Miroir,Tableau,Rideau","name":"French product name","description":"why it fits (French, 1 sentence)","budgetMin":50,"budgetMax":300,"searchKeywords":"2-3 French keywords"}]}` },
    ],
    { response_format: { type: "json_object" } }
  );

  const parsed = JSON.parse(jsonText);
  const items = (parsed.items || []).map((item) => ({
    ...item,
    links: SHOP_LINKS(item.searchKeywords || item.name),
  }));

  return { analysis, stylePrompt, items };
}

export async function generateImage({ stylePrompt }) {
  const prompt = `${stylePrompt}, interior design professional photography, beautiful lighting, high quality, realistic, no people, no text`;
  // Pollinations.ai — gratuit, sans clé, retourne une URL image directement
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=true&seed=${Date.now()}`;
}
