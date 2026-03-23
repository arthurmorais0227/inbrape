import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { analyzeDocument } from "../services/api";
import { saveToHistory } from "../services/storage";

const I = ({ d }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const QUICK_PROMPTS = [
  "Faça um resumo executivo destacando os pontos mais importantes.",
  "Liste os 5 pontos principais de forma clara e objetiva.",
  "Quais são os principais insights e tendências presentes?",
  "Gere 5 perguntas relevantes sobre este documento e responda cada uma.",
  "Com base neste documento, crie um plano de ação com etapas práticas.",
  "Faça uma análise crítica identificando pontos fortes e fracos.",
  "Identifique todos os dados numéricos e métricas relevantes.",
  "Extraia todas as datas, prazos e compromissos mencionados.",
];

export default function DocumentAnalyzer({ onNotify }) {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragover, setDragover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const inputRef = useRef();

  function handleFile(f) {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["pdf", "txt", "md", "csv"].includes(ext)) {
      setError("Apenas PDF, TXT, MD e CSV são aceitos.");
      return;
    }
    setFile(f);
    setError("");
    setResult("");
    if (ext !== "pdf") {
      const reader = new FileReader();
      reader.onload = (e) => setFileContent(e.target.result);
      reader.readAsText(f, "utf-8");
    } else {
      setFileContent("");
    }
  }

  function formatSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Selecione um arquivo primeiro.");
      return;
    }
    if (!question.trim()) {
      setError("Digite uma pergunta ou instrução.");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await analyzeDocument(file, question);
      setResult(res);
      onNotify?.("📄 Análise do documento concluída!"); // ← adiciona essa linha
      saveToHistory({
        type: "document",
        text: file.name + " — " + question.slice(0, 60),
        mode: "document",
        result: res,
      });
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <div className="page-title-icon">
            <I d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </div>
          Análise de Documentos
        </h1>
        <p className="page-subtitle">
          Anexe um PDF ou TXT e faça perguntas específicas com campo de texto
          livre.
        </p>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon">
                <I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </div>
              <div>
                <div className="card-title">Arquivo</div>
                <div className="card-desc">PDF, TXT, MD ou CSV — máx. 10MB</div>
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
                  <I d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </div>
                <div className="file-drop-title">Arraste o arquivo aqui</div>
                <div className="file-drop-text">
                  ou <span>clique para selecionar</span>
                </div>
                <div className="file-drop-hint">PDF · TXT · MD · CSV</div>
              </div>
            ) : (
              <div>
                <div className="file-selected">
                  <div className="file-selected-icon">
                    <I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </div>
                  <div className="file-selected-info">
                    <div className="file-selected-name">{file.name}</div>
                    <div className="file-selected-size">
                      {formatSize(file.size)} ·{" "}
                      {file.name.split(".").pop().toUpperCase()}
                    </div>
                  </div>
                  <button
                    className="file-remove"
                    onClick={() => {
                      setFile(null);
                      setResult("");
                      setFileContent("");
                    }}
                  >
                    <I d="M6 18L18 6M6 6l12 12" />
                  </button>
                </div>
                {fileContent && (
                  <div
                    style={{
                      marginTop: 10,
                      background: "var(--gray-50)",
                      border: "1px solid var(--gray-200)",
                      borderRadius: "var(--radius)",
                      padding: "10px 12px",
                      maxHeight: 140,
                      overflow: "auto",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--gray-400)",
                        marginBottom: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Prévia do conteúdo
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--gray-600)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {fileContent.slice(0, 500)}
                      {fileContent.length > 500 ? "..." : ""}
                    </p>
                  </div>
                )}
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon">
                <I d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </div>
              <div>
                <div className="card-title">Pergunta ou instrução</div>
                <div className="card-desc">
                  Diga à IA o que analisar neste documento
                </div>
              </div>
            </div>

            <label className="label">
              <I d="M13 10V3L4 14h7v7l9-11h-7z" />
              Atalhos rápidos
            </label>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  className="quick-prompt-btn"
                  onClick={() => setQuestion(p)}
                >
                  {p.slice(0, 32)}…
                </button>
              ))}
            </div>

            <label className="label">
              <I d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              Sua pergunta
            </label>
            <textarea
              className="textarea"
              style={{ minHeight: 110 }}
              placeholder="Ex: Quais são os valores totais desta cotação? Quem é o fornecedor? Quais são os prazos?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="char-count">{question.length} caracteres</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <I d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            <div className="spinner" />
            Analisando documento...
          </>
        ) : (
          <>
            <I d="M13 10V3L4 14h7v7l9-11h-7z" />
            Analisar com IA
          </>
        )}
      </button>

      {result && (
        <>
          <div className="divider" />
          <div className="result-header">
            <div className="result-badge">
              <I d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              Análise do documento
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
                  <I d="M5 13l4 4L19 7" />
                  Copiado!
                </>
              ) : (
                <>
                  <I d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  Copiar
                </>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setResult("");
                setQuestion("");
              }}
            >
              <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
