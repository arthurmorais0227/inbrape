import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import TextAnalyzer from './pages/TextAnalyzer';
import ExcelAnalyzer from './pages/ExcelAnalyzer';
import ImageAnalyzer from './pages/ImageAnalyzer';
import DocumentAnalyzer from './pages/DocumentAnalyzer';
import PDFEditor from './pages/PDFEditor';
import History from './pages/History';
import './App.css';

const TABS = [
  { id:'text',     label:'Texto',      d:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',        component: TextAnalyzer },
  { id:'excel',    label:'Planilha',   d:'M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z',                                   component: ExcelAnalyzer },
  { id:'image',    label:'Imagem',     d:'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', component: ImageAnalyzer },
  { id:'document', label:'Documentos', d:'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13',        component: DocumentAnalyzer },
  { id:'pdf',      label:'Editor PDF', d:'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',       component: PDFEditor },
  { id:'history',  label:'Histórico',  d:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                                                                                  component: History },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('text');

  useEffect(() => {
    const token = localStorage.getItem('ai_token');
    const savedUser = localStorage.getItem('ai_user');
    if (token && savedUser) {
      // Verifica se o token ainda é válido
      fetch('http://localhost:3001/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => {
        if (r.ok) setUser(JSON.parse(savedUser));
        else { localStorage.removeItem('ai_token'); localStorage.removeItem('ai_user'); }
      }).catch(() => {});
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('ai_token');
    localStorage.removeItem('ai_user');
    setUser(null);
  }

  if (!user) return <Login onLogin={setUser}/>;

  const ActivePage = TABS.find(t => t.id === activeTab)?.component;

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="logo">
            <div className="logo-img-wrap">
              <img src="https://cic-rs.ind.br/wp-content/uploads/2025/06/INBRAPE-2.jpeg" alt="Inbrape" style={{height:28,width:'auto'}}/>
            </div>
            <div className="logo-divider"/>
            <div className="logo-info">
              <span className="logo-text">AI Doc Analyzer</span>
              <span className="logo-sub">Análise inteligente com IA · Groq LLaMA 3.3</span>
            </div>
          </div>
          <div className="header-right">
            <div className="header-badge">
              <span className="header-badge-dot"/>
              Sistema online
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'5px 12px'}}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14,color:'rgba(255,255,255,0.7)'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.8)',fontWeight:500}}>{user.username}</span>
              <button onClick={handleLogout} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',padding:'0 0 0 4px',display:'flex',alignItems:'center'}} title="Sair">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="header-stripe"/>
      </header>

      <div className="tabs-wrapper">
        <nav className="tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab===tab.id?'active':''}`} onClick={()=>setActiveTab(tab.id)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.d}/>
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="main"><ActivePage/></main>
    </div>
  );
}
