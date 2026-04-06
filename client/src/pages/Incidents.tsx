import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { List, PlusCircle, Search, Trash2, Eye, Filter } from "lucide-react";
import { toast } from "sonner";
import CyberLayout from "@/components/CyberLayout";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing",
  malware: "Malware",
  brute_force: "Força Bruta",
  ddos: "DDoS",
  vazamento_de_dados: "Vazamento",
  unknown: "Desconhecido",
};

const RISK_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const ALL_CATEGORIES = ["", "phishing", "malware", "brute_force", "ddos", "vazamento_de_dados"];
const ALL_RISKS = ["", "critical", "high", "medium", "low"];

export default function Incidents() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const utils = trpc.useUtils();

  const { data: incidents, isLoading } = trpc.incidents.list.useQuery();

  const deleteMutation = trpc.incidents.delete.useMutation({
    onSuccess: () => {
      toast.success("Incidente removido.");
      utils.incidents.list.invalidate();
      utils.incidents.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((inc) => {
      const matchSearch = !search || inc.title.toLowerCase().includes(search.toLowerCase()) || inc.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !filterCategory || inc.category === filterCategory;
      const matchRisk = !filterRisk || inc.riskLevel === filterRisk;
      return matchSearch && matchCategory && matchRisk;
    });
  }, [incidents, search, filterCategory, filterRisk]);

  const selectStyle: React.CSSProperties = {
    background: "oklch(0.10 0.015 240)",
    border: "1px solid oklch(0.22 0.03 240)",
    borderRadius: "0.25rem",
    padding: "0.5rem 0.75rem",
    color: "oklch(0.75 0.01 240)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.75rem",
    outline: "none",
    cursor: "pointer",
  };

  return (
    <CyberLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded" style={{ background: "oklch(0.85 0.2 195 / 0.1)", border: "1px solid oklch(0.85 0.2 195 / 0.3)" }}>
            <List className="w-5 h-5 neon-text-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono neon-text-cyan tracking-wider">MEUS INCIDENTES</h1>
            <p className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
              {filtered.length} de {incidents?.length ?? 0} registros
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/incidents/new")}
          className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-bold tracking-wider uppercase transition-all duration-200"
          style={{ background: "oklch(0.85 0.2 195 / 0.12)", border: "1px solid oklch(0.85 0.2 195 / 0.5)", color: "oklch(0.85 0.2 195)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px oklch(0.85 0.2 195 / 0.3)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <PlusCircle className="w-4 h-4" />
          NOVO
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 p-3 rounded" style={{ background: "oklch(0.09 0.012 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.45 0.02 240)" }} />
          <input
            type="text"
            placeholder="BUSCAR INCIDENTES..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, flex: 1, padding: "0.5rem 0.5rem" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" style={{ color: "oklch(0.45 0.02 240)" }} />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={selectStyle}>
            <option value="">CATEGORIA</option>
            {ALL_CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} style={selectStyle}>
            <option value="">RISCO</option>
            {ALL_RISKS.filter(Boolean).map((r) => (
              <option key={r} value={r}>{RISK_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden" style={{ border: "1px solid oklch(0.22 0.03 240)" }}>
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5" style={{ background: "oklch(0.08 0.012 240)", borderBottom: "1px solid oklch(0.22 0.03 240)" }}>
          {["#ID", "TÍTULO", "CATEGORIA", "RISCO", "CONFIANÇA", "DATA", "AÇÕES"].map((h, i) => (
            <div key={h} className={`font-mono text-xs font-bold ${i === 1 ? "col-span-4" : i === 5 ? "col-span-2" : "col-span-1"}`} style={{ color: "oklch(0.45 0.02 240)" }}>
              {h}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 text-center" style={{ background: "oklch(0.09 0.012 240)" }}>
            <p className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>CARREGANDO...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center" style={{ background: "oklch(0.09 0.012 240)" }}>
            <List className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.25 0.02 240)" }} />
            <p className="font-mono text-sm" style={{ color: "oklch(0.35 0.02 240)" }}>
              {incidents?.length === 0 ? "Nenhum incidente registrado" : "Nenhum resultado para os filtros"}
            </p>
            {incidents?.length === 0 && (
              <button onClick={() => navigate("/incidents/new")} className="mt-3 font-mono text-xs neon-text-cyan">
                + Registrar primeiro incidente
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: "oklch(0.09 0.012 240)" }}>
            {filtered.map((incident, idx) => (
              <div
                key={incident.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center transition-all duration-150"
                style={{
                  borderBottom: idx < filtered.length - 1 ? "1px solid oklch(0.15 0.02 240)" : "none",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.12 0.015 240)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div className="col-span-1 font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>#{incident.id}</div>
                <div className="col-span-4 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "oklch(0.85 0.01 240)" }}>{incident.title}</p>
                  <p className="font-mono text-xs truncate mt-0.5" style={{ color: "oklch(0.4 0.02 240)" }}>
                    {incident.description.slice(0, 60)}...
                  </p>
                </div>
                <div className="col-span-1">
                  <span className={`badge-${incident.category} px-1.5 py-0.5 rounded font-mono text-xs whitespace-nowrap`}>
                    {CATEGORY_LABELS[incident.category] ?? incident.category}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className={`risk-${incident.riskLevel} px-1.5 py-0.5 rounded font-mono text-xs`}>
                    {RISK_LABELS[incident.riskLevel] ?? incident.riskLevel}
                  </span>
                </div>
                <div className="col-span-1 font-mono text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>
                  {incident.confidence ? `${Math.round((incident.confidence ?? 0) * 100)}%` : "—"}
                </div>
                <div className="col-span-2 font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
                  {new Date(incident.createdAt).toLocaleDateString("pt-BR")}
                </div>
                <div className="col-span-1 flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "oklch(0.45 0.02 240)" }}
                    title="Ver detalhes"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.85 0.2 195)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.45 0.02 240)"; }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm("Remover este incidente?")) deleteMutation.mutate({ id: incident.id }); }}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "oklch(0.45 0.02 240)" }}
                    title="Excluir"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.65 0.32 0)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.45 0.02 240)"; }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CyberLayout>
  );
}
