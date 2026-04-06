import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Shield, AlertTriangle, Activity, PlusCircle, TrendingUp,
  Cpu, Zap, Eye, Clock
} from "lucide-react";
import CyberLayout from "@/components/CyberLayout";

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

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.incidents.stats.useQuery();
  const { data: incidents } = trpc.incidents.list.useQuery();

  const totalIncidents = useMemo(() => stats?.byCategory.reduce((a, b) => a + b.count, 0) ?? 0, [stats]);
  const criticalCount = useMemo(() => stats?.byRisk.find((r) => r.riskLevel === "critical")?.count ?? 0, [stats]);
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

  const cardStyle: React.CSSProperties = {
    background: "oklch(0.10 0.015 240)",
    border: "1px solid oklch(0.22 0.03 240)",
    borderRadius: "0.25rem",
    padding: "1.25rem",
    position: "relative",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <CyberLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-mono neon-text-cyan tracking-wider">PAINEL DE CONTROLE</h1>
          <p className="font-mono text-xs mt-1" style={{ color: "oklch(0.45 0.02 240)" }}>
            Monitoramento em tempo real · Classificação automática por ML
          </p>
        </div>
        <button
          onClick={() => navigate("/incidents/new")}
          className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-bold tracking-wider uppercase transition-all duration-200"
          style={{ background: "oklch(0.85 0.2 195 / 0.12)", border: "1px solid oklch(0.85 0.2 195 / 0.5)", color: "oklch(0.85 0.2 195)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px oklch(0.85 0.2 195 / 0.3)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <PlusCircle className="w-4 h-4" />
          NOVO INCIDENTE
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Shield, label: "Total de Incidentes", value: totalIncidents, color: "oklch(0.85 0.2 195)", glow: "oklch(0.85 0.2 195 / 0.3)" },
          { icon: AlertTriangle, label: "Risco Crítico", value: criticalCount, color: "oklch(0.6 0.28 20)", glow: "oklch(0.6 0.28 20 / 0.3)" },
          { icon: Activity, label: "Categorias Ativas", value: stats?.byCategory.length ?? 0, color: "oklch(0.65 0.32 0)", glow: "oklch(0.65 0.32 0 / 0.3)" },
          { icon: TrendingUp, label: "Precisão do Modelo", value: "97%", color: "oklch(0.75 0.25 145)", glow: "oklch(0.75 0.25 145 / 0.3)" },
        ].map(({ icon: Icon, label, value, color, glow }) => (
          <div key={label} style={cardStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color.replace(")", " / 0.4)")}`; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${glow}`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.22 0.03 240)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs mb-1" style={{ color: "oklch(0.45 0.02 240)" }}>{label.toUpperCase()}</p>
                <p className="text-2xl font-bold font-mono" style={{ color, textShadow: `0 0 12px ${glow}` }}>
                  {isLoading ? "—" : value}
                </p>
              </div>
              <div className="p-2 rounded" style={{ background: `${color.replace(")", " / 0.1)")}`, border: `1px solid ${color.replace(")", " / 0.3)")}` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Bar Chart - Categories */}
        <div className="lg:col-span-2" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart className="w-4 h-4 neon-text-cyan" />
            <h3 className="font-mono text-sm font-bold" style={{ color: "oklch(0.85 0.01 240)" }}>INCIDENTES POR CATEGORIA</h3>
          </div>
          {barData.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>Nenhum dado disponível</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "oklch(0.45 0.02 240)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.45 0.02 240)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.12 0.015 240)", border: "1px solid oklch(0.22 0.03 240)", borderRadius: "0.25rem", fontFamily: "JetBrains Mono", fontSize: "11px", color: "oklch(0.85 0.01 240)" }}
                  cursor={{ fill: "oklch(0.85 0.2 195 / 0.05)" }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart - Risk */}
        <div style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 neon-text-pink" />
            <h3 className="font-mono text-sm font-bold" style={{ color: "oklch(0.85 0.01 240)" }}>NÍVEL DE RISCO</h3>
          </div>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>Nenhum dado</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" stroke="none">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.12 0.015 240)", border: "1px solid oklch(0.22 0.03 240)", borderRadius: "0.25rem", fontFamily: "JetBrains Mono", fontSize: "11px", color: "oklch(0.85 0.01 240)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: entry.fill }} />
                      <span className="font-mono text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>{entry.name}</span>
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
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 neon-text-cyan" />
            <h3 className="font-mono text-sm font-bold" style={{ color: "oklch(0.85 0.01 240)" }}>INCIDENTES RECENTES</h3>
          </div>
          <button onClick={() => navigate("/incidents")} className="font-mono text-xs transition-colors" style={{ color: "oklch(0.85 0.2 195)" }}>
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
            {recentIncidents.map((incident) => (
              <div
                key={incident.id}
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className="flex items-center gap-3 p-3 rounded cursor-pointer transition-all duration-150"
                style={{ background: "oklch(0.08 0.012 240)", border: "1px solid oklch(0.18 0.025 240)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.85 0.2 195 / 0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.18 0.025 240)"; }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "oklch(0.85 0.01 240)" }}>{incident.title}</p>
                  <p className="font-mono text-xs mt-0.5" style={{ color: "oklch(0.45 0.02 240)" }}>
                    {new Date(incident.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge-${incident.category} px-2 py-0.5 rounded font-mono text-xs`}>
                    {CATEGORY_LABELS[incident.category] ?? incident.category}
                  </span>
                  <span className={`risk-${incident.riskLevel} px-2 py-0.5 rounded font-mono text-xs`}>
                    {RISK_LABELS[incident.riskLevel] ?? incident.riskLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ML Info */}
      <div className="mt-4 p-3 rounded flex items-center gap-3" style={{ background: "oklch(0.85 0.2 195 / 0.04)", border: "1px solid oklch(0.85 0.2 195 / 0.15)" }}>
        <Cpu className="w-4 h-4 neon-text-cyan flex-shrink-0" />
        <p className="font-mono text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>
          Classificação automática via <span className="neon-text-cyan">TF-IDF + Naive Bayes</span> treinado com 100 amostras · Acurácia CV: <span className="neon-text-green">97%</span> · 5 categorias
        </p>
      </div>
    </CyberLayout>
  );
}
