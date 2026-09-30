import React, { useState } from 'react';
import './Home.css';

// Links externos. Para tirar do código, defina no frontend/.env:
// REACT_APP_POWERAPPS_URL=...  e  REACT_APP_POWERBI_URL=...
const POWER_APPS_URL =
  process.env.REACT_APP_POWERAPPS_URL ||
  'https://apps.powerapps.com/play/e/default-2bef70d6-e53a-4482-ae12-e388b39ceee0/a/3a4e9eb0-837b-4d24-9e6a-224d0332480b?tenantId=2bef70d6-e53a-4482-ae12-e388b39ceee0&hint=7935951c-aa14-46c5-85bf-5d8bcf67e008&sourcetime=1779903169348';
const POWER_BI_URL =
  process.env.REACT_APP_POWERBI_URL ||
  'https://app.powerbi.com/groups/0a4da8f6-7c98-4983-ba48-9238d6508740/reports/eea557ff-2443-47a5-89af-a2e906dca1f1/c8459633f7fa304a70ec?language=pt-BR&experience=power-bi';


const EXTERNAL_D = 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14';

// page = id da aba no App.js | href = link externo
const QUICK = [
  { label: 'Editor de PDF', desc: 'Abra, altere e salve seus PDFs direto no navegador.', page: 'pdf', color: '#DC2626', badge: 'Principal',
    d: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'App de cotações', desc: 'Monte e consulte cotações no Power Apps.', href: POWER_APPS_URL, color: '#E87722',
    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { label: 'Relatório Power BI', desc: 'Painel automático com os números atualizados.', href: POWER_BI_URL, color: '#C99700',
    d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

const TOOLS = [
  { label: 'CRM', desc: 'Clientes, contas e oportunidades.', page: 'crm', color: '#0EA5E9',
    d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
  { label: 'Analisar texto', desc: 'Resumo, palavras-chave e insights.', page: 'text', color: '#002855',
    d: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { label: 'Analisar planilha', desc: 'Envie um Excel ou CSV e pergunte.', page: 'excel', color: '#059669',
    d: 'M3 10h18M3 14h18M10 3v18M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z' },
  { label: 'Analisar imagem', desc: 'Descreva e extraia dados de imagens.', page: 'image', color: '#7C3AED',
    d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Documentos', desc: 'Analise contratos, laudos e fichas.', page: 'document', color: '#E87722',
    d: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13' },
  { label: 'Histórico', desc: 'Suas últimas análises salvas.', page: 'history', color: '#64748B',
    d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Card({ item, index, big, onNavigate }) {
  const track = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const cls = `hm-card ${big ? 'hm-card-big' : ''}`;
  const style = { '--c': item.color, '--i': index };
  const inner = (
    <>
      <span className="hm-ico"><Icon d={item.d} /></span>
      {item.badge && <span className="hm-pill">{item.badge}</span>}
      <strong>{item.label}</strong>
      <span className="hm-desc">{item.desc}</span>
      <span className="hm-go">
        {item.href ? 'Abrir em nova aba' : 'Abrir'}
        <span className="hm-go-ico"><Icon d={item.href ? EXTERNAL_D : 'M5 12h14m-6-6l6 6-6 6'} /></span>
      </span>
    </>
  );
  return item.href ? (
    <a className={cls} style={style} href={item.href} target="_blank" rel="noopener noreferrer" onMouseMove={track}>{inner}</a>
  ) : (
    <button type="button" className={cls} style={style} onClick={() => onNavigate(item.page)} onMouseMove={track}>{inner}</button>
  );
}

const GLASS = { fill: 'url(#hmGlass)', stroke: 'rgba(255,255,255,.38)', strokeWidth: 1.2 };

// Grupo posicionado que flutua suavemente
function Fl({ x, y, d = 0, children }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="hm-fl" style={{ animationDelay: `${d}s` }}>{children}</g>
    </g>
  );
}

function HeroArt() {
  const nodes = [[0, 0, 13], [-52, -18, 8], [38, -44, 9], [58, 20, 8], [-28, 46, 9], [8, 64, 6]];
  const links = ['M280 200 Q220 170 150 122', 'M280 200 Q268 140 262 92', 'M280 200 Q360 150 440 108',
    'M280 200 Q210 230 150 236', 'M280 200 Q360 230 420 236', 'M280 200 Q230 270 175 300',
    'M280 200 Q282 260 290 300', 'M280 200 Q340 260 380 298'];
  return (
    <svg className="hm-art" viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="hmGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".26" /><stop offset="1" stopColor="#fff" stopOpacity=".06" />
        </linearGradient>
        <linearGradient id="hmCy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="hmTl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <radialGradient id="hmOrb" cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor="#e0f7ff" /><stop offset=".45" stopColor="#38bdf8" /><stop offset="1" stopColor="#1d4ed8" />
        </radialGradient>
        <radialGradient id="hmGlow">
          <stop offset="0" stopColor="#7dd3fc" stopOpacity=".5" /><stop offset="1" stopColor="#7dd3fc" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* circuitos ligando tudo ao núcleo */}
      {links.map((p, i) => (
        <path key={i} d={p} fill="none" stroke="rgba(125,211,252,.5)" strokeWidth="1.6" strokeDasharray="4 8"
          className="hm-flow" style={{ animationDelay: `${i * 0.35}s` }} />
      ))}

      {/* núcleo */}
      <circle cx="280" cy="200" r="120" fill="url(#hmGlow)" className="hm-pulse" />
      <circle cx="280" cy="200" r="52" fill="none" stroke="rgba(255,255,255,.35)" strokeDasharray="3 7" />
      <circle cx="280" cy="200" r="31" fill="url(#hmOrb)" stroke="rgba(255,255,255,.6)" />
      <circle cx="271" cy="191" r="8" fill="#fff" opacity=".55" />

      {/* rede de nós */}
      <Fl x={110} y={108} d={0.2}>
        {[[1], [2], [3], [4], [5]].map(([n]) => (
          <line key={n} x1="0" y1="0" x2={nodes[n][0]} y2={nodes[n][1]} stroke="rgba(255,255,255,.45)" />
        ))}
        <line x1={nodes[2][0]} y1={nodes[2][1]} x2={nodes[3][0]} y2={nodes[3][1]} stroke="rgba(255,255,255,.35)" />
        <line x1={nodes[1][0]} y1={nodes[1][1]} x2={nodes[4][0]} y2={nodes[4][1]} stroke="rgba(255,255,255,.35)" />
        {nodes.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="url(#hmCy)" stroke="rgba(255,255,255,.6)" />)}
      </Fl>

      {/* gráfico de barras com seta */}
      <Fl x={262} y={58} d={0.9}>
        <line x1="-44" y1="40" x2="44" y2="40" stroke="rgba(255,255,255,.4)" strokeWidth="2" />
        {[[-36, 22], [-16, 34], [4, 48], [24, 62]].map(([x, h], i) => (
          <rect key={i} x={x} y={40 - h} width="14" height={h} rx="3" fill={i % 2 ? 'url(#hmTl)' : 'url(#hmCy)'} />
        ))}
        <polyline points="-42,16 -18,2 -2,10 30,-24" fill="none" stroke="#E87722" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 -28 L34 -30 L32 -16" fill="none" stroke="#E87722" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </Fl>

      {/* rosca */}
      <Fl x={450} y={100} d={1.4}>
        <circle r="50" {...GLASS} />
        <g transform="rotate(-90)" fill="none" strokeWidth="16">
          <circle r="31" stroke="url(#hmCy)" strokeDasharray="100 195" />
          <circle r="31" stroke="#5eead4" strokeDasharray="56 195" strokeDashoffset="-104" />
          <circle r="31" stroke="rgba(255,255,255,.4)" strokeDasharray="30 195" strokeDashoffset="-164" />
        </g>
      </Fl>

      {/* janela com lupa */}
      <Fl x={44} y={196} d={0.6}>
        <rect width="106" height="78" rx="9" {...GLASS} />
        <line x1="0" y1="17" x2="106" y2="17" stroke="rgba(255,255,255,.35)" />
        {[10, 20, 30].map((x) => <circle key={x} cx={x - 3} cy="8.5" r="2.4" fill="rgba(255,255,255,.7)" />)}
        {[32, 44, 56].map((y) => <line key={y} x1="12" y1={y} x2="70" y2={y} stroke="rgba(255,255,255,.4)" strokeWidth="3" strokeLinecap="round" />)}
        <circle cx="76" cy="52" r="17" fill="rgba(125,211,252,.18)" stroke="#7dd3fc" strokeWidth="4" />
        <line x1="88" y1="64" x2="102" y2="78" stroke="#7dd3fc" strokeWidth="5.5" strokeLinecap="round" />
      </Fl>

      {/* gráfico de linha */}
      <Fl x={398} y={198} d={1.1}>
        <rect width="124" height="80" rx="9" {...GLASS} />
        <polyline points="12,60 38,42 60,50 86,24 112,32" fill="none" stroke="#5eead4" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        {[[12, 60], [38, 42], [60, 50], [86, 24], [112, 32]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.6" fill="#fff" />)}
      </Fl>

      {/* banco de dados */}
      <Fl x={132} y={288} d={0.4}>
        <path d="M0 10 V58 A28 10 0 0 0 56 58 V10" fill="url(#hmCy)" stroke="rgba(255,255,255,.5)" />
        <ellipse cx="28" cy="10" rx="28" ry="10" fill="#7dd3fc" stroke="rgba(255,255,255,.6)" />
        <text x="28" y="44" textAnchor="middle" fill="#fff" fontWeight="700" fontSize="18">DB</text>
      </Fl>

      {/* medidores */}
      <Fl x={246} y={298} d={1.7}>
        <rect width="92" height="54" rx="9" {...GLASS} />
        {[24, 68].map((cx, i) => (
          <g key={cx}>
            <path d={`M${cx - 15} 38 A15 15 0 0 1 ${cx + 15} 38`} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="5" strokeLinecap="round" />
            <path d={`M${cx - 15} 38 A15 15 0 0 1 ${cx + (i ? 8 : 0)} ${i ? 25 : 23}`} fill="none" stroke={i ? '#E87722' : '#5eead4'} strokeWidth="5" strokeLinecap="round" />
          </g>
        ))}
      </Fl>

      {/* funil */}
      <Fl x={356} y={290} d={0.8}>
        <path d="M0 0 H66 L42 32 V58 L24 50 V32 Z" fill="url(#hmCy)" stroke="rgba(255,255,255,.55)" strokeLinejoin="round" />
        <ellipse cx="33" cy="0" rx="33" ry="6" fill="#7dd3fc" stroke="rgba(255,255,255,.6)" />
      </Fl>

      {/* engrenagem */}
      <Fl x={478} y={318} d={1.3}>
        <g className="hm-spin">
          <circle r="25" fill="none" stroke="url(#hmTl)" strokeWidth="9" strokeDasharray="7.85 7.85" />
          <circle r="19" {...GLASS} />
          <circle r="7" fill="#38bdf8" />
        </g>
      </Fl>
    </svg>
  );
}

export default function Home({ user, onNavigate = () => {} }) {
  const [q, setQ] = useState('');
  const match = (i) => `${i.label} ${i.desc}`.toLowerCase().includes(q.trim().toLowerCase());
  const quick = QUICK.filter(match);
  const tools = TOOLS.filter(match);
  const first = user?.name?.split(' ')[0];

  return (
    <div className="hm">
      <header className="hm-hero">
        <div className="hm-hero-text">
          <p className="hm-hello">{greeting()}{first ? `, ${first}` : ''}</p>
          <h1>Inbrape</h1>
          <p className="hm-sub">Edite PDFs, monte cotações, acompanhe os números e analise documentos com IA.</p>
          <label className="hm-search">
            <Icon d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ferramenta" aria-label="Buscar ferramenta" />
          </label>
        </div>
        <HeroArt />
      </header>

      {quick.length > 0 && (
        <section aria-labelledby="hm-q">
          <h2 id="hm-q" className="hm-h2">Acesso rápido</h2>
          <div className="hm-grid hm-grid-3">
            {quick.map((it, i) => <Card key={it.label} item={it} index={i} big onNavigate={onNavigate} />)}
          </div>
        </section>
      )}

      {tools.length > 0 && (
        <section aria-labelledby="hm-t">
          <h2 id="hm-t" className="hm-h2">Ferramentas</h2>
          <div className="hm-grid hm-grid-auto">
            {tools.map((it, i) => <Card key={it.label} item={it} index={i + 3} onNavigate={onNavigate} />)}
          </div>
        </section>
      )}

      {!quick.length && !tools.length && (
        <p className="hm-empty">Nenhuma ferramenta encontrada para “{q}”. Tente “PDF”, “cotação” ou “planilha”.</p>
      )}
    </div>
  );
}