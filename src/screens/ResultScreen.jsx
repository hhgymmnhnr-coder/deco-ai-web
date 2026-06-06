import { useState } from "react";
import { CATEGORY_ICONS } from "../config";
import s from "./ResultScreen.module.css";

export default function ResultScreen({ data, onBack, onHome }) {
  const { originalPhoto, generatedImageUrl, analysis, items = [], roomType, userRequest } = data;
  const [showOriginal, setShowOriginal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const totalMin = items.reduce((a, i) => a + (i.budgetMin || 0), 0);
  const totalMax = items.reduce((a, i) => a + (i.budgetMax || 0), 0);

  return (
    <div className={s.container}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={onBack}>← Modifier</button>
        <button className={s.homeBtn} onClick={onHome}>🏠</button>
      </div>

      <div className={s.scroll}>
        <div className={s.styleBadge}>
          <span>🏠</span>
          <span>{roomType} · {userRequest}</span>
        </div>

        {/* Image avant/après */}
        <p className={s.sectionLabel}>Transformation</p>
        <div className={s.imageCard}>
          {imgError && !showOriginal ? (
            <div className={s.imgErrorBox}>
              <p>⚠️ Génération échouée</p>
              <button onClick={() => { setImgError(false); setImgLoaded(false); }} style={{ marginTop: 8, fontSize: 13 }}>Réessayer</button>
            </div>
          ) : (
            <>
              {!imgLoaded && !showOriginal && (
                <div className={s.imgErrorBox}><p>🎨 Génération en cours…</p></div>
              )}
              <img
                src={showOriginal ? originalPhoto : generatedImageUrl}
                className={s.mainImage}
                alt="résultat"
                style={{ display: (imgLoaded || showOriginal) ? "block" : "none" }}
                onLoad={() => { setImgLoaded(true); setImgError(false); }}
                onError={() => setImgError(true)}
              />
            </>
          )}
          <div className={s.toggleRow}>
            <button
              className={`${s.toggleBtn} ${!showOriginal ? s.toggleBtnActive : ""}`}
              onClick={() => setShowOriginal(false)}
            >✨ Après</button>
            <button
              className={`${s.toggleBtn} ${showOriginal ? s.toggleBtnActive : ""}`}
              onClick={() => setShowOriginal(true)}
            >📷 Avant</button>
          </div>
        </div>

        {/* Analyse */}
        {analysis && (
          <div className={s.analysisCard}>
            <p className={s.analysisLabel}>Analyse de ta pièce</p>
            <p className={s.analysisText}>{analysis}</p>
          </div>
        )}

        {/* Budget */}
        <div className={s.budgetCard}>
          <div>
            <p className={s.budgetLabel}>Budget estimé</p>
            <p className={s.budgetSub}>pour toute la liste</p>
          </div>
          <p className={s.budgetAmount}>{totalMin}€ – {totalMax}€</p>
        </div>

        {/* Liste */}
        <p className={s.sectionLabel}>Liste d'achats ({items.length} articles)</p>
        {items.map((item, i) => <ItemCard key={i} item={item} />)}

        <button className={s.newBtn} onClick={onBack}>✦ Nouvelle transformation</button>
      </div>
    </div>
  );
}

function ItemCard({ item }) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICONS[item.category] ?? "✦";

  const shops = [
    { key: "ikea", label: "IKEA", color: "#0058A3" },
    { key: "amazon", label: "Amazon", color: "#FF9900" },
    { key: "maisonsduMonde", label: "MDM", color: "#8B5E3C" },
    { key: "googleShopping", label: "Google", color: "#4285F4" },
  ];

  return (
    <div className={s.itemCard} onClick={() => setOpen(!open)}>
      <div className={s.itemHeader}>
        <div className={s.itemIconWrap}>{icon}</div>
        <div className={s.itemInfo}>
          <p className={s.itemCategory}>{item.category}</p>
          <p className={s.itemName}>{item.name}</p>
        </div>
        <div className={s.itemRight}>
          <p className={s.itemPrice}>{item.budgetMin}–{item.budgetMax}€</p>
          <p className={s.expand}>{open ? "▲" : "▼"}</p>
        </div>
      </div>

      {open && (
        <div className={s.itemExpanded}>
          <p className={s.itemDesc}>{item.description}</p>
          <div className={s.linksRow}>
            {shops.map((shop) =>
              item.links?.[shop.key] ? (
                <a
                  key={shop.key}
                  href={item.links[shop.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.shopLink}
                  style={{ borderColor: shop.color + "55", color: shop.color }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {shop.label} →
                </a>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
