import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import CyberLayout from "@/components/CyberLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Shield, Users, AlertTriangle, RefreshCw, Search, Filter, Crown, UserCheck, BarChart3, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import ExportPdfButton from "@/components/ExportPdfButton";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing", malware: "Malware", brute_force: "Força Bruta",
  ddos: "DDoS", vazamento_de_dados: "Vazamento", unknown: "Desconhecido",
};
const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Crítico",  color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  high:     { label: "Alto",     color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  medium:   { label: "Médio",    color: "#eab308", bg: "rgba(234,179,8,0.12)"  },
  low:      { label: "Baixo",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
};
const CAT_CONFIG: Record<string, { color: string; bg: string }> = {
  phishing:          { color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
  malware:           { color: "#a855f7", bg: "rgba(168,85,247,0.10)" },
  brute_force:       { color: "#f97316", bg: "rgba(249,115,22,0.10)" },
  ddos:              { color: "#eab308", bg: "rgba(234,179,8,0.10)"  },
  vazamento_de_dados:{ color: "#06b6d4", bg: "rgba(6,182,212,0.10)" },
  unknown:           { color: "#64748b", bg: "rgba(100,116,139,0.10)"},
};

export default function Admin() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"incidents" | "users">("incidents");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [reclassifyTarget, setReclassifyTarget] = useState<{ id: number; title: string; category: string; riskLevel: string } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newRisk, setNewRisk] = useState("");

  const utils = trpc.useUtils();

  const { data: incidentsData, isLoading: incLoading } = trpc.admin.listIncidents.useQuery(
    { category: filterCategory !== "all" ? filterCategory : undefined, riskLevel: filterRisk !== "all" ? filterRisk : undefined, limit: 200, offset: 0 },
    { enabled: !!user && user.role === "admin" }
  );
  const { data: usersData, isLoading: usersLoading } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && tab === "users",
  });
  const { data: statsData } = trpc.admin.stats.useQuery(undefined, { enabled: !!user && user.role === "admin" });

  const reclassifyMutation = trpc.admin.reclassify.useMutation({
    onSuccess: () => { toast.success("Incidente reclassificado"); setReclassifyTarget(null); utils.admin.listIncidents.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Perfil atualizado"); utils.admin.listUsers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;

  if (!user || user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "oklch(0.07 0.010 240)" }}>
        <div className="soc-card" style={{ maxWidth: 400, textAlign: "center", padding: "2rem" }}>
          <AlertTriangle size={32} style={{ color: "#ef4444", margin: "0 auto 1rem" }} />
          <h2 style={{ color: "#ef4444", fontWeight: 700, marginBottom: "0.5rem" }}>Acesso Restrito</h2>
          <p style={{ color: "oklch(0.48 0.010 240)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>Esta área é exclusiva para administradores.</p>
          <button className="soc-btn-primary" onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</button>
        </div>
      </div>
    );
  }

  const filteredIncidents = (incidentsData?.incidents ?? []).filter((inc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return inc.title.toLowerCase().includes(q) || (inc.userName ?? "").toLowerCase().includes(q) || (inc.userEmail ?? "").toLowerCase().includes(q);
  });

  return (
    <CyberLayout>
      {/* Header */}
      <div className="soc-page-header">
        <div>
          <h1 className="soc-page-title">Painel de Administração</h1>
          <p className="soc-page-subtitle">Controle global · Reclassificação · Gestão de usuários</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "4px 10px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.30)" }}>
            <Crown size={11} /> ADMIN
          </span>
          <ExportPdfButton adminMode label="Exportar PDF" />
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { icon: AlertTriangle, label: "Total Incidentes", value: statsData?.totalIncidents ?? 0, color: "#22c55e" },
          { icon: Users,         label: "Total Usuários",   value: statsData?.totalUsers ?? 0,      color: "#06b6d4" },
          { icon: Shield,        label: "Críticos",         value: statsData?.byRisk.find((r) => r.riskLevel === "critical")?.count ?? 0, color: "#ef4444" },
          { icon: BarChart3,     label: "Categorias",       value: statsData?.byCategory.length ?? 0, color: "#eab308" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="soc-card">
            <div className="soc-card-body" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.72rem", color: "oklch(0.48 0.010 240)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                <Icon size={14} style={{ color }} />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", borderBottom: "1px solid oklch(0.18 0.008 240)", paddingBottom: "0" }}>
        {(["incidents", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.80rem",
              fontWeight: 600,
              color: tab === t ? "#22c55e" : "oklch(0.48 0.010 240)",
              borderBottom: tab === t ? "2px solid #22c55e" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              transition: "color 0.15s",
              textTransform: "capitalize",
            }}
          >
            {t === "incidents" ? `Incidentes (${incidentsData?.total ?? 0})` : `Usuários (${usersData?.length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Incidents Tab */}
      {tab === "incidents" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "oklch(0.40 0.008 240)" }} />
              <input
                className="soc-input"
                style={{ paddingLeft: "2rem", width: "100%" }}
                placeholder="Buscar por título, usuário ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="soc-input" style={{ width: 170 }}>
                <Filter size={12} style={{ marginRight: 6 }} />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="soc-input" style={{ width: 140 }}>
                <SelectValue placeholder="Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos riscos</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="soc-card" style={{ overflow: "hidden" }}>
            <table className="soc-table">
              <thead>
                <tr>
                  {["ID", "Título", "Usuário", "Categoria", "Risco", "Confiança", "Data", "Ações"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "oklch(0.40 0.008 240)" }}>Carregando...</td></tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "oklch(0.40 0.008 240)" }}>Nenhum incidente encontrado</td></tr>
                ) : filteredIncidents.map((inc) => {
                  const riskCfg = RISK_CONFIG[inc.riskLevel] ?? { label: inc.riskLevel, color: "#64748b", bg: "rgba(100,116,139,0.10)" };
                  const catCfg  = CAT_CONFIG[inc.category]   ?? { color: "#64748b", bg: "rgba(100,116,139,0.10)" };
                  return (
                    <tr key={inc.id}>
                      <td style={{ color: "oklch(0.40 0.008 240)" }}>#{inc.id}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.title}</td>
                      <td>
                        <div>{inc.userName ?? "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "oklch(0.40 0.008 240)" }}>{inc.userEmail ?? ""}</div>
                      </td>
                      <td>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600, color: catCfg.color, background: catCfg.bg, border: `1px solid ${catCfg.color}40` }}>
                          {CATEGORY_LABELS[inc.category] ?? inc.category}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, color: riskCfg.color, background: riskCfg.bg, border: `1px solid ${riskCfg.color}40` }}>
                          {riskCfg.label}
                        </span>
                      </td>
                      <td style={{ color: "oklch(0.65 0.008 240)" }}>{inc.confidence != null ? `${Math.round(inc.confidence * 100)}%` : "—"}</td>
                      <td style={{ color: "oklch(0.40 0.008 240)", fontSize: "0.78rem" }}>{new Date(inc.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <Link href={`/incidents/${inc.id}`}>
                            <button title="Ver detalhes" style={{ padding: "4px 6px", borderRadius: 4, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", cursor: "pointer" }}>
                              <Eye size={12} />
                            </button>
                          </Link>
                          <button
                            title="Reclassificar"
                            style={{ padding: "4px 6px", borderRadius: 4, background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)", color: "#eab308", cursor: "pointer" }}
                            onClick={() => { setReclassifyTarget({ id: inc.id, title: inc.title, category: inc.category, riskLevel: inc.riskLevel }); setNewCategory(inc.category); setNewRisk(inc.riskLevel); }}
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="soc-card" style={{ overflow: "hidden" }}>
          <table className="soc-table">
            <thead>
              <tr>
                {["ID", "Nome", "Email", "Perfil", "Status", "Último Acesso", "Ações"].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "oklch(0.40 0.008 240)" }}>Carregando...</td></tr>
              ) : (usersData ?? []).length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "oklch(0.40 0.008 240)" }}>Nenhum usuário encontrado</td></tr>
              ) : (usersData ?? []).map((u) => (
                <tr key={u.id}>
                  <td style={{ color: "oklch(0.40 0.008 240)" }}>#{u.id}</td>
                  <td>{u.name ?? "—"}</td>
                  <td style={{ color: "oklch(0.55 0.008 240)" }}>{u.email ?? "—"}</td>
                  <td>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, color: u.role === "admin" ? "#f97316" : "#22c55e", background: u.role === "admin" ? "rgba(249,115,22,0.12)" : "rgba(34,197,94,0.12)", border: `1px solid ${u.role === "admin" ? "rgba(249,115,22,0.30)" : "rgba(34,197,94,0.30)"}` }}>
                      {u.role === "admin" ? "ADMIN" : "USER"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.78rem", color: u.isActive ? "#22c55e" : "oklch(0.40 0.008 240)" }}>
                      {u.isActive ? "● Ativo" : "○ Inativo"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.78rem", color: "oklch(0.40 0.008 240)" }}>{new Date(u.lastSignedIn).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {u.id !== user.id && (
                      <button
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "3px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", color: u.role === "admin" ? "#22c55e" : "#f97316", background: u.role === "admin" ? "rgba(34,197,94,0.10)" : "rgba(249,115,22,0.10)", border: `1px solid ${u.role === "admin" ? "rgba(34,197,94,0.25)" : "rgba(249,115,22,0.25)"}` }}
                        onClick={() => updateRoleMutation.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                        disabled={updateRoleMutation.isPending}
                      >
                        {u.role === "admin" ? <><UserCheck size={11} /> Rebaixar</> : <><Crown size={11} /> Promover</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reclassify Dialog */}
      <Dialog open={!!reclassifyTarget} onOpenChange={(open) => !open && setReclassifyTarget(null)}>
        <DialogContent style={{ background: "oklch(0.10 0.012 240)", border: "1px solid oklch(0.20 0.008 240)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#22c55e", fontSize: "0.90rem", fontWeight: 700, letterSpacing: "0.04em" }}>
              Reclassificar Incidente
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
            <p style={{ fontSize: "0.82rem", color: "oklch(0.65 0.008 240)" }}>{reclassifyTarget?.title}</p>
            <div>
              <label className="soc-label">Nova Categoria</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="soc-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="soc-label">Novo Nível de Risco</label>
              <Select value={newRisk} onValueChange={setNewRisk}>
                <SelectTrigger className="soc-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button className="soc-btn-secondary" onClick={() => setReclassifyTarget(null)}>Cancelar</button>
            <button
              className="soc-btn-primary"
              onClick={() => reclassifyMutation.mutate({ id: reclassifyTarget!.id, category: newCategory as "phishing" | "malware" | "brute_force" | "ddos" | "vazamento_de_dados" | "unknown", riskLevel: newRisk as "critical" | "high" | "medium" | "low" })}
              disabled={reclassifyMutation.isPending || !newCategory || !newRisk}
            >
              {reclassifyMutation.isPending ? "Salvando..." : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CyberLayout>
  );
}
