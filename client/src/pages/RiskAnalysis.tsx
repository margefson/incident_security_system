import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Shield, AlertTriangle, TrendingUp, Activity } from "lucide-react";

// RISK_CONFIG: maps risk levels to display properties (used by design system tests)
const RISK_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  critical: { label: "Crítico",  color: "#f87171", badge: "text-red-400 bg-red-400/10 border-red-400/30" },
  high:     { label: "Alto",     color: "#fb923c", badge: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  medium:   { label: "Médio",    color: "#fbbf24", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  low:      { label: "Baixo",    color: "#34d399", badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
};

const RISK_COLORS: Record<string, string> = {
  critical: "#f87171",
  high:     "#fb923c",
  medium:   "#fbbf24",
  low:      "#34d399",
};

const RISK_BADGE: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  low:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

export default function RiskAnalysis() {
  const { data: stats } = trpc.incidents.stats.useQuery();

  const riskData = stats?.byRisk
    ? Object.entries(stats.byRisk).map(([name, value]) => ({ name, value: value as number }))
    : [];

  const criticalCount = stats?.byRisk?.critical ?? 0;
  const highCount = stats?.byRisk?.high ?? 0;
  const totalCount = stats?.total ?? 0;
  const riskScore = totalCount > 0 ? Math.round(((criticalCount * 4 + highCount * 3) / (totalCount * 4)) * 100) : 0;

  const recommendations: { level: string; text: string }[] = [];
  if (criticalCount > 0) recommendations.push({ level: "critical", text: `${criticalCount} incidente(s) crítico(s) requerem atenção imediata.` });
  if (highCount > 0) recommendations.push({ level: "high", text: `${highCount} incidente(s) de alto risco devem ser investigados.` });
  if (recommendations.length === 0) recommendations.push({ level: "low", text: "Nenhum incidente crítico ou de alto risco no momento." });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono">Análise de Risco</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão consolidada dos níveis de risco</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Score de Risco", value: `${riskScore}%`, icon: TrendingUp, color: riskScore > 60 ? "text-red-400" : riskScore > 30 ? "text-yellow-400" : "text-emerald-400" },
            { label: "Críticos", value: criticalCount, icon: AlertTriangle, color: "text-red-400" },
            { label: "Alto Risco", value: highCount, icon: Shield, color: "text-orange-400" },
            { label: "Total", value: totalCount, icon: Activity, color: "text-cyan-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground font-mono mb-4">Distribuição por Nível de Risco</h3>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.24 0.02 240)" />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.58 0.02 240)", fontSize: 11, fontFamily: "JetBrains Mono" }} />
                <YAxis tick={{ fill: "oklch(0.58 0.02 240)", fontSize: 11, fontFamily: "JetBrains Mono" }} />
                <Tooltip contentStyle={{ background: "oklch(0.15 0.018 240)", border: "1px solid oklch(0.24 0.02 240)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "12px" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry, i) => <Cell key={i} fill={RISK_COLORS[entry.name] ?? "#94a3b8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Nenhum dado disponível</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground font-mono mb-4">Recomendações</h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${RISK_BADGE[rec.level] ?? RISK_BADGE.low}`}>
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{rec.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
