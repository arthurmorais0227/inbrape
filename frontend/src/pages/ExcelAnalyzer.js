// ── MAIN CHART COMPONENT ──────────────────────
function ChartView({ data, columns, aiConfig }) {
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  
  // Controles de Ordenação e Filtros Automáticos
  const [sortOrder, setSortOrder] = useState('none');
  const [activeFilters, setActiveFilters] = useState({});
  
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const numericCols = columns.filter(col => {
    const vals = data.slice(0, 20).map(r => r[col]);
    return vals.filter(v => v !== '' && !isNaN(Number(v))).length > vals.length * 0.5;
  });
  const textCols = columns.filter(c => !numericCols.includes(c));

  // Lógica de Detecção de Colunas Categóricas para Filtros Automáticos
  const filterableCols = useMemo(() => {
    return textCols.filter(col => {
      const uniqueVals = new Set(data.map(r => r[col]).filter(v => v !== '' && v != null));
      return uniqueVals.size > 0 && uniqueVals.size <= 15;
    });
  }, [data, textCols]);

  // --- NOVA: Função auxiliar de limpeza de nome para agrupamento ---
  const getGroupingKey = (str) => {
    if (!str) return '';
    return String(str)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // remove acentos
      .toLowerCase()
      .replace(/[./""]/g, '') // remove ./ " "
      .trim();
  };

  // --- NOVA: Lógica de Processamento de Dados (Filtro, Agrupamento e Métricas) ---
  // Esta lógica alimenta as métricas e serve de base para os gráficos
  const groupedAndFilteredData = useMemo(() => {
    let result = [...data];

    // 1. Aplicar Filtros Automáticos (sobre os dados originais)
    Object.entries(activeFilters).forEach(([col, val]) => {
      if (val) {
        result = result.filter(r => String(r[col]) === String(val));
      }
    });

    // 2. Agrupar por Eixo X se for texto e Eixo Y for numérico
    if (xCol && textCols.includes(xCol) && yCol && numericCols.includes(yCol)) {
      const grouped = {};
      result.forEach(row => {
        const rawX = row[xCol];
        const yVal = Number(row[yCol]);
        if (isNaN(yVal)) return; // Pular se não for número

        const groupingKey = getGroupingKey(rawX);
        if (!groupingKey) return; // Pular registros sem chave

        if (grouped[groupingKey]) {
          grouped[groupingKey][yCol] += yVal;
        } else {
          grouped[groupingKey] = {
            [xCol]: rawX, // Manter o nome original para exibição
            [yCol]: yVal
          };
        }
      });
      result = Object.values(grouped);
    }
    return result;
  }, [data, activeFilters, xCol, yCol, textCols, numericCols]);

  // --- NOVA: Lógica de Dados para Gráficos (Ordenação e Fatiamento Top 20) ---
  const chartData = useMemo(() => {
      let result = [...groupedAndFilteredData];
      
      // Aplicar Ordenação para gráficos normais (bar, line, etc.)
      // O Pareto tem ordenação própria descendente obrigatória e fatiamento
      if (chartType !== 'pareto' && yCol) {
          if (sortOrder === 'asc') {
              result.sort((a, b) => (Number(a[yCol]) || 0) - (Number(b[yCol]) || 0));
          } else if (sortOrder === 'desc') {
              result.sort((a, b) => (Number(b[yCol]) || 0) - (Number(a[yCol]) || 0));
          }
          result = result.slice(0, 20); // Top 20 para gráficos normais
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
    
    // Agora usamos chartData, que já está pré-processado (agrupado, filtrado, ordenado e fatiado)
    const labels = chartData.map(r => String(r[xCol]||'').slice(0,15));
    const values = chartData.map(r => Number(r[yCol])||0);
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

      {/* Pareto info */}
      {chartType === 'pareto' && (
        <div style={{background:'#FDF3EA',border:'1px solid #E87722',borderLeft:'3px solid #E87722',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#92400E',display:'flex',gap:7,marginBottom:12}}>
          <I d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <span><strong>Gráfico de Pareto (80/20):</strong> Barras azul escuro = 80% do impacto. Linha laranja = % acumulado. Ordena automaticamente do maior para o menor.</span>
        </div>
      )}

      {/* Controls: Eixos, Ordenação e Filtros Automáticos integrados */}
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
        <div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,gap:2,flexWrap:'wrap'}}>
          {CHART_TYPES.map(t => (
            <button key={t.id} onClick={()=>setChartType(t.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 11px',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:chartType===t.id?'white':'transparent',color:chartType===t.id?'#002855':'#94A3B8',boxShadow:chartType===t.id?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
              <I d={t.icon}/>{t.label}
            </button>
          ))}
        </div>
        
        {/* Eixos Originais */}
        <select value={xCol} onChange={e=>setXCol(e.target.value)} style={selectStyle}>
          <option value="">Eixo X</option>
          {columns.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={yCol} onChange={e=>setYCol(e.target.value)} style={selectStyle}>
          <option value="">Eixo Y (valor)</option>
          {numericCols.map(c=><option key={c} value={c}>{c}</option>)}
        </select>

        {/* --- NOVO: Ordenação (Ativado na interação anterior) --- */}
        <select value={sortOrder} onChange={e=>setSortOrder(e.target.value)} disabled={chartType === 'pareto'} style={selectStyle}>
          <option value="none">Ordenação Padrão</option>
          <option value="asc">Menor para Maior</option>
          <option value="desc">Maior para Menor</option>
        </select>

        {/* --- NOVO: Filtros Automáticos (Ativado na interação anterior) --- */}
        {filterableCols.map(col => {
          const uniqueValues = Array.from(new Set(data.map(r => r[col]).filter(Boolean))).sort();
          return (
            <select key={col} value={activeFilters[col] || ''} onChange={e => setActiveFilters(prev => ({...prev, [col]: e.target.value}))} style={selectStyle}>
              <option value="">Filtro: {col}</option>
              {uniqueValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          );
        })}
      </div>

      {/* Canvas */}
      <div style={{background:'white',border:'1px solid #E2E8F0',borderRadius:12,padding:20,height:320}}>
        {chartType === 'pareto'
          ? <ParetoChart data={chartData} xCol={xCol} yCol={yCol}/>
          : <canvas ref={canvasRef}/>
        }
      </div>

      {/* Stats - Agora usam groupedAndFilteredData (dados filtrados e agrupados) */}
      {yCol && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:12}}>
          {[
            {label:'Total',  value: groupedAndFilteredData.reduce((s,r)=>s+(Number(r[yCol])||0),0).toLocaleString('pt-BR',{maximumFractionDigits:2})},
            {label:'Média',  value: (groupedAndFilteredData.reduce((s,r)=>s+(Number(r[yCol])||0),0)/Math.max(1,groupedAndFilteredData.filter(r=>r[yCol]!=='').length)).toLocaleString('pt-BR',{maximumFractionDigits:2})},
            {label:'Máximo', value: (groupedAndFilteredData.length ? Math.max(...groupedAndFilteredData.map(r=>Number(r[yCol])||0)) : 0).toLocaleString('pt-BR',{maximumFractionDigits:2})},
            {label:'Mínimo', value: (groupedAndFilteredData.length ? Math.min(...groupedAndFilteredData.filter(r=>r[yCol]!=='').map(r=>Number(r[yCol])||0)) : 0).toLocaleString('pt-BR',{maximumFractionDigits:2})},
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