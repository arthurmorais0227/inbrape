import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { analyzeImage } from "../services/api";
import { saveToHistory } from "../services/storage";

const MODES = [
  {
    id: "describe",
    label: "Descrever",
    desc: "Descrição detalhada",
    icon: (
      <svg
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
  {
    id: "extract_text",
    label: "Extrair Texto",
    desc: "OCR — lê o texto da imagem",
    icon: (
      <svg
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    id: "analyze_chart",
    label: "Analisar Gráfico",
    desc: "Interpreta dados visuais",
    icon: (
      <svg
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: "identify",
    label: "Identificar",
    desc: "Objetos e elementos",
    icon: (
      <svg
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
  {
    id: "quality",
    label: "Qualidade",
    desc: "Avalia a imagem tecnicamente",
    icon: (
      <svg
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
  },
  {
    id: "custom",
    label: "Pergunta livre",
    desc: "Faça qualquer pergunta",
    icon: (
      <svg
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export default function ImageAnalyzer({ onNotify }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState("describe");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragover, setDragover] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef();

  function handleFile(f) {
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(f.type)) {
      setError("Apenas imagens JPG, PNG, GIF e WebP.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 20MB.");
      return;
    }
    setFile(f);
    setError("");
    setResult("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }

  function formatSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Selecione uma imagem primeiro.");
      return;
    }
    if (mode === "custom" && !question.trim()) {
      setError('Digite uma pergunta para o modo "Pergunta livre".');
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await analyzeImage(file, mode, question);
      setResult(res);
      onNotify?.("🖼️ Análise da imagem concluída!"); // ← adiciona essa linha
      saveToHistory({ type: "image", text: file.name, mode, result: res });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentMode = MODES.find((m) => m.id === mode);

  return (
    <div>
      <h1 className="page-title">Análise de Imagem</h1>
      <p className="page-subtitle">
        Envie uma imagem e a IA irá analisá-la, extrair texto, interpretar
        gráficos e muito mais.
      </p>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="card-title">Imagem</div>
                <div className="card-desc">JPG, PNG, GIF, WebP — máx. 20MB</div>
              </div>
            </div>

            {!file ? (
              <div
                className={`file-drop ${dragover ? "dragover" : ""}`}
                onClick={() => inputRef.current.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragover(true);
                }}
                onDragLeave={() => setDragover(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragover(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                <div className="file-drop-icon">
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="file-drop-title">Arraste a imagem aqui</div>
                <div className="file-drop-text">
                  ou <span>clique para selecionar</span>
                </div>
                <div className="file-drop-hint">JPG · PNG · GIF · WebP</div>
              </div>
            ) : (
              <div>
                <div className="image-preview-wrapper">
                  <img src={preview} alt="preview" className="image-preview" />
                  <div className="image-preview-overlay">
                    <span className="image-preview-name">
                      {file.name} · {formatSize(file.size)}
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    padding: "8px 14px",
                    width: "auto",
                  }}
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setResult("");
                  }}
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ width: 14, height: 14 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Remover imagem
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <div>
                <div className="card-title">Tipo de análise</div>
                <div className="card-desc">
                  O que a IA deve fazer com a imagem
                </div>
              </div>
            </div>
            <div
              className="modes-grid"
              style={{
                gridTemplateColumns: "1fr 1fr",
                marginBottom: mode === "custom" ? 12 : 0,
              }}
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`mode-card ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id)}
                >
                  <div className="mode-icon">{m.icon}</div>
                  <span className="mode-label">{m.label}</span>
                  <p className="mode-desc">{m.desc}</p>
                </button>
              ))}
            </div>
            {mode === "custom" && (
              <input
                className="question-input"
                placeholder='Ex: "Qual é o produto mostrado?" ou "Descreva os defeitos visíveis"'
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      <button
        className="btn btn-orange"
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="spinner" /> Analisando imagem...
          </>
        ) : (
          <>
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 16, height: 16 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Analisar com IA
          </>
        )}
      </button>

      {result && (
        <>
          <div className="divider" />
          <div className="result-header">
            <div className="result-badge">
              {currentMode?.icon}
              {currentMode?.label}
            </div>
          </div>
          <div className="result-box">
            <div className="result-text">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied ? (
                <>
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ width: 14, height: 14 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ width: 14, height: 14 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copiar
                </>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setResult("");
                setQuestion("");
              }}
            >
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ width: 14, height: 14 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
