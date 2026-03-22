import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { saveToHistory } from '../services/storage';

const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape-production.up.railway.app';

const I = ({d,size=14}) => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:size,height:size,flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;

const SUGGESTIONS = [
  'Resuma este texto para mim:',
  'Quais são os pontos principais sobre:',
  'Explique de forma simples o que é:',
  'Faça uma análise crítica de:',
  'Traduza para o inglês:',
  'Melhore a redação deste texto:',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{display:'flex',gap:10,alignItems:'flex-start',flexDirection: isUser?'row-reverse':'row',marginBottom:16}}>
      {/* Avatar */}
      <div style={{
        width:32,height:32,borderRadius:10,flexShrink:0,
        display:'flex',alignItems:'center',justifyContent:'center',
        background: isUser ? '#002855' : '#EAF0F8',
        color: isUser ? 'white' : '#002855',
        fontSize:12,fontWeight:700,
      }}>
        {isUser
          ? (msg.userName?.charAt(0).toUpperCase() || 'U')
          : <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        }
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth:'75%',
        background: isUser ? '#002855' : 'white',
        color: isUser ? 'white' : '#1E293B',
        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        padding:'12px 16px',
        boxShadow: isUser ? '0 2px 8px rgba(0,40,85,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
        border: isUser ? 'none' : '1px solid #E2E8F0',
        fontSize:14,lineHeight:1.65,
      }}>
        {msg.loading ? (
          <div style={{display:'flex',gap:4,alignItems:'center',padding:'2px 0'}}>
            {[0,1,2].map(i => (
              <div key={i} style={{width:7,height:7,borderRadius:'50%',background:'#94A3B8',animation:`bounce 1s ease-in-out ${i*0.15}s infinite`}}/>
            ))}
          </div>
        ) : (
          <div className={isUser ? '' : 'result-text'} style={{color: isUser?'white':undefined}}>
            {isUser
              ? <p style={{margin:0}}>{msg.content}</p>
              : <ReactMarkdown>{msg.content}</ReactMarkdown>
            }
          </div>
        )}
        <div style={{fontSize:10,color: isUser?'rgba(255,255,255,0.45)':'#CBD5E1',marginTop:6,textAlign:'right'}}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

export default function TextAnalyzer() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('ai_user') || '{}');

  // Load saved conversation
  useEffect(() => {
    const saved = localStorage.getItem(`@chat_${user.id || 'guest'}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setMessages(parsed.messages || []);
      setConversationHistory(parsed.history || []);
    } else {
      // Welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Olá${user.name ? ', ' + user.name : ''}! 👋 Sou seu assistente de IA. Posso ajudar com análise de textos, resumos, traduções, redação e muito mais.\n\nComo posso te ajudar hoje?`,
        time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}),
      }]);
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save conversation
  function saveConversation(msgs, hist) {
    localStorage.setItem(`@chat_${user.id || 'guest'}`, JSON.stringify({ messages: msgs, history: hist }));
  }

  function getTime() {
    return new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  }

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now().toString(), role:'user', content: text.trim(), time: getTime(), userName: user.name };
    const loadingMsg = { id: 'loading', role:'assistant', content:'', loading:true, time:'' };

    const newMessages = [...messages, userMsg, loadingMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Build conversation history for Groq
    const newHistory = [...conversationHistory, { role:'user', content: text.trim() }];

    try {
      const token = localStorage.getItem('ai_token');
      const r = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao obter resposta.');

      const assistantMsg = { id: (Date.now()+1).toString(), role:'assistant', content: data.result, time: getTime() };
      const updatedHistory = [...newHistory, { role:'assistant', content: data.result }];
      const updatedMessages = [...messages, userMsg, assistantMsg];

      setMessages(updatedMessages);
      setConversationHistory(updatedHistory);
      saveConversation(updatedMessages, updatedHistory);
      saveToHistory({ type:'text', text: text.trim().slice(0,80), mode:'chat', result: data.result });
    } catch (err) {
      const errMsg = { id: (Date.now()+1).toString(), role:'assistant', content: `Desculpe, ocorreu um erro: ${err.message}`, time: getTime() };
      const updatedMessages = [...messages, userMsg, errMsg];
      setMessages(updatedMessages);
      saveConversation(updatedMessages, conversationHistory);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function handleClear() {
    if (!window.confirm('Limpar toda a conversa?')) return;
    const welcome = [{
      id: 'welcome',
      role: 'assistant',
      content: `Conversa reiniciada! Como posso te ajudar?`,
      time: getTime(),
    }];
    setMessages(welcome);
    setConversationHistory([]);
    saveConversation(welcome, []);
  }

  function handleCopyLast() {
    const lastAi = [...messages].reverse().find(m => m.role === 'assistant' && !m.loading);
    if (lastAi) navigator.clipboard.writeText(lastAi.content);
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 130px)',minHeight:500}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'#EAF0F8',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#002855'}}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:'#002855'}}>Chat com IA</div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#64748B'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'#059669'}}/>
              Groq LLaMA 3.3 · online
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={handleCopyLast} title="Copiar última resposta" style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',background:'white',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:12,fontWeight:500,color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>
            <I d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>Copiar
          </button>
          <button onClick={handleClear} title="Limpar conversa" style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',background:'white',border:'1.5px solid #FCA5A5',borderRadius:8,fontSize:12,fontWeight:500,color:'#DC2626',cursor:'pointer',fontFamily:'inherit'}}>
            <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>Limpar
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',background:'#F8FAFC',borderRadius:14,border:'1px solid #E2E8F0',padding:'20px 16px',marginBottom:12,scrollbarWidth:'thin',scrollbarColor:'#E2E8F0 transparent'}}>
        {messages.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#94A3B8'}}>
            <div style={{width:56,height:56,background:'#EAF0F8',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',color:'#002855'}}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:26,height:26}}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
            </div>
            <p style={{fontWeight:500,color:'#64748B'}}>Inicie uma conversa</p>
          </div>
        )}
        {messages.map(msg => <Message key={msg.id} msg={msg}/>)}
        <div ref={bottomRef}/>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {SUGGESTIONS.map((s,i) => (
            <button key={i} onClick={()=>setInput(s)} style={{background:'white',border:'1.5px solid #E2E8F0',borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:500,color:'#1B4F8A',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}
              onMouseOver={e=>{e.currentTarget.style.background='#EAF0F8';e.currentTarget.style.borderColor='#1B4F8A';}}
              onMouseOut={e=>{e.currentTarget.style.background='white';e.currentTarget.style.borderColor='#E2E8F0';}}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{display:'flex',gap:10,alignItems:'flex-end',background:'white',border:'1.5px solid #E2E8F0',borderRadius:14,padding:'10px 12px',boxShadow:'0 2px 8px rgba(0,40,85,0.06)',transition:'border-color 0.2s'}}
        onFocusCapture={e=>e.currentTarget.style.borderColor='#1B4F8A'}
        onBlurCapture={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,140)+'px';}}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
          rows={1}
          style={{flex:1,border:'none',outline:'none',resize:'none',fontSize:14,color:'#1E293B',fontFamily:'inherit',lineHeight:1.5,background:'transparent',maxHeight:140,overflowY:'auto'}}
        />
        <button onClick={()=>sendMessage(input)} disabled={loading || !input.trim()} style={{width:38,height:38,borderRadius:10,border:'none',background: loading||!input.trim() ? '#E2E8F0' : '#002855',color: loading||!input.trim() ? '#94A3B8' : 'white',cursor: loading||!input.trim() ? 'not-allowed' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.18s'}}>
          {loading
            ? <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>
            : <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          }
        </button>
      </div>

      <p style={{fontSize:11,color:'#CBD5E1',textAlign:'center',marginTop:6}}>Enter para enviar · Shift+Enter para nova linha · conversa salva automaticamente</p>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}