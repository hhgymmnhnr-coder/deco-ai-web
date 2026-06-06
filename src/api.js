const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

async function groqFetch(model, messages, options = {}) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
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

export async function analyzeRoom({ imageBase64, imageMediaType, roomType, userRequest }) {
  if (!GROQ_KEY) throw new Error("Clé Groq manquante. Vérifie les secrets GitHub.");

  const mediaType = imageMediaType || "image/jpeg";

  // Étape 1 : description visuelle de la pièce
  const visionText = await groqFetch(
    "meta-llama/llama-4-scout-17b-16e-instruct",
    [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
        {
          type: "text",
          text: `Describe this ${roomType} in 2 sentences focusing on style, colors and furniture. Then write a Stable Diffusion prompt (50+ words) showing this same ${roomType} but with the following addition/change: "${userRequest}". Keep the original room style and layout. Format:\nDESCRIPTION: ...\nPROMPT: ...`,
        },
      ],
    }]
  );

  const descMatch = visionText.match(/DESCRIPTION:\s*(.+?)(?=PROMPT:|$)/s);
  const promptMatch = visionText.match(/PROMPT:\s*(.+)/s);
  const analysis = descMatch ? descMatch[1].trim() : `${roomType} analysé.`;
  const stylePrompt = promptMatch ? promptMatch[1].trim() : `${roomType} with ${userRequest}`;

  // Étape 2 : liste d'achats JSON basée sur la demande utilisateur
  const jsonText = await groqFetch(
    "llama-3.3-70b-versatile",
    [
      { role: "system", content: "You are an interior design expert. Always respond with valid JSON only, no markdown." },
      {
        role: "user",
        content: `A client has a ${roomType} and wants to add/change: "${userRequest}". Generate 6 relevant furniture or decor items to buy. Return JSON only: {"items":[{"category":"one of: Canapé,Table,Lampe,Tapis,Coussin,Plante,Étagère,Miroir,Tableau,Rideau","name":"French product name","description":"why it fits this request (French, 1 sentence)","budgetMin":50,"budgetMax":300,"searchKeywords":"2-3 French keywords"}]}`,
      },
    ],
    { response_format: { type: "json_object" } }
  );

  const parsed = JSON.parse(jsonText);
  const SHOP_LINKS = (kw) => ({
    ikea: `https://www.ikea.com/fr/fr/search/?q=${encodeURIComponent(kw)}`,
    amazon: `https://www.amazon.fr/s?k=${encodeURIComponent(kw)}`,
    maisonsduMonde: `https://www.maisonsdumonde.com/FR/fr/search?q=${encodeURIComponent(kw)}`,
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(kw)}`,
  });
  const items = (parsed.items || []).map((item) => ({
    ...item,
    links: SHOP_LINKS(item.searchKeywords || item.name),
  }));

  return { analysis, stylePrompt, items };
}

export async function generateImage({ stylePrompt }) {
  const prompt = `${stylePrompt}, interior design professional photography, beautiful lighting, high quality, realistic, no people, no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=true&nofeed=true&seed=${Date.now()}`;
}
