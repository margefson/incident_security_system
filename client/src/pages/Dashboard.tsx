import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  Shield, AlertTriangle, Activity, PlusCircle, TrendingUp,
  Cpu, Zap, Eye, Clock, Target, FileDown,
} from "lucide-react";
import CyberLayout from "@/components/CyberLayout";
import ExportPdfButton from "@/components/ExportPdfButton";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing",
  malware: "Malware",
  brute_force: "Força Bruta",
  ddos: "DDoS",
  vazamento_de_dados: "Vazamento",
  unknown: "Desconhecido",
};

const CATEGORY_COLORS: Record<string, string> = {
  phishing: "oklch(0.65 0.32 0)",
  malware: "oklch(0.6 0.28 290)",
  brute_force: "oklch(0.9 0.25 100)",
  ddos: "oklch(0.85 0.2 195)",
  vazamento_de_dados: "oklch(0.75 0.25 145)",
  unknown: "oklch(0.45 0.02 240)",
};

const RISK_COLORS: Record<string, string> = {
  critical: "oklch(0.6 0.28 20)",
  high: "oklch(0.65 0.32 0)",
  medium: "oklch(0.9 0.25 100)",
  low: "oklch(0.75 0.25 145)",
};

const RISK_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded font-mono text-xs" style={{ background: "oklch(0.13 0.02 240)", border: "1px solid oklch(0.85 0.2 195 / 0.3)" }}>
      <div style={{ color: "oklch(0.55 0.02 240)" }}>{label}</div>
      <div style={{ color: "oklch(0.85 0.2 195)" }}>{payload[0]?.value} incidente(s)</div>
    </div>
  );
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.incidents.stats.useQuery();
  const { data: incidents } = trpc.incidents.list.useQuery();

  const totalIncidents = useMemo(() => stats?.byCategory.reduce((a, b) => a + b.count, 0) ?? 0, [stats]);
  const criticalCount = useMemo(() => stats?.byRisk.find((r) => r.riskLevel === "critical")?.count ?? 0, [stats]);
  const highRiskCount = useMemo(() =>
    (stats?.byRisk.find((r) => r.riskLevel === "critical")?.count ?? 0) +
    (stats?.byRisk.find((r) => r.riskLevel === "high")?.count ?? 0), [stats]);
  const recentIncidents = useMemo(() => incidents?.slice(0, 5) ?? [], [incidents]);

  const barData = useMemo(() =>
    (stats?.byCategory ?? []).map((r) => ({
      name: CATEGORY_LABELS[r.category] ?? r.category,
      count: r.count,
      fill: CATEGORY_COLORS[r.category] ?? "oklch(0.45 0.02 240)",
    })), [stats]);

  const pieData = useMemo(() =>
    (stats?.byRisk ?? []).map((r) => ({
      name: RISK_LABELS[r.riskLevel] ?? r.riskLevel,
      value: r.count,
      fill: RISK_COLORS[r.riskLevel] ?? "oklch(0.45 0.02 240)",
    })), [stats]);

  return (
    <CyberLayout>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ background: "oklch(0.85 0.2 195)", boxShadow: "0 0 10px oklch(0.85 0.2 195 / 0.7)" }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Orbitron, JetBrains Mono, monospace", color: "oklch(0.85 0.2 195)", letterSpacing: "0.08em" }}>
              DASHBOARD
            </h1>
          </div>
          <p className="ml-4 text-sm font-mono" style={{ color: "oklch(0.45 0.02 240)" }}>
            Monitoramento · Classificação automática por ML · Análise de risco
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPdfButton label="Exportar PDF" />
          <button
            onClick={() => navigate("/incidents/new")}
            className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-semibold tracking-wider uppercase transition-all duration-200"
            style={{ background: "oklch(0.85 0.2 195 / 0.12)", border: "1px solid oklch(0.85 0.2 195 / 0.5)", color: "oklch(0.85 0.2 195)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.22)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px oklch(0.85 0.2 195 / 0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <PlusCircle className="w-4 h-4" />
            Novo Incidente
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Shield, label: "Total de Incidentes", value: totalIncidents, color: "oklch(0.85 0.2 195)", accent: "stat-card-cyan", sub: "registros ativos" },
          { icon: AlertTriangle, label: "Risco Crítico", value: criticalCount, color: "oklch(0.65 0.32 0)", accent: "stat-card-pink", sub: "atenção imediata" },
          { icon: Zap, label: "Alto Risco", value: highRiskCount, color: "oklch(0.9 0.25 100)", accent: "stat-card-yellow", sub: "crítico + alto" },
          { icon: Target, label: "Precisão ML", value: "97%", color: "oklch(0.75 0.25 145)", accent: "stat-card-green", sub: "cross-validation 5-fold" },
        ].map(({ icon: Icon, label, value, color, accent, sub }) => (
          <div key={label} className={`cyber-card p-5 ${accent}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "oklch(0.45 0.02 240)" }}>
                {label}
              </span>
              <div className="p-1.5 rounded" style={{ background: `${color} / 0.1`, border: `1px solid ${color} / 0.25` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ fontFamily: "Orbitron, monospace", color, textShadow: `0 0 16px ${color} / 0.4` }}>
              {isLoading ? "—" : value}
            </div>
            <div className="text-xs font-mono" style={{ color: "oklch(0.38 0.02 240)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Bar Chart */}
        <div className="lg:col-span-2 cyber-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-mono text-sm font-semibold" style={{ color: "oklch(0.85 0.2 195)" }}>
                INCIDENTES POR CATEGORIA
              </h3>
              <p className="font-mono text-xs mt-0.5" style={{ color: "oklch(0.38 0.02 240)" }}>Distribuição de ameaças detectadas</p>
            </div>
            <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.45 0.02 240)" }} />
          </div>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="font-mono text-xs neon-pulse" style={{ color: "oklch(0.38 0.02 240)" }}>Carregando...</span>
            </div>
          ) : barData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <Shield className="w-8 h-8" style={{ color: "oklch(0.25 0.02 240)" }} />
              <p className="font-mono text-xs" style={{ color: "oklch(0.38 0.02 240)" }}>Nenhum incidente registrado</p>
              <button onClick={() => navigate("/incidents/new")} className="px-3 py-1.5 rounded font-mono text-xs" style={{ background: "oklch(0.85 0.2 195 / 0.1)", border: "1px solid oklch(0.85 0.2 195 / 0.4)", color: "oklch(0.85 0.2 195)" }}>
                + Registrar primeiro
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 240)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.45 0.02 240)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.38 0.02 240)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "oklch(0.85 0.2 195 / 0.05)" }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="cyber-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-mono text-sm font-semibold" style={{ color: "oklch(0.65 0.32 0)" }}>NÍVEIS DE RISCO</h3>
              <p className="font-mono text-xs mt-0.5" style={{ color: "oklch(0.38 0.02 240)" }}>Por severidade</p>
            </div>
            <Activity className="w-4 h-4" style={{ color: "oklch(0.45 0.02 240)" }} />
          </div>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="font-mono text-xs neon-pulse" style={{ color: "oklch(0.38 0.02 240)" }}>Carregando...</span>
            </div>
          ) : pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <span className="font-mono text-xs" style={{ color: "oklch(0.38 0.02 240)" }}>Sem dados</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="oklch(0.08 0.012 240)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="px-2 py-1.5 rounded font-mono text-xs" style={{ background: "oklch(0.13 0.02 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
                          <span style={{ color: payload[0]?.payload?.fill }}>{payload[0]?.name}</span>
                          <span style={{ color: "oklch(0.75 0.01 240)" }}> · {payload[0]?.value}</span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
                      <span className="font-mono text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>{entry.name}</span>
                    </div>
                    <span className="font-mono text-xs font-bold" style={{ color: entry.fill }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="cyber-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 neon-text-cyan" />
            <h3 className="font-mono text-sm font-semibold" style={{ color: "oklch(0.85 0.2 195)" }}>INCIDENTES RECENTES</h3>
          </div>
          <button onClick={() => navigate("/incidents")} className="font-mono text-xs transition-colors" style={{ color: "oklch(0.45 0.02 240)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.85 0.2 195)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.45 0.02 240)"; }}
          >
            VER TODOS →
          </button>
        </div>
        {recentIncidents.length === 0 ? (
          <div className="py-8 text-center">
            <Eye className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.25 0.02 240)" }} />
            <p className="font-mono text-sm" style={{ color: "oklch(0.35 0.02 240)" }}>Nenhum incidente registrado</p>
            <button onClick={() => navigate("/incidents/new")} className="mt-3 font-mono text-xs neon-text-cyan">
              + Registrar primeiro incidente
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentIncidents.map((incident, idx) => (
              <div
                key={incident.id}
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className="flex items-center gap-4 px-4 py-3 rounded cursor-pointer transition-all duration-150"
                style={{ background: "oklch(0.08 0.012 240)", border: "1px solid oklch(0.18 0.025 240)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.85 0.2 195 / 0.3)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.10 0.015 240)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.18 0.025 240)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.08 0.012 240)"; }}
              >
                <span className="font-mono text-xs w-5 text-center flex-shrink-0" style={{ color: "oklch(0.35 0.02 240)" }}>{idx + 1}</span>
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[incident.riskLevel] ?? "oklch(0.45 0.02 240)" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "oklch(0.85 0.01 240)" }}>{incident.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[incident.category] ?? "oklch(0.45 0.02 240)"} / 0.12`, color: CATEGORY_COLORS[incident.category] ?? "oklch(0.45 0.02 240)" }}>
                      {CATEGORY_LABELS[incident.category] ?? incident.category}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-1 rounded flex-shrink-0" style={{ color: RISK_COLORS[incident.riskLevel] ?? "oklch(0.45 0.02 240)", background: `${RISK_COLORS[incident.riskLevel] ?? "oklch(0.45 0.02 240)"} / 0.1` }}>
                  {RISK_LABELS[incident.riskLevel] ?? incident.riskLevel}
                </span>
                <span className="font-mono text-xs flex-shrink-0" style={{ color: "oklch(0.35 0.02 240)" }}>
                  {new Date(incident.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ML Info bar */}
      <div className="mt-6 p-3 rounded flex items-center gap-3" style={{ background: "oklch(0.85 0.2 195 / 0.04)", border: "1px solid oklch(0.85 0.2 195 / 0.15)" }}>
        <Cpu className="w-4 h-4 neon-text-cyan flex-shrink-0" />
        <p className="font-mono text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>
          Classificação automática via <span className="neon-text-cyan">TF-IDF + Naive Bayes</span> · Treinado com 100 amostras · Acurácia CV: <span className="neon-text-green">97%</span> · 5 categorias de ameaça
        </p>
      </div>
    </CyberLayout>
  );
}
