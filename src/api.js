const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;
const HF_MODEL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

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

async function hfTextToImage(prompt) {
  const makeReq = () =>
    fetch(HF_MODEL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
        "x-use-cache": "false",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

  let res = await makeReq();

  // Modèle en cours de chargement → attendre et réessayer
  if (res.status === 503) {
    const json = await res.json().catch(() => ({}));
    const wait = Math.min((json.estimated_time || 20) * 1000, 30000);
    await new Promise((r) => setTimeout(r, wait));
    res = await makeReq();
  }

  if (!res.ok) throw new Error(`HF error ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error("HF n'a pas retourné une image");

  const blob = await res.blob();
  return URL.createObjectURL(blob);
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
          text: `Describe this ${roomType} briefly. Then write a Stable Diffusion image prompt (max 200 words) showing this ${roomType} with: "${userRequest}". Be very specific about colors, furniture, lighting. Format:\nDESCRIPTION: ...\nPROMPT: ...`,
        },
      ],
    }]
  );

  const descMatch = visionText.match(/DESCRIPTION:\s*(.+?)(?=PROMPT:|$)/s);
  const promptMatch = visionText.match(/PROMPT:\s*(.+)/s);
  const analysis = descMatch ? descMatch[1].trim() : `${roomType} analysé.`;
  const imagePrompt = promptMatch
    ? promptMatch[1].trim()
    : `${roomType} with ${userRequest}, interior design, professional photography`;

  const jsonText = await groqFetch(
    "llama-3.3-70b-versatile",
    [
      { role: "system", content: "You are an interior design expert. Always respond with valid JSON only, no markdown." },
      {
        role: "user",
        content: `A client has a ${roomType} and wants: "${userRequest}". Generate 6 relevant items to buy. Return JSON only: {"items":[{"category":"one of: Canapé,Table,Lampe,Tapis,Coussin,Plante,Étagère,Miroir,Tableau,Rideau","name":"French product name","description":"why it fits (French, 1 sentence)","budgetMin":50,"budgetMax":300,"searchKeywords":"2-3 French keywords"}]}`,
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

  return { analysis, imagePrompt, items };
}

export async function generateImage({ imagePrompt }) {
  const prompt = `${imagePrompt}, interior design professional photography, beautiful lighting, high quality, 8k, realistic, no people, no text`;

  // 1. HuggingFace (token requis, retourne une vraie image)
  if (HF_TOKEN) {
    try {
      return await hfTextToImage(prompt.slice(0, 500));
    } catch (e) {
      console.warn("HF échoué, fallback Pollinations:", e.message);
    }
  }

  // 2. Pollinations (gratuit, 1 req/IP à la fois)
  const safePrompt = prompt.slice(0, 400);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=768&height=512&nologo=true&seed=${Date.now()}`;
}
