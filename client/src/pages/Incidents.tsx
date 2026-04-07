import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { PlusCircle, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEV: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  low:      "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

export default function Incidents() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const { data: incidents, isLoading } = trpc.incidents.list.useQuery();

  const filtered = incidents?.filter(inc => {
    const matchSearch = !search || inc.title.toLowerCase().includes(search.toLowerCase()) || inc.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || inc.category === categoryFilter;
    return matchSearch && matchCat;
  }) ?? [];

  const categories = Array.from(new Set((incidents?.map(i => i.category).filter(Boolean) ?? []) as string[]));

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono">Incidentes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{incidents?.length ?? 0} incidente(s) registrado(s)</p>
          </div>
          <Button onClick={() => navigate("/incidents/new")} className="gap-2 font-mono text-xs">
            <PlusCircle className="w-4 h-4" /> Novo Incidente
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar incidentes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-input border-border font-mono text-sm" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-input border border-border text-foreground rounded-md px-3 py-2 text-sm font-mono cursor-pointer">
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c} value={c}>{c?.replace("_", " ")}</option>)}
          </select>
        </div>

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
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Nenhum incidente encontrado</p>
                  </td>
                </tr>
              ) : filtered.map(inc => (
                <tr key={inc.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/incidents/${inc.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-sm truncate max-w-xs">{inc.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{inc.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded border font-mono capitalize text-primary bg-primary/10 border-primary/30">
                      {inc.category?.replace("_", " ") ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${SEV[inc.riskLevel ?? "low"] ?? SEV.low}`}>
                      {inc.riskLevel ?? "—"}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
