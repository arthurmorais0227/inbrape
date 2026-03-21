import React, { useState } from 'react';

const EyeIcon = ({ open }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}>
    {open
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
    }
  </svg>
);

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';

function Field({ label, type, placeholder, value, onChange, icon, showToggle, show, onToggle }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{fontSize:10,fontWeight:700,color:'#475569',letterSpacing:'0.8px',textTransform:'uppercase',display:'block',marginBottom:6}}>{label}</label>
      <div style={{position:'relative'}}>
        <div style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#94A3B8',pointerEvents:'none'}}>{icon}</div>
        <input
          type={showToggle ? (show ? 'text' : 'password') : type}
          placeholder={placeholder} value={value} onChange={onChange}
          style={{width:'100%',padding:`10px ${showToggle?'38px':'12px'} 10px 36px`,background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:9,fontSize:13,color:'#1E293B',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
          onFocus={e=>e.target.style.borderColor='#1B4F8A'}
          onBlur={e=>e.target.style.borderColor='#E2E8F0'}
        />
        {showToggle && <button type="button" onClick={onToggle} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94A3B8',padding:3}}><EyeIcon open={show}/></button>}
      </div>
    </div>
  );
}

const PersonIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;
const LockIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>;
const MailIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [login, setLogin] = useState({ username:'', password:'' });
  const [register, setRegister] = useState({ username:'', name:'', email:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!login.username || !login.password) { setError('Preencha todos os campos.'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API_URL}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(login) });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      localStorage.setItem('ai_token', data.token);
      localStorage.setItem('ai_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch { setError('Erro de conexão com o servidor.'); }
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!register.username || !register.name || !register.email || !register.password) { setError('Preencha todos os campos.'); return; }
    if (register.password !== register.confirm) { setError('As senhas não coincidem.'); return; }
    if (register.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`${API_URL}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:register.username, name:register.name, email:register.email, password:register.password }) });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      setSuccess('Solicitação enviada! Aguarde aprovação do administrador.');
      setRegister({ username:'', name:'', email:'', password:'', confirm:'' });
      setTimeout(() => { setTab('login'); setSuccess(''); }, 4000);
    } catch { setError('Erro de conexão com o servidor.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'linear-gradient(135deg,#002855 0%,#1B4F8A 60%,#2E6DB4 100%)',fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      <div style={{height:4,background:'linear-gradient(90deg,#E87722,#F5A623,#E87722)'}}/>
      <div style={{padding:'22px 36px',display:'flex',alignItems:'center',gap:12}}>
        <div style={{background:'white',borderRadius:8,padding:'5px 10px',boxShadow:'0 2px 10px rgba(0,0,0,0.2)',display:'flex',alignItems:'center'}}>
          <img src="https://cic-rs.ind.br/wp-content/uploads/2025/06/INBRAPE-2.jpeg" alt="Inbrape" style={{height:24,width:'auto'}}/>
        </div>
        <div style={{width:1,height:28,background:'rgba(255,255,255,0.2)'}}/>
        <div><div style={{fontSize:13,fontWeight:700,color:'white'}}>AI Doc Analyzer</div><div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginTop:1}}>Sistema de análise inteligente</div></div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
        <div style={{background:'white',borderRadius:20,padding:'36px 32px',width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
          <div style={{width:50,height:50,background:'#EAF0F8',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',color:'#002855'}}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:24,height:24}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#002855',textAlign:'center',marginBottom:4}}>{tab==='login'?'Acesso ao sistema':'Solicitar acesso'}</h1>
          <p style={{fontSize:12,color:'#94A3B8',textAlign:'center',marginBottom:22}}>{tab==='login'?'Entre com suas credenciais':'Preencha os dados para solicitar uma conta'}</p>
          <div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,marginBottom:24}}>
            <button style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:tab==='login'?'white':'transparent',color:tab==='login'?'#002855':'#94A3B8',boxShadow:tab==='login'?'0 1px 4px rgba(0,0,0,0.1)':'none'}} onClick={()=>{setTab('login');setError('');setSuccess('');}}>Entrar</button>
            <button style={{flex:1,padding:'8px',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:tab==='register'?'white':'transparent',color:tab==='register'?'#002855':'#94A3B8',boxShadow:tab==='register'?'0 1px 4px rgba(0,0,0,0.1)':'none'}} onClick={()=>{setTab('register');setError('');setSuccess('');}}>Criar conta</button>
          </div>
          {error && <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#DC2626',display:'flex',gap:7,alignItems:'center',marginBottom:14}}><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:13,height:13,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{error}</div>}
          {success && <div style={{background:'#ECFDF5',border:'1px solid #6EE7B7',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#059669',display:'flex',gap:7,alignItems:'center',marginBottom:14}}><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:13,height:13,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{success}</div>}
          {tab==='login' ? (
            <form onSubmit={handleLogin}>
              <Field label="Usuário" type="text" placeholder="seu.usuario" value={login.username} onChange={e=>setLogin(f=>({...f,username:e.target.value}))} icon={<PersonIcon/>}/>
              <Field label="Senha" type="password" placeholder="••••••••" value={login.password} onChange={e=>setLogin(f=>({...f,password:e.target.value}))} icon={<LockIcon/>} showToggle show={showPass} onToggle={()=>setShowPass(s=>!s)}/>
              <button type="submit" disabled={loading} style={{width:'100%',padding:'12px',background:'#E87722',border:'none',borderRadius:10,color:'white',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:7,boxShadow:'0 4px 14px rgba(232,119,34,0.32)',opacity:loading?0.7:1}}>
                {loading?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Entrando...</>:<>Entrar no sistema</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <Field label="Nome completo" type="text" placeholder="Seu Nome" value={register.name} onChange={e=>setRegister(f=>({...f,name:e.target.value}))} icon={<PersonIcon/>}/>
              <Field label="Usuário" type="text" placeholder="seu.usuario" value={register.username} onChange={e=>setRegister(f=>({...f,username:e.target.value}))} icon={<PersonIcon/>}/>
              <Field label="E-mail" type="email" placeholder="email@inbrape.com.br" value={register.email} onChange={e=>setRegister(f=>({...f,email:e.target.value}))} icon={<MailIcon/>}/>
              <Field label="Senha" type="password" placeholder="Mínimo 6 caracteres" value={register.password} onChange={e=>setRegister(f=>({...f,password:e.target.value}))} icon={<LockIcon/>} showToggle show={showRegPass} onToggle={()=>setShowRegPass(s=>!s)}/>
              <Field label="Confirmar senha" type="password" placeholder="Repita a senha" value={register.confirm} onChange={e=>setRegister(f=>({...f,confirm:e.target.value}))} icon={<LockIcon/>}/>
              <div style={{background:'#EAF0F8',border:'1px solid rgba(0,40,85,0.1)',borderRadius:8,padding:'9px 12px',fontSize:11,color:'#1B4F8A',marginBottom:14,display:'flex',gap:6}}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:13,height:13,flexShrink:0,marginTop:1}}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Sua conta será ativada após aprovação do administrador.
              </div>
              <button type="submit" disabled={loading} style={{width:'100%',padding:'12px',background:'#002855',border:'none',borderRadius:10,color:'white',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:7,opacity:loading?0.7:1}}>
                {loading?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Enviando...</>:<>Solicitar acesso</>}
              </button>
            </form>
          )}
        </div>
      </div>
      <div style={{padding:'14px',textAlign:'center'}}><p style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>© 2026 Inbrape Tecidos Industriais · Sistema interno</p></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
