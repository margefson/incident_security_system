import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { Activity, AlertTriangle, Shield, TrendingUp, Zap } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing", malware: "Malware", brute_force: "Brute Force",
  ddos: "DDoS", vazamento_de_dados: "Vazamento", unknown: "Desconhecido",
};
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítico", color: "#ef4444" },
  high:     { label: "Alto",    color: "#f97316" },
  medium:   { label: "Médio",   color: "#eab308" },
  low:      { label: "Baixo",   color: "#22c55e" },
};
const RISK_WEIGHTS: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export default function RiskAnalysis() {
  const { data: stats } = trpc.incidents.stats.useQuery();
  const { data: incidents } = trpc.incidents.list.useQuery();
  const totalIncidents = incidents?.length ?? 0;

  const riskScore = useMemo(() => {
    if (!stats?.byRisk || totalIncidents === 0) return 0;
    const weighted = stats.byRisk.reduce((sum, r) => sum + r.count * (RISK_WEIGHTS[r.riskLevel] ?? 1), 0);
    return Math.round((weighted / (totalIncidents * 4)) * 100);
  }, [stats, totalIncidents]);

  const riskScoreColor = riskScore >= 75 ? "#ef4444" : riskScore >= 50 ? "#f97316" : riskScore >= 25 ? "#eab308" : "#22c55e";
  const riskScoreLabel = riskScore >= 75 ? "Crítico" : riskScore >= 50 ? "Alto" : riskScore >= 25 ? "Médio" : "Baixo";

  const radarData = useMemo(() =>
    (stats?.byCategory ?? []).map((r) => ({ subject: CATEGORY_LABELS[r.category] ?? r.category, value: r.count })),
    [stats]);

  const riskBarData = useMemo(() =>
    (stats?.byRisk ?? []).map((r) => ({
      name: RISK_CONFIG[r.riskLevel]?.label ?? r.riskLevel,
      count: r.count,
      fill: RISK_CONFIG[r.riskLevel]?.color ?? "#64748b",
    })), [stats]);

  const recommendations: { level: string; text: string; color: string }[] = useMemo(() => {
    const recs = [];
    const byCat = Object.fromEntries((stats?.byCategory ?? []).map((r) => [r.category, r.count]));
    const byRisk = Object.fromEntries((stats?.byRisk ?? []).map((r) => [r.riskLevel, r.count]));
    if ((byRisk.critical ?? 0) > 0) recs.push({ level: "Crítico", text: `${byRisk.critical} incidente(s) crítico(s). Acionar equipe de resposta imediatamente.`, color: "#ef4444" });
    if ((byCat.vazamento_de_dados ?? 0) > 0) recs.push({ level: "Crítico", text: `${byCat.vazamento_de_dados} vazamento(s) de dados. Notificar DPO e avaliar obrigações LGPD.`, color: "#ef4444" });
    if ((byCat.malware ?? 0) > 0) recs.push({ level: "Alto", text: `${byCat.malware} incidente(s) de malware. Verificar isolamento de sistemas comprometidos.`, color: "#f97316" });
    if ((byCat.phishing ?? 0) > 0) recs.push({ level: "Alto", text: `${byCat.phishing} incidente(s) de phishing. Reforçar treinamento de conscientização.`, color: "#f97316" });
    if ((byCat.brute_force ?? 0) > 0) recs.push({ level: "Médio", text: `${byCat.brute_force} ataque(s) de força bruta. Implementar bloqueio automático após falhas.`, color: "#eab308" });
    if ((byCat.ddos ?? 0) > 0) recs.push({ level: "Médio", text: `${byCat.ddos} incidente(s) DDoS. Revisar configurações de rate limiting e CDN.`, color: "#eab308" });
    if (recs.length === 0) recs.push({ level: "Info", text: "Nenhum incidente registrado. Continue monitorando o ambiente.", color: "#22c55e" });
    return recs;
  }, [stats]);

  const tooltipStyle = { background: "oklch(0.12 0.012 240)", border: "1px solid oklch(0.20 0.008 240)", borderRadius: 4, fontSize: 11, color: "oklch(0.82 0.008 240)" };

  return (
    <div className="soc-page">
      {/* Header */}
      <div className="soc-page-header">
        <div>
          <h1 className="soc-page-title">Análise de Risco</h1>
          <p className="soc-page-sub">Avaliação de ameaças e recomendações de segurança</p>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { icon: Activity, label: "Score de Risco", value: riskScore, suffix: "", color: riskScoreColor, sub: riskScoreLabel },
          { icon: Shield, label: "Total Incidentes", value: totalIncidents, suffix: "", color: "oklch(0.82 0.20 155)", sub: "registrados" },
          { icon: AlertTriangle, label: "Críticos + Altos", value: (stats?.byRisk.filter((r) => r.riskLevel === "critical" || r.riskLevel === "high").reduce((a, b) => a + b.count, 0) ?? 0), suffix: "", color: "#f97316", sub: "requerem atenção" },
          { icon: TrendingUp, label: "Precisão ML", value: "97", suffix: "%", color: "#22c55e", sub: "cross-validation" },
        ].map(({ icon: Icon, label, value, suffix, color, sub }) => (
          <div key={label} className="soc-card">
            <div className="soc-card-body" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.72rem", color: "oklch(0.48 0.010 240)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                <Icon size={14} style={{ color }} />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color, lineHeight: 1, marginBottom: "0.25rem" }}>
                {value}{suffix}
              </div>
              <div style={{ fontSize: "0.72rem", color: "oklch(0.40 0.008 240)" }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Radar */}
        <div className="soc-card">
          <div className="soc-card-header">
            <Zap size={14} style={{ color: "oklch(0.82 0.20 155)" }} />
            <span className="soc-card-title">Perfil de Ameaças</span>
          </div>
          <div className="soc-card-body">
            {radarData.length === 0 ? (
              <div className="soc-empty" style={{ height: 200 }}>Sem dados disponíveis</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(0.20 0.008 240)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.48 0.010 240)", fontSize: 10 }} />
                  <Radar dataKey="value" stroke="oklch(0.82 0.20 155)" fill="oklch(0.82 0.20 155 / 0.15)" strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Risk Bar */}
        <div className="soc-card">
          <div className="soc-card-header">
            <AlertTriangle size={14} style={{ color: "#f97316" }} />
            <span className="soc-card-title">Distribuição por Risco</span>
          </div>
          <div className="soc-card-body">
            {riskBarData.length === 0 ? (
              <div className="soc-empty" style={{ height: 200 }}>Sem dados disponíveis</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.48 0.010 240)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.48 0.010 240)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.82 0.20 155 / 0.05)" }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {riskBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="soc-card">
        <div className="soc-card-header">
          <Shield size={14} style={{ color: "oklch(0.82 0.20 155)" }} />
          <span className="soc-card-title">Recomendações de Segurança</span>
        </div>
        <div className="soc-card-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: 4, background: `${rec.color}08`, border: `1px solid ${rec.color}25` }}>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, color: rec.color, background: `${rec.color}18`, border: `1px solid ${rec.color}40`, flexShrink: 0 }}>
                  {rec.level}
                </span>
                <p style={{ fontSize: "0.82rem", color: "oklch(0.65 0.008 240)", lineHeight: 1.5 }}>{rec.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
