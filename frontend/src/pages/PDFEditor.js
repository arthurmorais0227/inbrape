import React, { useState, useRef } from 'react';

const I = ({d}) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

export default function PDFEditor() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [watermark, setWatermark] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [annotationPage, setAnnotationPage] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState([]); // 🔥 NOVO
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef();

  // 🔥 NOVO
  const extraOptions = [
    { id: 'gaiola', label: 'Gaiola' },
    { id: 'manga', label: 'Manga' },
    { id: 'manga_plissada', label: 'Manga Plissada' }
  ];

  function handleFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) { setError('Apenas arquivos PDF são aceitos.'); return; }
    setFile(f); setError(''); setSuccess('');
    const mockPages = Array.from({length: 5}, (_,i) => i+1);
    setPages(mockPages);
    setSelectedPages([]);
    setSelectedExtras([]); // reset extras
  }

  function togglePage(p) {
    setSelectedPages(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p]);
  }

  function toggleExtra(id) { // 🔥 NOVO
    setSelectedExtras(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  }

  function selectAll() { setSelectedPages([...pages]); }
  function clearSel() { setSelectedPages([]); }

  async function handleDownload(action) {
    if (!file) { setError('Carregue um PDF primeiro.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', action);

      if (action === 'watermark') formData.append('watermark', watermark);

      if (action === 'annotate') {
        formData.append('annotation', annotation);
        formData.append('annotationPage', annotationPage);
      }

      if (action === 'extract' && selectedPages.length > 0) {
        formData.append('pages', JSON.stringify(selectedPages));
      }

      // 🔥 NOVO
      if (action === 'merge' && selectedExtras.length > 0) {
        formData.append('extras', JSON.stringify(selectedExtras));
      }

      const res = await fetch('http://localhost:3001/pdf-edit', { method:'POST', body: formData });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Erro ao processar PDF.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.pdf','')}_editado.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('PDF baixado com sucesso!');
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <div className="page-title-icon"><I d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
          Editor de PDF
        </h1>
        <p className="page-subtitle">Carregue um PDF para adicionar anotações, marca d'água, extrair páginas e baixar.</p>
      </div>

      {/* Upload */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
          <div><div className="card-title">Arquivo PDF</div><div className="card-desc">Carregue o PDF que deseja editar</div></div>
        </div>

        {!file ? (
          <div className={`file-drop ${dragover?'dragover':''}`}
            onClick={()=>inputRef.current.click()}
            onDragOver={e=>{e.preventDefault();setDragover(true);}}
            onDragLeave={()=>setDragover(false)}
            onDrop={e=>{e.preventDefault();setDragover(false);handleFile(e.dataTransfer.files[0]);}}>
            <div className="file-drop-icon"><I d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
            <div className="file-drop-title">Arraste o PDF aqui</div>
            <div className="file-drop-text">ou <span>clique para selecionar</span></div>
            <div className="file-drop-hint">Somente arquivos .PDF</div>
          </div>
        ) : (
          <div className="file-selected">
            <div className="file-selected-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
            <div className="file-selected-info">
              <div className="file-selected-name">{file.name}</div>
              <div className="file-selected-size">{formatSize(file.size)} · {pages.length} páginas detectadas</div>
            </div>
            <button className="file-remove" onClick={()=>{setFile(null);setPages([]);setSelectedPages([]);setSelectedExtras([]);setSuccess('');}}>
              <I d="M6 18L18 6M6 6l12 12"/>
            </button>
          </div>
        )}

        <input ref={inputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>

      {file && (
        <>
          {/* 🔥 NOVO - CHECKLIST */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></div>
              <div>
                <div className="card-title">Adicionar páginas promocionais</div>
                <div className="card-desc">Selecione PDFs para anexar ao final</div>
              </div>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {extraOptions.map(opt => (
                <label key={opt.id} style={{display:'flex', gap:8, alignItems:'center', cursor:'pointer'}}>
                  <input
                    type="checkbox"
                    checked={selectedExtras.includes(opt.id)}
                    onChange={() => toggleExtra(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <button
              className="btn btn-navy"
              style={{marginTop:10, width:'auto', padding:'9px 16px', fontSize:13}}
              onClick={()=>handleDownload('merge')}
              disabled={loading || selectedExtras.length === 0}
            >
              {loading ? 'Processando...' : 'Gerar PDF com páginas extras'}
            </button>
          </div>

          {/* 🔽 TODO O RESTO CONTINUA IGUAL (watermark, annotation, extract, etc) */}

  function handleFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) { setError('Apenas arquivos PDF são aceitos.'); return; }
    setFile(f); setError(''); setSuccess('');
    // Simula páginas (em produção o backend retorna o total)
    const mockPages = Array.from({length: 5}, (_,i) => i+1);
    setPages(mockPages);
    setSelectedPages([]);
  }

  function togglePage(p) {
    setSelectedPages(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p]);
  }

  function selectAll() { setSelectedPages([...pages]); }
  function clearSel() { setSelectedPages([]); }

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

      const res = await fetch('http://localhost:3001/pdf-edit', { method:'POST', body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro ao processar PDF.'); }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.pdf','')}_editado.pdf`;
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <div className="page-title-icon"><I d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
          Editor de PDF
        </h1>
        <p className="page-subtitle">Carregue um PDF para adicionar anotações, marca d'água, extrair páginas e baixar.</p>
      </div>

      {/* Upload */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
          <div><div className="card-title">Arquivo PDF</div><div className="card-desc">Carregue o PDF que deseja editar</div></div>
        </div>
        {!file ? (
          <div className={`file-drop ${dragover?'dragover':''}`}
            onClick={()=>inputRef.current.click()}
            onDragOver={e=>{e.preventDefault();setDragover(true);}}
            onDragLeave={()=>setDragover(false)}
            onDrop={e=>{e.preventDefault();setDragover(false);handleFile(e.dataTransfer.files[0]);}}>
            <div className="file-drop-icon"><I d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
            <div className="file-drop-title">Arraste o PDF aqui</div>
            <div className="file-drop-text">ou <span>clique para selecionar</span></div>
            <div className="file-drop-hint">Somente arquivos .PDF</div>
          </div>
        ) : (
          <div className="file-selected">
            <div className="file-selected-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
            <div className="file-selected-info">
              <div className="file-selected-name">{file.name}</div>
              <div className="file-selected-size">{formatSize(file.size)} · {pages.length} páginas detectadas</div>
            </div>
            <button className="file-remove" onClick={()=>{setFile(null);setPages([]);setSelectedPages([]);setSuccess('');}}><I d="M6 18L18 6M6 6l12 12"/></button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>

      {file && (
        <>
          {/* Pages */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></div>
              <div><div className="card-title">Páginas ({pages.length})</div><div className="card-desc">Selecione páginas para extrair</div></div>
            </div>
            <div style={{display:'flex', gap:6, marginBottom:12}}>
              <button className="btn btn-secondary" style={{width:'auto',padding:'5px 12px',fontSize:11}} onClick={selectAll}>Selecionar todas</button>
              <button className="btn btn-secondary" style={{width:'auto',padding:'5px 12px',fontSize:11}} onClick={clearSel}>Limpar seleção</button>
              {selectedPages.length > 0 && <span style={{fontSize:12,color:'var(--navy)',alignSelf:'center',fontWeight:600}}>{selectedPages.length} selecionada(s)</span>}
            </div>
            <div className="pdf-pages">
              {pages.map(p => (
                <div key={p} className={`pdf-page-thumb ${selectedPages.includes(p)?'selected':''}`} onClick={()=>togglePage(p)}>
                  <div className="pdf-page-icon"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></div>
                  <div className="pdf-page-num">Página {p}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Watermark */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></div>
              <div><div className="card-title">Marca d'água</div><div className="card-desc">Texto exibido em todas as páginas</div></div>
            </div>
            <input className="question-input" placeholder='Ex: CONFIDENCIAL, RASCUNHO, Inbrape 2026...' value={watermark} onChange={e=>setWatermark(e.target.value)}/>
            <button className="btn btn-secondary" style={{marginTop:10, width:'auto', padding:'9px 16px', fontSize:13}} onClick={()=>handleDownload('watermark')} disabled={loading || !watermark.trim()}>
              {loading ? <><div className="spinner"/>Processando...</> : <><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Baixar com marca d'água</>}
            </button>
          </div>

          {/* Annotation */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></div>
              <div><div className="card-title">Adicionar anotação</div><div className="card-desc">Insere texto no rodapé de uma página</div></div>
            </div>
            <div style={{display:'flex', gap:10, marginBottom:10}}>
              <div style={{flex:1}}>
                <label className="label"><I d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>Texto da anotação</label>
                <input className="question-input" placeholder='Ex: Aprovado por Arthur Morais - 21/03/2026' value={annotation} onChange={e=>setAnnotation(e.target.value)}/>
              </div>
              <div style={{width:90}}>
                <label className="label"><I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>Página</label>
                <input className="question-input" type="number" min={1} max={pages.length} value={annotationPage} onChange={e=>setAnnotationPage(Number(e.target.value))} style={{textAlign:'center'}}/>
              </div>
            </div>
            <button className="btn btn-secondary" style={{width:'auto', padding:'9px 16px', fontSize:13}} onClick={()=>handleDownload('annotate')} disabled={loading || !annotation.trim()}>
              {loading ? <><div className="spinner"/>Processando...</> : <><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Baixar com anotação</>}
            </button>
          </div>

          {/* Extract pages */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></div>
              <div><div className="card-title">Extrair páginas</div><div className="card-desc">Gera um novo PDF só com as páginas selecionadas</div></div>
            </div>
            {selectedPages.length === 0 && (
              <div className="hint-box"><I d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>Selecione as páginas desejadas no painel acima antes de extrair.</div>
            )}
            <button className="btn btn-navy" style={{marginTop:10, background:'var(--navy-mid)', width:'auto', padding:'9px 16px', fontSize:13}} onClick={()=>handleDownload('extract')} disabled={loading || selectedPages.length === 0}>
              {loading ? <><div className="spinner"/>Processando...</> : <><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Extrair {selectedPages.length > 0 ? `${selectedPages.length} página(s)` : 'páginas'}</>}
            </button>
          </div>

          {/* Download original */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon"><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></div>
              <div><div className="card-title">Baixar original</div><div className="card-desc">Download do PDF sem alterações</div></div>
            </div>
            <button className="btn btn-success" style={{width:'auto', padding:'9px 16px', fontSize:13}} onClick={()=>{
              const url = URL.createObjectURL(file);
              const a = document.createElement('a');
              a.href = url; a.download = file.name; a.click();
              URL.revokeObjectURL(url);
              setSuccess('PDF original baixado!');
            }}>
              <I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Baixar PDF original
            </button>
          </div>
        </>
      )}

      {error && <div className="error-box"><I d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>{error}</div>}
      {success && <div className="success-box"><I d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>{success}</div>}
    </div>
  );
}
