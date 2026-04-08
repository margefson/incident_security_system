/**
 * AdminML.tsx — Painel de Machine Learning (Admin Only)
 * Seção 8: Classificação Automática por Machine Learning
 *
 * Funcionalidades:
 *  - Visualizar métricas do modelo (acurácia, CV, distribuição)
 *  - Download do dataset de treinamento (incidentes_cybersecurity_2000.xlsx)
 *  - Retreinar o modelo com novas amostras e categorias
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Brain, Download, RefreshCw, Plus, Trash2, BarChart2,
  CheckCircle2, AlertTriangle, Database, Cpu, ExternalLink, Table2,
} from "lucide-react";

type RiskLevel = "critical" | "high" | "medium" | "low";

interface NewSample {
  title: string;
  description: string;
  category: string;
  riskLevel: RiskLevel;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export default function AdminML() {
  const [samples, setSamples] = useState<NewSample[]>([
    { title: "", description: "", category: "", riskLevel: "medium" },
  ]);
  const [retrainResult, setRetrainResult] = useState<{
    success: boolean;
    message: string;
    metrics?: Record<string, unknown>;
  } | null>(null);
  const [, setShowOnlineViewer] = useState(false);
  void setShowOnlineViewer;

  const metricsQuery = trpc.admin.getMLMetrics.useQuery();
  const datasetQuery = trpc.admin.getDataset.useQuery();
  const retrainMutation = trpc.admin.retrainModel.useMutation({
    onSuccess: (data: { success: boolean; message: string; metrics: Record<string, unknown> }) => {
      setRetrainResult(data);
      toast.success(data.message);
      void metricsQuery.refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao retreinar: ${err.message}`);
    },
  });

  const DATASET_CDN_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663148675640/KjT4emSwzjBHV8i56oSYsp/incidentes_cybersecurity_2000_6bb5989b.xlsx";
  const ONLINE_VIEWER_URL = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(DATASET_CDN_URL)}`;

  const handleDownloadDataset = () => {
    const a = document.createElement("a");
    a.href = DATASET_CDN_URL;
    a.download = "incidentes_cybersecurity_2000.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download iniciado: incidentes_cybersecurity_2000.xlsx");
  };

  const addSample = () => {
    setSamples((prev) => [...prev, { title: "", description: "", category: "", riskLevel: "medium" }]);
  };

  const removeSample = (index: number) => {
    setSamples((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSample = (index: number, field: keyof NewSample, value: string) => {
    setSamples((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleRetrain = () => {
    const validSamples = samples.filter((s) => s.description.trim() && s.category.trim());
    const risk_map: Record<string, RiskLevel> = {};
    for (const s of validSamples) {
      risk_map[s.category.toLowerCase().replace(/\s+/g, "_")] = s.riskLevel;
    }
    retrainMutation.mutate({
      samples: validSamples.map((s) => ({
        title: s.title || undefined,
        description: s.description,
        category: s.category.toLowerCase().replace(/\s+/g, "_"),
      })),
      risk_map,
      includeAllIncidents: true,
    });
  };

  const metrics = metricsQuery.data;
  const dataset = datasetQuery.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="soc-page-title flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Machine Learning
          </h1>
          <p className="soc-page-sub">
            Classificação automática de incidentes via TF-IDF + Naive Bayes
          </p>
        </div>

        {/* Métricas do Modelo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground">Método</span>
              </div>
              <p className="text-sm font-mono font-medium text-foreground">
                {metricsQuery.isLoading ? "..." : "TF-IDF + Naive Bayes"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-green-400" />
                <span className="text-xs font-mono text-muted-foreground">Acurácia Treino</span>
              </div>
              <p className="text-2xl font-mono font-bold text-green-400">
                {metricsQuery.isLoading ? "..." : `${Math.round((metrics?.train_accuracy ?? 0) * 100)}%`}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono text-muted-foreground">Acurácia CV (5-fold)</span>
              </div>
              <p className="text-2xl font-mono font-bold text-blue-400">
                {metricsQuery.isLoading
                  ? "..."
                  : `${Math.round((metrics?.cv_accuracy_mean ?? 0) * 100)}% ±${Math.round((metrics?.cv_accuracy_std ?? 0) * 100)}%`}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono text-muted-foreground">Amostras no Dataset</span>
              </div>
              <p className="text-2xl font-mono font-bold text-purple-400">
                {metricsQuery.isLoading ? "..." : metrics?.dataset_size ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Categorias e Distribuição */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Categorias do Modelo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground font-mono">Carregando...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(metrics?.categories ?? []).map((cat: string) => (
                    <Badge key={cat} variant="outline" className="font-mono text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground font-mono">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(metrics?.category_distribution ?? {}).map(([cat, count]) => {
                    const c = Number(count);
                    return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-32 truncate">{cat}</span>
                      <div className="flex-1 bg-muted/30 rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${Math.round((c / (metrics?.dataset_size ?? 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-foreground w-8 text-right">{c}</span>
                    </div>
                  );})}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dataset de Treinamento */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Dataset de Treinamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground">
                  Arquivo: <span className="text-foreground">incidentes_cybersecurity_2000.xlsx</span>
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  Total: <span className="text-foreground">{dataset?.total_samples ?? metrics?.dataset_size ?? "..."} amostras</span>
                  {" · "}
                  Categorias:{" "}
                  <span className="text-foreground font-medium">
                    {dataset?.category_distribution
                      ? Object.keys(dataset.category_distribution).length
                      : metrics?.categories?.length ?? "..."}
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs gap-1.5"
                onClick={handleDownloadDataset}
              >
                <Download className="w-3.5 h-3.5" />
                Download XLSX
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs gap-1.5"
                onClick={() => window.open(ONLINE_VIEWER_URL, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Visualizar Online
              </Button>
            </div>

            {/* Preview */}
            {dataset?.preview && dataset.preview.length > 0 && (
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-2">Prévia das primeiras amostras:</p>
                <div className="border border-border rounded-md overflow-hidden">
                  <table className="soc-table w-full text-xs font-mono">
                    <thead>
                      <tr className="bg-muted/20">
                        <th className="px-3 py-2 text-left text-muted-foreground font-medium">Título</th>
                        <th className="px-3 py-2 text-left text-muted-foreground font-medium">Descrição</th>
                        <th className="px-3 py-2 text-left text-muted-foreground font-medium">Categoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.preview.slice(0, 5).map((row: { title: string; description: string; category: string }, i: number) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-2 text-foreground truncate max-w-[150px]">{row.title || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{row.description}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">{row.category}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retreinamento com Novas Categorias */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                Retreinar Modelo com Novas Categorias
              </CardTitle>
              {metrics?.last_updated ? (
                <span className="text-xs font-mono text-muted-foreground">
                  Última atualização:{" "}
                  <span className="text-foreground font-medium">
                    {new Date(metrics.last_updated).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              ) : (
                <span className="text-xs font-mono text-muted-foreground">Sem registro de atualização</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs font-mono text-primary font-semibold mb-1 flex items-center gap-1.5">
                <Table2 className="w-3.5 h-3.5" />
                Retreinamento Completo com Incidentes do Sistema
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                Ao clicar em "Retreinar Modelo", o sistema usa <span className="text-foreground font-semibold">todos os incidentes cadastrados</span> no banco
                + o dataset original + as novas amostras abaixo. Novas categorias são incorporadas automaticamente.
              </p>
            </div>

            {/* Amostras */}
            <div className="space-y-3">
              {samples.map((sample, index) => (
                <div key={index} className="border border-border/50 rounded-lg p-3 space-y-2 bg-muted/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">Amostra #{index + 1}</span>
                    {samples.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeSample(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-mono text-muted-foreground">Título (opcional)</Label>
                      <Input
                        className="h-8 text-xs font-mono mt-1"
                        placeholder="Ex: Email de phishing detectado"
                        value={sample.title}
                        onChange={(e) => updateSample(index, "title", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-mono text-muted-foreground">
                        Categoria <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        className="h-8 text-xs font-mono mt-1"
                        placeholder="Ex: engenharia_social"
                        value={sample.category}
                        onChange={(e) => updateSample(index, "category", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-2">
                      <Label className="text-xs font-mono text-muted-foreground">
                        Descrição <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        className="text-xs font-mono mt-1 min-h-[60px] resize-none"
                        placeholder="Descreva o incidente com detalhes relevantes para o modelo aprender..."
                        value={sample.description}
                        onChange={(e) => updateSample(index, "description", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-mono text-muted-foreground">Nível de Risco</Label>
                      <Select
                        value={sample.riskLevel}
                        onValueChange={(v) => updateSample(index, "riskLevel", v)}
                      >
                        <SelectTrigger className="h-8 text-xs font-mono mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["critical", "high", "medium", "low"] as RiskLevel[]).map((r) => (
                            <SelectItem key={r} value={r} className="text-xs font-mono">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-mono border ${RISK_COLORS[r]}`}>
                                {RISK_LABELS[r]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs gap-1.5"
                onClick={addSample}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Amostra
              </Button>
              <Button
                size="sm"
                className="font-mono text-xs gap-1.5"
                onClick={handleRetrain}
                disabled={retrainMutation.isPending}
              >
                {retrainMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Brain className="w-3.5 h-3.5" />
                )}
                {retrainMutation.isPending ? "Retreinando..." : "Retreinar Modelo"}
              </Button>
            </div>

            {/* Resultado do retreinamento */}
            {retrainResult && (
              <div className={`border rounded-lg p-3 ${retrainResult.success ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {retrainResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs font-mono font-medium text-foreground">
                    {retrainResult.success ? "Retreinamento concluído" : "Erro no retreinamento"}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground">{retrainResult.message}</p>
                {retrainResult.metrics && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground">Amostras totais: </span>
                      <span className="text-foreground">{String(retrainResult.metrics.dataset_size)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Acurácia treino: </span>
                      <span className="text-green-400">
                        {Math.round(Number(retrainResult.metrics.train_accuracy) * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Acurácia CV: </span>
                      <span className="text-blue-400">
                        {Math.round(Number(retrainResult.metrics.cv_accuracy_mean) * 100)}%
                        {" ±"}
                        {Math.round(Number(retrainResult.metrics.cv_accuracy_std) * 100)}%
                      </span>
                    </div>
                    {Array.isArray(retrainResult.metrics.new_categories) &&
                      (retrainResult.metrics.new_categories as string[]).length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Novas categorias: </span>
                          <span className="text-purple-400">
                            {(retrainResult.metrics.new_categories as string[]).join(", ")}
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
