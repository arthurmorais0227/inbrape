import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
            type: 'bar', label: yCol, data: values,
            backgroundColor: values.map((_, i) => {
              const pct = cumulativeData[i];
              return pct <= 80 ? '#002855' : pct <= 95 ? '#1B4F8A' : '#94A3B8';
            }),
            borderRadius: 4, yAxisID: 'y', order: 2,
          },
          {
            type: 'line', label: '% Acumulado', data: cumulativeData,
            borderColor: '#E87722', backgroundColor: 'rgba(232,119,34,0.1)',
            pointBackgroundColor: '#E87722', pointRadius: 4,
            tension: 0.3, fill: false, yAxisID: 'y2', order: 1,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter,sans-serif', size: 12 }, color: '#475569' } },
          tooltip: { callbacks: { afterLabel: (ctx) => ctx.datasetIndex === 0 ? `Acumulado: ${cumulativeData[ctx.dataIndex]}%` : '' } },
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

// ── REPORT EXPORT ─────────────────────────────
function ReportExport({ data, columns, fileName }) {
  const [selectedFormat, setSelectedFormat] = useState('xlsx');
  const [filterText, setFilterText]         = useState('');
  const [showPreview, setShowPreview]       = useState(false);
  const [exported, setExported]             = useState(false);
  const sheetjsRef = useRef(false);

  // Carrega SheetJS uma vez
  useEffect(() => {
    if (sheetjsRef.current || window.XLSX) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(s);
    sheetjsRef.current = true;
  }, []);

  const yearCols  = columns.filter(c => /^20\d{2}$/.test(String(c)));
  const totalCol  = columns.find(c => String(c).toLowerCase().includes('total'));

  // Filtra linhas inválidas (rodapé de filtros, linhas vazias, cabeçalho duplo)
  const cleanRows = useMemo(() => data.filter(r => {
    const first = String(r[columns[0]] ?? '').trim();
    return first && first !== columns[0] && !first.startsWith('Filtros') && !first.startsWith('Representante Cliente');
  }), [data, columns]);

  // Aplica busca por texto
  const filteredRows = useMemo(() => {
    if (!filterText.trim()) return cleanRows;
    const q = filterText.toLowerCase();
    return cleanRows.filter(r => columns.some(c => String(r[c] ?? '').toLowerCase().includes(q)));
  }, [cleanRows, columns, filterText]);

  const grandTotal = totalCol
    ? filteredRows.reduce((s, r) => s + (Number(r[totalCol]) || 0), 0)
    : null;

  const baseName = (fileName || 'relatorio').replace(/\.[^/.]+$/, '');

  // ── exportadores ──
  function doExportCSV() {
    const header = columns.join(',');
    const body   = filteredRows.map(r =>
      columns.map(c => { const v = r[c] ?? ''; return String(v).includes(',') ? `"${v}"` : v; }).join(',')
    ).join('\n');
    triggerBlob(new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' }), baseName + '.csv');
  }

  function doExportJSON() {
    triggerBlob(new Blob([JSON.stringify(filteredRows, null, 2)], { type: 'application/json' }), baseName + '.json');
  }

  function doExportXLSX() {
    if (!window.XLSX) { alert('SheetJS ainda carregando, tente novamente em 2s.'); return; }
    const wsData = [columns, ...filteredRows.map(r => columns.map(c => r[c] ?? ''))];
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);

    // Estilo cabeçalho (SheetJS CE não suporta estilos avançados, mas define larguras)
    ws['!cols'] = columns.map(c => ({ wch: Math.max(String(c).length + 4, 14) }));

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    window.XLSX.writeFile(wb, baseName + '.xlsx');
  }

  function triggerBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    if (selectedFormat === 'csv')  doExportCSV();
    if (selectedFormat === 'json') doExportJSON();
    if (selectedFormat === 'xlsx') doExportXLSX();
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  }

  const FORMATS = [
    { id:'xlsx', label:'Excel (.xlsx)', icon:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5',  color:'#217346', bg:'#E8F5ED' },
    { id:'csv',  label:'CSV (.csv)',    icon:'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z', color:'#0066CC', bg:'#E5F0FF' },
    { id:'json', label:'JSON (.json)',  icon:'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',                                             color:'#7C3AED', bg:'#F0EBFF' },
  ];

  const sel = FORMATS.find(f => f.id === selectedFormat);

  const ss = { // selectStyle reutilizado
    padding:'6px 10px', border:'1.5px solid #E2E8F0', borderRadius:8,
    fontSize:12, color:'#475569', background:'white', fontFamily:'inherit', cursor:'pointer',
  };

  return (
    <div style={{marginTop:16,background:'white',border:'1px solid #E2E8F0',borderRadius:14,padding:20}}>

      {/* Cabeçalho */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#002855,#1B4F8A)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0}}>
          <I d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={16}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:'#002855'}}>Exportar Relatório</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>
            {filteredRows.length} registros · {columns.length} colunas
            {yearCols.length > 0 && ` · Anos: ${yearCols.join(', ')}`}
          </div>
        </div>
        {grandTotal !== null && (
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:14,fontWeight:700,color:'#002855'}}>
              {grandTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
            </div>
            <div style={{fontSize:10,color:'#94A3B8'}}>Total geral</div>
          </div>
        )}
      </div>

      {/* Busca / filtro */}
      <div style={{position:'relative',marginBottom:12}}>
        <div style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8',pointerEvents:'none'}}>
          <I d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={13}/>
        </div>
        <input
          placeholder="Filtrar dados antes de exportar…"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{width:'100%',boxSizing:'border-box',padding:'8px 12px 8px 30px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:12,color:'#475569',outline:'none',fontFamily:'inherit'}}
        />
        {filterText && (
          <button onClick={() => setFilterText('')}
            style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94A3B8',padding:2,display:'flex'}}>
            <I d="M18 6L6 18M6 6l12 12" size={13}/>
          </button>
        )}
      </div>
      {filterText && (
        <div style={{fontSize:11,color:'#E87722',marginBottom:10}}>
          Mostrando {filteredRows.length} de {cleanRows.length} registros
        </div>
      )}

      {/* Seleção de formato */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
        {FORMATS.map(f => (
          <button key={f.id} onClick={() => setSelectedFormat(f.id)}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,padding:'10px 8px',border:'2px solid',borderColor:selectedFormat===f.id ? f.color : '#E2E8F0',borderRadius:10,cursor:'pointer',background:selectedFormat===f.id ? f.bg : 'white',transition:'all 0.15s',fontFamily:'inherit'}}>
            <div style={{color:f.color}}>
              <I d={f.icon} size={18}/>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:selectedFormat===f.id ? f.color : '#64748B'}}>{f.label}</div>
          </button>
        ))}
      </div>

      {/* Pré-visualização */}
      <button onClick={() => setShowPreview(p => !p)}
        style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'1.5px solid #E2E8F0',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12,color:'#64748B',fontFamily:'inherit',marginBottom:12}}>
        <I d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" size={13}/>
        {showPreview ? 'Ocultar pré-visualização' : 'Pré-visualizar dados'}
      </button>

      {showPreview && filteredRows.length > 0 && (
        <div style={{marginBottom:14,overflowX:'auto',borderRadius:8,border:'1px solid #E2E8F0'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,fontFamily:'inherit'}}>
            <thead>
              <tr style={{background:'#002855'}}>
                {columns.map(c => (
                  <th key={c} style={{padding:'7px 11px',color:'white',fontWeight:700,whiteSpace:'nowrap',textAlign:yearCols.includes(c)||c===totalCol?'right':'left'}}>
                    {String(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.slice(0, 6).map((row, i) => (
                <tr key={i} style={{background:i%2===0?'white':'#F8FAFC'}}>
                  {columns.map(c => {
                    const isNum = (yearCols.includes(c) || c === totalCol) && !isNaN(Number(row[c]));
                    return (
                      <td key={c} style={{padding:'6px 11px',color:isNum?'#002855':'#475569',textAlign:isNum?'right':'left',fontWeight:isNum?600:400,borderBottom:'1px solid #F1F5F9',whiteSpace:'nowrap',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>
                        {isNum ? Number(row[c]).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : (row[c] ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length > 6 && (
            <div style={{padding:'7px 12px',fontSize:11,color:'#94A3B8',background:'#F8FAFC',borderTop:'1px solid #E2E8F0'}}>
              +{filteredRows.length - 6} linhas não exibidas
            </div>
          )}
        </div>
      )}

      {/* Botão exportar */}
      <button onClick={handleExport}
        style={{width:'100%',padding:'12px 20px',background:exported?'linear-gradient(135deg,#059669,#10B981)':'linear-gradient(135deg,#002855,#1B4F8A)',border:'none',borderRadius:10,cursor:'pointer',color:'white',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all 0.3s',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(0,40,85,0.2)'}}>
        <I d={exported ? 'M20 6L9 17l-5-5' : 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3'} size={16}/>
        {exported ? 'Exportado com sucesso!' : `Baixar ${sel?.label} (${filteredRows.length} registros)`}
      </button>

      <div style={{fontSize:11,color:'#94A3B8',textAlign:'center',marginTop:6}}>
        Arquivo: <strong style={{color:'#475569'}}>{baseName}.{selectedFormat}</strong>
      </div>
    </div>
  );
}

// ── CHART VIEW ────────────────────────────────
function ChartView({ data, columns, aiConfig }) {
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [sortOrder, setSortOrder] = useState('none');
  const [activeFilters, setActiveFilters] = useState({});
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const numericCols = columns.filter(col => {
    const vals = data.slice(0, 20).map(r => r[col]);
    return vals.filter(v => v !== '' && !isNaN(Number(v))).length > vals.length * 0.5;
  });
  const textCols = columns.filter(c => !numericCols.includes(c));

  const filterableCols = useMemo(() => textCols.filter(col => {
    const u = new Set(data.map(r => r[col]).filter(v => v !== '' && v != null));
    return u.size > 0 && u.size <= 15;
  }), [data, textCols]);

  const getGroupingKey = str => str ? String(str).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'').trim() : '';

  const groupedAndFilteredData = useMemo(() => {
    let result = [...data];
    Object.entries(activeFilters).forEach(([col, val]) => {
      if (val) result = result.filter(r => String(r[col]) === String(val));
    });
    if (xCol && textCols.includes(xCol) && yCol && numericCols.includes(yCol)) {
      const grouped = {};
      result.forEach(row => {
        const rawX = row[xCol];
        const yVal = Number(row[yCol]);
        if (isNaN(yVal)) return;
        const key = getGroupingKey(rawX);
        if (!key) return;
        if (grouped[key]) { grouped[key][yCol] += yVal; }
        else { grouped[key] = { [xCol]: rawX, [yCol]: yVal }; }
      });
      result = Object.values(grouped);
    }
    return result;
  }, [data, activeFilters, xCol, yCol, textCols, numericCols]);

  const chartData = useMemo(() => {
    let result = [...groupedAndFilteredData];
    if (chartType !== 'pareto' && yCol) {
      if (sortOrder === 'asc') result.sort((a,b) => (Number(a[yCol])||0)-(Number(b[yCol])||0));
      if (sortOrder === 'desc') result.sort((a,b) => (Number(b[yCol])||0)-(Number(a[yCol])||0));
      result = result.slice(0, 20);
    }
    return result;
  }, [groupedAndFilteredData, sortOrder, yCol, chartType]);

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

  useEffect(() => {
    if (chartType === 'pareto') return;
    if (!canvasRef.current || !xCol || !yCol || !chartData.length) return;
    const labels = chartData.map(r => String(r[xCol]||'').slice(0,15));
    const values = chartData.map(r => Number(r[yCol])||0);
    const colors = ['#002855','#1B4F8A','#2E6DB4','#E87722','#F5A623','#059669','#DC2626','#7C3AED','#0891B2','#D97706'];
    if (chartRef.current) chartRef.current.destroy();
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
        plugins: { legend: { position: chartType==='pie'||chartType==='doughnut'?'right':'top', labels:{ font:{family:'Inter,sans-serif',size:12}, color:'#475569' } } },
        scales: chartType==='bar'||chartType==='line' ? {
          x:{ ticks:{color:'#94A3B8',font:{size:11}}, grid:{color:'#F1F5F9'} },
          y:{ ticks:{color:'#94A3B8',font:{size:11}}, grid:{color:'#F1F5F9'} },
        } : {},
      },
    });
  }, [chartType, xCol, yCol, chartData]);

  if (!data.length) return null;

  const CHART_TYPES = [
    {id:'bar',      icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label:'Barras'},
    {id:'line',     icon:'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', label:'Linha'},
    {id:'pie',      icon:'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', label:'Pizza'},
    {id:'doughnut', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label:'Rosca'},
    {id:'pareto',   icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', label:'Pareto'},
  ];

  const selectStyle = {padding:'6px 10px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:12,color:'#475569',background:'white',fontFamily:'inherit',cursor:'pointer'};

  return (
    <div style={{marginTop:4}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <div style={{width:28,height:28,background:'#EAF0F8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#002855'}}>
          <I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={15}/>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'#002855'}}>Visualização gráfica</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>Mostrando até 20 registros agrupados (com filtros aplicados)</div>
        </div>
      </div>

      {chartType === 'pareto' && (
        <div style={{background:'#FDF3EA',border:'1px solid #E87722',borderLeft:'3px solid #E87722',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#92400E',display:'flex',gap:7,marginBottom:12}}>
          <I d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <span><strong>Gráfico de Pareto (80/20):</strong> Barras azul escuro = 80% do impacto. Linha laranja = % acumulado. Ordena automaticamente do maior para o menor.</span>
        </div>
      )}

      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
        <div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,gap:2,flexWrap:'wrap'}}>
          {CHART_TYPES.map(t => (
            <button key={t.id} onClick={()=>setChartType(t.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 11px',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:chartType===t.id?'white':'transparent',color:chartType===t.id?'#002855':'#94A3B8',boxShadow:chartType===t.id?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
              <I d={t.icon}/>{t.label}
            </button>
          ))}
        </div>
        <select value={xCol} onChange={e=>setXCol(e.target.value)} style={selectStyle}>
          <option value="">Eixo X</option>
          {columns.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={yCol} onChange={e=>setYCol(e.target.value)} style={selectStyle}>
          <option value="">Eixo Y (valor)</option>
          {numericCols.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortOrder} onChange={e=>setSortOrder(e.target.value)} disabled={chartType==='pareto'} style={selectStyle}>
          <option value="none">Ordenação Padrão</option>
          <option value="asc">Menor para Maior</option>
          <option value="desc">Maior para Menor</option>
        </select>
        {filterableCols.map(col => {
          const uniqueValues = Array.from(new Set(data.map(r => r[col]).filter(Boolean))).sort();
          return (
            <select key={col} value={activeFilters[col]||''} onChange={e=>setActiveFilters(prev=>({...prev,[col]:e.target.value}))} style={selectStyle}>
              <option value="">Filtro: {col}</option>
              {uniqueValues.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          );
        })}
      </div>

      <div style={{background:'white',border:'1px solid #E2E8F0',borderRadius:12,padding:20,height:320}}>
        {chartType==='pareto' ? <ParetoChart data={chartData} xCol={xCol} yCol={yCol}/> : <canvas ref={canvasRef}/>}
      </div>

      {yCol && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:12}}>
          {[
            {label:'Total',  value: groupedAndFilteredData.reduce((s,r)=>s+(Number(r[yCol])||0),0).toLocaleString('pt-BR',{maximumFractionDigits:2})},
            {label:'Média',  value: (groupedAndFilteredData.reduce((s,r)=>s+(Number(r[yCol])||0),0)/Math.max(1,groupedAndFilteredData.filter(r=>r[yCol]!=='').length)).toLocaleString('pt-BR',{maximumFractionDigits:2})},
            {label:'Máximo', value: (groupedAndFilteredData.length?Math.max(...groupedAndFilteredData.map(r=>Number(r[yCol])||0)):0).toLocaleString('pt-BR',{maximumFractionDigits:2})},
            {label:'Mínimo', value: (groupedAndFilteredData.length?Math.min(...groupedAndFilteredData.filter(r=>r[yCol]!=='').map(r=>Number(r[yCol])||0)):0).toLocaleString('pt-BR',{maximumFractionDigits:2})},
          ].map(s=>(
            <div key={s.label} style={{background:'white',border:'1px solid #E2E8F0',borderRadius:10,padding:'10px 14px',textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:700,color:'#002855'}}>{s.value}</div>
              <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{s.label} {yCol && `(${yCol})`}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────
export default function ExcelAnalyzer({ onNotify }) {
  const [file, setFile]                   = useState(null);
  const [question, setQuestion]           = useState('');
  const [chartPrompt, setChartPrompt]     = useState('');
  const [result, setResult]               = useState('');
  const [meta, setMeta]                   = useState(null);
  const [rawData, setRawData]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [loadingChart, setLoadingChart]   = useState(false);
  const [loadingAiChart, setLoadingAiChart] = useState(false);
  const [error, setError]                 = useState('');
  const [dragover, setDragover]           = useState(false);
  const [copied, setCopied]               = useState(false);
  const [showChart, setShowChart]         = useState(false);
  const [showExport, setShowExport]       = useState(false);   // ← NOVO
  const [chartLoaded, setChartLoaded]     = useState(false);
  const [aiChartConfig, setAiChartConfig] = useState(null);
  const [aiChartMsg, setAiChartMsg]       = useState('');
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
    setFile(f); setError(''); setResult(''); setMeta(null); setRawData([]);
    setShowChart(false); setShowExport(false); setAiChartConfig(null); setAiChartMsg('');
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

  // ── NOVO: abre o painel de exportação carregando os dados se necessário ──
  async function handleLoadExport() {
    if (!file) return;
    if (rawData.length === 0) {
      setLoadingChart(true);
      try { await loadRawData(); } catch (err) { setError(err.message); setLoadingChart(false); return; }
      setLoadingChart(false);
    }
    setShowExport(e => !e);
  }

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
        body: JSON.stringify({ text: chartPrompt, mode: 'summary', rows, columns: cols }),
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

      {/* Upload */}
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
            <button className="file-remove" onClick={()=>{setFile(null);setResult('');setMeta(null);setRawData([]);setShowChart(false);setShowExport(false);setAiChartConfig(null);setAiChartMsg('');}}>
              <I d="M6 18L18 6M6 6l12 12"/>
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>

      {/* Pergunta */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><I d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={17}/></div>
          <div><div className="card-title">Pergunta para análise</div><div className="card-desc">Opcional — deixe em branco para análise completa</div></div>
        </div>
        <input className="question-input" placeholder='Ex: "Qual produto teve mais vendas?"' value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAnalyze()}/>
      </div>

      {/* Gráfico com IA */}
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

      {/* Botões de ação */}
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button className="btn btn-orange" onClick={handleAnalyze} disabled={loading} style={{flex:2,minWidth:140}}>
          {loading?<><div className="spinner"/>Analisando...</>:<><I d="M13 10V3L4 14h7v7l9-11h-7z"/>Analisar com IA</>}
        </button>

        {file && chartLoaded && (
          <button className="btn btn-secondary" onClick={handleLoadChart} disabled={loadingChart} style={{flex:1,minWidth:120}}>
            {loadingChart?<><div className="spinner" style={{borderTopColor:'#002855'}}/>Carregando...</>:<><I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>Ver gráficos</>}
          </button>
        )}

        {/* ── NOVO: botão Exportar Relatório ── */}
        {file && (
          <button
            onClick={handleLoadExport}
            disabled={loadingChart}
            style={{
              flex:1, minWidth:140, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
              padding:'10px 16px', border:'1.5px solid',
              borderColor: showExport ? '#002855' : '#E2E8F0',
              borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600,
              background: showExport ? '#002855' : 'white',
              color: showExport ? 'white' : '#002855',
              transition:'all 0.2s',
            }}>
            <I d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={15}/>
            {showExport ? 'Fechar exportação' : 'Exportar relatório'}
          </button>
        )}
      </div>

      {/* Meta info */}
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

      {/* Gráfico */}
      {showChart && rawData.length > 0 && (
        <div className="card" style={{marginTop:16}}>
          <ChartView data={rawData} columns={cols} aiConfig={aiChartConfig}/>
        </div>
      )}

      {/* ── NOVO: Painel de exportação ── */}
      {showExport && rawData.length > 0 && (
        <ReportExport data={rawData} columns={cols} fileName={file?.name}/>
      )}

      {/* Resultado IA */}
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
            <button className="btn btn-secondary" onClick={()=>{setFile(null);setQuestion('');setResult('');setMeta(null);setRawData([]);setShowChart(false);setShowExport(false);setAiChartConfig(null);setAiChartMsg('');setChartPrompt('');}}>
              <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
