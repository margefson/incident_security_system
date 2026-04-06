import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Activity, AlertTriangle, Shield, TrendingUp, Zap } from "lucide-react";
import CyberLayout from "@/components/CyberLayout";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing",
  malware: "Malware",
  brute_force: "Força Bruta",
  ddos: "DDoS",
  vazamento_de_dados: "Vazamento",
  unknown: "Desconhecido",
};

const RISK_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const RISK_WEIGHTS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const RISK_COLORS: Record<string, string> = {
  critical: "oklch(0.6 0.28 20)",
  high: "oklch(0.65 0.32 0)",
  medium: "oklch(0.9 0.25 100)",
  low: "oklch(0.75 0.25 145)",
};

const CATEGORY_COLORS: Record<string, string> = {
  phishing: "oklch(0.65 0.32 0)",
  malware: "oklch(0.6 0.28 290)",
  brute_force: "oklch(0.9 0.25 100)",
  ddos: "oklch(0.85 0.2 195)",
  vazamento_de_dados: "oklch(0.75 0.25 145)",
  unknown: "oklch(0.45 0.02 240)",
};

export default function RiskAnalysis() {
  const [, navigate] = useLocation();
  const { data: stats } = trpc.incidents.stats.useQuery();
  const { data: incidents } = trpc.incidents.list.useQuery();

  const totalIncidents = useMemo(() => incidents?.length ?? 0, [incidents]);

  const riskScore = useMemo(() => {
    if (!stats?.byRisk || totalIncidents === 0) return 0;
    const weighted = stats.byRisk.reduce((sum, r) => sum + r.count * (RISK_WEIGHTS[r.riskLevel] ?? 1), 0);
    const maxPossible = totalIncidents * 4;
    return Math.round((weighted / maxPossible) * 100);
  }, [stats, totalIncidents]);

  const riskScoreColor = riskScore >= 75 ? "oklch(0.6 0.28 20)" : riskScore >= 50 ? "oklch(0.65 0.32 0)" : riskScore >= 25 ? "oklch(0.9 0.25 100)" : "oklch(0.75 0.25 145)";
  const riskScoreLabel = riskScore >= 75 ? "CRÍTICO" : riskScore >= 50 ? "ALTO" : riskScore >= 25 ? "MÉDIO" : "BAIXO";

  const radarData = useMemo(() =>
    (stats?.byCategory ?? []).map((r) => ({
      subject: CATEGORY_LABELS[r.category] ?? r.category,
      value: r.count,
    })), [stats]);

  const riskBarData = useMemo(() =>
    (stats?.byRisk ?? []).map((r) => ({
      name: RISK_LABELS[r.riskLevel] ?? r.riskLevel,
      count: r.count,
      fill: RISK_COLORS[r.riskLevel] ?? "oklch(0.45 0.02 240)",
    })), [stats]);

  const cardStyle: React.CSSProperties = {
    background: "oklch(0.10 0.015 240)",
    border: "1px solid oklch(0.22 0.03 240)",
    borderRadius: "0.25rem",
    padding: "1.25rem",
  };

  const recommendations: { level: string; text: string; color: string }[] = useMemo(() => {
    const recs = [];
    const byCat = Object.fromEntries((stats?.byCategory ?? []).map((r) => [r.category, r.count]));
    const byRisk = Object.fromEntries((stats?.byRisk ?? []).map((r) => [r.riskLevel, r.count]));

    if ((byRisk.critical ?? 0) > 0) recs.push({ level: "CRÍTICO", text: `${byRisk.critical} incidente(s) crítico(s) detectado(s). Acionar equipe de resposta imediatamente.`, color: "oklch(0.6 0.28 20)" });
    if ((byCat.malware ?? 0) > 0) recs.push({ level: "ALTO", text: `${byCat.malware} incidente(s) de malware. Verificar isolamento de sistemas comprometidos.`, color: "oklch(0.65 0.32 0)" });
    if ((byCat.phishing ?? 0) > 0) recs.push({ level: "ALTO", text: `${byCat.phishing} incidente(s) de phishing. Reforçar treinamento de conscientização.`, color: "oklch(0.65 0.32 0)" });
    if ((byCat.brute_force ?? 0) > 0) recs.push({ level: "MÉDIO", text: `${byCat.brute_force} ataque(s) de força bruta. Implementar bloqueio automático após falhas.`, color: "oklch(0.9 0.25 100)" });
    if ((byCat.ddos ?? 0) > 0) recs.push({ level: "MÉDIO", text: `${byCat.ddos} incidente(s) DDoS. Revisar configurações de rate limiting e CDN.`, color: "oklch(0.9 0.25 100)" });
    if ((byCat.vazamento_de_dados ?? 0) > 0) recs.push({ level: "CRÍTICO", text: `${byCat.vazamento_de_dados} vazamento(s) de dados. Notificar DPO e avaliar obrigações LGPD.`, color: "oklch(0.6 0.28 20)" });
    if (recs.length === 0) recs.push({ level: "INFO", text: "Nenhum incidente registrado. Continue monitorando o ambiente.", color: "oklch(0.75 0.25 145)" });
    return recs;
  }, [stats]);

  return (
    <CyberLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded" style={{ background: "oklch(0.65 0.32 0 / 0.1)", border: "1px solid oklch(0.65 0.32 0 / 0.3)" }}>
          <Activity className="w-5 h-5 neon-text-pink" />
        </div>
        <div>
          <h1 className="text-lg font-bold font-mono neon-text-pink tracking-wider">ANÁLISE DE RISCO</h1>
          <p className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>Avaliação de ameaças e recomendações de segurança</p>
        </div>
      </div>

      {/* Risk Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1 p-5 rounded flex flex-col items-center justify-center" style={{ background: "oklch(0.09 0.012 240)", border: `1px solid ${riskScoreColor.replace(")", " / 0.3)")}` }}>
          <div className="font-mono text-xs mb-2" style={{ color: "oklch(0.45 0.02 240)" }}>SCORE DE RISCO GERAL</div>
          <div className="text-5xl font-bold font-mono mb-1" style={{ color: riskScoreColor, textShadow: `0 0 20px ${riskScoreColor.replace(")", " / 0.5)")}` }}>
            {riskScore}
          </div>
          <div className="font-mono text-xs font-bold" style={{ color: riskScoreColor }}>{riskScoreLabel}</div>
          <div className="w-full mt-3 h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 240)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${riskScore}%`, background: riskScoreColor, boxShadow: `0 0 8px ${riskScoreColor.replace(")", " / 0.6)")}` }} />
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          {[
            { icon: Shield, label: "Total Incidentes", value: totalIncidents, color: "oklch(0.85 0.2 195)" },
            { icon: AlertTriangle, label: "Críticos + Altos", value: (stats?.byRisk.filter((r) => r.riskLevel === "critical" || r.riskLevel === "high").reduce((a, b) => a + b.count, 0) ?? 0), color: "oklch(0.65 0.32 0)" },
            { icon: Zap, label: "Categorias", value: stats?.byCategory.length ?? 0, color: "oklch(0.9 0.25 100)" },
            { icon: TrendingUp, label: "Precisão ML", value: "97%", color: "oklch(0.75 0.25 145)" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>{label.toUpperCase()}</span>
              </div>
              <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Radar */}
        <div style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 neon-text-cyan" />
            <h3 className="font-mono text-sm font-bold" style={{ color: "oklch(0.85 0.01 240)" }}>PERFIL DE AMEAÇAS</h3>
          </div>
          {radarData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>Sem dados</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(0.22 0.03 240)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.45 0.02 240)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Radar dataKey="value" stroke="oklch(0.85 0.2 195)" fill="oklch(0.85 0.2 195 / 0.2)" strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Risk Bar */}
        <div style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 neon-text-pink" />
            <h3 className="font-mono text-sm font-bold" style={{ color: "oklch(0.85 0.01 240)" }}>DISTRIBUIÇÃO DE RISCO</h3>
          </div>
          {riskBarData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>Sem dados</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "oklch(0.45 0.02 240)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.45 0.02 240)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.12 0.015 240)", border: "1px solid oklch(0.22 0.03 240)", borderRadius: "0.25rem", fontFamily: "JetBrains Mono", fontSize: "11px", color: "oklch(0.85 0.01 240)" }} cursor={{ fill: "oklch(0.85 0.2 195 / 0.05)" }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {riskBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 neon-text-cyan" />
          <h3 className="font-mono text-sm font-bold" style={{ color: "oklch(0.85 0.01 240)" }}>RECOMENDAÇÕES DE SEGURANÇA</h3>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded" style={{ background: "oklch(0.08 0.012 240)", border: `1px solid ${rec.color.replace(")", " / 0.2)")}` }}>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ background: `${rec.color.replace(")", " / 0.15)")}`, color: rec.color, border: `1px solid ${rec.color.replace(")", " / 0.3)")}` }}>
                {rec.level}
              </span>
              <p className="font-mono text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>{rec.text}</p>
            </div>
          ))}
        </div>
      </div>
    </CyberLayout>
  );
}
