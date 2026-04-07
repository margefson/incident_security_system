import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, AlertTriangle, Clock, CheckCircle, Plus, ArrowRight, Activity, Target } from "lucide-react";
import ExportPdfButton from "@/components/ExportPdfButton";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing", malware: "Malware", brute_force: "Brute Force",
  ddos: "DDoS", vazamento_de_dados: "Vazamento de Dados",
};
const CAT_COLORS: Record<string, string> = {
  phishing: "#3b82f6", malware: "#ef4444", brute_force: "#f97316",
  ddos: "#a855f7", vazamento_de_dados: "#ec4899",
};
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítico",  color: "#ef4444" },
  high:     { label: "Alto",     color: "#f97316" },
  medium:   { label: "Médio",    color: "#eab308" },
  low:      { label: "Baixo",    color: "#22c55e" },
};

function RiskBadge({ risk }: { risk: string }) {
  const cfg = RISK_CONFIG[risk] ?? { label: risk, color: "#94a3b8" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 4, fontSize: "0.72rem", fontWeight: 600,
      color: cfg.color, background: `${cfg.color}1a`, border: `1px solid ${cfg.color}40`,
    }}>{cfg.label}</span>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const color = CAT_COLORS[cat] ?? "#64748b";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 4, fontSize: "0.72rem", fontWeight: 500,
      color, background: `${color}18`, border: `1px solid ${color}30`,
    }}>{CATEGORY_LABELS[cat] ?? cat}</span>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: incidents = [], isLoading } = trpc.incidents.list.useQuery();

  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.riskLevel === "critical").length;
    const high = incidents.filter((i) => i.riskLevel === "high").length;
    const medium = incidents.filter((i) => i.riskLevel === "medium").length;
    const low = incidents.filter((i) => i.riskLevel === "low").length;
    const byCat: Record<string, number> = {};
    incidents.forEach((i) => { if (i.category) byCat[i.category] = (byCat[i.category] ?? 0) + 1; });
    return { total, critical, high, medium, low, byCat };
  }, [incidents]);

  const recent = incidents.slice(0, 8);
  const catEntries = Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries[0]?.[1] ?? 1;

  return (
    <div className="soc-page">
      {/* Header */}
      <div className="soc-page-header">
        <div>
          <h1 className="soc-page-title">Dashboard SOC</h1>
          <p className="soc-page-sub">Visão geral de incidentes de segurança</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <ExportPdfButton label="Exportar PDF" />
          <button className="soc-btn soc-btn-primary" onClick={() => navigate("/incidents/new")}>
            <Plus size={14} />Novo Incidente
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="soc-kpi-grid">
        {[
          { icon: AlertTriangle, label: "Críticos", value: stats.critical, color: "#ef4444", sub: "Atenção imediata" },
          { icon: Shield,        label: "Alto Risco", value: stats.high,     color: "#f97316", sub: "Risco elevado" },
          { icon: Clock,         label: "Médio Risco",value: stats.medium,   color: "#eab308", sub: "Monitoramento" },
          { icon: CheckCircle,   label: "Baixo Risco",value: stats.low,      color: "#22c55e", sub: "Risco controlado" },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} className="soc-kpi-card">
            <div className="soc-kpi-label">
              <Icon size={13} style={{ color }} />{label}
            </div>
            <div className="soc-kpi-value" style={{ color }}>
              {isLoading ? "—" : value}
            </div>
            <div className="soc-kpi-sub" style={value > 0 && label === "Críticos" ? { color } : {}}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Table */}
      <div className="soc-two-col">
        {/* Distribution */}
        <div className="soc-card">
          <div className="soc-card-header">
            <Activity size={14} style={{ color: "oklch(0.82 0.20 155)" }} />
            <span className="soc-card-title">Distribuição por Categoria</span>
          </div>
          <div className="soc-card-body">
            {isLoading ? (
              <div className="soc-empty">Carregando...</div>
            ) : catEntries.length === 0 ? (
              <div className="soc-empty">Nenhum incidente classificado ainda.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {catEntries.map(([cat, count]) => {
                  const pct = Math.round((count / stats.total) * 100);
                  const color = CAT_COLORS[cat] ?? "#64748b";
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                        <CategoryBadge cat={cat} />
                        <span style={{ fontSize: "0.75rem", color: "oklch(0.55 0.010 240)" }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="soc-bar-track">
                        <div className="soc-bar-fill" style={{ width: `${(count / maxCat) * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent incidents */}
        <div className="soc-card">
          <div className="soc-card-header">
            <Shield size={14} style={{ color: "oklch(0.82 0.20 155)" }} />
            <span className="soc-card-title">Incidentes Recentes</span>
            <button className="soc-link" onClick={() => navigate("/incidents")}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            {isLoading ? (
              <div className="soc-empty">Carregando...</div>
            ) : recent.length === 0 ? (
              <div className="soc-empty">
                Nenhum incidente registrado.{" "}
                <button className="soc-link" onClick={() => navigate("/incidents/new")}>
                  Registrar primeiro
                </button>
              </div>
            ) : (
              <table className="soc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Categoria</th>
                    <th>Risco</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((inc) => (
                    <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)} style={{ cursor: "pointer" }}>
                      <td><span className="soc-id">INC-{String(inc.id).padStart(3, "0")}</span></td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inc.title}
                      </td>
                      <td>{inc.category ? <CategoryBadge cat={inc.category} /> : <span style={{ color: "oklch(0.38 0.008 240)" }}>—</span>}</td>
                      <td>{inc.riskLevel ? <RiskBadge risk={inc.riskLevel} /> : <span style={{ color: "oklch(0.38 0.008 240)" }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ML accuracy card */}
      <div className="soc-card" style={{ marginTop: "1rem" }}>
        <div className="soc-card-header">
          <Target size={14} style={{ color: "#22c55e" }} />
          <span className="soc-card-title">Modelo de Classificação ML</span>
        </div>
        <div className="soc-card-body">
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            {[
              { label: "Algoritmo", value: "TF-IDF + Naive Bayes" },
              { label: "Acurácia", value: "97%", color: "#22c55e" },
              { label: "Validação", value: "Cross-validation 5-fold" },
              { label: "Categorias", value: "5 classes" },
              { label: "Dataset treino", value: "100 amostras" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: "0.72rem", color: "oklch(0.45 0.010 240)", marginBottom: "0.2rem" }}>{label}</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: color ?? "oklch(0.82 0.008 240)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
