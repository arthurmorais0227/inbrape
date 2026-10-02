import React, { useState, useEffect, useRef } from "react";
import "./NavBar.css";

// Abas fixas na barra, na ordem. Todas as outras vão para o menu de ferramentas.
const PRIMARY = ["home", "pdf", "crm", "excel"];

// Cor do ícone de cada ferramenta no menu (ids que não estiverem aqui usam FALLBACK)
const COLORS = {
  painel: "#22C55E",
  text: "#4C6FFF",
  visitas: "#F97316",
  image: "#A855F7",
  document: "#F43F5E",
  history: "#CA8A04",
  admin: "#06B6D4",
};
const FALLBACK = ["#4C6FFF", "#22C55E", "#F97316", "#F43F5E", "#A855F7", "#06B6D4"];

const WRENCH =
  "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z";

const Svg = ({ d, size = 15, stroke = 2 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size, flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export default function NavBar({ tabs, active, onChange, badges = {}, primary = PRIMARY }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const primaryTabs = primary.map((id) => tabs.find((t) => t.id === id)).filter(Boolean);
  const menuTabs = tabs.filter((t) => !primary.includes(t.id));
  const menuActive = menuTabs.some((t) => t.id === active);
  const menuBadge = menuTabs.reduce((n, t) => n + (badges[t.id] || 0), 0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className="nav">
      <div className="nav-inner">
        <nav className="nav-primary" aria-label="Navegação principal">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${active === tab.id ? "active" : ""}`}
              onClick={() => pick(tab.id)}
            >
              <Svg d={tab.d} />
              {tab.label}
            </button>
          ))}
        </nav>

        {menuTabs.length > 0 && (
          <div className="nav-menu-wrap" ref={wrapRef}>
            <button
              ref={btnRef}
              type="button"
              className={`nav-launch ${open ? "open" : ""}`}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label="Mais ferramentas"
              onClick={() => setOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {[6, 12, 18].flatMap((cy) =>
                  [6, 12, 18].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" />)
                )}
              </svg>
              {menuBadge > 0 ? (
                <span className="nav-badge">{menuBadge}</span>
              ) : (
                menuActive && <span className="nav-dot" />
              )}
            </button>

            {open && (
              <div className="nav-pop" role="dialog" aria-label="Ferramentas">
                <div className="nav-pop-head">
                  <h2>
                    <Svg d={WRENCH} size={20} />
                    Ferramentas
                  </h2>
                  <button type="button" className="nav-pop-close" onClick={() => setOpen(false)} aria-label="Fechar menu">
                    <Svg d="M5 15l7-7 7 7" size={16} />
                  </button>
                </div>

                <div className="nav-grid">
                  {menuTabs.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`nav-tile ${active === t.id ? "on" : ""}`}
                      style={{ "--c": COLORS[t.id] || FALLBACK[i % FALLBACK.length], "--i": i }}
                      onClick={() => pick(t.id)}
                    >
                      <Svg d={t.d} size={30} stroke={1.8} />
                      <span>{t.label}</span>
                      {badges[t.id] > 0 && <em>{badges[t.id]}</em>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}