import React, { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { analisarComIA, exportarAnaliseIA } from "../services/api";

const NAVY = "#024088";
const ORANGE = "#E87722";
const NAVY_LIGHT = "#2E6DB4";
const GRAY = "#CBD5E1";
const SUCCESS = "#059669";
const PALETTE = [NAVY, ORANGE, NAVY_LIGHT, SUCCESS, GRAY];

const EXEMPLOS = [
  "Quais os 10 representantes com maior valor total em pedidos de venda?",
  "Compare o total de cotações por estágio nos últimos 6 meses",
  "Quais contas classe A estão há mais de 90 dias sem comprar?",
  "Quais os 5 produtos mais presentes em cotações abertas?",
];

function Icon({ d, size = 16, ...props }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: size, height: size, flexShrink: 0 }} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}
const ICONS = {
  sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L22 12l-6.714 2.143L13 21l-2.286-6.857L4 12l6.714-2.143L13 3z",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  alert: "M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z",
};

function formatCell(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return String(v);
}

function ChartRenderer({ tipoGrafico, campoRotulo, campoValor, rows }) {
  if (tipoGrafico === "tabela" || !campoRotulo || !campoValor) {
    const colunas = rows.length ? Object.keys(rows[0]) : [];
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--gray-600)", fontSize: 12 }}>
              {colunas.map((c) => (<th key={c} style={{ padding: "8px 10px" }}>{c}</th>))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--gray-100)" }}>
                {colunas.map((c) => (<td key={c} style={{ padding: "8px 10px" }}>{formatCell(row[c])}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 50 && <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 8 }}>Mostrando 50 de {rows.length} linhas — baixe o Excel para ver tudo.</p>}
      </div>
    );
  }

  const data = rows.map((r) => ({ label: r[campoRotulo], value: Number(r[campoValor]) || 0 }));

  if (tipoGrafico === "pie") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
            {data.map((_, i) => (<Cell key={i} fill={PALETTE[i % PALETTE.length]} />))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (tipoGrafico === "line") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="label" fontSize={11} angle={-20} textAnchor="end" height={70} interval={0} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" fill={ORANGE} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function InsightsIA({ onNotify }) {
  const [pergunta, setPergunta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function handleAnalisar() {
    if (!pergunta.trim()) return;
    setLoading(true);
    setError("");
    setResultado(null);
    try {
      const res = await analisarComIA(pergunta);
      setResultado(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportar() {
    setExporting(true);
    try {
      await exportarAnaliseIA(resultado);
      onNotify?.("Excel exportado", "ia");
    } catch (e) {
      onNotify?.(e.message || "Erro ao exportar", "ia");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Análise com IA</h1>
      <p className="page-subtitle">Pergunte em português — a IA consulta o CRM sincronizado e gera a análise, o gráfico e o Excel.</p>

      <div className="card">
        <textarea
          className="question-input"
          rows={3}
          placeholder="Ex: Quais os 10 clientes com maior valor em pedidos de venda este ano?"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          style={{ resize: "vertical", marginBottom: 10 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {EXEMPLOS.map((ex) => (
            <button key={ex} className="btn btn-secondary" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => setPergunta(ex)}>
              {ex}
            </button>
          ))}
        </div>
        <button className="btn btn-orange" onClick={handleAnalisar} disabled={loading || !pergunta.trim()}>
          {loading ? (<><div className="spinner" /> Analisando…</>) : (<><Icon d={ICONS.sparkles} size={16} /> Analisar com IA</>)}
        </button>
      </div>

      {error && (<div className="error-box"><Icon d={ICONS.alert} />{error}</div>)}

      {resultado && (
        <>
          <div className="divider" />
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><Icon d={ICONS.sparkles} /></div>
              <div style={{ flex: 1 }}>
                <div className="card-title">{resultado.titulo}</div>
                <div className="card-desc">{resultado.totalLinhas} registro(s) encontrado(s)</div>
              </div>
              <button className="btn btn-secondary" style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={handleExportar} disabled={exporting}>
                <Icon d={ICONS.download} size={14} /> {exporting ? "Exportando…" : "Baixar Excel"}
              </button>
            </div>

            <p style={{ fontSize: 14, color: "var(--gray-700)", whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 18 }}>{resultado.insights}</p>

            <ChartRenderer tipoGrafico={resultado.tipoGrafico} campoRotulo={resultado.campoRotulo} campoValor={resultado.campoValor} rows={resultado.rows} />

            <details style={{ marginTop: 18 }}>
              <summary style={{ fontSize: 12, color: "var(--gray-400)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={ICONS.code} size={13} /> Ver consulta SQL gerada
              </summary>
              <pre style={{ fontSize: 12, background: "var(--gray-50)", padding: 12, borderRadius: 8, marginTop: 8, overflowX: "auto", color: "var(--gray-700)" }}>{resultado.sql}</pre>
            </details>
          </div>
        </>
      )}
    </div>
  );
}