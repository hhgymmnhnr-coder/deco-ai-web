// En production Vercel, l'API est sur le même domaine
export const API_BASE_URL = "";

export const STYLES = [
  { id: "scandinave", label: "Scandinave", icon: "❄️", description: "Bois clair, blanc, épuré" },
  { id: "artdeco", label: "Art Déco", icon: "✨", description: "Géométrique, doré, luxueux" },
  { id: "industriel", label: "Industriel", icon: "🔩", description: "Acier, brique, brut" },
  { id: "boheme", label: "Bohème", icon: "🌿", description: "Coloré, plantes, rotin" },
  { id: "minimaliste", label: "Minimaliste", icon: "⬜", description: "Épuré, neutre, essentiel" },
  { id: "japandi", label: "Japandi", icon: "🏯", description: "Wabi-sabi, bois sombre, zen" },
  { id: "contemporain", label: "Contemporain", icon: "🏙️", description: "Moderne, élégant, lignes nettes" },
];

export const ROOM_TYPES = [
  { id: "salon", label: "Salon" },
  { id: "chambre", label: "Chambre" },
  { id: "cuisine", label: "Cuisine" },
  { id: "salle à manger", label: "Salle à manger" },
  { id: "bureau", label: "Bureau" },
  { id: "salle de bain", label: "Salle de bain" },
];

export const CATEGORY_ICONS = {
  Canapé: "🛋️", Table: "🪑", Lampe: "💡", Tapis: "🟫",
  Coussin: "🪆", Plante: "🌱", Étagère: "📚", Miroir: "🪞",
  Tableau: "🖼️", Rideau: "🪟", Autre: "✦",
};
