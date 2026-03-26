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
      bar:{ type:'bar', data:{ labels, datasets:[{ label:yCol, data:values, backgroundColor:colors, borderRadius:6 }] }},
      line:{ type:'line', data:{ labels, datasets:[{ label:yCol, data:values, borderColor:'#002855', backgroundColor:'rgba(0,40,85,0.08)', tension:0.4, fill:true }] }},
      pie:{ type:'pie', data:{ labels, datasets:[{ data:values, backgroundColor:colors }] }},
      doughnut:{ type:'doughnut', data:{ labels, datasets:[{ data:values, backgroundColor:colors }] }},
    };

    chartRef.current = new Chart(canvasRef.current, {
      ...config[chartType],
      options:{ responsive:true, maintainAspectRatio:false }
    });

  }, [chartType, xCol, yCol, processedData]);

  if (!data.length) return null;

  const CHART_TYPES = [
    {id:'bar', icon:'M9 19v-6a2 2 0 00-2-2H5...', label:'Barras'},
    {id:'line', icon:'M7 12l3-3 3 3 4-4...', label:'Linha'},
    {id:'pie', icon:'M11 3.055A9.001...', label:'Pizza'},
    {id:'doughnut', icon:'M9 19v-6a2...', label:'Rosca'},
    {id:'pareto', icon:'M3 3h2l.4 2...', label:'Pareto'},
  ];

  return (
    <div style={{marginTop:4}}>

      {/* CONTROLES */}
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>

        {/* TIPOS DE GRÁFICO COM ÍCONE */}
        <div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,gap:2}}>
          {CHART_TYPES.map(t => (
            <button
              key={t.id}
              onClick={()=>setChartType(t.id)}
              style={{
                display:'flex',
                alignItems:'center',
                gap:5,
                padding:'6px 11px',
                border:'none',
                borderRadius:8,
                fontSize:12,
                fontWeight:600,
                cursor:'pointer',
                background:chartType===t.id?'white':'transparent',
                color:chartType===t.id?'#002855':'#94A3B8',
                boxShadow:chartType===t.id?'0 1px 4px rgba(0,0,0,0.1)':'none'
              }}
            >
              <I d={t.icon} size={14}/>
              {t.label}
            </button>
          ))}
        </div>

        {/* ORDENAÇÃO */}
        <div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,gap:2}}>
          {[
            {id:'desc', label:'Maior'},
            {id:'asc', label:'Menor'},
            {id:'az', label:'A→Z'},
            {id:'za', label:'Z→A'},
          ].map(opt => (
            <button
              key={opt.id}
              onClick={()=>setSortType(opt.id)}
              style={{
                padding:'6px 10px',
                border:'none',
                borderRadius:8,
                fontSize:11,
                fontWeight:600,
                cursor:'pointer',
                background:sortType===opt.id?'white':'transparent',
                color:sortType===opt.id?'#002855':'#94A3B8',
                boxShadow:sortType===opt.id?'0 1px 4px rgba(0,0,0,0.1)':'none'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* SELECTS ESTILIZADOS (IGUAL ANTES) */}
        <select
          value={xCol}
          onChange={e=>setXCol(e.target.value)}
          style={{
            padding:'6px 10px',
            border:'1.5px solid #E2E8F0',
            borderRadius:8,
            fontSize:12,
            color:'#475569',
            background:'white',
            fontFamily:'inherit',
            cursor:'pointer'
          }}
        >
          <option value="">Eixo X</option>
          {columns.map(c=><option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={yCol}
          onChange={e=>setYCol(e.target.value)}
          style={{
            padding:'6px 10px',
            border:'1.5px solid #E2E8F0',
            borderRadius:8,
            fontSize:12,
            color:'#475569',
            background:'white',
            fontFamily:'inherit',
            cursor:'pointer'
          }}
        >
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
