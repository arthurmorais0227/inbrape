import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getDashboardPipeline, getDashboardVisitas, getDashboardContas } from "../services/api";

const NAVY = "#024088";
const NAVY_LIGHT = "#2E6DB4";
const ORANGE = "#E87722";
const SUCCESS = "#059669";
const ERROR = "#DC2626";
const GRAY = "#CBD5E1";

const STAGE_COLORS = {
  vencedor: SUCCESS, perdedor: ERROR, aberto: NAVY_LIGHT,
};
function stageColor(label) {
  return STAGE_COLORS[String(label).toLowerCase()] || GRAY;
}

function formatMoney(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function formatMoneyCompact(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}K`;
  return formatMoney(n);
}
function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso; }
}

function Icon({ d, size = 16, ...props }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: size, height: size, flexShrink: 0 }} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}
const ICONS = {
  currency: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  mic: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4m-4 0h8",
  alert: "M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z",
};

function KpiCard({ icon, label, value, tone }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div className="card-header-icon" style={tone === "danger" ? { background: "var(--error-bg)", color: "var(--error)" } : {}}>
        <Icon d={icon} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: tone === "danger" ? "var(--error)" : "var(--gray-800)" }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--gray-400)" }}>{label}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, desc, children, loading, error }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {desc && <div className="card-desc">{desc}</div>}
        </div>
      </div>
      {loading && <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}><div className="spinner" /></div>}
      {!loading && error && <div className="error-box"><Icon d={ICONS.alert} />{error}</div>}
      {!loading && !error && children}
    </div>
  );
}

export default function Dashboard() {
  const [pipeline, setPipeline] = useState(null);
  const [visitas, setVisitas] = useState(null);
  const [contas, setContas] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState({ pipeline: true, visitas: true, contas: true });

  useEffect(() => {
    getDashboardPipeline()
      .then(setPipeline)
      .catch((e) => setErrors((er) => ({ ...er, pipeline: e.message })))
      .finally(() => setLoading((l) => ({ ...l, pipeline: false })));

    getDashboardVisitas()
      .then(setVisitas)
      .catch((e) => setErrors((er) => ({ ...er, visitas: e.message })))
      .finally(() => setLoading((l) => ({ ...l, visitas: false })));

    getDashboardContas()
      .then(setContas)
      .catch((e) => setErrors((er) => ({ ...er, contas: e.message })))
      .finally(() => setLoading((l) => ({ ...l, contas: false })));
  }, []);

  const resumo = pipeline?.resumo;
  const vencidosCount = visitas?.proximosPassosVencidos?.length ?? 0;

  return (
    <div>
      <h1 className="page-title">Painel de Inteligência</h1>
      <p className="page-subtitle">Pipeline, disciplina de visitas e saúde de contas — direto dos dados sincronizados.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiCard icon={ICONS.currency} label="Pipeline em aberto" value={resumo ? formatMoneyCompact(resumo.valorAberto) : "—"} />
        <KpiCard icon={ICONS.check} label="Taxa de conversão" value={resumo?.taxaConversao != null ? `${(resumo.taxaConversao * 100).toFixed(0)}%` : "—"} />
        <KpiCard icon={ICONS.mic} label="Visitas registradas" value={visitas?.totalVisitas ?? "—"} />
        <KpiCard icon={ICONS.alert} label="Próximos passos vencidos" value={vencidosCount} tone={vencidosCount > 0 ? "danger" : undefined} />
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <ChartCard title="Pipeline por estágio" desc="Valor total de cotações" loading={loading.pipeline} error={errors.pipeline}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipeline?.porEstagio || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="estagio" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={formatMoneyCompact} width={60} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {(pipeline?.porEstagio || []).map((entry, i) => (
                  <Cell key={i} fill={stageColor(entry.estagio)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendência mensal" desc="Valor de cotações criadas por mês" loading={loading.pipeline} error={errors.pipeline}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={pipeline?.tendencia || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={formatMoneyCompact} width={60} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Line type="monotone" dataKey="valor" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <ChartCard title="Top 10 contas por valor em cotações" loading={loading.pipeline} error={errors.pipeline}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pipeline?.topContas || []} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" fontSize={11} tickFormatter={formatMoneyCompact} />
              <YAxis type="category" dataKey="accountname" fontSize={11} width={140} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="valor" fill={ORANGE} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Visitas por semana" desc="Últimas 8 semanas" loading={loading.visitas} error={errors.visitas}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={visitas?.porSemana || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="semana" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="qtd" fill={NAVY_LIGHT} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <ChartCard title="Visitas por pessoa" loading={loading.visitas} error={errors.visitas}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={visitas?.porPessoa || []} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="pessoa" fontSize={11} width={110} />
              <Tooltip />
              <Bar dataKey="qtd" fill={NAVY} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Classificação ABC das contas" desc="Campo já calculado pela própria Gluo" loading={loading.contas} error={errors.contas}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={contas?.porClasse || []} dataKey="qtd" nameKey="classe" cx="50%" cy="50%" outerRadius={80} label>
                {(contas?.porClasse || []).map((_, i) => (
                  <Cell key={i} fill={[NAVY, ORANGE, NAVY_LIGHT, GRAY, SUCCESS][i % 5]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Próximos passos vencidos" desc="Combinados em relatórios de visita e ainda não cumpridos" loading={loading.visitas} error={errors.visitas}>
        {(visitas?.proximosPassosVencidos || []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--gray-400)" }}>Nenhum próximo passo vencido. 🎉</p>
        ) : (
          <div className="history-list">
            {visitas.proximosPassosVencidos.map((v) => (
              <div className="history-card" key={v.id}>
                <div className="history-card-icon document" style={{ background: "var(--error-bg)", color: "var(--error)" }}>
                  <Icon d={ICONS.alert} size={18} />
                </div>
                <div className="history-card-body">
                  <div className="history-card-top">
                    <span className="history-card-badge">{v.empresa_unidade || "Sem empresa"}</span>
                    <span style={{ fontSize: 12, color: "var(--error)" }}>venceu em {formatDate(v.data_proximo_passo)}</span>
                  </div>
                  <p className="history-preview">{v.proximo_passo || "—"} {v.responsavel ? `· ${v.responsavel}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <div style={{ height: 20 }} />

      <ChartCard title="Contas em risco" desc="Maior tempo sem venda, entre clientes ativos" loading={loading.contas} error={errors.contas}>
        {(contas?.emRisco || []).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--gray-400)" }}>Sem dados suficientes ainda.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--gray-600)", fontSize: 12 }}>
                  <th style={{ padding: "8px 10px" }}>Organização</th>
                  <th style={{ padding: "8px 10px" }}>Dias sem venda</th>
                  <th style={{ padding: "8px 10px" }}>Último faturamento</th>
                  <th style={{ padding: "8px 10px" }}>Classe</th>
                </tr>
              </thead>
              <tbody>
                {contas.emRisco.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--gray-100)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{c.accountname}</td>
                    <td style={{ padding: "8px 10px", color: c.dias_sem_venda > 90 ? "var(--error)" : "var(--gray-700)" }}>{c.dias_sem_venda ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{c.ultimo_faturamento ? formatMoney(c.ultimo_faturamento) : "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{c.classe || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}