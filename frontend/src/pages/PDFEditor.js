import React, { useState, useRef, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';
const I = ({d,size=14}) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:size,height:size,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('ai_token')}` };
}

export default function PDFEditor() {
  const [file, setFile]                 = useState(null);
  const [pages, setPages]               = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [watermark, setWatermark]       = useState('');
  const [annotation, setAnnotation]     = useState('');
  const [annotationPage, setAnnotationPage] = useState(1);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState('');
  const [error, setError]               = useState('');
  const [dragover, setDragover]         = useState(false);

  // PDFs padrão
  const [standardPDFs, setStandardPDFs] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState([]); // [{id, name, position}]
  const [loadingStandard, setLoadingStandard] = useState(false);

  const inputRef = useRef();

  useEffect(() => { fetchStandardPDFs(); }, []);

  async function fetchStandardPDFs() {
    setLoadingStandard(true);
    try {
      const r = await fetch(`${API_URL}/pdf-standards`, { headers: authHeaders() });
      if (r.ok) setStandardPDFs(await r.json());
    } catch {}
    finally { setLoadingStandard(false); }
  }

  function handleFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) { setError('Apenas arquivos PDF são aceitos.'); return; }
    setFile(f); setError(''); setSuccess('');
    setPages(Array.from({length: 5}, (_,i) => i+1));
    setSelectedPages([]); setSelectedStandard([]);
  }

  function togglePage(p) {
    setSelectedPages(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p]);
  }

  function toggleStandard(pdf) {
    setSelectedStandard(prev => {
      const exists = prev.find(s => s.id === pdf.id);
      if (exists) return prev.filter(s => s.id !== pdf.id);
      return [...prev, { id: pdf.id, name: pdf.name, position: prev.length + 2 }];
    });
  }

  function moveStandard(id, dir) {
    setSelectedStandard(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((s, i) => ({ ...s, position: i + 2 }));
    });
  }

  async function handleDownload(action) {
    if (!file) { setError('Carregue um PDF primeiro.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', action);
      if (action === 'watermark') formData.append('watermark', watermark);
      if (action === 'annotate') { formData.append('annotation', annotation); formData.append('annotationPage', annotationPage); }
      if (action === 'extract' && selectedPages.length > 0) formData.append('pages', JSON.stringify(selectedPages));
      if (action === 'merge') formData.append('standards', JSON.stringify(selectedStandard));

      const res = await fetch(`${API_URL}/pdf-edit`, { method:'POST', headers: authHeaders(), body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro ao processar PDF.'); }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.pdf','')}_${action === 'merge' ? 'mesclado' : 'editado'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('PDF baixado com sucesso!');
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }

  const isSelected = (id) => selectedStandard.some(s => s.id === id);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <div className="page-title-icon"><I d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
          Editor de PDF
        </h1>
        <p className="page-subtitle">Carregue um PDF, adicione páginas padrão, anotações, marca d'água e baixe.</p>
      </div>

      {/* Upload */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={17}/></div>
          <div><div className="card-title">Arquivo PDF principal</div><div className="card-desc">Ex: cotação, proposta, contrato</div></div>
        </div>
        {!file ? (
          <div className={`file-drop ${dragover?'dragover':''}`}
            onClick={()=>inputRef.current.click()}
            onDragOver={e=>{e.preventDefault();setDragover(true);}}
            onDragLeave={()=>setDragover(false)}
            onDrop={e=>{e.preventDefault();setDragover(false);handleFile(e.dataTransfer.files[0]);}}>
            <div className="file-drop-icon"><I d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={24}/></div>
            <div className="file-drop-title">Arraste o PDF aqui</div>
            <div className="file-drop-text">ou <span>clique para selecionar</span></div>
            <div className="file-drop-hint">Somente arquivos .PDF</div>
          </div>
        ) : (
          <div className="file-selected">
            <div className="file-selected-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={20}/></div>
            <div className="file-selected-info">
              <div className="file-selected-name">{file.name}</div>
              <div className="file-selected-size">{formatSize(file.size)} · {pages.length} páginas detectadas</div>
            </div>
            <button className="file-remove" onClick={()=>{setFile(null);setPages([]);setSelectedPages([]);setSuccess('');setSelectedStandard([]);}}><I d="M6 18L18 6M6 6l12 12"/></button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>

      {file && (
        <>
          {/* Mesclar PDFs padrão */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon" style={{background:'#FDF3EA',color:'#E87722'}}>
                <I d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" size={17}/>
              </div>
              <div>
                <div className="card-title">Anexar PDFs padrão</div>
                <div className="card-desc">Selecione catálogos ou materiais para adicionar após sua cotação</div>
              </div>
            </div>

            {loadingStandard ? (
              <div style={{textAlign:'center',padding:24,color:'var(--gray-400)'}}>Carregando PDFs padrão...</div>
            ) : standardPDFs.length === 0 ? (
              <div className="hint-box">
                <I d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                Nenhum PDF padrão cadastrado. O administrador pode adicionar PDFs na aba <strong>Usuários → PDFs Padrão</strong>.
              </div>
            ) : (
              <>
                {/* Lista de PDFs disponíveis */}
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                  {standardPDFs.map(pdf => (
                    <div key={pdf.id} onClick={()=>toggleStandard(pdf)} style={{
                      display:'flex',alignItems:'center',gap:12,
                      padding:'12px 14px',
                      background: isSelected(pdf.id) ? 'var(--navy-pale)' : 'var(--gray-50)',
                      border: `1.5px solid ${isSelected(pdf.id) ? 'var(--navy-mid)' : 'var(--gray-200)'}`,
                      borderRadius:'var(--radius)',cursor:'pointer',transition:'all 0.15s',
                    }}>
                      <div style={{width:36,height:36,background:isSelected(pdf.id)?'var(--navy)':'var(--gray-200)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',color:isSelected(pdf.id)?'white':'var(--gray-400)',flexShrink:0}}>
                        <I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={18}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:isSelected(pdf.id)?'var(--navy)':'var(--gray-800)'}}>{pdf.name}</div>
                        {pdf.description && <div style={{fontSize:11,color:'var(--gray-400)',marginTop:1}}>{pdf.description}</div>}
                      </div>
                      <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${isSelected(pdf.id)?'var(--navy)':'var(--gray-300)'}`,background:isSelected(pdf.id)?'var(--navy)':'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {isSelected(pdf.id) && <I d="M5 13l4 4L19 7" size={12}/>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ordem dos selecionados */}
                {selectedStandard.length > 0 && (
                  <div style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius)',padding:'14px'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:10}}>
                      Ordem de inserção
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'white',border:'1px solid var(--gray-200)',borderRadius:8}}>
                        <div style={{width:22,height:22,background:'var(--navy)',borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:11,fontWeight:700,flexShrink:0}}>1</div>
                        <span style={{fontSize:13,color:'var(--gray-600)',fontStyle:'italic',flex:1}}>{file.name} (seu arquivo)</span>
                      </div>
                      {selectedStandard.map((s, idx) => (
                        <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--navy-pale)',border:'1.5px solid rgba(0,40,85,0.15)',borderRadius:8}}>
                          <div style={{width:22,height:22,background:'var(--orange)',borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:11,fontWeight:700,flexShrink:0}}>{idx+2}</div>
                          <span style={{fontSize:13,color:'var(--navy)',fontWeight:500,flex:1}}>{s.name}</span>
                          <div style={{display:'flex',gap:4}}>
                            <button onClick={()=>moveStandard(s.id,-1)} disabled={idx===0} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--gray-200)',background:'white',cursor:idx===0?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:idx===0?0.4:1}}>
                              <I d="M5 15l7-7 7 7" size={12}/>
                            </button>
                            <button onClick={()=>moveStandard(s.id,1)} disabled={idx===selectedStandard.length-1} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--gray-200)',background:'white',cursor:idx===selectedStandard.length-1?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:idx===selectedStandard.length-1?0.4:1}}>
                              <I d="M19 9l-7 7-7-7" size={12}/>
                            </button>
                            <button onClick={()=>toggleStandard(s)} style={{width:26,height:26,borderRadius:6,border:'1px solid #FCA5A5',background:'#FEF2F2',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#DC2626'}}>
                              <I d="M6 18L18 6M6 6l12 12" size={12}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className="btn btn-orange" style={{marginTop:14,width:'auto',padding:'10px 18px',fontSize:13}} onClick={()=>handleDownload('merge')} disabled={loading || selectedStandard.length===0}>
                  {loading ? <><div className="spinner"/>Mesclando PDFs...</> : <><I d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/>Mesclar e baixar PDF ({selectedStandard.length+1} arquivo{selectedStandard.length>0?'s':''})</>}
                </button>
              </>
            )}
          </div>

          {/* Pages */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" size={17}/></div>
              <div><div className="card-title">Páginas ({pages.length})</div><div className="card-desc">Selecione páginas para extrair</div></div>
            </div>
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              <button className="btn btn-secondary" style={{width:'auto',padding:'5px 12px',fontSize:11}} onClick={()=>setSelectedPages([...pages])}>Selecionar todas</button>
              <button className="btn btn-secondary" style={{width:'auto',padding:'5px 12px',fontSize:11}} onClick={()=>setSelectedPages([])}>Limpar seleção</button>
              {selectedPages.length>0&&<span style={{fontSize:12,color:'var(--navy)',alignSelf:'center',fontWeight:600}}>{selectedPages.length} selecionada(s)</span>}
            </div>
            <div className="pdf-pages">
              {pages.map(p=>(
                <div key={p} className={`pdf-page-thumb ${selectedPages.includes(p)?'selected':''}`} onClick={()=>togglePage(p)}>
                  <div className="pdf-page-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={28}/></div>
                  <div className="pdf-page-num">Página {p}</div>
                </div>
              ))}
            </div>
            {selectedPages.length===0&&<div className="hint-box" style={{marginTop:10}}><I d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>Selecione as páginas desejadas antes de extrair.</div>}
            <button className="btn btn-secondary" style={{marginTop:10,width:'auto',padding:'9px 16px',fontSize:13}} onClick={()=>handleDownload('extract')} disabled={loading||selectedPages.length===0}>
              {loading?<><div className="spinner"/>Processando...</>:<><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Extrair {selectedPages.length>0?`${selectedPages.length} página(s)`:'páginas'}</>}
            </button>
          </div>

          {/* Watermark */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" size={17}/></div>
              <div><div className="card-title">Marca d'água</div><div className="card-desc">Texto exibido em todas as páginas</div></div>
            </div>
            <input className="question-input" placeholder='Ex: CONFIDENCIAL, RASCUNHO...' value={watermark} onChange={e=>setWatermark(e.target.value)}/>
            <button className="btn btn-secondary" style={{marginTop:10,width:'auto',padding:'9px 16px',fontSize:13}} onClick={()=>handleDownload('watermark')} disabled={loading||!watermark.trim()}>
              {loading?<><div className="spinner"/>Processando...</>:<><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Baixar com marca d'água</>}
            </button>
          </div>

          {/* Annotation */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" size={17}/></div>
              <div><div className="card-title">Adicionar anotação</div><div className="card-desc">Insere texto no rodapé de uma página</div></div>
            </div>
            <div style={{display:'flex',gap:10,marginBottom:10}}>
              <div style={{flex:1}}>
                <label className="label">Texto da anotação</label>
                <input className="question-input" placeholder='Ex: Aprovado por Arthur Morais...' value={annotation} onChange={e=>setAnnotation(e.target.value)}/>
              </div>
              <div style={{width:90}}>
                <label className="label">Página</label>
                <input className="question-input" type="number" min={1} max={pages.length} value={annotationPage} onChange={e=>setAnnotationPage(Number(e.target.value))} style={{textAlign:'center'}}/>
              </div>
            </div>
            <button className="btn btn-secondary" style={{width:'auto',padding:'9px 16px',fontSize:13}} onClick={()=>handleDownload('annotate')} disabled={loading||!annotation.trim()}>
              {loading?<><div className="spinner"/>Processando...</>:<><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Baixar com anotação</>}
            </button>
          </div>

          {/* Download original */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" size={17}/></div>
              <div><div className="card-title">Baixar original</div><div className="card-desc">Download do PDF sem alterações</div></div>
            </div>
            <button className="btn btn-success" style={{width:'auto',padding:'9px 16px',fontSize:13}} onClick={()=>{
              const url=URL.createObjectURL(file);
              const a=document.createElement('a');
              a.href=url;a.download=file.name;a.click();
              URL.revokeObjectURL(url);
              setSuccess('PDF original baixado!');
            }}>
              <I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Baixar PDF original
            </button>
          </div>
        </>
      )}

      {error&&<div className="error-box"><I d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>{error}</div>}
      {success&&<div className="success-box"><I d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>{success}</div>}
    </div>
  );
}