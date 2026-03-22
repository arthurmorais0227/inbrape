import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeExcel } from '../services/api';
import { saveToHistory } from '../services/storage';

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';

const I = ({d}) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

// ── CHART COMPONENT ───────────────────────────
function ChartView({ data, columns }) {
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const numericCols = columns.filter(col => {
    const vals = data.slice(0, 20).map(r => r[col]);
    return vals.filter(v => v !== '' && !isNaN(Number(v))).length > vals.length * 0.5;
  });
  const textCols = columns.filter(c => !numericCols.includes(c));

  useEffect(() => {
    if (textCols.length > 0 && !xCol) setXCol(textCols[0]);
    if (numericCols.length > 0 && !yCol) setYCol(numericCols[0]);
  }, [columns]);

  useEffect(() => {
    if (!canvasRef.current || !xCol || !yCol || !data.length) return;

    const labels = data.slice(0, 20).map(r => String(r[xCol] || '').slice(0, 15));
    const values = data.slice(0, 20).map(r => Number(r[yCol]) || 0);

    const colors = [
      '#002855','#1B4F8A','#2E6DB4','#E87722','#F5A623',
      '#059669','#DC2626','#7C3AED','#0891B2','#D97706',
    ];

    if (chartRef.current) { chartRef.current.destroy(); }

    const ctx = canvasRef.current.getContext('2d');
    const Chart = window.Chart;
    if (!Chart) return;

    const config = {
      bar: {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: yCol, data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
        },
      },
      line: {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: yCol, data: values, borderColor: '#002855', backgroundColor: 'rgba(0,40,85,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#E87722', pointRadius: 4 }]
        },
      },
      pie: {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: colors }]
        },
      },
      doughnut: {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: colors }]
        },
      },
    };

    chartRef.current = new Chart(ctx, {
      ...config[chartType],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: chartType === 'pie' || chartType === 'doughnut' ? 'right' : 'top', labels: { font: { family: 'Inter, sans-serif', size: 12 }, color: '#475569' } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label || ctx.label}: ${ctx.parsed.y ?? ctx.parsed}` } },
        },
        scales: chartType === 'bar' || chartType === 'line' ? {
          x: { ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: '#F1F5F9' } },
          y: { ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: '#F1F5F9' } },
        } : {},
      },
    });
  }, [chartType, xCol, yCol, data]);

  if (!data.length) return null;

  return (
    <div style={{marginTop:20}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <div style={{width:28,height:28,background:'#EAF0F8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#002855'}}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'#002855'}}>Visualização gráfica</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>Mostrando até 20 registros</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
        {/* Chart type */}
        <div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,gap:2}}>
          {[
            {id:'bar', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label:'Barras'},
            {id:'line', icon:'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', label:'Linha'},
            {id:'pie', icon:'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', label:'Pizza'},
            {id:'doughnut', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label:'Rosca'},
          ].map(t => (
            <button key={t.id} onClick={()=>setChartType(t.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:chartType===t.id?'white':'transparent',color:chartType===t.id?'#002855':'#94A3B8',boxShadow:chartType===t.id?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
              <I d={t.icon}/>{t.label}
            </button>
          ))}
        </div>

        {/* Axis selectors */}
        <select value={xCol} onChange={e=>setXCol(e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:12,color:'#475569',background:'white',fontFamily:'inherit',cursor:'pointer'}}>
          <option value="">Eixo X (categoria)</option>
          {columns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={yCol} onChange={e=>setYCol(e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:12,color:'#475569',background:'white',fontFamily:'inherit',cursor:'pointer'}}>
          <option value="">Eixo Y (valor)</option>
          {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Canvas */}
      <div style={{background:'white',border:'1px solid #E2E8F0',borderRadius:12,padding:20,height:320}}>
        <canvas ref={canvasRef}/>
      </div>

      {/* Stats row */}
      {yCol && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:12}}>
          {[
            { label:'Total', value: data.reduce((s,r)=>s+(Number(r[yCol])||0),0).toLocaleString('pt-BR',{maximumFractionDigits:2}) },
            { label:'Média', value: (data.reduce((s,r)=>s+(Number(r[yCol])||0),0)/data.filter(r=>r[yCol]!=='').length).toLocaleString('pt-BR',{maximumFractionDigits:2}) },
            { label:'Máximo', value: Math.max(...data.map(r=>Number(r[yCol])||0)).toLocaleString('pt-BR',{maximumFractionDigits:2}) },
            { label:'Mínimo', value: Math.min(...data.filter(r=>r[yCol]!=='').map(r=>Number(r[yCol])||0)).toLocaleString('pt-BR',{maximumFractionDigits:2}) },
          ].map(s => (
            <div key={s.label} style={{background:'white',border:'1px solid #E2E8F0',borderRadius:10,padding:'10px 14px',textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:700,color:'#002855'}}>{s.value}</div>
              <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{s.label} de {yCol}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────
export default function ExcelAnalyzer() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState('');
  const [meta, setMeta] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState('');
  const [dragover, setDragover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const inputRef = useRef();

  // Load Chart.js from CDN
  useEffect(() => {
    if (window.Chart) { setChartLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => setChartLoaded(true);
    document.head.appendChild(script);
  }, []);

  function handleFile(f) {
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) { setError('Apenas .xlsx, .xls e .csv são aceitos.'); return; }
    setFile(f); setError(''); setResult(''); setMeta(null); setRawData([]); setShowChart(false);
  }

  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }

  async function handleAnalyze() {
    if (!file) { setError('Selecione uma planilha primeiro.'); return; }
    setLoading(true); setError(''); setResult(''); setMeta(null); setShowChart(false);
    try {
      const res = await analyzeExcel(file, question);
      setResult(res.result);
      setMeta(res.meta);
      saveToHistory({ type:'excel', text: file.name, mode: question || 'análise geral', result: res.result });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleLoadChart() {
    if (!file) return;
    if (rawData.length > 0) { setShowChart(true); return; }
    setLoadingChart(true);
    try {
      const token = localStorage.getItem('ai_token');
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API_URL}/excel-data`, { method:'POST', headers:{'Authorization':`Bearer ${token}`}, body: fd });
      if (!r.ok) throw new Error('Erro ao carregar dados.');
      const data = await r.json();
      setRawData(data.rows);
      if (!meta) setMeta({ columns: data.columns, totalRows: data.totalRows, sheetName: data.sheetName, fileName: file.name });
      setShowChart(true);
    } catch (err) { setError(err.message); }
    finally { setLoadingChart(false); }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  }

  const cols = meta?.columns || [];

  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:700,color:'#002855',marginBottom:3,display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:28,height:28,background:'#EAF0F8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#002855'}}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
        </div>
        Análise de Planilha
      </h1>
      <p style={{fontSize:13,color:'#64748B',marginBottom:24}}>Faça upload de uma planilha Excel ou CSV, analise com IA e visualize gráficos.</p>

      {/* Upload */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg></div>
          <div><div className="card-title">Arquivo de dados</div><div className="card-desc">.xlsx, .xls ou .csv — máx. 10MB</div></div>
        </div>
        {!file ? (
          <div className={`file-drop ${dragover?'dragover':''}`} onClick={()=>inputRef.current.click()}
            onDragOver={e=>{e.preventDefault();setDragover(true);}} onDragLeave={()=>setDragover(false)}
            onDrop={e=>{e.preventDefault();setDragover(false);handleFile(e.dataTransfer.files[0]);}}>
            <div className="file-drop-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg></div>
            <div className="file-drop-title">Arraste a planilha aqui</div>
            <div className="file-drop-text">ou <span>clique para selecionar</span></div>
            <div className="file-drop-hint">Suporta .xlsx, .xls e .csv</div>
          </div>
        ) : (
          <div className="file-selected">
            <div className="file-selected-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
            <div className="file-selected-info">
              <div className="file-selected-name">{file.name}</div>
              <div className="file-selected-size">{formatSize(file.size)}</div>
            </div>
            <button className="file-remove" onClick={()=>{setFile(null);setResult('');setMeta(null);setRawData([]);setShowChart(false);}}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>

      {/* Question */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
          <div><div className="card-title">Pergunta personalizada</div><div className="card-desc">Opcional — deixe em branco para análise completa</div></div>
        </div>
        <input className="question-input" placeholder='Ex: "Qual produto teve mais vendas?" ou "Qual é a média de faturamento mensal?"'
          value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAnalyze()}/>
        <div className="hint-box" style={{marginTop:10}}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Sem pergunta, a IA faz um diagnóstico completo: resumo, tendências, anomalias e sugestões.
        </div>
      </div>

      {error && <div className="error-box"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{error}</div>}

      {/* Action buttons */}
      <div style={{display:'flex',gap:10,marginBottom: result||showChart ? 0 : 0}}>
        <button className="btn btn-orange" onClick={handleAnalyze} disabled={loading} style={{flex:2}}>
          {loading ? <><div className="spinner"/>Analisando...</> : <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Analisar com IA</>}
        </button>
        {file && chartLoaded && (
          <button className="btn btn-secondary" onClick={handleLoadChart} disabled={loadingChart} style={{flex:1}}>
            {loadingChart ? <><div className="spinner" style={{borderTopColor:'#002855'}}/>Carregando...</> : <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>Ver gráficos</>}
          </button>
        )}
      </div>

      {/* Meta */}
      {meta && (
        <>
          <div className="divider"/>
          <div className="meta-grid">
            <div className="meta-item"><div className="meta-item-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg></div><div><div className="meta-value">{meta.totalRows}</div><div className="meta-label">Linhas</div></div></div>
            <div className="meta-item"><div className="meta-item-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg></div><div><div className="meta-value">{meta.columns?.length}</div><div className="meta-label">Colunas</div></div></div>
            <div className="meta-item"><div className="meta-item-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg></div><div><div className="meta-value" style={{fontSize:13}}>{meta.sheetName}</div><div className="meta-label">Aba</div></div></div>
          </div>
          <div className="columns-info">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:13,height:13,color:'var(--navy)',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span><strong>Colunas:</strong> {meta.columns?.join(' · ')}</span>
          </div>
        </>
      )}

      {/* Chart */}
      {showChart && rawData.length > 0 && (
        <div className="card" style={{marginTop:16}}>
          <ChartView data={rawData} columns={cols}/>
        </div>
      )}

      {/* Result */}
      {result && (
        <>
          <div className="divider"/>
          <div className="result-header">
            <div className="result-badge">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              {question ? 'Resposta da IA' : 'Análise completa'}
            </div>
          </div>
          <div className="result-box">
            <div className="result-text"><ReactMarkdown>{result}</ReactMarkdown></div>
          </div>
          <div className="actions">
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied ? <><I d="M5 13l4 4L19 7"/>Copiado!</> : <><I d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>Copiar</>}
            </button>
            <button className="btn btn-secondary" onClick={()=>{setFile(null);setQuestion('');setResult('');setMeta(null);setRawData([]);setShowChart(false);}}>
              <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}