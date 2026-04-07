import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Filter, Eye, Trash2, ChevronRight } from "lucide-react";
import ExportPdfButton from "@/components/ExportPdfButton";
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

function RiskBadge({ risk }: { risk: string }) {
  const cfg = RISK_CONFIG[risk] ?? { label: risk, color: "#94a3b8" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 4, fontSize: "0.72rem", fontWeight: 600,
      color: cfg.color, background: `${cfg.color}1a`, border: `1px solid ${cfg.color}40`,
    }}>{cfg.label}</span>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const color = CAT_COLORS[cat] ?? "#64748b";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 4, fontSize: "0.72rem", fontWeight: 500,
      color, background: `${color}18`, border: `1px solid ${color}30`,
    }}>{CATEGORY_LABELS[cat] ?? cat}</span>
  );
}

export default function Incidents() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const utils = trpc.useUtils();

  const { data: incidents = [], isLoading } = trpc.incidents.list.useQuery();

  const deleteMutation = trpc.incidents.delete.useMutation({
    onSuccess: () => {
      toast.success("Incidente removido com sucesso.");
      utils.incidents.list.invalidate();
      utils.incidents.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => incidents.filter((inc) => {
    const matchSearch = !search ||
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || inc.category === filterCategory;
    const matchRisk = !filterRisk || inc.riskLevel === filterRisk;
    return matchSearch && matchCat && matchRisk;
  }), [incidents, search, filterCategory, filterRisk]);

  return (
    <div className="soc-page">
      {/* Header */}
      <div className="soc-page-header">
        <div>
          <h1 className="soc-page-title">Incidentes</h1>
          <p className="soc-page-sub">
            {isLoading ? "Carregando..." : `${incidents.length} incidente${incidents.length !== 1 ? "s" : ""} registrado${incidents.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <ExportPdfButton category={filterCategory || undefined} riskLevel={filterRisk || undefined} label="Exportar PDF" />
          <button className="soc-btn soc-btn-primary" onClick={() => navigate("/incidents/new")}>
            <Plus size={14} />Novo Incidente
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="soc-card" style={{ marginBottom: "1rem" }}>
        <div style={{ padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
            <Search size={13} style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "oklch(0.45 0.010 240)" }} />
            <input
              type="text" className="soc-input" placeholder="Buscar por título ou descrição..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2rem", width: "100%" }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <Filter size={12} style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "oklch(0.45 0.010 240)", pointerEvents: "none" }} />
            <select className="soc-input soc-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ paddingLeft: "2rem", minWidth: 160 }}>
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <select className="soc-input soc-select" value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} style={{ minWidth: 140 }}>
            <option value="">Todos os riscos</option>
            {Object.entries(RISK_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(search || filterCategory || filterRisk) && (
            <button className="soc-btn" onClick={() => { setSearch(""); setFilterCategory(""); setFilterRisk(""); }} style={{ fontSize: "0.78rem" }}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="soc-card">
        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div className="soc-empty" style={{ padding: "3rem" }}>Carregando incidentes...</div>
          ) : filtered.length === 0 ? (
            <div className="soc-empty" style={{ padding: "3rem" }}>
              {incidents.length === 0 ? (
                <>Nenhum incidente registrado. <button className="soc-link" onClick={() => navigate("/incidents/new")}>Registrar primeiro incidente</button></>
              ) : "Nenhum incidente corresponde aos filtros aplicados."}
            </div>
          ) : (
            <table className="soc-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th>Título</th>
                  <th style={{ width: 160 }}>Categoria</th>
                  <th style={{ width: 100 }}>Risco</th>
                  <th style={{ width: 80 }}>Conf.</th>
                  <th style={{ width: 100 }}>Data</th>
                  <th style={{ width: 80 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
                  <tr key={inc.id}>
                    <td><span className="soc-id">INC-{String(inc.id).padStart(3, "0")}</span></td>
                    <td style={{ cursor: "pointer" }} onClick={() => navigate(`/incidents/${inc.id}`)}>
                      <div style={{ fontWeight: 500, color: "oklch(0.88 0.008 240)", marginBottom: "0.1rem" }}>{inc.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "oklch(0.45 0.010 240)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                        {inc.description}
                      </div>
                    </td>
                    <td>{inc.category ? <CategoryBadge cat={inc.category} /> : <span style={{ color: "oklch(0.38 0.008 240)" }}>—</span>}</td>
                    <td>{inc.riskLevel ? <RiskBadge risk={inc.riskLevel} /> : <span style={{ color: "oklch(0.38 0.008 240)" }}>—</span>}</td>
                    <td style={{ fontSize: "0.75rem", color: "oklch(0.55 0.010 240)" }}>
                      {inc.confidence ? `${Math.round(inc.confidence * 100)}%` : "—"}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "oklch(0.48 0.010 240)" }}>
                      {new Date(inc.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="soc-icon-btn" title="Ver detalhes" onClick={() => navigate(`/incidents/${inc.id}`)}>
                          <Eye size={13} />
                        </button>
                        <button className="soc-icon-btn soc-icon-btn-danger" title="Excluir"
                          onClick={() => { if (confirm("Remover este incidente?")) deleteMutation.mutate({ id: inc.id }); }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: "0.625rem 1rem", borderTop: "1px solid oklch(0.16 0.008 240)", fontSize: "0.75rem", color: "oklch(0.45 0.010 240)" }}>
            Exibindo {filtered.length} de {incidents.length} incidente{incidents.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
