import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, AlertTriangle, ChevronRight, Cpu, Calendar, Hash, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CyberLayout from "@/components/CyberLayout";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing",
  malware: "Malware",
  brute_force: "Força Bruta",
  ddos: "DDoS",
  vazamento_de_dados: "Vazamento de Dados",
  unknown: "Desconhecido",
};

const RISK_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
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
      <CyberLayout>
        <div className="flex items-center justify-center py-20">
          <div className="font-mono text-sm neon-text-cyan">CARREGANDO...</div>
        </div>
      </CyberLayout>
    );
  }

  if (error || !incident) {
    return (
      <CyberLayout>
        <div className="flex items-center justify-center py-20">
          <div className="font-mono text-sm" style={{ color: "oklch(0.65 0.32 0)" }}>INCIDENTE NÃO ENCONTRADO</div>
        </div>
      </CyberLayout>
    );
  }

  const riskColor = {
    critical: "oklch(0.6 0.28 20)",
    high: "oklch(0.65 0.32 0)",
    medium: "oklch(0.9 0.25 100)",
    low: "oklch(0.75 0.25 145)",
  }[incident.riskLevel] ?? "oklch(0.45 0.02 240)";

  return (
    <CyberLayout>
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate("/incidents")} className="font-mono text-xs transition-colors" style={{ color: "oklch(0.45 0.02 240)" }}>
            INCIDENTES
          </button>
          <ChevronRight className="w-3 h-3" style={{ color: "oklch(0.35 0.02 240)" }} />
          <span className="font-mono text-xs neon-text-cyan">#{incident.id}</span>
        </div>

        {/* Title card */}
        <div className="relative p-5 rounded mb-4" style={{ background: "oklch(0.09 0.012 240)", border: `1px solid ${riskColor.replace(")", " / 0.3)")}` }}>
          <span className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: `1px solid ${riskColor.replace(")", " / 0.6)")}`, borderLeft: `1px solid ${riskColor.replace(")", " / 0.6)")}` }} />
          <span className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: `1px solid ${riskColor.replace(")", " / 0.6)")}`, borderRight: `1px solid ${riskColor.replace(")", " / 0.6)")}` }} />

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-3.5 h-3.5" style={{ color: "oklch(0.45 0.02 240)" }} />
                <span className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>INCIDENTE #{incident.id}</span>
              </div>
              <h1 className="text-lg font-bold" style={{ color: "oklch(0.92 0.01 240)" }}>{incident.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="w-3 h-3" style={{ color: "oklch(0.45 0.02 240)" }} />
                <span className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
                  {new Date(incident.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
            <button
              onClick={() => { if (confirm("Remover este incidente?")) deleteMutation.mutate({ id: incident.id }); }}
              className="p-2 rounded transition-colors flex-shrink-0"
              style={{ color: "oklch(0.45 0.02 240)", border: "1px solid oklch(0.22 0.03 240)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.65 0.32 0)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.65 0.32 0 / 0.4)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.45 0.02 240)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.22 0.03 240)"; }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Classification + Risk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Category */}
          <div className="p-4 rounded" style={{ background: "oklch(0.09 0.012 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 neon-text-cyan" />
              <h3 className="font-mono text-xs font-bold" style={{ color: "oklch(0.65 0.01 240)" }}>CLASSIFICAÇÃO ML</h3>
            </div>
            <div className="mb-3">
              <span className={`badge-${incident.category} px-3 py-1.5 rounded font-mono text-sm font-bold`}>
                {CATEGORY_LABELS[incident.category] ?? incident.category}
              </span>
            </div>
            {incident.confidence != null && incident.confidence > 0 && (
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>CONFIANÇA</span>
                  <span className="font-mono text-xs neon-text-cyan">{Math.round(incident.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 240)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(incident.confidence * 100)}%`, background: "oklch(0.85 0.2 195)", boxShadow: "0 0 8px oklch(0.85 0.2 195 / 0.6)" }} />
                </div>
              </div>
            )}
            <p className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
              {CATEGORY_DESCRIPTIONS[incident.category] ?? ""}
            </p>
          </div>

          {/* Risk */}
          <div className="p-4 rounded" style={{ background: "oklch(0.09 0.012 240)", border: `1px solid ${riskColor.replace(")", " / 0.25)")}` }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: riskColor }} />
              <h3 className="font-mono text-xs font-bold" style={{ color: "oklch(0.65 0.01 240)" }}>ANÁLISE DE RISCO</h3>
            </div>
            <div className="mb-3">
              <span className={`risk-${incident.riskLevel} px-3 py-1.5 rounded font-mono text-sm font-bold`}>
                {RISK_LABELS[incident.riskLevel] ?? incident.riskLevel}
              </span>
            </div>
            <p className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
              {RISK_DESCRIPTIONS[incident.riskLevel] ?? ""}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="p-5 rounded" style={{ background: "oklch(0.09 0.012 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 neon-text-cyan" />
            <h3 className="font-mono text-xs font-bold" style={{ color: "oklch(0.65 0.01 240)" }}>DESCRIÇÃO DO INCIDENTE</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(0.75 0.01 240)", whiteSpace: "pre-wrap" }}>
            {incident.description}
          </p>
        </div>
      </div>
    </CyberLayout>
  );
}
