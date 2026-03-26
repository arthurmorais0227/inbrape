import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeExcel } from '../services/api';
import { saveToHistory } from '../services/storage';

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';
const I = ({d,size=14}) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:size,height:size,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

// ── PARETO CHART ──────────────────────────────
function ParetoChart({ data, xCol, yCol }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !xCol || !yCol || !data.length) return;
    const Chart = window.Chart;
    if (!Chart) return;

    // Sort descending and calculate cumulative %
    const sorted = [...data]
      .filter(r => r[yCol] !== '' && !isNaN(Number(r[yCol])))
      .sort((a, b) => Number(b[yCol]) - Number(a[yCol]))
      .slice(0, 20);

    const total = sorted.reduce((s, r) => s + Number(r[yCol]), 0);
    let cumulative = 0;
    const cumulativeData = sorted.map(r => {
      cumulative += Number(r[yCol]);
      return parseFloat(((cumulative / total) * 100).toFixed(1));
    });

    const labels = sorted.map(r => String(r[xCol] || '').slice(0, 12));
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
          annotation: {},
        },
        scales: {
          x: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { display: false } },
          y: { position: 'left', ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: '#F1F5F9' }, title: { display: true, text: yCol, color: '#94A3B8', font: { size: 11 } } },
          y2: { position: 'right', min: 0, max: 100, ticks: { color: '#E87722', font: { size: 11 }, callback: v => v + '%' }, grid: { display: false }, title: { display: true, text: '% Acumulado', color: '#E87722', font: { size: 11 } } },
        },
      },
    });
  }, [data, xCol, yCol]);

  return <canvas ref={canvasRef}/>;
}

// ── MAIN CHART COMPONENT ──────────────────────
function ChartView({ data, columns, aiConfig }) {
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [sortType, setSortType] = useState('desc');

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const numericCols = columns.filter(col => {
    const vals = data.slice(0, 20).map(r => r[col]);
    return vals.filter(v => v !== '' && !isNaN(Number(v))).length > vals.length * 0.5;
  });

  const textCols = columns.filter(c => !numericCols.includes(c));

  useEffect(() => {
    if (aiConfig) {
      if (aiConfig.chartType) setChartType(aiConfig.chartType);
      if (aiConfig.xCol && columns.includes(aiConfig.xCol)) setXCol(aiConfig.xCol);
      if (aiConfig.yCol && columns.includes(aiConfig.yCol)) setYCol(aiConfig.yCol);
    } else {
      if (textCols.length > 0 && !xCol) setXCol(textCols[0]);
      if (numericCols.length > 0 && !yCol) setYCol(numericCols[0]);
    }
  }, [columns, aiConfig]);

  const processedData = React.useMemo(() => {
    let d = [...data].filter(r => r[yCol] !== '' && !isNaN(Number(r[yCol])));

    switch (sortType) {
      case 'desc': d.sort((a,b)=>Number(b[yCol])-Number(a[yCol])); break;
      case 'asc': d.sort((a,b)=>Number(a[yCol])-Number(b[yCol])); break;
      case 'az': d.sort((a,b)=>String(a[xCol]).localeCompare(String(b[xCol]))); break;
      case 'za': d.sort((a,b)=>String(b[xCol]).localeCompare(String(a[xCol]))); break;
      default: break;
    }

    return d.slice(0, 20);
  }, [data, xCol, yCol, sortType]);

  useEffect(() => {
    if (chartType === 'pareto') return;
    if (!canvasRef.current || !xCol || !yCol || !processedData.length) return;

    const labels = processedData.map(r => String(r[xCol] || '').slice(0, 15));
    const values = processedData.map(r => Number(r[yCol]) || 0);

    const colors = ['#002855','#1B4F8A','#2E6DB4','#E87722','#F5A623','#059669','#DC2626','#7C3AED','#0891B2','#D97706'];

    if (chartRef.current) chartRef.current.destroy();

    const Chart = window.Chart;
    if (!Chart) return;

    const config = {
      bar: { type:'bar', data:{ labels, datasets:[{ label:yCol, data:values, backgroundColor:colors, borderRadius:6 }] } },
      line:{ type:'line', data:{ labels, datasets:[{ label:yCol, data:values, borderColor:'#002855', backgroundColor:'rgba(0,40,85,0.08)', tension:0.4, fill:true }] } },
      pie:{ type:'pie', data:{ labels, datasets:[{ data:values, backgroundColor:colors }] } },
      doughnut:{ type:'doughnut', data:{ labels, datasets:[{ data:values, backgroundColor:colors }] } },
    };

    chartRef.current = new Chart(canvasRef.current, {
      ...config[chartType],
      options:{ responsive:true, maintainAspectRatio:false }
    });

  }, [chartType, xCol, yCol, processedData]);

  if (!data.length) return null;

  const CHART_TYPES = [
    {id:'bar', label:'Barras'},
    {id:'line', label:'Linha'},
    {id:'pie', label:'Pizza'},
    {id:'doughnut', label:'Rosca'},
    {id:'pareto', label:'Pareto'},
  ];

  return (
    <div style={{marginTop:4}}>

      {/* 🔥 LINHA COMPLETA DE CONTROLES */}
      <div style={{
        display:'flex',
        gap:10,
        flexWrap:'wrap',
        marginBottom:16,
        alignItems:'center'
      }}>

        {/* TIPOS DE GRÁFICO (RESTAURADO) */}
        <div style={{
          display:'flex',
          background:'#F1F5F9',
          borderRadius:10,
          padding:3,
          gap:2
        }}>
          {CHART_TYPES.map(t => (
            <button
              key={t.id}
              onClick={()=>setChartType(t.id)}
              style={{
                padding:'6px 10px',
                fontSize:11,
                border:'none',
                borderRadius:8,
                cursor:'pointer',
                background: chartType===t.id ? 'white' : 'transparent',
                color: chartType===t.id ? '#002855' : '#64748B',
                fontWeight:600,
                boxShadow: chartType===t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ORDENAÇÃO */}
        <div style={{
          display:'flex',
          gap:6,
          background:'#F1F5F9',
          padding:4,
          borderRadius:10
        }}>
          {[
            {id:'desc', label:'Maior'},
            {id:'asc', label:'Menor'},
            {id:'az', label:'A-Z'},
            {id:'za', label:'Z-A'},
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortType(opt.id)}
              style={{
                padding:'6px 10px',
                fontSize:11,
                border:'none',
                borderRadius:8,
                cursor:'pointer',
                background: sortType === opt.id ? 'white' : 'transparent',
                color: sortType === opt.id ? '#002855' : '#64748B',
                fontWeight:600,
                boxShadow: sortType === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* SELECTS */}
        <select value={xCol} onChange={e=>setXCol(e.target.value)}>
          <option value="">Eixo X</option>
          {columns.map(c=><option key={c} value={c}>{c}</option>)}
        </select>

        <select value={yCol} onChange={e=>setYCol(e.target.value)}>
          <option value="">Eixo Y</option>
          {numericCols.map(c=><option key={c} value={c}>{c}</option>)}
        </select>

      </div>

      {/* CANVAS */}
      <div style={{background:'white',border:'1px solid #E2E8F0',borderRadius:12,padding:20,height:320}}>
        {chartType === 'pareto'
          ? <ParetoChart data={processedData} xCol={xCol} yCol={yCol}/>
          : <canvas ref={canvasRef}/>
        }
      </div>

    </div>
  );
}

// ── MAIN ──────────────────────────────────────
export default function ExcelAnalyzer({ onNotify }) {
  const [file, setFile]             = useState(null);
  const [question, setQuestion]     = useState('');
  const [chartPrompt, setChartPrompt] = useState('');
  const [result, setResult]         = useState('');
  const [meta, setMeta]             = useState(null);
  const [rawData, setRawData]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingAiChart, setLoadingAiChart] = useState(false);
  const [error, setError]           = useState('');
  const [dragover, setDragover]     = useState(false);
  const [copied, setCopied]         = useState(false);
  const [showChart, setShowChart]   = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [aiChartConfig, setAiChartConfig] = useState(null);
  const [aiChartMsg, setAiChartMsg] = useState('');
  const inputRef = useRef();

  useEffect(() => {
    if (window.Chart) { setChartLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => setChartLoaded(true);
    document.head.appendChild(s);
  }, []);

  function handleFile(f) {
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!['.xlsx','.xls','.csv'].includes(ext)) { setError('Apenas .xlsx, .xls e .csv são aceitos.'); return; }
    setFile(f); setError(''); setResult(''); setMeta(null); setRawData([]); setShowChart(false); setAiChartConfig(null); setAiChartMsg('');
  }

  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }

  async function loadRawData() {
    if (rawData.length > 0) return rawData;
    const token = localStorage.getItem('ai_token');
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch(`${API_URL}/excel-data`, { method:'POST', headers:{'Authorization':`Bearer ${token}`}, body:fd });
    if (!r.ok) throw new Error('Erro ao carregar dados.');
    const data = await r.json();
    setRawData(data.rows);
    if (!meta) setMeta({ columns:data.columns, totalRows:data.totalRows, sheetName:data.sheetName, fileName:file.name });
    return data.rows;
  }

  async function handleAnalyze() {
    if (!file) { setError('Selecione uma planilha primeiro.'); return; }
    setLoading(true); setError(''); setResult(''); setShowChart(false); setAiChartConfig(null);
    try {
      const res = await analyzeExcel(file, question);
      setResult(res.result); setMeta(res.meta);
      saveToHistory({ type:'excel', text:file.name, mode:question||'análise geral', result:res.result });
      onNotify?.('📊 Análise da planilha concluída!');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleLoadChart() {
    if (!file) return;
    setLoadingChart(true);
    try { await loadRawData(); setShowChart(true); }
    catch (err) { setError(err.message); }
    finally { setLoadingChart(false); }
  }

  // substitua handleAiChart por:
async function handleAiChart() {
  if (!chartPrompt.trim()) { setError('Digite o que você quer visualizar.'); return; }
  if (!file) { setError('Selecione uma planilha primeiro.'); return; }
  setLoadingAiChart(true); setError(''); setAiChartConfig(null); setAiChartMsg('');
  try {
    const rows = await loadRawData();
    const cols = meta?.columns || Object.keys(rows[0] || {});
    const token = localStorage.getItem('ai_token');

    const r = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        text: chartPrompt,
        mode: 'summary',
        rows,
        columns: cols,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Erro ao gerar gráfico.');
    if (!data.config) throw new Error('IA não retornou configuração válida.');

    setAiChartConfig(data.config);
    setAiChartMsg(data.config.explanation || '');
    setShowChart(true);
    onNotify?.('📈 Gráfico gerado pela IA!');
  } catch { setError('Não foi possível interpretar o pedido. Tente ser mais específico.'); }
  finally { setLoadingAiChart(false); }
}

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  const cols = meta?.columns || [];

  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:700,color:'#002855',marginBottom:3,display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:28,height:28,background:'#EAF0F8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#002855'}}>
          <I d="M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" size={15}/>
        </div>
        Análise de Planilha
      </h1>
      <p style={{fontSize:13,color:'#64748B',marginBottom:24}}>Faça upload, analise com IA e visualize gráficos incluindo Pareto.</p>

      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><I d="M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" size={17}/></div>
          <div><div className="card-title">Arquivo de dados</div><div className="card-desc">.xlsx, .xls ou .csv — máx. 10MB</div></div>
        </div>
        {!file ? (
          <div className={`file-drop ${dragover?'dragover':''}`} onClick={()=>inputRef.current.click()}
            onDragOver={e=>{e.preventDefault();setDragover(true);}} onDragLeave={()=>setDragover(false)}
            onDrop={e=>{e.preventDefault();setDragover(false);handleFile(e.dataTransfer.files[0]);}}>
            <div className="file-drop-icon"><I d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" size={24}/></div>
            <div className="file-drop-title">Arraste a planilha aqui</div>
            <div className="file-drop-text">ou <span>clique para selecionar</span></div>
            <div className="file-drop-hint">Suporta .xlsx, .xls e .csv</div>
          </div>
        ) : (
          <div className="file-selected">
            <div className="file-selected-icon"><I d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={20}/></div>
            <div className="file-selected-info">
              <div className="file-selected-name">{file.name}</div>
              <div className="file-selected-size">{formatSize(file.size)}</div>
            </div>
            <button className="file-remove" onClick={()=>{setFile(null);setResult('');setMeta(null);setRawData([]);setShowChart(false);setAiChartConfig(null);setAiChartMsg('');}}>
              <I d="M6 18L18 6M6 6l12 12"/>
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><I d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={17}/></div>
          <div><div className="card-title">Pergunta para análise</div><div className="card-desc">Opcional — deixe em branco para análise completa</div></div>
        </div>
        <input className="question-input" placeholder='Ex: "Qual produto teve mais vendas?"' value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAnalyze()}/>
      </div>

      {file && (
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon" style={{background:'#FDF3EA',color:'#E87722'}}>
              <I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={17}/>
            </div>
            <div><div className="card-title">Criar gráfico com IA</div><div className="card-desc">Descreva o gráfico — suporta Barras, Linha, Pizza, Rosca e Pareto</div></div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
            {['Mostre as vendas por produto em barras','Compare receita por mês em linha','Distribuição por categoria em pizza','Análise de Pareto por valor total','Ranking dos maiores valores em Pareto'].map((s,i)=>(
              <button key={i} onClick={()=>setChartPrompt(s)} style={{background:'white',border:'1.5px solid #E2E8F0',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:500,color:'#1B4F8A',cursor:'pointer',fontFamily:'inherit'}}>{s}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:10}}>
            <input className="question-input" style={{flex:1}} placeholder='Ex: "análise de Pareto por faturamento" ou "vendas por vendedor em barras"' value={chartPrompt} onChange={e=>setChartPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAiChart()}/>
            <button className="btn btn-orange" onClick={handleAiChart} disabled={loadingAiChart} style={{width:'auto',padding:'10px 18px',fontSize:13,flexShrink:0}}>
              {loadingAiChart?<><div className="spinner"/>Gerando...</>:<><I d="M13 10V3L4 14h7v7l9-11h-7z"/>Gerar</>}
            </button>
          </div>
          {aiChartMsg && (
            <div style={{marginTop:10,background:'#EAF0F8',border:'1px solid rgba(0,40,85,0.12)',borderLeft:'3px solid #E87722',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#002855',display:'flex',gap:7}}>
              <I d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              {aiChartMsg}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-box"><I d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>{error}</div>}

      <div style={{display:'flex',gap:10}}>
        <button className="btn btn-orange" onClick={handleAnalyze} disabled={loading} style={{flex:2}}>
          {loading?<><div className="spinner"/>Analisando...</>:<><I d="M13 10V3L4 14h7v7l9-11h-7z"/>Analisar com IA</>}
        </button>
        {file && chartLoaded && (
          <button className="btn btn-secondary" onClick={handleLoadChart} disabled={loadingChart} style={{flex:1}}>
            {loadingChart?<><div className="spinner" style={{borderTopColor:'#002855'}}/>Carregando...</>:<><I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>Ver gráficos</>}
          </button>
        )}
      </div>

      {meta && (
        <>
          <div className="divider"/>
          <div className="meta-grid">
            <div className="meta-item"><div className="meta-item-icon"><I d="M4 6h16M4 10h16M4 14h16M4 18h16"/></div><div><div className="meta-value">{meta.totalRows}</div><div className="meta-label">Linhas</div></div></div>
            <div className="meta-item"><div className="meta-item-icon"><I d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></div><div><div className="meta-value">{meta.columns?.length}</div><div className="meta-label">Colunas</div></div></div>
            <div className="meta-item"><div className="meta-item-icon"><I d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></div><div><div className="meta-value" style={{fontSize:13}}>{meta.sheetName}</div><div className="meta-label">Aba</div></div></div>
          </div>
          <div className="columns-info">
            <I d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <span><strong>Colunas:</strong> {meta.columns?.join(' · ')}</span>
          </div>
        </>
      )}

      {showChart && rawData.length > 0 && (
        <div className="card" style={{marginTop:16}}>
          <ChartView data={rawData} columns={cols} aiConfig={aiChartConfig}/>
        </div>
      )}

      {result && (
        <>
          <div className="divider"/>
          <div className="result-header">
            <div className="result-badge">
              <I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              {question?'Resposta da IA':'Análise completa'}
            </div>
          </div>
          <div className="result-box">
            <div className="result-text"><ReactMarkdown>{result}</ReactMarkdown></div>
          </div>
          <div className="actions">
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied?<><I d="M5 13l4 4L19 7"/>Copiado!</>:<><I d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>Copiar</>}
            </button>
            <button className="btn btn-secondary" onClick={()=>{setFile(null);setQuestion('');setResult('');setMeta(null);setRawData([]);setShowChart(false);setAiChartConfig(null);setAiChartMsg('');setChartPrompt('');}}>
              <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
