import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeExcel } from '../services/api';
import { saveToHistory } from '../services/storage';

export default function ExcelAnalyzer() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState('');
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragover, setDragover] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef();

  function handleFile(f) {
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) { setError('Apenas .xlsx, .xls e .csv são aceitos.'); return; }
    setFile(f); setError(''); setResult(''); setMeta(null);
  }

  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function handleAnalyze() {
    if (!file) { setError('Selecione uma planilha primeiro.'); return; }
    setLoading(true); setError(''); setResult(''); setMeta(null);
    try {
      const res = await analyzeExcel(file, question);
      setResult(res.result); setMeta(res.meta);
      saveToHistory({ type: 'excel', text: file.name, mode: question || 'análise geral', result: res.result });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h1 className="page-title">Análise de Planilha</h1>
      <p className="page-subtitle">Faça upload de uma planilha Excel ou CSV e faça perguntas sobre os dados.</p>

      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
          </div>
          <div>
            <div className="card-title">Arquivo de dados</div>
            <div className="card-desc">.xlsx, .xls ou .csv — máx. 10MB</div>
          </div>
        </div>

        {!file ? (
          <div
            className={`file-drop ${dragover ? 'dragover' : ''}`}
            onClick={() => inputRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={e => { e.preventDefault(); setDragover(false); handleFile(e.dataTransfer.files[0]); }}
          >
            <div className="file-drop-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            </div>
            <div className="file-drop-title">Arraste a planilha aqui</div>
            <div className="file-drop-text">ou <span>clique para selecionar</span></div>
            <div className="file-drop-hint">Suporta .xlsx, .xls e .csv</div>
          </div>
        ) : (
          <div className="file-selected">
            <div className="file-selected-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div className="file-selected-info">
              <div className="file-selected-name">{file.name}</div>
              <div className="file-selected-size">{formatSize(file.size)}</div>
            </div>
            <button className="file-remove" onClick={() => setFile(null)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e => handleFile(e.target.files[0])} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <div className="card-title">Pergunta personalizada</div>
            <div className="card-desc">Opcional — deixe em branco para análise completa automática</div>
          </div>
        </div>
        <input
          className="question-input"
          placeholder='Ex: "Qual produto teve mais vendas?" ou "Qual é a média de faturamento mensal?"'
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
        />
        <div className="hint-box" style={{marginTop:12}}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Sem pergunta, a IA faz um diagnóstico completo: resumo, tendências, anomalias e sugestões.
        </div>
      </div>

      {error && <div className="error-box"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>{error}</div>}

      <button className="btn btn-orange" onClick={handleAnalyze} disabled={loading}>
        {loading
          ? <><div className="spinner" /> Analisando planilha...</>
          : <><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Analisar com IA</>
        }
      </button>

      {meta && (
        <>
          <div className="divider" />
          <div className="meta-grid">
            <div className="meta-item">
              <div className="meta-item-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg></div>
              <div><div className="meta-value">{meta.totalRows}</div><div className="meta-label">Linhas de dados</div></div>
            </div>
            <div className="meta-item">
              <div className="meta-item-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg></div>
              <div><div className="meta-value">{meta.columns.length}</div><div className="meta-label">Colunas</div></div>
            </div>
            <div className="meta-item">
              <div className="meta-item-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg></div>
              <div><div className="meta-value" style={{fontSize:13}}>{meta.sheetName}</div><div className="meta-label">Aba ativa</div></div>
            </div>
          </div>
          <div className="columns-info">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span><strong>Colunas identificadas:</strong> {meta.columns.join(' · ')}</span>
          </div>
        </>
      )}

      {result && (
        <>
          {!meta && <div className="divider" />}
          <div className="result-header">
            <div className="result-badge">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              {question ? 'Resposta da IA' : 'Análise completa'}
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
            <button className="btn btn-secondary" onClick={() => { setFile(null); setQuestion(''); setResult(''); setMeta(null); }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
