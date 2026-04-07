import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Calendar, Tag, AlertTriangle, Activity, Shield } from "lucide-react";

const SEV: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  low:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

// Recomendações contextualizadas por categoria (seção 7.5)
const CATEGORY_RECOMMENDATIONS: Record<string, { title: string; description: string; priority: string; action: string }> = {
  malware: {
    title: "Isolamento de Sistemas Comprometidos",
    description: "Incidente de malware detectado. Verifique e isole imediatamente os sistemas comprometidos para evitar a propagação lateral na rede.",
    priority: "critical",
    action: "Isolar o sistema afetado da rede, executar varredura completa com antivírus atualizado e restaurar a partir de backup limpo.",
  },
  vazamento_de_dados: {
    title: "Notificação ao DPO e Avaliação LGPD",
    description: "Vazamento de dados identificado. É obrigatório notificar o Encarregado de Dados (DPO) e avaliar as obrigações previstas na LGPD (Art. 48).",
    priority: "critical",
    action: "Notificar o DPO em até 72h, registrar o incidente, avaliar notificação à ANPD e comunicar os titulares afetados.",
  },
  phishing: {
    title: "Reforço de Treinamento de Conscientização",
    description: "Ataque de phishing registrado. Reforce o treinamento de conscientização dos colaboradores e implemente filtros de e-mail mais rigorosos.",
    priority: "high",
    action: "Realizar campanha de phishing simulado, atualizar treinamentos de segurança e habilitar MFA em todas as contas corporativas.",
  },
  brute_force: {
    title: "Bloqueio Automático após Falhas de Login",
    description: "Tentativa de força bruta detectada. Implemente bloqueio automático de contas após múltiplas falhas consecutivas de autenticação.",
    priority: "high",
    action: "Configurar lockout após 5 tentativas, habilitar CAPTCHA nos formulários de login e revisar a política de senhas.",
  },
  ddos: {
    title: "Revisão de Rate Limiting e CDN",
    description: "Ataque DDoS identificado. Revise as configurações de rate limiting, WAF e CDN para mitigar o impacto de futuros ataques.",
    priority: "high",
    action: "Ativar proteção DDoS no CDN, revisar regras de rate limiting e configurar auto-scaling para absorver picos de tráfego.",
  },
};

const REC_BADGE: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  low:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Crítica",
  high:     "Alta",
  medium:   "Média",
  low:      "Baixa",
};

export default function IncidentDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const utils = trpc.useUtils();

  const { data: incident, isLoading } = trpc.incidents.getById.useQuery({ id });
  const deleteMutation = trpc.incidents.delete.useMutation({
    onSuccess: () => {
      toast.success("Incidente excluído.");
      utils.incidents.list.invalidate();
      navigate("/incidents");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <DashboardLayout><div className="text-muted-foreground p-8 text-center">Carregando...</div></DashboardLayout>;
  if (!incident) return <DashboardLayout><div className="text-muted-foreground p-8 text-center">Incidente não encontrado.</div></DashboardLayout>;

  const recommendation = incident.category ? CATEGORY_RECOMMENDATIONS[incident.category] : null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/incidents")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground font-mono truncate">{incident.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">#{incident.id}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id })} disabled={deleteMutation.isPending} className="gap-2 font-mono text-xs">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            {incident.category && (
              <span className="text-xs px-2.5 py-1 rounded-full border font-mono capitalize text-primary bg-primary/10 border-primary/30">
                <Tag className="w-3 h-3 inline mr-1" />{incident.category.replace(/_/g, " ")}
              </span>
            )}
            {incident.riskLevel && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${SEV[incident.riskLevel] ?? SEV.low}`}>
                <AlertTriangle className="w-3 h-3 inline mr-1" />{incident.riskLevel}
              </span>
            )}
            {incident.confidence != null && (
              <span className="text-xs px-2.5 py-1 rounded-full border font-mono text-muted-foreground bg-muted/30 border-border">
                <Activity className="w-3 h-3 inline mr-1" />{Math.round(incident.confidence * 100)}% confiança
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Descrição</p>
            <p className="text-sm text-foreground leading-relaxed">{incident.description}</p>
          </div>

          <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Registrado em</p>
              <p className="text-sm text-foreground font-mono flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {new Date(incident.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {/* Recomendação contextualizada por categoria (seção 7.5) */}
        {recommendation && (
          <div
            className={`rounded-xl border p-5 space-y-3 ${REC_BADGE[recommendation.priority] ?? REC_BADGE.low}`}
            data-testid="incident-recommendation"
            data-category={incident.category}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              <h3 className="text-sm font-semibold font-mono">Recomendação de Segurança</h3>
              <span className="text-xs px-2 py-0.5 rounded-full border font-mono ml-auto">
                Prioridade {PRIORITY_LABEL[recommendation.priority] ?? recommendation.priority}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold font-mono mb-1">{recommendation.title}</p>
              <p className="text-sm opacity-90">{recommendation.description}</p>
            </div>
            <div className="pt-2 border-t border-current/20">
              <p className="text-xs font-mono opacity-75">
                <span className="font-semibold">Ação recomendada:</span> {recommendation.action}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
