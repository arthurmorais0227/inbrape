import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCrmOrganizacoes, getCrmCotacoes, getCrmPedidos, getCrmOrganizacoesNomes,
  getCrmOrganizacoesFiltros,
  triggerCrmSync, getCrmSyncStatus,
  exportCrmOrganizacoes, exportCrmCotacoes, exportCrmPedidos,
} from '../services/api';
import './Crm.css';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

// ── Ícones ──────────────────────────────────────
const Icon = ({ d, size = 16, ...props }) => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: size, height: size, flexShrink: 0 }} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const ICONS = {
  building: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1m-1 4h1m-1 4h1',
  quote: 'M7 8h10M7 12h6m-9 8l3-3H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-3 3z',
  package: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
  filter: 'M6 12h12M3 6h18M9 18h6',
  phone: 'M3 5a2 2 0 012-2h2.28a1 1 0 01.98.804l.786 3.93a1 1 0 01-.276.94L7.1 10.35a12 12 0 005.55 5.55l1.677-1.677a1 1 0 01.94-.276l3.93.786a1 1 0 01.804.98V19a2 2 0 01-2 2h-1C9.163 21 3 14.837 3 7V5z',
  mail: 'M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  id: 'M3 7h18M3 17h18M6 11h4m-4 3h2M14 7v10M17 7v10',
  calendar: 'M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  currency: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  note: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  close: 'M6 18L18 6M6 6l12 12',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M19 9l-7 7-7-7',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  sync: 'M16 4v4h-4M4 20v-4h4M4 8a8 8 0 0114-4.9M20 16a8 8 0 01-14 4.9',
  alert: 'M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M5 21h14',
};

// Colunas espelhando o CRM oficial — cada uma com seu próprio campo de busca.
// Cotações e Pedidos de Venda usam o mesmo padrão (filtro por coluna); só
// mudam os nomes dos campos de status/data por trás.
const COTACAO_COLUMNS = [
  { key: 'total', label: 'Total', icon: ICONS.currency, money: true, filterKey: 'total', filterLabel: 'Total' },
  { key: 'nome_representante_inbrape', label: 'Nome Representante', icon: ICONS.user, filterKey: 'nome_representante_inbrape', filterLabel: 'Nome Representante' },
  { key: 'quotestage', label: 'Estágio Cotação', icon: ICONS.tag, pill: true, filterKey: 'quotestage', filterLabel: 'Estágio Cotação' },
  { key: 'account_id', label: 'Nome Organização', icon: ICONS.building, filterKey: 'account_name', filterLabel: 'Nome Organização' },
  { key: 'complemento_inbrape', label: 'Complemento', icon: ICONS.note, filterKey: 'complemento_inbrape', filterLabel: 'Complemento' },
  { key: 'produto_inbrape', label: 'Produto', icon: ICONS.tag, filterKey: 'produto_inbrape', filterLabel: 'Produto' },
  { key: 'cod_representante_inbrape', label: 'Cod Representante', icon: ICONS.id, filterKey: 'cod_representante_inbrape', filterLabel: 'Cod Representante' },
];

const PEDIDO_COLUMNS = [
  { key: 'total', label: 'Total', icon: ICONS.currency, money: true, filterKey: 'total', filterLabel: 'Total' },
  { key: 'nome_representante_inbrape', label: 'Nome Representante', icon: ICONS.user, filterKey: 'nome_representante_inbrape', filterLabel: 'Nome Representante' },
  { key: 'sostatus', label: 'Status do Pedido', icon: ICONS.tag, pill: true, filterKey: 'sostatus', filterLabel: 'Status do Pedido' },
  { key: 'account_id', label: 'Nome Organização', icon: ICONS.building, filterKey: 'account_name', filterLabel: 'Nome Organização' },
  { key: 'complemento_inbrape', label: 'Complemento', icon: ICONS.note, filterKey: 'complemento_inbrape', filterLabel: 'Complemento' },
  { key: 'produto_inbrape', label: 'Produto', icon: ICONS.tag, filterKey: 'produto_inbrape', filterLabel: 'Produto' },
  { key: 'cod_representante_inbrape', label: 'Cod Representante', icon: ICONS.id, filterKey: 'cod_representante_inbrape', filterLabel: 'Cod Representante' },
];

const MODULES = {
  organizacoes: {
    label: 'Organizações',
    icon: ICONS.building,
    singular: 'organização',
    titleColumnLabel: 'Nome',
    titleKeys: ['accountname', 'name'],
    subtitleKeys: ['industry', 'cpfcnpj'],
    columns: [
      { key: 'phone', label: 'Telefone', icon: ICONS.phone },
      { key: 'email1', label: 'E-mail', icon: ICONS.mail },
      { key: 'industry', label: 'Segmento', icon: ICONS.tag },
      { key: 'cpfcnpj', label: 'CNPJ', icon: ICONS.id },
    ],
    filterLabel: 'Segmento',
    getFiltros: getCrmOrganizacoesFiltros,
    listFn: (pg, limit, _col, search, filterValue) => getCrmOrganizacoes(pg, limit, search, filterValue),
    exportFn: (_col, search, filterValue) => exportCrmOrganizacoes(search, filterValue),
  },
  cotacoes: {
    label: 'Cotações',
    icon: ICONS.quote,
    singular: 'cotação',
    titleColumnLabel: 'Assunto',
    titleKeys: ['subject', 'quotename', 'quote_no'],
    subtitleKeys: ['quote_no'],
    columns: COTACAO_COLUMNS,
    usesColumnFilters: true,
    titleFilterKey: 'subject',
    titleFilterLabel: 'Assunto',
    dateFilterLabel: 'Emissão',
    listFn: (pg, limit, col) => getCrmCotacoes(pg, limit, col),
    exportFn: (col) => exportCrmCotacoes(col),
  },
  pedidos: {
    label: 'Pedidos de Venda',
    icon: ICONS.package,
    singular: 'pedido',
    titleColumnLabel: 'Assunto',
    titleKeys: ['subject', 'salesorder_no'],
    subtitleKeys: ['salesorder_no'],
    columns: PEDIDO_COLUMNS,
    usesColumnFilters: true,
    titleFilterKey: 'subject',
    titleFilterLabel: 'Assunto',
    dateFilterLabel: 'Pedido',
    listFn: (pg, limit, col) => getCrmPedidos(pg, limit, col),
    exportFn: (col) => exportCrmPedidos(col),
  },
};

function emptyFiltersFor(config) {
  if (!config.usesColumnFilters) return {};
  const f = { [config.titleFilterKey]: '', data_de: '', data_ate: '' };
  config.columns.forEach((c) => { f[c.filterKey] = ''; });
  return f;
}

const STAGE_STYLES = {
  aberto: 'info', aberta: 'info', open: 'info',
  vencedor: 'success', ganho: 'success', ganha: 'success', won: 'success',
  perdedor: 'danger', perdida: 'danger', perdido: 'danger', lost: 'danger',
  cancelado: 'danger', cancelada: 'danger', cancelled: 'danger', canceled: 'danger',
  created: 'neutral', approved: 'info', delivered: 'success', invoiced: 'success', shipped: 'info',
};
function stageStyle(value) {
  if (!value) return 'neutral';
  return STAGE_STYLES[String(value).toLowerCase()] || 'neutral';
}

function rawValue(item, key) {
  const v = item?.[key];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'object') return v.name || v.label || v.email1 || v.accountname || null;
  return v;
}
function resolveValue(item, key, orgMap) {
  const value = rawValue(item, key);
  if (!value) return null;
  if (key === 'account_id' && orgMap && orgMap[value]) return orgMap[value];
  return value;
}
function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function pickFirst(item, keys) {
  for (const k of keys) {
    const v = rawValue(item, k);
    if (v) return v;
  }
  return null;
}
function initials(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}
function humanizeKey(key) {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}
const HIDDEN_DETAIL_KEYS = new Set(['smownerid', 'smcreatorid', 'modifiedby', 'record_id', 'setype', 'source']);

function Cell({ col, item, orgMap }) {
  const value = resolveValue(item, col.key, orgMap);
  if (!value) return <span className="crm-cell-empty">—</span>;
  if (col.pill) return <span className={`crm-pill crm-pill-${stageStyle(value)}`}>{value}</span>;
  if (col.money) return <span className="crm-cell-money">{formatMoney(value)}</span>;
  return <span>{value}</span>;
}

function DetailPanel({ item, moduleKey, onClose, orgMap }) {
  const config = MODULES[moduleKey];
  const title = pickFirst(item, config.titleKeys) || `#${item.id ?? '—'}`;
  const subtitle = pickFirst(item, config.subtitleKeys);
  const panelRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const entries = Object.entries(item)
    .filter(([k, v]) => !HIDDEN_DETAIL_KEYS.has(k) && v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    .filter(([k]) => k !== 'id');

  return (
    <div className="crm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="crm-panel" ref={panelRef} tabIndex={-1}>
        <div className="crm-panel-header">
          <div className="crm-avatar">{initials(title)}</div>
          <div className="crm-panel-heading">
            <div className="crm-panel-title">{title}</div>
            <div className="crm-panel-subtitle">{config.singular} {subtitle ? `· ${subtitle}` : ''}</div>
          </div>
          <button className="crm-icon-btn" onClick={onClose} aria-label="Fechar"><Icon d={ICONS.close} /></button>
        </div>

        <div className="crm-panel-highlights">
          {config.columns.map((col) => {
            const value = resolveValue(item, col.key, orgMap);
            if (!value) return null;
            return (
              <div className="crm-highlight" key={col.key}>
                <Icon d={col.icon} size={14} />
                <div>
                  <div className="crm-highlight-label">{col.label}</div>
                  <div className="crm-highlight-value">
                    {col.pill ? <span className={`crm-pill crm-pill-${stageStyle(value)}`}>{value}</span> : col.money ? formatMoney(value) : value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="crm-panel-section-label">Todos os campos</div>
        <div className="crm-detail-grid">
          {entries.map(([key, value]) => (
            <div className="crm-detail-row" key={key}>
              <span className="crm-detail-key">{humanizeKey(key)}</span>
              <span className="crm-detail-value">{String(key === 'account_id' ? resolveValue(item, key, orgMap) : value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonRows({ columns }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="crm-row crm-row-skeleton">
          <td><div className="crm-skel" style={{ width: '70%' }} /></td>
          {columns.map((c) => (<td key={c.key}><div className="crm-skel" style={{ width: '50%' }} /></td>))}
          <td />
        </tr>
      ))}
    </>
  );
}

function formatDateTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
}

export default function Crm({ onNotify }) {
  const [moduleKey, setModuleKey] = useState('organizacoes');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  // Organizações: busca única + dropdown
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filterOptions, setFilterOptions] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Cotações / Pedidos: um campo de busca por coluna (genérico pros dois)
  const [colDraft, setColDraft] = useState({});
  const [colApplied, setColApplied] = useState({});

  const [orgMap, setOrgMap] = useState(null);
  const [orgMapLoading, setOrgMapLoading] = useState(false);

  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStarting, setSyncStarting] = useState(false);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pollRef = useRef(null);
  const syncMenuRef = useRef(null);

  const config = MODULES[moduleKey];

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchData = useCallback(async (mod, pg, searchState, colState) => {
    setLoading(true);
    setError('');
    try {
      const modConfig = MODULES[mod];
      const res = await modConfig.listFn(pg, PAGE_SIZE, colState, searchState.search, searchState.filterValue);
      setItems(res.data || []);
      setTotal(res.meta?.total ?? 0);
      setHasMore(res.meta?.hasMore ?? false);
    } catch (e) {
      setError(e.message || 'Erro ao buscar dados do CRM.');
      setItems([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(moduleKey, page, { search, filterValue }, colApplied);
  }, [moduleKey, page, search, filterValue, colApplied, fetchData]);

  useEffect(() => {
    if (config.usesColumnFilters || !config.getFiltros) return;
    config.getFiltros().then((res) => setFilterOptions(res.data || [])).catch(() => setFilterOptions([]));
  }, [moduleKey, config]);

  useEffect(() => {
    if (moduleKey === 'organizacoes' || orgMap !== null || orgMapLoading) return;
    setOrgMapLoading(true);
    getCrmOrganizacoesNomes()
      .then((res) => {
        const map = {};
        (res.data || []).forEach((o) => { if (o.id) map[o.id] = o.accountname || o.name; });
        setOrgMap(map);
      })
      .catch(() => setOrgMap({}))
      .finally(() => setOrgMapLoading(false));
  }, [moduleKey, orgMap, orgMapLoading]);

  useEffect(() => {
    getCrmSyncStatus().then(setSyncStatus).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (!syncMenuOpen) return undefined;
    function closeMenu(event) {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setSyncMenuOpen(false);
      } else if (event.type === 'pointerdown' && !syncMenuRef.current?.contains(event.target)) {
        setSyncMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeMenu);
    };
  }, [syncMenuOpen]);

  useEffect(() => {
    if (syncStatus?.running) {
      pollRef.current = setInterval(() => {
        getCrmSyncStatus().then((s) => {
          setSyncStatus(s);
          if (!s.running) {
            clearInterval(pollRef.current);
            fetchData(moduleKey, page, { search, filterValue }, colApplied);
            onNotify?.('Sincronização com o CRM concluída', 'crm');
          }
        }).catch(() => {});
      }, 2500);
      return () => clearInterval(pollRef.current);
    }
  }, [syncStatus?.running]);

  function switchModule(mod) {
    if (mod === moduleKey) return;
    const newConfig = MODULES[mod];
    setModuleKey(mod);
    setPage(1);
    setSelected(null);
    setSearchInput('');
    setSearch('');
    setFilterValue('');
    const empty = emptyFiltersFor(newConfig);
    setColDraft(empty);
    setColApplied(empty);
  }

  function applyColFilters() {
    setPage(1);
    setColApplied(colDraft);
  }
  function clearColFilters() {
    const empty = emptyFiltersFor(config);
    setColDraft(empty);
    setColApplied(empty);
    setPage(1);
  }
  function onColFieldKeyDown(e) {
    if (e.key === 'Enter') applyColFilters();
  }
  const hasActiveColFilters = Object.values(colApplied).some(Boolean);

  async function handleSync(module) {
    setSyncMenuOpen(false);
    setSyncStarting(true);
    try {
      await triggerCrmSync(module);
      const s = await getCrmSyncStatus();
      setSyncStatus(s);
      const label = module === 'all' ? 'todos os módulos' : MODULES[module]?.label.toLowerCase();
      onNotify?.(`Sincronização de ${label} iniciada`, 'crm');
    } catch (e) {
      onNotify?.(e.message || 'Erro ao iniciar sincronização', 'crm');
    } finally {
      setSyncStarting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await config.exportFn(colApplied, search, filterValue);
      onNotify?.('Excel exportado', 'crm');
    } catch (e) {
      onNotify?.(e.message || 'Erro ao exportar Excel', 'crm');
    } finally {
      setExporting(false);
    }
  }

  const isSyncing = !!syncStatus?.running;

  return (
    <div className="crm">
      <div className="crm-header">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-subtitle">
            Sincronizado com a Gluo CRM
            {syncStatus?.finishedAt && !isSyncing && ` · última sync: ${formatDateTime(syncStatus.finishedAt)}`}
          </p>
        </div>
        <div className="crm-header-actions">
          <button className="crm-btn-icon-text" onClick={handleExport} disabled={exporting || total === 0}>
            <Icon d={ICONS.download} size={14} />
            {exporting ? 'Exportando…' : 'Exportar Excel'}
          </button>
          <div className="crm-sync-menu" ref={syncMenuRef}>
            <button
              className="crm-btn-icon-text"
              onClick={() => setSyncMenuOpen((open) => !open)}
              disabled={isSyncing || syncStarting}
              aria-haspopup="menu"
              aria-expanded={syncMenuOpen}
            >
              <Icon d={ICONS.sync} size={14} />
              {syncStarting ? 'Iniciando…' : isSyncing ? 'Sincronizando…' : 'Sincronizar'}
              {!syncStarting && !isSyncing && <Icon d={ICONS.chevronDown} size={13} />}
            </button>
            {syncMenuOpen && !isSyncing && !syncStarting && (
              <div className="crm-sync-dropdown" role="menu">
                {[
                  ['organizacoes', 'Organizações'],
                  ['cotacoes', 'Cotações'],
                  ['pedidos', 'Pedidos de venda'],
                  ['all', 'Todos os módulos'],
                ].map(([module, label]) => (
                  <button key={module} className="crm-sync-option" role="menuitem" onClick={() => handleSync(module)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(isSyncing || syncStarting) && (
            <span className="crm-sync-progress" aria-live="polite">
              {syncStarting ? 'Iniciando sincronização…' : `Sincronizando ${MODULES[syncStatus?.module]?.label || syncStatus?.module || ''} (pág. ${syncStatus?.page || 0}${syncStatus?.totalPages ? `/${syncStatus.totalPages}` : ''})…`}
            </span>
          )}
        </div>
      </div>

      <div className="crm-segmented">
        {Object.entries(MODULES).map(([key, m]) => (
          <button key={key} className={`crm-segment ${moduleKey === key ? 'active' : ''}`} onClick={() => switchModule(key)}>
            <Icon d={m.icon} size={15} />
            {m.label}
          </button>
        ))}
      </div>

      {!config.usesColumnFilters && (
        <div className="crm-toolbar">
          <div className="crm-search">
            <Icon d={ICONS.search} size={15} />
            <input type="text" placeholder={`Buscar ${config.label.toLowerCase()}...`} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="crm-filter-wrap">
            <button className="crm-filter-btn" onClick={() => setFilterOpen((o) => !o)}>
              <Icon d={ICONS.filter} size={14} />
              {filterValue || config.filterLabel}
              <Icon d={ICONS.chevronDown} size={13} />
            </button>
            {filterOpen && (
              <div className="crm-filter-menu" onMouseLeave={() => setFilterOpen(false)}>
                <button className="crm-filter-option" onClick={() => { setFilterValue(''); setPage(1); setFilterOpen(false); }}>Todos</button>
                {filterOptions.map((opt) => (
                  <button key={opt} className="crm-filter-option" onClick={() => { setFilterValue(opt); setPage(1); setFilterOpen(false); }}>{opt}</button>
                ))}
                {filterOptions.length === 0 && <div className="crm-filter-empty">Sem opções cadastradas</div>}
              </div>
            )}
          </div>
          <div className="crm-count">{loading ? 'Carregando…' : `${total.toLocaleString('pt-BR')} registros`}</div>
        </div>
      )}

      {config.usesColumnFilters && (
        <div className="crm-cot-filters">
          <div className="crm-cot-filters-grid">
            <label className="crm-cot-field">
              <span>{config.titleFilterLabel}</span>
              <input value={colDraft[config.titleFilterKey] || ''} onChange={(e) => setColDraft((f) => ({ ...f, [config.titleFilterKey]: e.target.value }))} onKeyDown={onColFieldKeyDown} />
            </label>
            {config.columns.map((c) => (
              <label className="crm-cot-field" key={c.filterKey}>
                <span>{c.filterLabel}</span>
                <input value={colDraft[c.filterKey] || ''} onChange={(e) => setColDraft((f) => ({ ...f, [c.filterKey]: e.target.value }))} onKeyDown={onColFieldKeyDown} />
              </label>
            ))}
            <label className="crm-cot-field">
              <span>{config.dateFilterLabel} (de)</span>
              <input type="date" value={colDraft.data_de || ''} onChange={(e) => setColDraft((f) => ({ ...f, data_de: e.target.value }))} onKeyDown={onColFieldKeyDown} />
            </label>
            <label className="crm-cot-field">
              <span>{config.dateFilterLabel} (até)</span>
              <input type="date" value={colDraft.data_ate || ''} onChange={(e) => setColDraft((f) => ({ ...f, data_ate: e.target.value }))} onKeyDown={onColFieldKeyDown} />
            </label>
          </div>
          <div className="crm-cot-filters-actions">
            <button className="crm-btn-primary" onClick={applyColFilters}>
              <Icon d={ICONS.search} size={14} />
              Pesquisar
            </button>
            {hasActiveColFilters && (
              <button className="crm-btn-text" onClick={clearColFilters}>Limpar filtros</button>
            )}
            <div className="crm-count" style={{ marginLeft: 'auto' }}>
              {loading ? 'Carregando…' : `${total.toLocaleString('pt-BR')} registros`}
              {orgMapLoading && ' · resolvendo nomes de clientes…'}
            </div>
          </div>
        </div>
      )}

      {error && (<div className="error-box"><Icon d={ICONS.alert} />{error}</div>)}

      {!error && (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>{config.titleColumnLabel}</th>
                {config.columns.map((c) => (<th key={c.key} className="crm-th-icon"><Icon d={c.icon} size={13} />{c.label}</th>))}
                <th className="crm-th-chevron" />
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonRows columns={config.columns} />}
              {!loading && items.map((item) => (
                <tr key={item.id ?? Math.random()} className="crm-row" onClick={() => setSelected(item)}>
                  <td>
                    <div className="crm-name-cell">
                      <div className="crm-avatar crm-avatar-sm">{initials(pickFirst(item, config.titleKeys) || '?')}</div>
                      <span className="crm-name-text">{pickFirst(item, config.titleKeys) || `#${item.id ?? '—'}`}</span>
                    </div>
                  </td>
                  {config.columns.map((c) => (<td key={c.key} data-label={c.label}><Cell col={c} item={item} orgMap={orgMap} /></td>))}
                  <td className="crm-row-chevron"><Icon d={ICONS.chevronRight} size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className="crm-empty">
              <Icon d={ICONS.inbox} size={28} />
              <p>{total === 0 ? 'Nenhum registro sincronizado ainda' : 'Nada corresponde a essa busca'}</p>
              <span>{total === 0 ? 'Clica em "Sincronizar agora" no topo da tela.' : 'Tente ajustar ou limpar os filtros.'}</span>
            </div>
          )}
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className="crm-pagination">
          <button className="crm-page-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <span className="crm-page-indicator">Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
          <button className="crm-page-btn" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      )}

      {selected && (
        <DetailPanel item={selected} moduleKey={moduleKey} onClose={() => setSelected(null)} orgMap={orgMap} />
      )}
    </div>
  );
}