import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Server, Database, Clock, Wifi, RotateCcw, Cpu, FileText,
  Loader2, Terminal, ChevronDown, ChevronUp,
} from "lucide-react";

type ServiceStatus = "online" | "degraded" | "offline";

interface FlaskServiceRaw {
  name: string;
  port: number;
  url: string;
  status: ServiceStatus;
  latency: number;
  details?: Record<string, unknown>;
  error?: string;
  httpStatus?: number;
}

interface FlaskStatusResponse {
  overall: "online" | "degraded";
  checked_at: string;
  services: FlaskServiceRaw[];
}

interface LogEntry {
  ts: string;
  port: number;
  type: "info" | "success" | "error" | "warn";
  message: string;
}

const STATUS_CONFIG: Record<ServiceStatus, { color: string; label: string; badge: string; border: string }> = {
  online:   { color: "text-green-400",  label: "Online",    badge: "bg-green-500/10 text-green-400 border-green-500/20",   border: "border-green-500/30" },
  degraded: { color: "text-yellow-400", label: "Degradado", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", border: "border-yellow-500/30" },
  offline:  { color: "text-red-400",    label: "Offline",   badge: "bg-red-500/10 text-red-400 border-red-500/20",          border: "border-red-500/30" },
};

// Extrai o número da porta do nome do serviço (ex: "Flask ML (porta 5001)" → 5001)
function extractPort(serviceName: string): number | null {
  const match = serviceName.match(/(\d{4,5})/);
  return match ? parseInt(match[1], 10) : null;
}

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

const LOG_COLORS: Record<LogEntry["type"], string> = {
  info:    "text-blue-400",
  success: "text-green-400",
  error:   "text-red-400",
  warn:    "text-yellow-400",
};

export default function AdminSystemHealth() {
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [restartingPorts, setRestartingPorts] = useState<Set<number>>(new Set());
  const [flaskData, setFlaskData] = useState<FlaskStatusResponse | null>(null);
  const [flaskLoading, setFlaskLoading] = useState(true);
  const [flaskError, setFlaskError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const addLog = useCallback((port: number, type: LogEntry["type"], message: string) => {
    const entry: LogEntry = {
      ts: new Date().toLocaleTimeString("pt-BR"),
      port,
      type,
      message,
    };
    setLogs(prev => [...prev.slice(-49), entry]); // manter últimos 50 logs
  }, []);

  // Busca o status diretamente do endpoint REST (sem tRPC/auth)
  const fetchFlaskStatus = useCallback(async (silent = false) => {
    if (!silent) setFlaskLoading(true);
    setFlaskError(null);
    try {
      const res = await fetch("/api/flask-status", { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as FlaskStatusResponse;
      setFlaskData(data);
      setLastRefresh(new Date().toLocaleString("pt-BR"));
      // Registrar no log
      for (const svc of data.services) {
        if (svc.status === "online") {
          addLog(svc.port, "success", `${svc.name} respondeu em ${svc.latency}ms`);
        } else if (svc.status === "degraded") {
          addLog(svc.port, "warn", `${svc.name} respondeu com status HTTP ${svc.httpStatus ?? "?"}`);
        } else {
          addLog(svc.port, "error", `${svc.name} não responde: ${svc.error ?? "timeout"}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFlaskError(msg);
      addLog(0, "error", `Falha ao consultar /api/flask-status: ${msg}`);
    } finally {
      setFlaskLoading(false);
    }
  }, [addLog]);

  // Busca inicial e auto-refresh a cada 30s
  useEffect(() => {
    void fetchFlaskStatus();
    const interval = setInterval(() => void fetchFlaskStatus(true), 30000);
    return () => clearInterval(interval);
  }, [fetchFlaskStatus]);

  // Scroll automático no log
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogs]);

  // Mutation tRPC para reiniciar serviço
  const restartMutation = trpc.admin.restartService.useMutation({
    onMutate: ({ port }) => {
      setRestartingPorts(prev => new Set([...Array.from(prev), port]));
      addLog(port, "info", `Iniciando reinício do serviço na porta ${port}...`);
      toast.info(`Reiniciando serviço na porta ${port}...`);
    },
    onSuccess: (result) => {
      setRestartingPorts(prev => {
        const s = new Set(Array.from(prev));
        s.delete(result.port);
        return s;
      });
      if (result.success) {
        addLog(result.port, "success", result.message);
        toast.success(result.message);
      } else {
        addLog(result.port, "warn", result.message);
        toast.warning(result.message);
      }
      void utils.admin.getSystemHealth.invalidate();
      // Re-verificar status após reinício
      setTimeout(() => void fetchFlaskStatus(true), 1000);
    },
    onError: (err, { port }) => {
      setRestartingPorts(prev => {
        const s = new Set(Array.from(prev));
        s.delete(port);
        return s;
      });
      addLog(port, "error", `Erro ao reiniciar porta ${port}: ${err.message}`);
      toast.error(err.message);
    },
  });

  const services = flaskData?.services ?? [];
  const allOnline = services.length > 0 && services.every((s) => s.status === "online");
  const anyOffline = services.some((s) => s.status === "offline");
  const overallStatus: ServiceStatus = allOnline ? "online" : anyOffline ? "offline" : "degraded";
  const isLoading = flaskLoading;

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
              onClick={() => void fetchFlaskStatus()}
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
              {isLoading && !flaskData ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-mono">Verificando serviços...</span>
                </div>
              ) : flaskError ? (
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-mono font-semibold text-red-400">Erro ao verificar status</p>
                    <p className="text-xs font-mono text-muted-foreground">{flaskError}</p>
                  </div>
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
                        ? "Um ou mais serviços estão offline — clique em 'Reiniciar Serviço' para forçar reinício"
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
            {isLoading && !flaskData
              ? [1, 2].map((i) => (
                  <Card key={i} className="bg-card border-border animate-pulse">
                    <CardContent className="pt-4 pb-4">
                      <div className="h-20 bg-muted/20 rounded" />
                    </CardContent>
                  </Card>
                ))
              : services.map((service) => {
                  const cfg = STATUS_CONFIG[service.status];
                  const port = service.port ?? extractPort(service.name);
                  const isRestarting = port !== null && port !== undefined && restartingPorts.has(port);

                  // Extrair detalhes relevantes do health check bruto
                  const details = service.details;
                  const modelLoaded = details?.model_loaded;
                  const metricsRaw = details?.metrics as Record<string, unknown> | undefined;
                  const method = metricsRaw?.method as string | undefined;
                  const datasetSize = metricsRaw?.dataset_size as number | undefined;
                  const trainAccuracy = details?.train_accuracy as number | undefined;
                  const serviceLabel = details?.service as string | undefined;

                  return (
                    <Card key={service.name} className={`bg-card border ${cfg.border}`}>
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                            <ServiceIcon name={service.name} />
                            {service.name}
                            {port && <span className="text-xs text-muted-foreground font-normal">:{port}</span>}
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

                        {/* Detalhes do serviço (quando online) */}
                        {service.status === "online" && details && (
                          <div className="bg-muted/10 rounded p-2 space-y-1">
                            {modelLoaded !== undefined && (
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">Modelo carregado:</span>
                                <span className={modelLoaded ? "text-green-400" : "text-red-400"}>
                                  {modelLoaded ? "sim" : "não"}
                                </span>
                              </div>
                            )}
                            {serviceLabel && (
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">Serviço:</span>
                                <span className="text-foreground">{serviceLabel}</span>
                              </div>
                            )}
                            {method && (
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">Método:</span>
                                <span className="text-foreground truncate max-w-[160px]" title={method}>{method}</span>
                              </div>
                            )}
                            {datasetSize !== undefined && (
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">Amostras de treino:</span>
                                <span className="text-foreground">{datasetSize.toLocaleString("pt-BR")}</span>
                              </div>
                            )}
                            {trainAccuracy !== undefined && (
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">Acurácia treino:</span>
                                <span className="text-green-400">{(trainAccuracy * 100).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Erro quando offline */}
                        {service.status === "offline" && (
                          <div className="space-y-2 pt-1">
                            <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                              <p className="text-xs font-mono text-red-400 font-semibold mb-1">
                                Serviço não responde
                              </p>
                              {service.error && (
                                <p className="text-xs font-mono text-muted-foreground break-all">
                                  {service.error}
                                </p>
                              )}
                              <p className="text-xs font-mono text-muted-foreground mt-1">
                                Clique em "Reiniciar Serviço" para forçar o reinício.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Botão Reiniciar */}
                        {port !== null && port !== undefined && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`font-mono text-xs gap-1.5 w-full ${
                                service.status === "offline"
                                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  : "border-border text-muted-foreground hover:text-foreground"
                              }`}
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
        {flaskData && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Diagnóstico Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <div key={svc.port} className="flex items-start gap-2 bg-muted/10 rounded p-2">
                    <StatusIcon status={svc.status} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-foreground truncate">{svc.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {svc.status === "online"
                          ? `Respondendo em ${svc.latency}ms`
                          : svc.status === "degraded"
                          ? `HTTP ${svc.httpStatus ?? "?"} — resposta inesperada`
                          : `Offline — ${svc.error?.substring(0, 60) ?? "sem resposta"}`}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Verificado em: {new Date(flaskData.checked_at).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Painel de Logs de Eventos */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowLogs(v => !v)}>
            <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                Log de Eventos
                {logs.length > 0 && (
                  <Badge variant="outline" className="text-xs font-mono bg-muted/20 text-muted-foreground border-border">
                    {logs.length}
                  </Badge>
                )}
              </span>
              {showLogs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {showLogs && (
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-xs font-mono text-muted-foreground">Nenhum evento registrado ainda.</p>
              ) : (
                <div className="bg-black/30 rounded p-3 space-y-0.5 max-h-48 overflow-y-auto font-mono text-xs">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0">{log.ts}</span>
                      {log.port > 0 && (
                        <span className="text-primary shrink-0">:{log.port}</span>
                      )}
                      <span className={LOG_COLORS[log.type]}>{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <p className="text-xs font-mono text-muted-foreground text-center">
          Auto-atualização a cada 30 segundos • Fonte: /api/flask-status (verificação direta, sem autenticação)
        </p>
      </div>
    </DashboardLayout>
  );
}
