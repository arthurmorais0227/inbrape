import React, { useState, useEffect, useCallback } from 'react';
import { getCrmOrganizacoes, getCrmCotacoes } from '../services/api';

const PAGE_SIZE = 20;

// Campos "de destaque" a tentar exibir no card, por módulo — a Gluo/vTiger
// pode variar o nome exato; a gente tenta a lista até achar algo preenchido.
const TITLE_KEYS = ['accountname', 'name', 'subject', 'quote_no', 'quotename'];
const CHIP_KEYS = {
  organizacoes: [
    ['phone', 'Telefone'],
    ['email1', 'E-mail'],
    ['industry', 'Segmento'],
    ['cpfcnpj', 'CNPJ'],
  ],
  cotacoes: [
    ['quotestage', 'Status'],
    ['total', 'Total'],
    ['hdnGrandTotal', 'Total'],
    ['quote_valid_till', 'Validade'],
    ['account_id', 'Cliente'],
  ],
};

function pickTitle(item) {
  for (const key of TITLE_KEYS) {
    if (item[key]) return item[key];
  }
  return `#${item.id ?? '—'}`;
}

function pickChips(item, moduleKey) {
  const candidates = CHIP_KEYS[moduleKey] || [];
  const chips = [];
  for (const [key, label] of candidates) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      chips.push({ label, value: String(item[key]) });
    }
  }
  return chips.slice(0, 4);
}

// A Gluo CRM pode devolver o array em formatos diferentes (data/result/records).
// Isso deixa a tela funcionando mesmo se o envelope da resposta mudar um pouco.
function extractList(res) {
  if (Array.isArray(res)) return res;
  return res?.data || res?.result || res?.records || res?.items || [];
}

function extractHasMore(res, receivedCount) {
  if (typeof res?.hasMore === 'boolean') return res.hasMore;
  if (typeof res?.has_more === 'boolean') return res.has_more;
  return receivedCount >= PAGE_SIZE;
}

export default function Crm({ onNotify }) {
  const [moduleKey, setModuleKey] = useState('organizacoes');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(async (mod, pg) => {
    setLoading(true);
    setError('');
    try {
      const fetcher = mod === 'organizacoes' ? getCrmOrganizacoes : getCrmCotacoes;
      const res = await fetcher(pg, PAGE_SIZE);
      const list = extractList(res);
      setItems(list);
      setHasMore(extractHasMore(res, list.length));
    } catch (e) {
      setError(e.message || 'Erro ao buscar dados do CRM.');
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(moduleKey, page);
  }, [moduleKey, page, fetchData]);

  function switchModule(mod) {
    if (mod === moduleKey) return;
    setModuleKey(mod);
    setPage(1);
    setSelected(null);
  }

  function handleRefresh() {
    fetchData(moduleKey, page);
    onNotify?.(
      moduleKey === 'organizacoes' ? 'Organizações atualizadas' : 'Cotações atualizadas',
      'crm'
    );
  }

  // ── Detalhe de um item ──────────────────────────────────────
  if (selected) {
    const entries = Object.entries(selected).filter(
      ([, v]) => v !== null && v !== undefined && typeof v !== 'object'
    );
    return (
      <div>
        <button className="btn btn-secondary back-btn" onClick={() => setSelected(null)}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{pickTitle(selected)}</div>
              <div className="card-desc">
                {moduleKey === 'organizacoes' ? 'Organização' : 'Cotação'} · ID {selected.id ?? '—'}
              </div>
            </div>
          </div>
          <div className="meta-grid">
            {entries.map(([key, value]) => (
              <div className="meta-item" key={key}>
                <div className="meta-value">{String(value)}</div>
                <div className="meta-label">{key}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Lista ───────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-subtitle">Dados vindos direto da Gluo CRM</p>
        </div>
        <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }} onClick={handleRefresh} disabled={loading}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      <div className="tabs-wrapper" style={{ marginBottom: 20 }}>
        <nav className="tabs">
          <button className={`tab-btn ${moduleKey === 'organizacoes' ? 'active' : ''}`} onClick={() => switchModule('organizacoes')}>
            Organizações
          </button>
          <button className={`tab-btn ${moduleKey === 'cotacoes' ? 'active' : ''}`} onClick={() => switchModule('cotacoes')}>
            Cotações
          </button>
        </nav>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && error && (
        <div className="error-box">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 4h.01M13 15h1" />
            </svg>
          </div>
          <p>Nenhum registro encontrado</p>
          <span>Confira se a chave da API e a página estão corretas</span>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="history-list">
            {items.map((item) => (
              <div key={item.id ?? Math.random()} className="history-card" onClick={() => setSelected(item)}>
                <div className="history-card-icon document">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                  </svg>
                </div>
                <div className="history-card-body">
                  <div className="history-card-top">
                    <span className="history-card-badge">{pickTitle(item)}</span>
                  </div>
                  <p className="history-preview">
                    {pickChips(item, moduleKey)
                      .map((c) => `${c.label}: ${c.value}`)
                      .join('  ·  ') || 'Sem detalhes adicionais nesta listagem'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
            <button
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--gray-600)' }}>Página {page}</span>
            <button
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}