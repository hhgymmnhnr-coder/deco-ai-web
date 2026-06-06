const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

// Modèles HF à essayer dans l'ordre
const HF_MODELS = [
  "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1",
  "https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4",
];

async function groqFetch(model, messages, options = {}) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.3, ...options }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq error ${res.status}`);
  }
  return (await res.json()).choices[0].message.content.trim();
}

async function hfGenerate(modelUrl, prompt) {
  const call = () =>
    fetch(modelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
        "x-use-cache": "false",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

  let res = await call();

  // Modèle en cours de démarrage → attendre et réessayer
  if (res.status === 503) {
    const json = await res.json().catch(() => ({}));
    const wait = Math.min((json.estimated_time || 25) * 1000, 45000);
    await new Promise((r) => setTimeout(r, wait));
    res = await call();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HF ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.startsWith("image/")) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pas une image: ${ct} — ${text.slice(0, 100)}`);
  }

  const blob = await res.blob();
  if (blob.size < 500) throw new Error(`Réponse trop petite (${blob.size} bytes)`);

  // Convertir en data URL — auto-contenu, jamais de problème d'affichage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("FileReader échoué"));
    reader.readAsDataURL(blob);
  });
}

export async function analyzeRoom({ imageBase64, imageMediaType, roomType, userRequest }) {
  if (!GROQ_KEY) throw new Error("Clé Groq manquante. Vérifie les secrets GitHub.");

  const mediaType = imageMediaType || "image/jpeg";

  const visionText = await groqFetch(
    "meta-llama/llama-4-scout-17b-16e-instruct",
    [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
        {
          type: "text",
          text: `Describe this ${roomType} briefly. Then write a Stable Diffusion image generation prompt (max 150 words) for this ${roomType} including: "${userRequest}". Format:\nDESCRIPTION: ...\nPROMPT: ...`,
        },
      ],
    }]
  );

  const descMatch = visionText.match(/DESCRIPTION:\s*(.+?)(?=PROMPT:|$)/s);
  const promptMatch = visionText.match(/PROMPT:\s*(.+)/s);
  const analysis = descMatch ? descMatch[1].trim() : `${roomType} analysé.`;
  const imagePrompt = promptMatch
    ? promptMatch[1].trim()
    : `${roomType} interior with ${userRequest}, professional photography`;

  const jsonText = await groqFetch(
    "llama-3.3-70b-versatile",
    [
      { role: "system", content: "Interior design expert. Valid JSON only, no markdown." },
      {
        role: "user",
        content: `Client has a ${roomType} and wants: "${userRequest}". Generate 6 items to buy. JSON: {"items":[{"category":"Canapé|Table|Lampe|Tapis|Coussin|Plante|Étagère|Miroir|Tableau|Rideau","name":"French name","description":"French 1 sentence","budgetMin":50,"budgetMax":300,"searchKeywords":"2-3 French keywords"}]}`,
      },
    ],
    { response_format: { type: "json_object" } }
  );

  const parsed = JSON.parse(jsonText);
  const LINKS = (kw) => ({
    ikea: `https://www.ikea.com/fr/fr/search/?q=${encodeURIComponent(kw)}`,
    amazon: `https://www.amazon.fr/s?k=${encodeURIComponent(kw)}`,
    maisonsduMonde: `https://www.maisonsdumonde.com/FR/fr/search?q=${encodeURIComponent(kw)}`,
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(kw)}`,
  });
  const items = (parsed.items || []).map((i) => ({ ...i, links: LINKS(i.searchKeywords || i.name) }));

  return { analysis, imagePrompt, items };
}

export async function generateImage({ imagePrompt }) {
  const prompt = `${imagePrompt}, interior design professional photography, beautiful lighting, high quality, realistic, 8k, no people, no text`.slice(0, 500);

  if (!HF_TOKEN) {
    throw new Error("Token HuggingFace manquant. Vérifie le secret VITE_HF_TOKEN dans GitHub.");
  }

  let lastError;
  for (const modelUrl of HF_MODELS) {
    try {
      const blobUrl = await hfGenerate(modelUrl, prompt);
      return blobUrl;
    } catch (e) {
      lastError = e;
      console.warn(`Modèle ${modelUrl} échoué:`, e.message);
    }
  }

  throw new Error(`Génération impossible — ${lastError?.message || "tous les modèles ont échoué"}. Réessaie dans 30 secondes.`);
}
