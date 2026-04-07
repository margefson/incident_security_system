/**
 * Incidents.tsx — Listagem de incidentes com filtros avançados
 * Filtros: busca textual, categoria, nível de risco, período de data
 * Exportação: CSV
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import {
  PlusCircle, Search, AlertTriangle, Filter, Download, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SEV: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  low:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

const SEV_LABELS: Record<string, string> = {
  critical: "Crítico", high: "Alto", medium: "Médio", low: "Baixo",
};

const CAT_LABELS: Record<string, string> = {
  phishing: "Phishing",
  malware: "Malware",
  brute_force: "Força Bruta",
  ddos: "DDoS",
  vazamento_de_dados: "Vazamento",
  unknown: "Desconhecido",
};

export default function Incidents() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: incidents, isLoading } = trpc.incidents.list.useQuery();

  const filtered = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((inc) => {
      const matchSearch =
        !search ||
        inc.title.toLowerCase().includes(search.toLowerCase()) ||
        inc.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = !categoryFilter || inc.category === categoryFilter;
      const matchRisk = !riskFilter || inc.riskLevel === riskFilter;
      const incDate = new Date(inc.createdAt);
      const matchFrom = !dateFrom || incDate >= new Date(dateFrom);
      const matchTo = !dateTo || incDate <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchCat && matchRisk && matchFrom && matchTo;
    });
  }, [incidents, search, categoryFilter, riskFilter, dateFrom, dateTo]);

  const categories = useMemo(
    () => Array.from(new Set((incidents?.map((i) => i.category).filter(Boolean) ?? []) as string[])),
    [incidents]
  );

  const activeFilters = [categoryFilter, riskFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setCategoryFilter("");
    setRiskFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const exportCSV = () => {
    if (!filtered.length) {
      toast.error("Nenhum incidente para exportar");
      return;
    }
    const header = ["ID", "Título", "Descrição", "Categoria", "Risco", "Confiança (%)", "Data"];
    const rows = filtered.map((inc) => [
      inc.id,
      `"${inc.title.replace(/"/g, '""')}"`,
      `"${inc.description.replace(/"/g, '""')}"`,
      CAT_LABELS[inc.category ?? ""] ?? inc.category ?? "—",
      SEV_LABELS[inc.riskLevel ?? ""] ?? inc.riskLevel ?? "—",
      inc.confidence != null ? Math.round(inc.confidence * 100) : "—",
      new Date(inc.createdAt).toLocaleDateString("pt-BR"),
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incidentes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} incidente(s) exportado(s) para CSV`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="soc-page-title">Incidentes</h1>
            <p className="soc-page-sub">
              {filtered.length} de {incidents?.length ?? 0} incidente(s)
              {activeFilters > 0 && ` · ${activeFilters} filtro(s) ativo(s)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-2 font-mono text-xs border-border"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </Button>
            <Button
              onClick={() => navigate("/incidents/new")}
              size="sm"
              className="gap-2 font-mono text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Novo Incidente
            </Button>
          </div>
        </div>

        {/* Barra de busca e filtros */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar incidentes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-input border-border font-mono text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 font-mono text-xs border-border ${showFilters ? "bg-primary/10 border-primary/30 text-primary" : ""}`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {activeFilters > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground rounded-full">
                  {activeFilters}
                </Badge>
              )}
            </Button>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </Button>
            )}
          </div>

          {/* Painel de filtros avançados */}
          {showFilters && (
            <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Categoria</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-input border border-border text-foreground rounded-md px-3 py-2 text-sm font-mono cursor-pointer"
                >
                  <option value="">Todas</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {CAT_LABELS[c] ?? c?.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Nível de Risco</label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full bg-input border border-border text-foreground rounded-md px-3 py-2 text-sm font-mono cursor-pointer"
                >
                  <option value="">Todos</option>
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Médio</option>
                  <option value="low">Baixo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Data Inicial</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-input border-border font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Data Final</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-input border-border font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="soc-table w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Risco</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Confiança</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground font-mono text-sm">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm font-mono">
                      {activeFilters > 0 ? "Nenhum incidente encontrado com os filtros aplicados" : "Nenhum incidente registrado"}
                    </p>
                    {activeFilters > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-2 font-mono text-xs text-primary"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((inc) => (
                  <tr
                    key={inc.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm truncate max-w-xs">{inc.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{inc.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded border font-mono capitalize text-primary bg-primary/10 border-primary/30">
                        {CAT_LABELS[inc.category ?? ""] ?? inc.category?.replace("_", " ") ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border font-mono ${SEV[inc.riskLevel ?? "low"] ?? SEV.low}`}>
                        {SEV_LABELS[inc.riskLevel ?? "low"] ?? inc.riskLevel ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {inc.confidence != null ? `${Math.round(inc.confidence * 100)}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(inc.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
