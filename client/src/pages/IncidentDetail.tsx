import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Calendar, Tag, AlertTriangle, Activity } from "lucide-react";

const SEV: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  low:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
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
                <Tag className="w-3 h-3 inline mr-1" />{incident.category.replace("_", " ")}
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
      </div>
    </DashboardLayout>
  );
}
