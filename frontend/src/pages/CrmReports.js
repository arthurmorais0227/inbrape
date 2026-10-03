import React, { useEffect, useRef, useState } from 'react';
import './CrmReports.css';

// ── Relatórios padrão ───────────────────────────
// module: 'pedidos' | 'cotacoes' (ajuste para as chaves de módulo do seu Crm.js)
// stage:  'open' | 'won' | 'lost' (o Crm.js traduz para o texto real do estágio)
// period: 'last30' | 'month' | 'year' | 'older30'
export const CRM_REPORTS = [
  { id: 'v30', group: 'Vendas', module: 'pedidos', title: 'Vendas · últimos 30 dias', period: 'last30', icon: 'trend', color: '#059669' },
  { id: 'vmes', group: 'Vendas', module: 'pedidos', title: 'Vendas · mês atual', period: 'month', icon: 'calendar', color: '#0EA5E9' },
  { id: 'vano', group: 'Vendas', module: 'pedidos', title: 'Vendas · ano atual', period: 'year', icon: 'chart', color: '#4C6FFF' },
  { id: 'c-aberto', group: 'Cotações', module: 'cotacoes', title: 'Cotações em aberto', stage: 'open', icon: 'clock', color: '#E87722' },
  { id: 'c-aberto30', group: 'Cotações', module: 'cotacoes', title: 'Em aberto · últimos 30 dias', stage: 'open', period: 'last30', icon: 'clock', color: '#F59E0B' },
  { id: 'c-parado', group: 'Cotações', module: 'cotacoes', title: 'Em aberto há mais de 30 dias', hint: 'Para cobrar retorno', stage: 'open', period: 'older30', icon: 'alert', color: '#DC2626' },
  { id: 'c-ganhas30', group: 'Cotações', module: 'cotacoes', title: 'Ganhas · últimos 30 dias', stage: 'won', period: 'last30', icon: 'check', color: '#059669' },
  { id: 'c-perdidas30', group: 'Cotações', module: 'cotacoes', title: 'Perdidas · últimos 30 dias', stage: 'lost', period: 'last30', icon: 'x', color: '#64748B' },
];

// Intervalo de datas (AAAA-MM-DD) de cada período
function ymd(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function reportRange(report, today = new Date()) {
  const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return ymd(d); };
  switch (report.period) {
    case 'last30': return { from: back(29), to: ymd(today) };
    case 'month': return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) };
    case 'year': return { from: `${today.getFullYear()}-01-01`, to: ymd(today) };
    case 'older30': return { from: null, to: back(30) };
    default: return { from: null, to: null };
  }
}

const ICONS = {
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  trend: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  calendar: 'M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  x: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

const Icon = ({ d, size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: size, height: size, flexShrink: 0 }} aria-hidden="true">
    <path d={d} />
  </svg>
);

/**
 * Props:
 *  reports    lista de relatórios (padrão: CRM_REPORTS)
 *  activeId   id do relatório aplicado no momento
 *  onSelect   (report) => void
 *  onClear    () => void
 *  getCount   (report) => Promise<number>   (opcional: mostra a quantidade de cada relatório)
 *  refreshKey muda o valor para recontar (ex.: após sincronizar)
 */
export default function CrmReports({ reports = CRM_REPORTS, activeId, onSelect, onClear, getCount, refreshKey }) {
  const [counts, setCounts] = useState({});
  const getCountRef = useRef(getCount);
  getCountRef.current = getCount;

  useEffect(() => {
    if (!getCountRef.current) return undefined;
    let cancelled = false;
    setCounts({});
    reports.forEach((r) => {
      Promise.resolve(getCountRef.current(r))
        .then((n) => { if (!cancelled) setCounts((c) => ({ ...c, [r.id]: n })); })
        .catch(() => { if (!cancelled) setCounts((c) => ({ ...c, [r.id]: null })); });
    });
    return () => { cancelled = true; };
  }, [reports, refreshKey]);

  const groups = [...new Set(reports.map((r) => r.group))];
  let order = 0;

  return (
    <aside className="rp-rail" aria-label="Relatórios padrão">
      <div className="rp">
        <div className="rp-head">
          <h2><Icon d={ICONS.chart} size={16} />Relatórios</h2>
          {activeId && onClear && (
            <button type="button" className="rp-clear" onClick={onClear}>Limpar</button>
          )}
        </div>

        {groups.map((g) => (
          <div className="rp-group" key={g}>
            <span>{g}</span>
            <div className="rp-list">
              {reports.filter((r) => r.group === g).map((r) => {
                const n = counts[r.id];
                const active = activeId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`rp-item ${active ? 'on' : ''}`}
                    style={{ '--c': r.color, '--i': order++ }}
                    onClick={() => onSelect?.(r)}
                    aria-pressed={active}
                  >
                    <span className="rp-ico"><Icon d={ICONS[r.icon] || ICONS.chart} size={16} /></span>
                    <span className="rp-txt">
                      <strong>{r.title}</strong>
                      {r.hint && <small>{r.hint}</small>}
                    </span>
                    {getCount && (
                      <span className={`rp-count ${n === undefined ? 'loading' : ''}`}>
                        {n === undefined ? '00' : n === null ? '—' : n.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}