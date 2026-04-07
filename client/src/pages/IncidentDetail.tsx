import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, AlertTriangle, ChevronRight, Cpu, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing", malware: "Malware", brute_force: "Brute Force",
  ddos: "DDoS", vazamento_de_dados: "Vazamento de Dados", unknown: "Desconhecido",
};
const CAT_COLORS: Record<string, string> = {
  phishing: "#3b82f6", malware: "#ef4444", brute_force: "#f97316",
  ddos: "#a855f7", vazamento_de_dados: "#ec4899", unknown: "#64748b",
};
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítico", color: "#ef4444" },
  high:     { label: "Alto",    color: "#f97316" },
  medium:   { label: "Médio",   color: "#eab308" },
  low:      { label: "Baixo",   color: "#22c55e" },
};
const RISK_DESCRIPTIONS: Record<string, string> = {
  critical: "Ameaça severa com potencial de causar danos irreversíveis. Requer resposta imediata e escalação para equipe de segurança.",
  high: "Ameaça significativa com alto potencial de impacto. Deve ser tratada com urgência nas próximas horas.",
  medium: "Ameaça moderada que requer atenção. Pode ser tratada dentro do ciclo normal de resposta a incidentes.",
  low: "Ameaça de baixo impacto. Deve ser monitorada e documentada para análise de tendências.",
};
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  phishing: "Tentativa de engenharia social para obter credenciais ou informações sensíveis através de comunicações fraudulentas.",
  malware: "Software malicioso projetado para danificar, comprometer ou obter acesso não autorizado a sistemas.",
  brute_force: "Ataque de força bruta tentando adivinhar credenciais através de múltiplas tentativas automatizadas.",
  ddos: "Ataque de negação de serviço distribuído visando tornar sistemas ou serviços indisponíveis.",
  vazamento_de_dados: "Exposição não autorizada de dados sensíveis, seja por acidente ou ação maliciosa.",
  unknown: "Incidente não classificado. Requer análise manual adicional.",
};

export default function IncidentDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const incidentId = parseInt(id, 10);
  const utils = trpc.useUtils();

  const { data: incident, isLoading, error } = trpc.incidents.getById.useQuery({ id: incidentId });

  const deleteMutation = trpc.incidents.delete.useMutation({
    onSuccess: () => {
      toast.success("Incidente removido.");
      utils.incidents.list.invalidate();
      utils.incidents.stats.invalidate();
      navigate("/incidents");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="soc-page">
        <div className="soc-empty" style={{ padding: "4rem" }}>Carregando incidente...</div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="soc-page">
        <div className="soc-empty" style={{ padding: "4rem", color: "#ef4444" }}>Incidente não encontrado.</div>
      </div>
    );
  }

  const riskCfg = RISK_CONFIG[incident.riskLevel] ?? { label: incident.riskLevel, color: "#94a3b8" };
  const catColor = CAT_COLORS[incident.category] ?? "#64748b";

  return (
    <div className="soc-page">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "1.25rem", fontSize: "0.78rem", color: "oklch(0.45 0.010 240)" }}>
        <button className="soc-link" onClick={() => navigate("/incidents")}>Incidentes</button>
        <ChevronRight size={12} />
        <span style={{ color: "oklch(0.82 0.008 240)" }}>INC-{String(incident.id).padStart(3, "0")}</span>
      </div>

      {/* Header card */}
      <div className="soc-card" style={{ marginBottom: "1rem", borderLeft: `3px solid ${riskCfg.color}` }}>
        <div className="soc-card-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", color: "oklch(0.45 0.010 240)", marginBottom: "0.4rem", fontFamily: "monospace" }}>
                INC-{String(incident.id).padStart(3, "0")}
              </div>
              <h1 style={{ fontSize: "1.15rem", fontWeight: 600, color: "oklch(0.92 0.008 240)", marginBottom: "0.5rem" }}>
                {incident.title}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "oklch(0.45 0.010 240)" }}>
                <Calendar size={12} />
                {new Date(incident.createdAt).toLocaleString("pt-BR")}
              </div>
            </div>
            <button
              className="soc-icon-btn soc-icon-btn-danger"
              title="Excluir incidente"
              onClick={() => { if (confirm("Remover este incidente permanentemente?")) deleteMutation.mutate({ id: incident.id }); }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Classification + Risk row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Category */}
        <div className="soc-card">
          <div className="soc-card-header">
            <Cpu size={14} style={{ color: "oklch(0.82 0.20 155)" }} />
            <span className="soc-card-title">Classificação ML</span>
          </div>
          <div className="soc-card-body">
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 4, fontSize: "0.82rem", fontWeight: 600, color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}40` }}>
                {CATEGORY_LABELS[incident.category] ?? incident.category}
              </span>
            </div>
            {incident.confidence != null && incident.confidence > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.72rem", color: "oklch(0.45 0.010 240)" }}>
                  <span>Confiança do modelo</span>
                  <span style={{ color: "oklch(0.82 0.20 155)", fontWeight: 600 }}>{Math.round(incident.confidence * 100)}%</span>
                </div>
                <div className="soc-bar-track">
                  <div className="soc-bar-fill" style={{ width: `${Math.round(incident.confidence * 100)}%`, background: "oklch(0.82 0.20 155)" }} />
                </div>
              </div>
            )}
            <p style={{ fontSize: "0.78rem", color: "oklch(0.48 0.010 240)", lineHeight: 1.5 }}>
              {CATEGORY_DESCRIPTIONS[incident.category] ?? ""}
            </p>
          </div>
        </div>

        {/* Risk */}
        <div className="soc-card" style={{ borderTop: `2px solid ${riskCfg.color}40` }}>
          <div className="soc-card-header">
            <AlertTriangle size={14} style={{ color: riskCfg.color }} />
            <span className="soc-card-title">Análise de Risco</span>
          </div>
          <div className="soc-card-body">
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 4, fontSize: "0.82rem", fontWeight: 700, color: riskCfg.color, background: `${riskCfg.color}1a`, border: `1px solid ${riskCfg.color}50` }}>
                {riskCfg.label}
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "oklch(0.48 0.010 240)", lineHeight: 1.5 }}>
              {RISK_DESCRIPTIONS[incident.riskLevel] ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="soc-card">
        <div className="soc-card-header">
          <Shield size={14} style={{ color: "oklch(0.82 0.20 155)" }} />
          <span className="soc-card-title">Descrição do Incidente</span>
        </div>
        <div className="soc-card-body">
          <p style={{ fontSize: "0.875rem", color: "oklch(0.75 0.008 240)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {incident.description}
          </p>
        </div>
      </div>
    </div>
  );
}
