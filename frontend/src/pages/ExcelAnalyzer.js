import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeExcel } from '../services/api';
import { saveToHistory } from '../services/storage';

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';

// ── FUNÇÕES DE SUPORTE (FORA DOS COMPONENTES) ──────────────────

const I = ({ d, size = 14 }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: size, height: size, flexShrink: 0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

/**
 * Agrupa dados repetidos no Eixo X e soma seus valores no Eixo Y.
 * Ex: Se "Empresa A" aparece 3 vezes, retorna uma única linha com a soma.
 */
const groupAndSum = (data, xCol, yCol) => {
  const grouped = data.reduce((acc, row) => {
    const key = String(row[xCol] || 'Não Identificado').trim();
    const value = Number(row[yCol]) || 0;
    if (!acc[key]) acc[key] = 0;
    acc[key] += value;
    return acc;
  }, {});

  return Object.keys(grouped).map(key => ({
    [xCol]: key,
    [yCol]: grouped[key]
  }));
};

// ── COMPONENTE: PARETO CHART ──────────────────────────────
function ParetoChart({ data, xCol, yCol }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !xCol || !yCol || !data.length) return;
    const Chart = window.Chart;
    if (!Chart) return;

    // 1. Agrupar e Somar para evitar duplicatas
    const groupedData = groupAndSum(data, xCol, yCol);

    // 2. Ordenar DECRESCENTE e pegar o Top 20 (Melhores dados)
    const sorted = groupedData
      .sort((a, b) => Number(b[yCol]) - Number(a[yCol]))
      .slice(0, 20);

    // 3. Cálculos de Pareto
    const total = sorted.reduce((s, r) => s + Number(r[yCol]), 0);
    let cumulative = 0;
    const cumulativeData = sorted.map(r => {
      cumulative += Number(r[yCol]);
      return parseFloat(((cumulative / total) * 100).toFixed(1));
    });

    const labels = sorted.map(r => String(r[xCol]).slice(0, 15));
    const values = sorted.map(r => Number(r[yCol]));

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: yCol,
            data: values,
            backgroundColor: values.map((_, i) => {
              const pct = cumulativeData[i];
              return pct <= 80 ? '#002855' : pct <= 95 ? '#1B4F8A' : '#94A3B8';
            }),
            borderRadius: 4,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: '% Acumulado',
            data: cumulativeData,
            borderColor: '#E87722',
            backgroundColor: 'rgba(232,119,34,0.1)',
            pointBackgroundColor: '#E87722',
            pointRadius: 4,
            tension: 0.3,
            fill: false,
            yAxisID: 'y2',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter,sans-serif', size: 12 }, color: '#475569' } },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => ctx.datasetIndex === 0 ? `Acumulado: ${cumulativeData[ctx.dataIndex]}%` : '',
            },
          },
        },
        scales: {
          x: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { display: false } },
          y: { position: 'left', ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: '#F1F5F9' } },
          y2: { position: 'right', min: 0, max: 100, ticks: { color: '#E87722', font: { size: 11 }, callback: v => v + '%' }, grid: { display: false } },
        },
      },
    });
  }, [data, xCol, yCol]);

  return <canvas ref={canvasRef} />;
}

// ── COMPONENTE: CHART VIEW (GERAL) ──────────────────────
function ChartView({ data, columns, aiConfig }) {
  const [chartType, setChartType] = useState(aiConfig?.chartType || 'bar');
  const [xCol, setXCol] = useState(aiConfig?.xCol || '');
  const [yCol, setYCol] = useState(aiConfig?.yCol || '');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const numericCols = columns.filter(c => {
    const val = data.find(r => r[c] !== '' && r[c] !== null)?.[c];
    return !isNaN(Number(val));
  });

  useEffect(() => {
    if (aiConfig) {
      setChartType(aiConfig.chartType);
      setXCol(aiConfig.xCol);
      setYCol(aiConfig.yCol);
    }
  }, [aiConfig]);

  useEffect(() => {
    if (chartType === 'pareto' || !canvasRef.current || !xCol || !yCol || !data.length) return;

    // 1. Agrupar, Ordenar pelos melhores e pegar Top 20
    const processedData = groupAndSum(data, xCol, yCol)
      .sort((a, b) => Number(b[yCol]) - Number(a[yCol]))
      .slice(0, 20);

    const labels = processedData.map(r => String(r[xCol] || '').slice(0, 15));
    const values = processedData.map(r => Number(r[yCol]) || 0);
    const colors = ['#002855', '#1B4F8A', '#2E6DB4', '#E87722', '#F5A623', '#059669', '#DC2626', '#7C3AED', '#0891B2', '#D97706'];

    if (chartRef.current) chartRef.current.destroy();

    const Chart = window.Chart;
    if (!Chart) return;

    const config = {
      bar: { type: 'bar', data: { labels, datasets: [{ label: yCol, data: values, backgroundColor: colors, borderRadius: 6 }] } },
      line: { type: 'line', data: { labels, datasets: [{ label: yCol, data: values, borderColor: '#002855', backgroundColor: 'rgba(0,40,85,0.08)', tension: 0.4, fill: true }] } },
      pie: { type: 'pie', data: { labels, datasets: [{ data: values, backgroundColor: colors }] } },
      doughnut: { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: colors }] } },
    };

    chartRef.current = new Chart(canvasRef.current, {
      ...config[chartType],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: ['pie', 'doughnut'].includes(chartType) ? 'right' : 'top' }
        },
        scales: ['bar', 'line'].includes(chartType) ? {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          x: { grid: { display: false } }
        } : {}
      }
    });
  }, [chartType, xCol, yCol, data]);

  const CHART_TYPES = [
    { id: 'bar', label: 'Barras', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2' },
    { id: 'line', label: 'Linha', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18' },
    { id: 'pie', label: 'Pizza', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
    { id: 'doughnut', label: 'Rosca', icon: 'M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z' },
    { id: 'pareto', label: 'Pareto', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5' },
  ];

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 600, color: '#002855' }}>Visualização (Top 20)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 2 }}>
          {CHART_TYPES.map(t => (
            <button key={t.id} onClick={() => setChartType(t.id)} style={{ padding: '6px 11px', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: chartType === t.id ? 'white' : 'transparent', color: chartType === t.id ? '#002855' : '#94A3B8' }}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={xCol} onChange={e => setXCol(e.target.value)} style={{ padding: '6px', borderRadius: 8, fontSize: 12 }}>
          <option value="">Eixo X</option>
          {columns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={yCol} onChange={e => setYCol(e.target.value)} style={{ padding: '6px', borderRadius: 8, fontSize: 12 }}>
          <option value="">Eixo Y</option>
          {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, height: 320 }}>
        {chartType === 'pareto' ? <ParetoChart data={data} xCol={xCol} yCol={yCol} /> : <canvas ref={canvasRef} />}
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL: EXCEL ANALYZER ──────────────────────
export default function ExcelAnalyzer({ onNotify }) {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [chartPrompt, setChartPrompt] = useState('');
  const [result, setResult] = useState('');
  const [meta, setMeta] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingAiChart, setLoadingAiChart] = useState(false);
  const [error, setError] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [aiChartConfig, setAiChartConfig] = useState(null);
  const [aiChartMsg, setAiChartMsg] = useState('');
  const [chartLoaded, setChartLoaded] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (window.Chart) { setChartLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => setChartLoaded(true);
    document.head.appendChild(s);
  }, []);

  async function loadRawData(f = file) {
    if (rawData.length > 0 && f === file) return rawData;
    const token = localStorage.getItem('ai_token');
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch(`${API_URL}/excel-data`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
    if (!r.ok) throw new Error('Erro ao carregar dados da planilha.');
    const res = await r.json();
    setRawData(res.rows);
    setMeta({ columns: res.columns, totalRows: res.totalRows, sheetName: res.sheetName, fileName: f.name });
    return res.rows;
  }

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setError(''); setResult(''); setRawData([]); setShowChart(false); setAiChartConfig(null);
  };

  const handleAnalyze = async () => {
    if (!file) return setError('Selecione um arquivo.');
    setLoading(true); setError('');
    try {
      const res = await analyzeExcel(file, question);
      setResult(res.result);
      setMeta(res.meta);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleAiChart = async () => {
    if (!chartPrompt.trim() || !file) return;
    setLoadingAiChart(true);
    try {
      const rows = await loadRawData();
      const cols = meta?.columns || Object.keys(rows[0] || {});
      const token = localStorage.getItem('ai_token');
      const prompt = `Especialista em visualização. Pedido: "${chartPrompt}"\nColunas: ${cols.join(', ')}\nResponda APENAS JSON: {"chartType":"bar|line|pie|doughnut|pareto","xCol":"coluna","yCol":"coluna","explanation":"texto"}`;
      
      const r = await fetch(`${API_URL}/analyze`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify({ text: prompt, mode: 'summary' }) 
      });
      const data = await r.json();
      const config = JSON.parse(data.result.match(/\{.*\}/s)[0]);
      setAiChartConfig(config);
      setAiChartMsg(config.explanation);
      setShowChart(true);
    } catch (e) { setError("Erro ao gerar gráfico com IA."); }
    finally { setLoadingAiChart(false); }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ color: '#002855' }}>Análise de Planilha Inbrape</h1>
      
      <div className="card" onClick={() => inputRef.current.click()} style={{ border: '2px dashed #ccc', padding: 40, textAlign: 'center', cursor: 'pointer', marginBottom: 20 }}>
        {file ? `Arquivo: ${file.name}` : "Clique ou arraste sua planilha aqui"}
        <input ref={inputRef} type="file" hidden onChange={e => handleFile(e.target.files[0])} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input 
          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd' }} 
          placeholder="Pergunta para a IA ou descrição do gráfico..." 
          value={question || chartPrompt} 
          onChange={e => { setQuestion(e.target.value); setChartPrompt(e.target.value); }}
        />
        <button className="btn btn-orange" onClick={handleAnalyze} disabled={loading}>Analisar Texto</button>
        <button className="btn btn-secondary" onClick={handleAiChart} disabled={loadingAiChart}>Gerar Gráfico IA</button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

      {showChart && rawData.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <ChartView data={rawData} columns={meta?.columns || []} aiConfig={aiChartConfig} />
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: 20, background: '#f9f9f9' }}>
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
