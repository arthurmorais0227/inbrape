import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import TextAnalyzer from './pages/TextAnalyzer';
import ExcelAnalyzer from './pages/ExcelAnalyzer';
import ImageAnalyzer from './pages/ImageAnalyzer';
import DocumentAnalyzer from './pages/DocumentAnalyzer';
import PDFEditor from './pages/PDFEditor';
import History from './pages/History';
import AdminPanel from './pages/AdminPanel';
import './App.css';

const USER_TABS = [
  { id:'text',     label:'Texto',      d:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',        component: TextAnalyzer },
  { id:'excel',    label:'Planilha',   d:'M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z',                                   component: ExcelAnalyzer },
  { id:'image',    label:'Imagem',     d:'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', component: ImageAnalyzer },
  { id:'document', label:'Documentos', d:'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13',        component: DocumentAnalyzer },
  { id:'pdf',      label:'Editor PDF', d:'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',       component: PDFEditor },
  { id:'history',  label:'Histórico',  d:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                                                                                  component: History },
];

const ADMIN_TAB = { id:'admin', label:'Usuários', d:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', component: AdminPanel };

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('text');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('ai_token');
    const saved = localStorage.getItem('ai_user');
    if (token && saved) {
      fetch('http://localhost:3001/auth/verify', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => { if (r.ok) setUser(JSON.parse(saved)); else handleLogout(); })
        .catch(() => {});
    }
  }, []);

  // Poll pending count for admin
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const check = async () => {
      const token = localStorage.getItem('ai_token');
      try {
        const r = await fetch('http://localhost:3001/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await r.json();
        setPendingCount(data.filter(u => u.status === 'pending').length);
      } catch {}
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user]);

  function handleLogout() {
    localStorage.removeItem('ai_token');
    localStorage.removeItem('ai_user');
    setUser(null);
  }

  if (!user) return <Login onLogin={setUser}/>;

  const TABS = user.role === 'admin' ? [...USER_TABS, ADMIN_TAB] : USER_TABS;
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
            {/* User info + logout */}
            <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'5px 12px'}}>
              <div style={{width:22,height:22,background:'rgba(255,255,255,0.15)',borderRadius:50,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white'}}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{display:'flex',flexDirection:'column',lineHeight:1.2}}>
                <span style={{fontSize:12,color:'rgba(255,255,255,0.9)',fontWeight:600}}>{user.name}</span>
                {user.role === 'admin' && <span style={{fontSize:9,color:'#E87722',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>Admin</span>}
              </div>
              <button onClick={handleLogout} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.45)',padding:'0 0 0 4px',display:'flex',alignItems:'center'}} title="Sair">
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
            <button key={tab.id} className={`tab-btn ${activeTab===tab.id?'active':''}`} onClick={()=>setActiveTab(tab.id)} style={{position:'relative'}}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.d}/>
              </svg>
              {tab.label}
              {tab.id === 'admin' && pendingCount > 0 && (
                <span style={{position:'absolute',top:8,right:6,background:'#E87722',color:'white',borderRadius:10,padding:'0 5px',fontSize:9,fontWeight:700,minWidth:16,textAlign:'center'}}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <main className="main"><ActivePage/></main>
    </div>
  );
}
