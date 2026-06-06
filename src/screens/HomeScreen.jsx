import s from "./HomeScreen.module.css";

const STEPS = ["📷 Photo", "🏠 Type de pièce", "💬 Décris ta vision", "✨ Génère"];

export default function HomeScreen({ onStart }) {
  return (
    <div className={s.container}>
      <div className={s.circle1} />
      <div className={s.circle2} />

      <div className={s.content}>
        <div className={s.badge}>✦&nbsp;&nbsp;Propulsé par IA</div>

        <h1 className={s.title}>Réinvente<br />ton intérieur</h1>
        <p className={s.subtitle}>
          Prends une photo de ta pièce, décris ce que tu veux ajouter, et l'IA transforme ton espace
          avec une liste d'achats personnalisée.
        </p>

        <div className={s.chips}>
          {STEPS.map((s2) => (
            <span key={s2} className={s.chip}>{s2}</span>
          ))}
        </div>

        <button className={s.cta} onClick={onStart}>
          Commencer →
        </button>

        <p className={s.disclaimer}>Gratuit · Aucune inscription requise</p>
      </div>
    </div>
  );
}
