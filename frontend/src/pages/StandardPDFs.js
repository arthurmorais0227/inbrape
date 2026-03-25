import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';
const I = ({d,size=14}) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:size,height:size,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('ai_token')}` };
}

export default function StandardPDFs() {
  const [pdfs, setPdfs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName]       = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile]       = useState(null);
  const [msg, setMsg]         = useState({ type:'', text:'' });
  const inputRef = useRef();

  useEffect(() => { fetchPDFs(); }, []);

  async function fetchPDFs() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/pdf-standards`, { headers: authHeaders() });
      if (r.ok) setPdfs(await r.json());
    } catch {}
    finally { setLoading(false); }
  }

  function showMsg(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 3500);
  }

  async function handleUpload() {
    if (!file || !name.trim()) { showMsg('error', 'Preencha o nome e selecione um arquivo.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      const r = await fetch(`${API_URL}/pdf-standards`, { method:'POST', headers: authHeaders(), body: fd });
      const data = await r.json();
      if (!r.ok) { showMsg('error', data.error || 'Erro ao enviar.'); return; }
      showMsg('success', 'PDF adicionado com sucesso!');
      setName(''); setDescription(''); setFile(null);
      fetchPDFs();
    } catch { showMsg('error', 'Erro ao enviar PDF.'); }
    finally { setUploading(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este PDF padrão?')) return;
    try {
      const r = await fetch(`${API_URL}/pdf-standards/${id}`, { method:'DELETE', headers: authHeaders() });
      if (r.ok) { showMsg('success', 'PDF removido.'); fetchPDFs(); }
      else showMsg('error', 'Erro ao remover.');
    } catch { showMsg('error', 'Erro ao remover.'); }
  }

  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }

  return (
    <div style={{marginTop:24}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18}}>
        <div style={{width:28,height:28,background:'#FDF3EA',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#E87722'}}>
          <I d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" size={15}/>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:'var(--navy)'}}>PDFs Padrão</div>
          <div style={{fontSize:12,color:'var(--gray-400)'}}>Catálogos e materiais disponíveis para mesclar com cotações</div>
        </div>
      </div>

      {msg.text && (
        <div style={{background:msg.type==='success'?'#ECFDF5':'#FEF2F2',border:`1px solid ${msg.type==='success'?'#6EE7B7':'#FCA5A5'}`,borderRadius:10,padding:'10px 14px',fontSize:13,color:msg.type==='success'?'#059669':'#DC2626',marginBottom:16,display:'flex',gap:7,alignItems:'center'}}>
          <I d={msg.type==='success'?'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z':'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}/>
          {msg.text}
        </div>
      )}

      {/* Upload form */}
      <div style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-lg)',padding:20,marginBottom:20,boxShadow:'var(--shadow-sm)'}}>
        <div style={{fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
          <I d="M12 4v16m8-8H4"/>
          Adicionar novo PDF padrão
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
          <div style={{flex:2,minWidth:160}}>
            <label className="label">Nome do documento</label>
            <input className="question-input" placeholder='Ex: Catálogo Mangas Filtrantes' value={name} onChange={e=>setName(e.target.value)}/>
          </div>
          <div style={{flex:2,minWidth:160}}>
            <label className="label">Descrição (opcional)</label>
            <input className="question-input" placeholder='Ex: Versão 2026' value={description} onChange={e=>setDescription(e.target.value)}/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          {!file ? (
            <div style={{border:'2px dashed var(--gray-200)',borderRadius:'var(--radius)',padding:'16px',textAlign:'center',cursor:'pointer',background:'var(--gray-50)'}} onClick={()=>inputRef.current.click()}>
              <I d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" size={20}/>
              <div style={{fontSize:13,color:'var(--gray-400)',marginTop:6}}>Clique para selecionar o PDF</div>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--navy-pale)',border:'1.5px solid rgba(0,40,85,0.15)',borderRadius:'var(--radius)',padding:'10px 14px'}}>
              <I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={20}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{file.name}</div>
                <div style={{fontSize:11,color:'var(--gray-400)'}}>{formatSize(file.size)}</div>
              </div>
              <button onClick={()=>setFile(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626'}}><I d="M6 18L18 6M6 6l12 12"/></button>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])}/>
        </div>
        <button className="btn btn-orange" style={{width:'auto',padding:'9px 18px',fontSize:13}} onClick={handleUpload} disabled={uploading||!file||!name.trim()}>
          {uploading?<><div className="spinner"/>Enviando...</>:<><I d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>Adicionar PDF padrão</>}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>Carregando...</div>
      ) : pdfs.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:'var(--gray-400)'}}>
          <I d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={36}/>
          <p style={{marginTop:10,fontWeight:500}}>Nenhum PDF padrão cadastrado</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {pdfs.map(pdf => (
            <div key={pdf.id} style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-lg)',padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'var(--shadow-sm)'}}>
              <div style={{width:40,height:40,background:'var(--navy-pale)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--navy)',flexShrink:0}}>
                <I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={20}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:'var(--navy)'}}>{pdf.name}</div>
                {pdf.description && <div style={{fontSize:12,color:'var(--gray-400)',marginTop:1}}>{pdf.description}</div>}
                <div style={{fontSize:11,color:'var(--gray-300)',marginTop:2}}>
                  Adicionado em {new Date(pdf.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <button onClick={()=>handleDelete(pdf.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:8,fontSize:12,color:'#DC2626',cursor:'pointer',fontFamily:'inherit'}}>
                <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}