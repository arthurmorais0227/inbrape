import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeExcel } from '../services/api';
import { saveToHistory } from '../services/storage';

// Mantivemos sua função de apoio, apenas garantindo que ela some corretamente
const groupData = (data, xCol, yCol) => {
  const grouped = data.reduce((acc, row) => {
    const key = String(row[xCol] || 'Não Identificado').trim();
    const value = Number(row[yCol]) || 0;
    
    if (!acc[key]) {
      acc[key] = 0;
    }
    acc[key] += value;
    return acc;
  }, {});

  return Object.keys(grouped).map(key => ({
    [xCol]: key,
    [yCol]: grouped[key]
  }));
};

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

    // --- LÓGICA CORRIGIDA: Agrupa e pega os 20 melhores ---
    const grouped = groupData(data, xCol, yCol);
    const sorted = grouped
      .sort((a, b) => Number(b[yCol]) - Number(a[yCol]))
      .slice(0, 20);

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
          y: { position: 'left', ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: '#F1F5F9' }, title: { display: true, text: yCol, color: '#94A3B8', font: { size: 11 } } },
          y2: { position: 'right', min: 0, max: 100, ticks: { color: '#E87722', font: { size: 11 }, callback: v => v + '%' }, grid: { display: false }, title: { display: true, text: '% Acumulado', color: '#E87722', font: { size: 11 } } },
        },
      },
    });
  }, [data, xCol, yCol]);

  return <canvas ref={canvasRef}/>;
}

// ── CHART VIEW (DENTRO DO COMPONENTE PRINCIPAL) ──────────────────────
// Nota: Para manter sua estrutura, vou colocar a lógica do gráfico geral aqui
function ChartView({ data, columns, aiConfig, chartType, setChartType, xCol, setXCol, yCol, setYCol }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const numericCols = columns.filter(c => {
    const val = data.find(r => r[c] !== '' && r[c] !== null)?.[c];
    return !isNaN(Number(val));
  });

  useEffect(() => {
    if (chartType === 'pareto') return;
    if (!canvasRef.current || !xCol || !yCol || !data.length) return;

    // --- LÓGICA CORRIGIDA: Agrupa e pega os 20 melhores para Barras/Pizza/Linha ---
    const processedData = groupData(data, xCol, yCol)
      .sort((a, b) => Number(b[yCol]) - Number(a[yCol]))
      .slice(0, 20);

    const labels = processedData.map(r => String(r[xCol] || '').slice(0, 15));
    const values = processedData.map(r => Number(r[yCol]) || 0);
    
    const colors = ['#002855','#1B4F8A','#2E6DB4','#E87722','#F5A623','#059669','#DC2626','#7C3AED','#0891B2','#D97706'];
    
    if (chartRef.current) { chartRef.current.destroy(); }
    const Chart = window.Chart;
    if (!Chart) return;

    const config = {
      bar:      { type:'bar',      data:{ labels, datasets:[{ label:yCol, data:values, backgroundColor:colors, borderRadius:6, borderSkipped:false }] } },
      line:     { type:'line',     data:{ labels, datasets:[{ label:yCol, data:values, borderColor:'#002855', backgroundColor:'rgba(0,40,85,0.08)', tension:0.4, fill:true, pointBackgroundColor:'#E87722', pointRadius:4 }] } },
      pie:      { type:'pie',      data:{ labels, datasets:[{ data:values, backgroundColor:colors }] } },
      doughnut: { type:'doughnut', data:{ labels, datasets:[{ data:values, backgroundColor:colors }] } },
    };

    chartRef.current = new Chart(canvasRef.current, {
      ...config[chartType],
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: chartType==='pie'||chartType==='doughnut'?'right':'top', labels:{ font:{family:'Inter,sans-serif',size:12}, color:'#475569' } },
        },
        scales: chartType==='bar'||chartType==='line' ? {
          x:{ ticks:{color:'#94A3B8',font:{size:11}}, grid:{color:'#F1F5F9'} },
          y:{ ticks:{color:'#94A3B8',font:{size:11}}, grid:{color:'#F1F5F9'} },
        } : {},
      },
    });
  }, [chartType, xCol, yCol, data]);

  return (
    <div style={{marginTop:4}}>
      {/* Todo o seu HTML original de controles e botões abaixo */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <div style={{width:28,height:28,background:'#EAF0F8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#002855'}}>
          <I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={15}/>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'#002855'}}>Visualização gráfica</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>Mostrando os 20 principais registros agrupados</div>
        </div>
      </div>

      {chartType === 'pareto' && (
        <div style={{background:'#FDF3EA',border:'1px solid #E87722',borderLeft:'3px solid #E87722',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#92400E',display:'flex',gap:7,marginBottom:12}}>
          <I d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <span><strong>Gráfico de Pareto (80/20):</strong> Barras azul escuro = 80% do impacto. Ordena automaticamente do maior para o menor.</span>
        </div>
      )}

      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
        <div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,gap:2,flexWrap:'wrap'}}>
          {[
            {id:'bar', label:'Barras', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10...'},
            {id:'line', label:'Linha', icon:'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18...'},
            {id:'pie', label:'Pizza', icon:'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z'},
            {id:'doughnut', label:'Rosca', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2...'},
            {id:'pareto', label:'Pareto', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5...'}
          ].map(t => (
            <button key={t.id} onClick={()=>setChartType(t.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 11px',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:chartType===t.id?'white':'transparent',color:chartType===t.id?'#002855':'#94A3B8',transition:'all 0.15s'}}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={xCol} onChange={e=>setXCol(e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:12}}>
          <option value="">Eixo X</option>
          {columns.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={yCol} onChange={e=>setYCol(e.target.value)} style={{padding:'6px 10px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:12}}>
          <option value="">Eixo Y (valor)</option>
          {numericCols.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{background:'white',border:'1px solid #E2E8F0',borderRadius:12,padding:20,height:320}}>
        {chartType === 'pareto'
          ? <ParetoChart data={data} xCol={xCol} yCol={yCol}/>
          : <canvas ref={canvasRef}/>
        }
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL (EXCEL ANALYZER) ──────────────────────
export default function ExcelAnalyzer({ onNotify }) {
  // ... todos os seus states originais (file, question, rawData, etc) ...
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
  const [dragover, setDragover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [aiChartConfig, setAiChartConfig] = useState(null);
  const [aiChartMsg, setAiChartMsg] = useState('');
  
  // Adicionando os states que o ChartView precisa
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');

  const inputRef = useRef();

  // ... (Mantenha suas funções originais: useEffect do Chart.js, handleFile, loadRawData, handleAnalyze, etc) ...
  useEffect(() => {
    if (window.Chart) { setChartLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => setChartLoaded(true);
    document.head.appendChild(s);
  }, []);

  // Mantive sua lógica original de carregar dados
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

  // ... Restante das suas funções (handleAnalyze, handleAiChart, etc) sem alterações ...

  return (
    <div>
      {/* Todo o seu JSX original (Título, Card de Upload, Inputs) permanece igual */}
      <h1 style={{fontSize:20,fontWeight:700,color:'#002855',marginBottom:3,display:'flex',alignItems:'center',gap:8}}>
        Análise de Planilha
      </h1>
      
      {/* ... Card de Upload ... */}
      {/* ... Input de Pergunta ... */}

      {showChart && rawData.length > 0 && (
        <div className="card" style={{marginTop:16}}>
          <ChartView 
            data={rawData} 
            columns={meta?.columns || []} 
            aiConfig={aiChartConfig}
            chartType={chartType} 
            setChartType={setChartType}
            xCol={xCol} 
            setXCol={setXCol}
            yCol={yCol} 
            setYCol={setYCol}
          />
        </div>
      )}

      {/* ... Card de Resultados e Estatísticas ... */}
    </div>
  );
}
