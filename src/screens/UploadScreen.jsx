import { useState, useRef } from "react";
import { ROOM_TYPES } from "../config";
import { analyzeRoom, generateImage } from "../api";
import s from "./UploadScreen.module.css";

export default function UploadScreen({ onBack, onResult }) {
  const [photo, setPhoto] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userRequest, setUserRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPhoto({ uri: dataUrl, base64: dataUrl.split(",")[1], mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const canSubmit = photo && selectedRoom && userRequest.trim().length > 3;

  const handleGenerate = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");

    try {
      setLoadingStep("🔍 Analyse de ta pièce…");
      const { analysis, imagePrompt, items } = await analyzeRoom({
        imageBase64: photo.base64,
        imageMediaType: photo.mimeType || "image/jpeg",
        roomType: selectedRoom,
        userRequest: userRequest.trim(),
      });

      setLoadingStep("🎨 Génération de l'image (30–60 sec)…");
      const generatedImageUrl = await generateImage({ imagePrompt });

      onResult({
        originalPhoto: photo.uri,
        generatedImageUrl,
        analysis,
        items,
        roomType: selectedRoom,
        userRequest: userRequest.trim(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={onBack}>← Retour</button>
        <h1 className={s.headerTitle}>Nouvelle création</h1>
      </div>

      <div className={s.scroll}>
        <SectionTitle n="1" title="Photo de ta pièce" />
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        {photo ? (
          <div className={s.photoPreviewWrap}>
            <img src={photo.uri} className={s.photoPreview} alt="pièce" />
            <button className={s.changePhoto} onClick={() => setPhoto(null)}>Changer la photo</button>
          </div>
        ) : (
          <div className={s.photoActions}>
            <button className={s.photoBtn} onClick={() => inputRef.current.click()}>
              <span className={s.photoBtnIcon}>📷</span>
              <span>Prendre / choisir une photo</span>
            </button>
          </div>
        )}

        <SectionTitle n="2" title="Type de pièce" />
        <div className={s.chips}>
          {ROOM_TYPES.map((r) => (
            <button
              key={r.id}
              className={`${s.chip} ${selectedRoom === r.id ? s.chipSelected : ""}`}
              onClick={() => setSelectedRoom(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <SectionTitle n="3" title="Qu'est-ce que tu veux ajouter ?" />
        <textarea
          className={s.requestInput}
          placeholder="Ex : un canapé rouge moderne, des plantes, une lampe dorée…"
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          rows={4}
        />

        {error && <div className={s.error}>{error}</div>}

        <button
          className={`${s.generateBtn} ${!canSubmit ? s.generateBtnDisabled : ""}`}
          onClick={handleGenerate}
          disabled={!canSubmit || loading}
        >
          {loading
            ? <><span className={s.btnSpinner} /> {loadingStep}</>
            : canSubmit
            ? "✨  Générer la transformation"
            : "Complète les 3 étapes ci-dessus"}
        </button>

        {loading && <p className={s.loadingHint}>L'analyse et la génération peuvent prendre 30 à 90 secondes…</p>}
      </div>
    </div>
  );
}

function SectionTitle({ n, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 12px" }}>
      <span style={{
        width: 26, height: 26, borderRadius: "50%",
        background: "var(--primary)", color: "#0F0F0F",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>{n}</span>
      <span style={{ color: "var(--text)", fontSize: 17, fontWeight: 600 }}>{title}</span>
    </div>
  );
}
