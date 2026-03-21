import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { getHistory, clearHistory } from '../services/storage';

const MODE_LABELS = {
  summary: 'Resumo', keywords: 'Palavras-chave', sentiment: 'Sentimento',
  insights: 'Insights', translate: 'Tradução', improve: 'Melhoria',
  questions: 'Perguntas', action: 'Ações',
  describe: 'Descrição', extract_text: 'OCR', analyze_chart: 'Gráfico',
  identify: 'Identificação', quality: 'Qualidade', custom: 'Pergunta livre',
};

const TypeIcon = ({ type }) => {
  if (type === 'excel') return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:20,height:20}}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  );
  if (type === 'image') return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:20,height:20}}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  );
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:20,height:20}}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  );
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setHistory(getHistory()); }, []);

  function handleClear() {
    if (window.confirm('Limpar todo o histórico?')) { clearHistory(); setHistory([]); setSelected(null); }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(selected.result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  if (selected) return (
    <div>
      <button className="btn btn-secondary back-btn" onClick={() => setSelected(null)}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Voltar ao histórico
      </button>
      <div className="card">
        <div className="card-header">
          <div className={`history-card-icon ${selected.type}`}><TypeIcon type={selected.type} /></div>
          <div>
            <div className="card-title">{MODE_LABELS[selected.mode] || selected.mode}</div>
            <div className="card-desc">{formatDate(selected.createdAt)}</div>
          </div>
        </div>
        <label className="label">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Entrada
        </label>
        <p style={{fontSize:13, color:'var(--gray-600)', fontStyle:'italic', padding:'10px 14px', background:'var(--gray-50)', borderRadius:'var(--radius)', border:'1px solid var(--gray-200)'}}>{selected.text}</p>
      </div>
      <div className="result-badge" style={{marginBottom:12}}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        Resultado da IA
      </div>
      <div className="result-box">
        <div className="result-text"><ReactMarkdown>{selected.result}</ReactMarkdown></div>
      </div>
      <div className="actions">
        <button className="btn btn-secondary" onClick={handleCopy}>
          {copied
            ? <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Copiado!</>
            : <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copiar</>
          }
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24}}>
        <div>
          <h1 className="page-title">Histórico</h1>
          <p className="page-subtitle">{history.length} análise{history.length !== 1 ? 's' : ''} salva{history.length !== 1 ? 's' : ''}</p>
        </div>
        {history.length > 0 && (
          <button className="btn btn-danger" style={{width:'auto', padding:'8px 16px', fontSize:13}} onClick={handleClear}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Limpar tudo
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <p>Nenhuma análise ainda</p>
          <span>Comece analisando um texto, planilha ou imagem</span>
        </div>
      ) : (
        <div className="history-list">
          {history.map(item => (
            <div key={item.id} className="history-card" onClick={() => setSelected(item)}>
              <div className={`history-card-icon ${item.type}`}><TypeIcon type={item.type} /></div>
              <div className="history-card-body">
                <div className="history-card-top">
                  <span className="history-card-badge">{MODE_LABELS[item.mode] || item.mode}</span>
                  <span className="history-date">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <p className="history-preview">"{item.text}"</p>
                <p className="history-result">{item.result}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
