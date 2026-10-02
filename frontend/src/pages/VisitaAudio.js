import React, { useState, useRef, useEffect, useCallback } from "react";
import { transcreverVisita, salvarVisita, listarVisitas } from "../services/api";

const ESTAGIOS = [
  { value: "", label: "Selecione…" },
  { value: "contato", label: "Contato" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "homologacao-vendor-list", label: "Homologação / Vendor list" },
  { value: "amostra", label: "Amostra" },
  { value: "piloto", label: "Piloto" },
  { value: "cotacao", label: "Cotação" },
  { value: "pedido", label: "Pedido" },
];

const EMPTY_CAMPOS = {
  empresa_unidade: "", com_quem: "", objetivo: "", resultado: "",
  oportunidades: "", concorrente: "", estagio: "", proximo_passo: "",
  responsavel: "", apoio_comercial: "",
};

function Icon({ d, size = 16, ...props }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: size, height: size, flexShrink: 0 }} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}
const ICONS = {
  mic: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8",
  stop: "M9 9h6v6H9z",
  upload: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L22 12l-6.714 2.143L13 21l-2.286-6.857L4 12l6.714-2.143L13 3z",
  save: "M5 13l4 4L19 7",
  close: "M6 18L18 6M6 6l12 12",
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  building: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1m-1 4h1m-1 4h1",
};

function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso; }
}

export default function VisitaAudio({ onNotify }) {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [canRecord] = useState(!!navigator.mediaDevices?.getUserMedia);

  const [transcribing, setTranscribing] = useState(false);
  const [transcricao, setTranscricao] = useState("");
  const [campos, setCampos] = useState(EMPTY_CAMPOS);
  const [sugestoes, setSugestoes] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [accountNome, setAccountNome] = useState("");
  const [dataVisita, setDataVisita] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataProximoPasso, setDataProximoPasso] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const inputRef = useRef();

  const loadHistory = useCallback(() => {
    setLoadingHistory(true);
    listarVisitas(1, 10)
      .then((res) => setHistory(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setError("");
    setTranscricao("");
    setCampos(EMPTY_CAMPOS);
    setSugestoes([]);
    setAccountId(null);
    setAccountNome("");
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const f = new File([blob], `visita-${Date.now()}.webm`, { type: "audio/webm" });
        handleFile(f);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }
  function stopRecording() {
    mediaRecorder?.stop();
    setRecording(false);
  }

  async function handleTranscrever() {
    if (!file) { setError("Grave ou envie um áudio primeiro."); return; }
    setTranscribing(true);
    setError("");
    try {
      const res = await transcreverVisita(file);
      setTranscricao(res.transcricao);
      setCampos({ ...EMPTY_CAMPOS, ...res.campos });
      setSugestoes(res.sugestoesOrganizacao || []);
      if ((res.sugestoesOrganizacao || []).length === 1) {
        setAccountId(res.sugestoesOrganizacao[0].id);
        setAccountNome(res.sugestoesOrganizacao[0].accountname);
      }
      onNotify?.("Áudio transcrito e estruturado", "visitas");
    } catch (e) {
      setError(e.message);
    } finally {
      setTranscribing(false);
    }
  }

  function updateCampo(key, value) {
    setCampos((c) => ({ ...c, [key]: value }));
  }

  async function handleSalvar() {
    setSaving(true);
    setError("");
    try {
      await salvarVisita({
        ...campos,
        account_id: accountId,
        data_visita: dataVisita || null,
        data_proximo_passo: dataProximoPasso || null,
        transcricao,
      });
      onNotify?.("Relatório de visita salvo", "visitas");
      setFile(null);
      setTranscricao("");
      setCampos(EMPTY_CAMPOS);
      setSugestoes([]);
      setAccountId(null);
      setAccountNome("");
      setDataProximoPasso("");
      loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const hasResult = !!transcricao;

  return (
    <div>
      <h1 className="page-title">Relatório de Visita</h1>
      <p className="page-subtitle">
        Grave ou envie o áudio da visita — a IA transcreve e preenche o relatório. Você só revisa e confirma.
      </p>

      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><Icon d={ICONS.mic} /></div>
          <div>
            <div className="card-title">Áudio da visita</div>
            <div className="card-desc">MP3, M4A, WAV, OGG, WEBM — máx. 20MB</div>
          </div>
        </div>

        {!file ? (
          <div
            className="file-drop"
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          >
            <div className="file-drop-icon"><Icon d={ICONS.upload} size={22} /></div>
            <div className="file-drop-title">Arraste o áudio aqui</div>
            <div className="file-drop-text">ou <span>clique para selecionar</span></div>
            {canRecord && (
              <>
                <div className="file-drop-hint" style={{ margin: "10px 0" }}>ou</div>
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}
                  onClick={(e) => { e.stopPropagation(); recording ? stopRecording() : startRecording(); }}
                >
                  <Icon d={recording ? ICONS.stop : ICONS.mic} size={14} />
                  {recording ? "Parar gravação" : "Gravar agora"}
                </button>
              </>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--gray-50)", borderRadius: 10 }}>
              <Icon d={ICONS.mic} size={16} />
              <span style={{ fontSize: 13, color: "var(--gray-700)", flex: 1 }}>{file.name}</span>
              <button className="btn btn-secondary" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }} onClick={() => handleFile(null)}>
                <Icon d={ICONS.close} size={13} />
              </button>
            </div>
            <audio controls src={URL.createObjectURL(file)} style={{ width: "100%", marginTop: 10 }} />
          </div>
        )}
        <input ref={inputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div className="error-box">
          <Icon d={ICONS.close} />
          {error}
        </div>
      )}

      {file && !hasResult && (
        <button className="btn btn-orange" onClick={handleTranscrever} disabled={transcribing}>
          {transcribing ? (<><div className="spinner" /> Transcrevendo e estruturando…</>) : (<><Icon d={ICONS.sparkles} size={16} /> Transcrever e Estruturar com IA</>)}
        </button>
      )}

      {hasResult && (
        <>
          <div className="divider" />

          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><Icon d={ICONS.building} /></div>
              <div>
                <div className="card-title">Organização vinculada</div>
                <div className="card-desc">Confirme a qual cliente esse relatório pertence</div>
              </div>
            </div>
            {sugestoes.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sugestoes.map((s) => (
                  <button
                    key={s.id}
                    className={`btn ${accountId === s.id ? "btn-orange" : "btn-secondary"}`}
                    style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}
                    onClick={() => { setAccountId(s.id); setAccountNome(s.accountname); }}
                  >
                    {s.accountname}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--gray-400)" }}>
                Nenhuma organização sincronizada com nome parecido a "{campos.empresa_unidade || "—"}". O relatório pode ser salvo sem vínculo.
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><Icon d={ICONS.sparkles} /></div>
              <div>
                <div className="card-title">Relatório estruturado</div>
                <div className="card-desc">Revise e ajuste antes de salvar</div>
              </div>
            </div>

            <div className="two-col" style={{ marginBottom: 12 }}>
              <div>
                <label className="label">Empresa / Unidade</label>
                <input className="question-input" value={campos.empresa_unidade} onChange={(e) => updateCampo("empresa_unidade", e.target.value)} />
              </div>
              <div>
                <label className="label">Data da visita</label>
                <input className="question-input" type="date" value={dataVisita} onChange={(e) => setDataVisita(e.target.value)} />
              </div>
            </div>

            <label className="label">Com quem (nome, cargo, área)</label>
            <input className="question-input" value={campos.com_quem} onChange={(e) => updateCampo("com_quem", e.target.value)} style={{ marginBottom: 12 }} />

            <label className="label">Objetivo da visita</label>
            <textarea className="question-input" rows={2} value={campos.objetivo} onChange={(e) => updateCampo("objetivo", e.target.value)} style={{ marginBottom: 12, resize: "vertical" }} />

            <label className="label">Resultado — o que foi constatado e decidido</label>
            <textarea className="question-input" rows={3} value={campos.resultado} onChange={(e) => updateCampo("resultado", e.target.value)} style={{ marginBottom: 12, resize: "vertical" }} />

            <label className="label">Outras oportunidades na planta</label>
            <textarea className="question-input" rows={2} value={campos.oportunidades} onChange={(e) => updateCampo("oportunidades", e.target.value)} style={{ marginBottom: 12, resize: "vertical" }} />

            <div className="two-col" style={{ marginBottom: 12 }}>
              <div>
                <label className="label">Concorrente atual e preço</label>
                <input className="question-input" value={campos.concorrente} onChange={(e) => updateCampo("concorrente", e.target.value)} />
              </div>
              <div>
                <label className="label">Estágio</label>
                <select className="question-input" value={campos.estagio} onChange={(e) => updateCampo("estagio", e.target.value)}>
                  {ESTAGIOS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
            </div>

            <div className="two-col" style={{ marginBottom: 12 }}>
              <div>
                <label className="label">Próximo passo</label>
                <input className="question-input" value={campos.proximo_passo} onChange={(e) => updateCampo("proximo_passo", e.target.value)} />
              </div>
              <div>
                <label className="label">Responsável</label>
                <input className="question-input" value={campos.responsavel} onChange={(e) => updateCampo("responsavel", e.target.value)} />
              </div>
            </div>

            <div className="two-col" style={{ marginBottom: 12 }}>
              <div>
                <label className="label">Data do próximo passo</label>
                <input className="question-input" type="date" value={dataProximoPasso} onChange={(e) => setDataProximoPasso(e.target.value)} />
              </div>
              <div>
                <label className="label">Apoio necessário do comercial</label>
                <input className="question-input" value={campos.apoio_comercial} onChange={(e) => updateCampo("apoio_comercial", e.target.value)} />
              </div>
            </div>

            <details style={{ marginTop: 4 }}>
              <summary style={{ fontSize: 12, color: "var(--gray-400)", cursor: "pointer" }}>Ver transcrição completa</summary>
              <p style={{ fontSize: 13, color: "var(--gray-600)", marginTop: 8, whiteSpace: "pre-wrap" }}>{transcricao}</p>
            </details>
          </div>

          <div className="actions">
            <button className="btn btn-orange" onClick={handleSalvar} disabled={saving}>
              {saving ? (<><div className="spinner" /> Salvando…</>) : (<><Icon d={ICONS.save} size={14} /> Salvar relatório</>)}
            </button>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setTranscricao(""); setCampos(EMPTY_CAMPOS); }}>
              <Icon d={ICONS.close} size={14} /> Descartar
            </button>
          </div>
        </>
      )}

      <div className="divider" />
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-700)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon d={ICONS.history} size={16} /> Últimos relatórios
      </h2>
      {loadingHistory && <div className="spinner" />}
      {!loadingHistory && history.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--gray-400)" }}>Nenhum relatório salvo ainda.</p>
      )}
      {!loadingHistory && history.length > 0 && (
        <div className="history-list">
          {history.map((v) => (
            <div className="history-card" key={v.id}>
              <div className="history-card-icon document"><Icon d={ICONS.mic} size={18} /></div>
              <div className="history-card-body">
                <div className="history-card-top">
                  <span className="history-card-badge">{v.empresa_unidade || "Sem empresa"}</span>
                  <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{formatDate(v.data_visita)} · {v.criado_por_nome}</span>
                </div>
                <p className="history-preview">{v.resultado || v.objetivo || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}