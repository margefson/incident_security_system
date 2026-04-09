import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Server, Database, Clock, Wifi, RotateCcw, Cpu, FileText,
  Loader2,
} from "lucide-react";

type ServiceStatus = "online" | "degraded" | "offline";

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  latency: number | null;
  port?: number;
  details: Record<string, unknown> | null;
}

const STATUS_CONFIG: Record<ServiceStatus, { color: string; label: string; badge: string; border: string }> = {
  online:   { color: "text-green-400",  label: "Online",    badge: "bg-green-500/10 text-green-400 border-green-500/20",   border: "border-green-500/30" },
  degraded: { color: "text-yellow-400", label: "Degradado", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", border: "border-yellow-500/30" },
  offline:  { color: "text-red-400",    label: "Offline",   badge: "bg-red-500/10 text-red-400 border-red-500/20",          border: "border-red-500/30" },
};

// Ícone por serviço
function ServiceIcon({ name }: { name: string }) {
  if (name.toLowerCase().includes("pdf")) return <FileText className="w-4 h-4 text-primary" />;
  return <Cpu className="w-4 h-4 text-primary" />;
}

function StatusIcon({ status, size = "md" }: { status: ServiceStatus; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  if (status === "online")   return <CheckCircle2 className={`${cls} text-green-400`} />;
  if (status === "degraded") return <AlertTriangle className={`${cls} text-yellow-400`} />;
  return <XCircle className={`${cls} text-red-400`} />;
}

// Extrai o número da porta do nome do serviço (ex: "Flask ML (porta 5001)" → 5001)
function extractPort(serviceName: string): number | null {
  const match = serviceName.match(/(\d{4,5})/);
  return match ? parseInt(match[1], 10) : null;
}

// Rótulos amigáveis para as chaves de detalhes
const DETAIL_LABELS: Record<string, string> = {
  status: "Status",
  modelo_carregado: "Modelo carregado",
  "serviço": "Serviço",
  "método": "Método",
  amostras_treino: "Amostras de treino",
};

export default function AdminSystemHealth() {
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [restartingPorts, setRestartingPorts] = useState<Set<number>>(new Set());
  const utils = trpc.useUtils();

  const healthQuery = trpc.admin.getSystemHealth.useQuery(undefined, {
    refetchInterval: 30000,
    retry: 1,
  });

  const restartMutation = trpc.admin.restartService.useMutation({
    onMutate: ({ port }) => {
      setRestartingPorts(prev => new Set([...Array.from(prev), port]));
      toast.info(`Reiniciando serviço na porta ${port}...`);
    },
    onSuccess: (result) => {
      setRestartingPorts(prev => {
        const s = new Set(Array.from(prev));
        s.delete(result.port);
        return s;
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
      void utils.admin.getSystemHealth.invalidate();
    },
    onError: (err, { port }) => {
      setRestartingPorts(prev => {
        const s = new Set(Array.from(prev));
        s.delete(port);
        return s;
      });
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (healthQuery.data) {
      setLastRefresh(new Date().toLocaleString("pt-BR"));
    }
  }, [healthQuery.data]);

  const data = healthQuery.data;
  const services: ServiceInfo[] = (data?.services ?? []) as ServiceInfo[];
  const allOnline = services.length > 0 && services.every((s) => s.status === "online");
  const anyOffline = services.some((s) => s.status === "offline");
  const overallStatus: ServiceStatus = allOnline ? "online" : anyOffline ? "offline" : "degraded";

  const isLoading = healthQuery.isLoading || healthQuery.isFetching;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Saúde do Sistema
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Monitoramento em tempo real dos servidores ML e serviços dependentes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Atualizado: {lastRefresh}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="font-mono text-xs gap-1.5"
              onClick={() => void healthQuery.refetch()}
              disabled={isLoading}
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              {isLoading ? "Verificando..." : "Atualizar"}
            </Button>
          </div>
        </div>

        {/* Status Geral */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              {isLoading && !data ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-mono">Verificando serviços e iniciando se necessário...</span>
                </div>
              ) : (
                <>
                  <StatusIcon status={overallStatus} />
                  <div>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      Status Geral:{" "}
                      <span className={STATUS_CONFIG[overallStatus].color}>
                        {STATUS_CONFIG[overallStatus].label}
                      </span>
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {allOnline
                        ? "Todos os serviços estão operacionais"
                        : anyOffline
                        ? "Um ou mais serviços estão offline — clique em 'Reiniciar Serviço' ou em 'Atualizar'"
                        : "Alguns serviços estão com desempenho reduzido"}
                    </p>
                  </div>
                  {isLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Serviços ML */}
        <div>
          <h2 className="text-sm font-mono font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" />
            Servidores de Machine Learning
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading && !data
              ? [1, 2].map((i) => (
                  <Card key={i} className="bg-card border-border animate-pulse">
                    <CardContent className="pt-4 pb-4">
                      <div className="h-20 bg-muted/20 rounded" />
                    </CardContent>
                  </Card>
                ))
              : services.map((service) => {
                  const cfg = STATUS_CONFIG[service.status];
                  const port = service.port ?? (service.name.match(/\d{4,5}/) ? parseInt(service.name.match(/\d{4,5}/)![0], 10) : null);
                  const isRestarting = port !== null && port !== undefined && restartingPorts.has(port);

                  return (
                    <Card key={service.name} className={`bg-card border ${cfg.border}`}>
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                            <ServiceIcon name={service.name} />
                            {service.name}
                          </CardTitle>
                          <Badge variant="outline" className={`text-xs font-mono shrink-0 ${cfg.badge}`}>
                            <StatusIcon status={service.status} size="sm" />
                            <span className="ml-1">{cfg.label}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-4">
                        {/* Latência */}
                        {service.latency !== null && service.latency !== undefined && (
                          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                            <Wifi className="w-3 h-3" />
                            Latência:{" "}
                            <span className={
                              service.latency < 100 ? "text-green-400"
                              : service.latency < 500 ? "text-yellow-400"
                              : "text-red-400"
                            }>
                              {service.latency}ms
                            </span>
                          </div>
                        )}

                        {/* Detalhes do serviço */}
                        {service.details && Object.keys(service.details).length > 0 && (
                          <div className="bg-muted/10 rounded p-2 space-y-1">
                            {Object.entries(service.details).map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">{DETAIL_LABELS[key] ?? key}:</span>
                                <span className="text-foreground font-medium">{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Ações para serviço offline */}
                        {service.status === "offline" && (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-mono text-red-400">
                              Serviço não responde. O sistema tentará reiniciá-lo automaticamente.
                            </p>
                            {port !== null && port !== undefined && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="font-mono text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full"
                                disabled={isRestarting}
                                onClick={() => restartMutation.mutate({ port })}
                              >
                                {isRestarting
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <RotateCcw className="w-3.5 h-3.5" />}
                                {isRestarting ? "Reiniciando..." : "Reiniciar Serviço"}
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Ações para serviço online — botão de reinício opcional */}
                        {service.status === "online" && port !== null && port !== undefined && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-mono text-xs gap-1.5 border-border text-muted-foreground hover:text-foreground w-full"
                              disabled={isRestarting}
                              onClick={() => restartMutation.mutate({ port })}
                            >
                              {isRestarting
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RotateCcw className="w-3.5 h-3.5" />}
                              {isRestarting ? "Reiniciando..." : "Reiniciar Serviço"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </div>

        {/* Cache de Métricas */}
        {data && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Cache de Métricas ML
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3">
                {data.metrics_cache.available
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <div>
                  <p className="text-xs font-mono text-foreground">
                    {data.metrics_cache.available
                      ? "Cache disponível — sistema funciona mesmo com Flask offline"
                      : "Cache não disponível — sistema requer Flask online para métricas"}
                  </p>
                  {data.metrics_cache.available && data.metrics_cache.last_updated && (
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      Última atualização: {new Date(data.metrics_cache.last_updated).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs font-mono text-muted-foreground text-center">
          Auto-atualização a cada 30 segundos • O sistema inicia os serviços automaticamente se estiverem offline
        </p>
      </div>
    </DashboardLayout>
  );
}
