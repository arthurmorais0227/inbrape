import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeText } from '../services/api';
import { saveToHistory } from '../services/storage';

const MODES = [
  {
    id: 'summary', label: 'Resumo', desc: 'Resumo objetivo e claro',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  },
  {
    id: 'keywords', label: 'Palavras-chave', desc: 'Principais temas e termos',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  },
  {
    id: 'sentiment', label: 'Sentimento', desc: 'Tom e análise emocional',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    id: 'insights', label: 'Insights', desc: 'Pontos relevantes',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
  },
  {
    id: 'translate', label: 'Traduzir', desc: 'Tradução para português',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>,
  },
  {
    id: 'improve', label: 'Melhorar', desc: 'Reescrever com clareza',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  },
  {
    id: 'questions', label: 'Perguntas', desc: 'Gera perguntas do texto',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    id: 'action', label: 'Ações', desc: 'Pontos de ação práticos',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  },
];

export default function TextAnalyzer() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('summary');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleAnalyze() {
    if (text.trim().length < 10) { setError('Digite pelo menos 10 caracteres.'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const res = await analyzeText(text, mode);
      setResult(res);
      saveToHistory({ type: 'text', text, mode, result: res });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentMode = MODES.find(m => m.id === mode);

  return (
    <div>
      <h1 className="page-title">Análise de Texto</h1>
      <p className="page-subtitle">Cole um texto e escolha o tipo de análise que a IA irá realizar.</p>

      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </div>
          <div>
            <div className="card-title">Documento de entrada</div>
            <div className="card-desc">Suporta qualquer idioma</div>
          </div>
        </div>
        <textarea
          className="textarea"
          placeholder="Cole ou digite o texto que deseja analisar..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="char-count">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:11,height:11}}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
          {text.length} caracteres · {text.split(/\s+/).filter(Boolean).length} palavras
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
          </div>
          <div>
            <div className="card-title">Tipo de análise</div>
            <div className="card-desc">Selecione o que a IA deve fazer com o texto</div>
          </div>
        </div>
        <div className="modes-grid">
          {MODES.map(m => (
            <button key={m.id} className={`mode-card ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>
              <div className="mode-icon">{m.icon}</div>
              <span className="mode-label">{m.label}</span>
              <p className="mode-desc">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-box"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{error}</div>}

      <button className="btn btn-orange" onClick={handleAnalyze} disabled={loading}>
        {loading
          ? <><div className="spinner" /> Analisando com IA...</>
          : <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Analisar com IA</>
        }
      </button>

      {result && (
        <>
          <div className="divider" />
          <div className="result-header">
            <div className="result-badge">
              {currentMode?.icon}
              {currentMode?.label}
            </div>
          </div>
          <div className="result-box">
            <div className="result-text"><ReactMarkdown>{result}</ReactMarkdown></div>
          </div>
          <div className="actions">
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied
                ? <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Copiado!</>
                : <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copiar</>
              }
            </button>
            <button className="btn btn-secondary" onClick={() => { setText(''); setResult(''); setError(''); }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
