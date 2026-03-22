import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';

const I = ({ d }) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

const STATUS_COLORS = {
  approved: { bg:'#ECFDF5', color:'#059669', border:'#6EE7B7', label:'Aprovado' },
  pending:  { bg:'#FFFBEB', color:'#D97706', border:'#FCD34D', label:'Pendente' },
  rejected: { bg:'#FEF2F2', color:'#DC2626', border:'#FCA5A5', label:'Recusado' },
};

function Badge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return <span style={{background:s.bg,color:s.color,border:`1px solid ${s.border}`,borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600}}>{s.label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
      <div style={{background:'white',borderRadius:16,padding:28,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:'#002855'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8',padding:4}}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState({ type:'', text:'' });

  const token = localStorage.getItem('ai_token');

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await r.json();
      setUsers(data);
    } catch { showMsg('error', 'Erro ao carregar usuários.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function showMsg(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 3500);
  }

  async function updateStatus(id, status) {
    try {
      const r = await fetch(`${API_URL}/admin/users/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await r.json();
      if (!r.ok) { showMsg('error', data.error); return; }
      showMsg('success', status === 'approved' ? 'Usuário aprovado!' : 'Usuário recusado.');
      fetchUsers();
    } catch { showMsg('error', 'Erro ao atualizar.'); }
  }

  async function changePassword() {
    if (!newPass || newPass.length < 6) { showMsg('error', 'Senha deve ter pelo menos 6 caracteres.'); return; }
    try {
      const r = await fetch(`${API_URL}/admin/users/${modal.user.id}/password`, {
        method: 'PATCH', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: newPass }),
      });
      const data = await r.json();
      if (!r.ok) { showMsg('error', data.error); return; }
      showMsg('success', 'Senha alterada com sucesso!');
      setModal(null); setNewPass('');
    } catch { showMsg('error', 'Erro ao alterar senha.'); }
  }

  async function deleteUser(id) {
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      const r = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) { showMsg('error', data.error); return; }
      showMsg('success', 'Usuário removido.');
      fetchUsers();
    } catch { showMsg('error', 'Erro ao remover.'); }
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter);
  const pending = users.filter(u => u.status === 'pending').length;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#002855',display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
            <div style={{width:28,height:28,background:'#EAF0F8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#002855'}}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
            Gerenciar Usuários
          </h1>
          <p style={{fontSize:13,color:'#64748B'}}>{users.length} usuário(s) cadastrado(s){pending > 0 && <span style={{marginLeft:8,background:'#FFFBEB',color:'#D97706',border:'1px solid #FCD34D',borderRadius:20,padding:'1px 8px',fontSize:11,fontWeight:600}}>⚠ {pending} pendente(s)</span>}</p>
        </div>
      </div>

      {msg.text && (
        <div style={{background: msg.type==='success'?'#ECFDF5':'#FEF2F2', border:`1px solid ${msg.type==='success'?'#6EE7B7':'#FCA5A5'}`, borderRadius:10, padding:'10px 14px', fontSize:13, color: msg.type==='success'?'#059669':'#DC2626', marginBottom:16, display:'flex', gap:7, alignItems:'center'}}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d={msg.type==='success'?'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z':'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}/></svg>
          {msg.text}
        </div>
      )}

      <div style={{display:'flex',gap:6,marginBottom:18,background:'#F1F5F9',borderRadius:10,padding:3,width:'fit-content'}}>
        {['all','pending','approved','rejected'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:filter===f?'white':'transparent',color:filter===f?'#002855':'#94A3B8',boxShadow:filter===f?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
            {f==='all'?'Todos':STATUS_COLORS[f]?.label}
            {f==='pending' && pending > 0 && <span style={{marginLeft:5,background:'#E87722',color:'white',borderRadius:10,padding:'0 5px',fontSize:10}}>{pending}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:'#94A3B8'}}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:'#94A3B8'}}>Nenhum usuário encontrado.</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map(user => (
            <div key={user.id} style={{background:'white',border:'1px solid #E2E8F0',borderRadius:14,padding:'16px 20px',boxShadow:'0 1px 4px rgba(0,40,85,0.06)',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div style={{width:42,height:42,background: user.role==='admin'?'#002855':'#EAF0F8',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',color:user.role==='admin'?'white':'#002855',fontWeight:700,fontSize:16,flexShrink:0}}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:160}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                  <span style={{fontSize:14,fontWeight:600,color:'#1E293B'}}>{user.name}</span>
                  {user.role === 'admin' && <span style={{background:'#002855',color:'white',borderRadius:6,padding:'1px 7px',fontSize:10,fontWeight:700}}>ADMIN</span>}
                </div>
                <div style={{fontSize:12,color:'#94A3B8'}}>@{user.username} · {user.email}</div>
                <div style={{fontSize:11,color:'#CBD5E1',marginTop:2}}>
                  Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  {user.approvedAt && ` · Aprovado em ${new Date(user.approvedAt).toLocaleDateString('pt-BR')}`}
                </div>
              </div>
              <Badge status={user.status}/>
              {user.role !== 'admin' && (
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {user.status === 'pending' && (
                    <>
                      <button onClick={()=>updateStatus(user.id,'approved')} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#ECFDF5',border:'1px solid #6EE7B7',borderRadius:8,fontSize:12,fontWeight:600,color:'#059669',cursor:'pointer',fontFamily:'inherit'}}>
                        <I d="M5 13l4 4L19 7"/>Aprovar
                      </button>
                      <button onClick={()=>updateStatus(user.id,'rejected')} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:8,fontSize:12,fontWeight:600,color:'#DC2626',cursor:'pointer',fontFamily:'inherit'}}>
                        <I d="M6 18L18 6M6 6l12 12"/>Recusar
                      </button>
                    </>
                  )}
                  {user.status === 'approved' && (
                    <button onClick={()=>updateStatus(user.id,'rejected')} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:8,fontSize:12,fontWeight:600,color:'#DC2626',cursor:'pointer',fontFamily:'inherit'}}>
                      <I d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>Revogar
                    </button>
                  )}
                  {user.status === 'rejected' && (
                    <button onClick={()=>updateStatus(user.id,'approved')} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#ECFDF5',border:'1px solid #6EE7B7',borderRadius:8,fontSize:12,fontWeight:600,color:'#059669',cursor:'pointer',fontFamily:'inherit'}}>
                      <I d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>Reativar
                    </button>
                  )}
                  <button onClick={()=>{setModal({type:'password',user});setNewPass('');}} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#EAF0F8',border:'1px solid rgba(0,40,85,0.15)',borderRadius:8,fontSize:12,fontWeight:600,color:'#002855',cursor:'pointer',fontFamily:'inherit'}}>
                    <I d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>Senha
                  </button>
                  <button onClick={()=>deleteUser(user.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 10px',background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:8,fontSize:12,color:'#DC2626',cursor:'pointer',fontFamily:'inherit'}}>
                    <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'password' && (
        <Modal title={`Alterar senha — ${modal.user.name}`} onClose={()=>setModal(null)}>
          <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Digite a nova senha para <strong>@{modal.user.username}</strong>.</p>
          <input
            type="password" placeholder="Nova senha (mín. 6 caracteres)"
            value={newPass} onChange={e=>setNewPass(e.target.value)}
            style={{width:'100%',padding:'10px 12px',background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:9,fontSize:14,color:'#1E293B',outline:'none',fontFamily:'inherit',marginBottom:14,boxSizing:'border-box'}}
            onFocus={e=>e.target.style.borderColor='#1B4F8A'}
            onBlur={e=>e.target.style.borderColor='#E2E8F0'}
          />
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:'10px',background:'white',border:'1.5px solid #E2E8F0',borderRadius:9,fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
            <button onClick={changePassword} style={{flex:1,padding:'10px',background:'#002855',border:'none',borderRadius:9,fontSize:13,fontWeight:600,color:'white',cursor:'pointer',fontFamily:'inherit'}}>Salvar senha</button>
          </div>
        </Modal>
      )}
    </div>
  );
}