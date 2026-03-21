import React, { useState } from 'react';

const I = ({d}) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) { setError('Preencha todos os campos.'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Credenciais inválidas.'); return; }
      localStorage.setItem('ai_token', data.token);
      localStorage.setItem('ai_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #002855 0%, #1B4F8A 60%, #2E6DB4 100%)',
    }}>
      {/* Header stripe */}
      <div style={{height: 4, background: 'linear-gradient(90deg, #E87722, #F5A623, #E87722)'}}/>

      {/* Logo top */}
      <div style={{padding: '28px 40px', display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{background: 'white', borderRadius: 8, padding: '6px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)'}}>
          <img src="https://cic-rs.ind.br/wp-content/uploads/2025/06/INBRAPE-2.jpeg" alt="Inbrape" style={{height: 26, width: 'auto', display: 'block'}}/>
        </div>
        <div style={{width: 1, height: 30, background: 'rgba(255,255,255,0.2)'}}/>
        <div>
          <div style={{fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '-0.2px'}}>AI Doc Analyzer</div>
          <div style={{fontSize: 11, color: 'rgba(255,255,255,0.5)'}}>Sistema de análise inteligente</div>
        </div>
      </div>

      {/* Card */}
      <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px'}}>
        <div style={{
          background: 'white', borderRadius: 20, padding: '40px 36px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {/* Icon */}
          <div style={{
            width: 56, height: 56, background: '#EAF0F8', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: '#002855',
          }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width: 28, height: 28}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>

          <h1 style={{fontSize: 22, fontWeight: 800, color: '#002855', textAlign: 'center', marginBottom: 6}}>Acesso ao sistema</h1>
          <p style={{fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 28}}>Digite suas credenciais para continuar</p>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{marginBottom: 16}}>
              <label style={{fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 7}}>
                Usuário
              </label>
              <div style={{position: 'relative'}}>
                <div style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none'}}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width: 16, height: 16}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="seu.usuario"
                  value={form.username}
                  onChange={e => setForm(f => ({...f, username: e.target.value}))}
                  style={{
                    width: '100%', padding: '11px 12px 11px 38px',
                    background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                    borderRadius: 10, fontSize: 14, color: '#1E293B',
                    outline: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1B4F8A'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{marginBottom: 22}}>
              <label style={{fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 7}}>
                Senha
              </label>
              <div style={{position: 'relative'}}>
                <div style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none'}}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width: 16, height: 16}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  style={{
                    width: '100%', padding: '11px 40px 11px 38px',
                    background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                    borderRadius: 10, fontSize: 14, color: '#1E293B',
                    outline: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1B4F8A'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4,
                }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width: 16, height: 16}}>
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/> }
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8,
                padding: '9px 12px', fontSize: 13, color: '#DC2626',
                display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16,
              }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width: 14, height: 14, flexShrink: 0}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? '#94A3B8' : '#E87722',
              border: 'none', borderRadius: 10,
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', transition: 'background 0.2s',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(232,119,34,0.35)',
            }}>
              {loading ? (
                <>
                  <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>
                  Entrando...
                </>
              ) : (
                <>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  </svg>
                  Entrar no sistema
                </>
              )}
            </button>
          </form>

          <div style={{marginTop: 24, padding: '14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0'}}>
            <p style={{fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8}}>Credenciais padrão</p>
            <div style={{display:'flex', gap:16}}>
              <div><span style={{fontSize:11,color:'#94A3B8'}}>Usuário: </span><span style={{fontSize:12,fontWeight:600,color:'#002855'}}>admin</span></div>
              <div><span style={{fontSize:11,color:'#94A3B8'}}>Senha: </span><span style={{fontSize:12,fontWeight:600,color:'#002855'}}>inbrape2026</span></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'16px 40px', textAlign:'center'}}>
        <p style={{fontSize:11, color:'rgba(255,255,255,0.35)'}}>© 2026 Inbrape Tecidos Industriais · Sistema interno</p>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
