import React, { useState } from "react";
import "./Login.css";

const API_URL =
  process.env.REACT_APP_API_URL || "https://inbrape.onrender.com";

const ICONS = {
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  eyeOff:
    "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21",
  alert: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bolt: "M13 10V3L4 14h7v7l9-11h-7z",
  building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
};

const FEATURES = [
  { icon: "bolt", text: "Análise de textos, planilhas e imagens com IA" },
  { icon: "building", text: "CRM sincronizado com a Gluo" },
  { icon: "doc", text: "Editor de PDF, cotações e relatório Power BI" },
];

const STRENGTH = ["", "Fraca", "Razoável", "Boa", "Forte"];
function strength(p) {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

const Icon = ({ d, size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size, flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

function Field({
  label, icon, value, onChange, placeholder,
  type = "text", password, autoComplete, index = 0, children,
}) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const id = `lg-${label.replace(/\s/g, "")}`;
  return (
    <div className="lg-field" style={{ "--i": index }}>
      <label htmlFor={id} className="lg-sr">{label}</label>
      <div className="lg-box">
        <input
          id={id}
          type={password ? (show ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          onKeyUp={password ? (e) => setCaps(!!e.getModifierState?.("CapsLock")) : undefined}
          onBlur={() => setCaps(false)}
        />
        {password ? (
          <button
            type="button"
            className="lg-end lg-eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            <Icon d={show ? ICONS.eyeOff : ICONS.eye} />
          </button>
        ) : (
          <span className="lg-end lg-ico"><Icon d={ICONS[icon]} /></span>
        )}
      </div>
      {caps && (
        <div className="lg-caps"><Icon d={ICONS.alert} size={12} /> Caps Lock ligado</div>
      )}
      {children}
    </div>
  );
}

// Formas fluidas no estilo da referência, com as cores da Inbrape
function PanelArt() {
  const edge = "M330 -20 C345 200 300 340 200 450 C120 530 40 570 -20 610";
  return (
    <svg className="lg-art" viewBox="0 0 500 740" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="pgBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#030b3f" /><stop offset="1" stopColor="#0a2a8f" />
        </linearGradient>
        <linearGradient id="pgA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b7cff" /><stop offset=".6" stopColor="#2a45d6" /><stop offset="1" stopColor="#1a2fa8" />
        </linearGradient>
        <linearGradient id="pgB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#020733" /><stop offset=".55" stopColor="#1b2fb5" /><stop offset="1" stopColor="#3d63f0" />
        </linearGradient>
        <linearGradient id="pgEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4c8ff" /><stop offset="1" stopColor="#8ea2ff" stopOpacity=".25" />
        </linearGradient>
        <radialGradient id="pgGlow">
          <stop offset="0" stopColor="#E87722" stopOpacity=".6" /><stop offset="1" stopColor="#E87722" stopOpacity="0" />
        </radialGradient>
        <filter id="pgBlur"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <rect width="500" height="740" fill="url(#pgBg)" />
      <circle cx="440" cy="80" r="200" fill="url(#pgGlow)" className="lg-pulse" />
      <g className="lg-sway">
        <path d="M-20 -20 H330 C345 200 300 340 200 450 C120 530 40 570 -20 610 Z" fill="url(#pgA)" />
        <path d={edge} fill="none" stroke="url(#pgEdge)" strokeWidth="12" filter="url(#pgBlur)" opacity=".75" />
        <path d={edge} fill="none" stroke="url(#pgEdge)" strokeWidth="3" />
      </g>
      <g className="lg-sway2">
        <path d="M-20 760 V600 C90 540 190 470 290 470 C370 470 420 570 520 560 V760 Z" fill="url(#pgB)" />
        <path d="M-20 600 C90 540 190 470 290 470 C370 470 420 570 520 560" fill="none" stroke="rgba(196,186,255,.55)" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [login, setLogin] = useState({
    username: localStorage.getItem("ai_last_user") || "",
    password: "",
  });
  const [remember, setRemember] = useState(!!localStorage.getItem("ai_last_user"));
  const [register, setRegister] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errKey, setErrKey] = useState(0);
  const [success, setSuccess] = useState("");

  function fail(msg) {
    setError(msg);
    setErrKey((k) => k + 1);
  }

  function switchTab(next) {
    setTab(next);
    setError("");
    setSuccess("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!login.username || !login.password) {
      fail("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });
      const data = await r.json();
      if (!r.ok) {
        fail(data.error || "Não foi possível entrar.");
        return;
      }
      if (remember) localStorage.setItem("ai_last_user", login.username);
      else localStorage.removeItem("ai_last_user");
      localStorage.setItem("ai_token", data.token);
      localStorage.setItem("ai_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch {
      fail("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!register.username || !register.name || !register.email || !register.password) {
      fail("Preencha todos os campos.");
      return;
    }
    if (register.password !== register.confirm) {
      fail("As senhas não coincidem.");
      return;
    }
    if (register.password.length < 6) {
      fail("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const r = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: register.username,
          name: register.name,
          email: register.email,
          password: register.password,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        fail(data.error || "Não foi possível enviar a solicitação.");
        return;
      }
      setSuccess("Solicitação enviada! Aguarde aprovação do administrador.");
      setRegister({ username: "", name: "", email: "", password: "", confirm: "" });
      setTimeout(() => { setTab("login"); setSuccess(""); }, 4000);
    } catch {
      fail("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  const s = strength(register.password);
  const spinner = <span className="lg-spin" />;

  return (
    <div className="lg">
      <div className="lg-card">
        <section className="lg-left">
          <div className="lg-form-wrap">
            <img className="lg-logo" src="https://cic-rs.ind.br/wp-content/uploads/2025/06/INBRAPE-2.jpeg" alt="Inbrape" />
            <h1>{tab === "login" ? "Bem-vindo de volta" : "Solicitar acesso"}</h1>
            <p className="lg-sub">
              {tab === "login"
                ? "Insira seus dados para entrar."
                : "Preencha os dados para solicitar uma conta."}
            </p>

            {error && (
              <div className="lg-alert err" key={errKey} role="alert">
                <Icon d={ICONS.alert} size={15} />{error}
              </div>
            )}
            {success && (
              <div className="lg-alert ok" role="status">
                <Icon d={ICONS.check} size={15} />{success}
              </div>
            )}

            {tab === "login" ? (
              <form key="login" onSubmit={handleLogin} className="lg-form">
                <Field index={0} label="Usuário" icon="user" placeholder="Usuário" autoComplete="username"
                  value={login.username} onChange={(e) => setLogin((f) => ({ ...f, username: e.target.value }))} />
                <Field index={1} label="Senha" password placeholder="Senha" autoComplete="current-password"
                  value={login.password} onChange={(e) => setLogin((f) => ({ ...f, password: e.target.value }))} />
                <label className="lg-remember" style={{ "--i": 2 }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Lembrar meu usuário
                </label>
                <button type="submit" className="lg-btn" disabled={loading} style={{ "--i": 3 }}>
                  {loading ? <>{spinner}Entrando...</> : "Entrar"}
                </button>
              </form>
            ) : (
              <form key="register" onSubmit={handleRegister} className="lg-form">
                <Field index={0} label="Nome completo" icon="user" placeholder="Nome completo" autoComplete="name"
                  value={register.name} onChange={(e) => setRegister((f) => ({ ...f, name: e.target.value }))} />
                <Field index={1} label="Usuário" icon="user" placeholder="Usuário" autoComplete="username"
                  value={register.username} onChange={(e) => setRegister((f) => ({ ...f, username: e.target.value }))} />
                <Field index={2} label="E-mail" icon="mail" type="email" placeholder="E-mail" autoComplete="email"
                  value={register.email} onChange={(e) => setRegister((f) => ({ ...f, email: e.target.value }))} />
                <Field index={3} label="Senha" password placeholder="Senha (mínimo 6 caracteres)" autoComplete="new-password"
                  value={register.password} onChange={(e) => setRegister((f) => ({ ...f, password: e.target.value }))}>
                  {register.password && (
                    <div className="lg-meter" data-s={s}>
                      <i /><i /><i /><i />
                      <span>{STRENGTH[s]}</span>
                    </div>
                  )}
                </Field>
                <Field index={4} label="Confirmar senha" password placeholder="Confirmar senha" autoComplete="new-password"
                  value={register.confirm} onChange={(e) => setRegister((f) => ({ ...f, confirm: e.target.value }))}>
                  {register.confirm && (
                    <div className={`lg-match ${register.confirm === register.password ? "yes" : "no"}`}>
                      {register.confirm === register.password ? "Senhas coincidem" : "As senhas não coincidem"}
                    </div>
                  )}
                </Field>
                <div className="lg-note" style={{ "--i": 5 }}>
                  <Icon d={ICONS.info} size={14} />
                  Sua conta será ativada após aprovação do administrador.
                </div>
                <button type="submit" className="lg-btn" disabled={loading} style={{ "--i": 6 }}>
                  {loading ? <>{spinner}Enviando...</> : "Solicitar acesso"}
                </button>
              </form>
            )}

            <div className="lg-or"><span>ou</span></div>
            <button
              type="button"
              className="lg-btn ghost"
              onClick={() => switchTab(tab === "login" ? "register" : "login")}
            >
              {tab === "login" ? "Solicitar acesso" : "Já tenho conta"}
            </button>
          </div>
        </section>

        <aside className="lg-panel">
          <PanelArt />
          <div className="lg-glass">
            <h2>Documentos, cotações e dados da Inbrape num só lugar.</h2>
            <ul>
              {FEATURES.map((f) => (
                <li key={f.icon}>
                  <span><Icon d={ICONS[f.icon]} size={15} /></span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <p className="lg-copy">© 2026 Inbrape Tecidos Industriais · Sistema interno</p>
    </div>
  );
}