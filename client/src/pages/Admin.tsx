import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import CyberLayout from "@/components/CyberLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Shield,
  Users,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Search,
  Filter,
  Crown,
  UserCheck,
  BarChart3,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

const CATEGORY_LABELS: Record<string, string> = {
  phishing: "Phishing",
  malware: "Malware",
  brute_force: "Força Bruta",
  ddos: "DDoS",
  vazamento_de_dados: "Vazamento",
  unknown: "Desconhecido",
};

const RISK_COLORS: Record<string, string> = {
  critical: "oklch(0.65 0.32 0)",
  high: "oklch(0.75 0.25 45)",
  medium: "oklch(0.9 0.25 100)",
  low: "oklch(0.75 0.25 145)",
};

const RISK_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const CAT_COLORS: Record<string, string> = {
  phishing: "oklch(0.65 0.32 0)",
  malware: "oklch(0.6 0.28 290)",
  brute_force: "oklch(0.75 0.25 45)",
  ddos: "oklch(0.9 0.25 100)",
  vazamento_de_dados: "oklch(0.85 0.2 195)",
  unknown: "oklch(0.55 0.02 240)",
};

export default function Admin() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("incidents");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [reclassifyTarget, setReclassifyTarget] = useState<{
    id: number;
    title: string;
    category: string;
    riskLevel: string;
  } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newRisk, setNewRisk] = useState("");

  const utils = trpc.useUtils();

  const { data: incidentsData, isLoading: incLoading } = trpc.admin.listIncidents.useQuery(
    {
      category: filterCategory !== "all" ? filterCategory : undefined,
      riskLevel: filterRisk !== "all" ? filterRisk : undefined,
      limit: 200,
      offset: 0,
    },
    { enabled: !!user && user.role === "admin" }
  );

  const { data: usersData, isLoading: usersLoading } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && tab === "users",
  });

  const { data: statsData } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const reclassifyMutation = trpc.admin.reclassify.useMutation({
    onSuccess: () => {
      toast.success("Incidente reclassificado com sucesso");
      setReclassifyTarget(null);
      utils.admin.listIncidents.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Perfil do usuário atualizado");
      utils.admin.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;

  if (!user || user.role !== "admin") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.06 0.01 240)" }}
      >
        <div className="text-center p-8 cyber-card max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "oklch(0.65 0.32 0)" }} />
          <h2 className="text-xl font-mono font-bold neon-text-pink mb-2">ACESSO NEGADO</h2>
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 240)" }}>
            Esta área é restrita a administradores do sistema.
          </p>
          <Button
            className="mt-4 cyber-btn-primary"
            onClick={() => navigate("/dashboard")}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const filteredIncidents = (incidentsData?.incidents ?? []).filter((inc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inc.title.toLowerCase().includes(q) ||
      (inc.userName ?? "").toLowerCase().includes(q) ||
      (inc.userEmail ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <CyberLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded"
              style={{ background: "oklch(0.65 0.32 0)" }}
            />
            <h1 className="text-2xl font-bold neon-text-pink tracking-wider" style={{ fontFamily: "Orbitron, JetBrains Mono, monospace", letterSpacing: "0.06em" }}>
              PAINEL ADMIN
            </h1>
          </div>
          <p className="text-sm font-mono ml-3" style={{ color: "oklch(0.55 0.02 240)" }}>
            Controle global · Reclassificação · Gestão de usuários
          </p>
        </div>
        <div
          className="px-3 py-1 rounded font-mono text-xs"
          style={{
            background: "oklch(0.65 0.32 0 / 0.1)",
            border: "1px solid oklch(0.65 0.32 0 / 0.4)",
            color: "oklch(0.65 0.32 0)",
          }}
        >
          <Crown className="w-3 h-3 inline mr-1" />
          ADMIN
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total Incidentes",
            value: statsData?.totalIncidents ?? 0,
            color: "oklch(0.85 0.2 195)",
            icon: AlertTriangle,
          },
          {
            label: "Total Usuários",
            value: statsData?.totalUsers ?? 0,
            color: "oklch(0.65 0.32 0)",
            icon: Users,
          },
          {
            label: "Críticos",
            value:
              statsData?.byRisk.find((r) => r.riskLevel === "critical")?.count ?? 0,
            color: "oklch(0.65 0.32 0)",
            icon: Shield,
          },
          {
            label: "Categorias",
            value: statsData?.byCategory.length ?? 0,
            color: "oklch(0.9 0.25 100)",
            icon: BarChart3,
          },
        ].map((stat) => (
          <div key={stat.label} className="cyber-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-mono uppercase tracking-wider"
                style={{ color: "oklch(0.55 0.02 240)" }}
              >
                {stat.label}
              </span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <div
              className="text-2xl font-mono font-bold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          className="mb-4 font-mono"
          style={{
            background: "oklch(0.10 0.015 240)",
            border: "1px solid oklch(0.22 0.03 240)",
          }}
        >
          <TabsTrigger value="incidents" className="data-[state=active]:neon-text-cyan">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Incidentes ({incidentsData?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:neon-text-pink">
            <Users className="w-4 h-4 mr-2" />
            Usuários ({usersData?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "oklch(0.55 0.02 240)" }}
              />
              <Input
                placeholder="Buscar por título, usuário ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-mono text-sm cyber-input"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44 font-mono text-sm cyber-input">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-36 font-mono text-sm cyber-input">
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
          <div
            className="rounded overflow-hidden"
            style={{ border: "1px solid oklch(0.22 0.03 240)" }}
          >
            <table className="w-full text-sm font-mono">
              <thead>
                <tr style={{ background: "oklch(0.10 0.015 240)" }}>
                  {["ID", "Título", "Usuário", "Categoria", "Risco", "Confiança", "Data", "Ações"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs uppercase tracking-wider"
                        style={{ color: "oklch(0.55 0.02 240)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {incLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center" style={{ color: "oklch(0.55 0.02 240)" }}>
                      Carregando...
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center" style={{ color: "oklch(0.55 0.02 240)" }}>
                      Nenhum incidente encontrado
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc, idx) => (
                    <tr
                      key={inc.id}
                      style={{
                        background: idx % 2 === 0 ? "oklch(0.08 0.012 240)" : "oklch(0.09 0.013 240)",
                        borderBottom: "1px solid oklch(0.15 0.02 240)",
                      }}
                    >
                      <td className="px-4 py-3" style={{ color: "oklch(0.55 0.02 240)" }}>
                        #{inc.id}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: "oklch(0.85 0.01 240)" }}>
                        {inc.title}
                      </td>
                      <td className="px-4 py-3">
                        <div style={{ color: "oklch(0.75 0.01 240)" }}>{inc.userName ?? "—"}</div>
                        <div className="text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
                          {inc.userEmail ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: `${CAT_COLORS[inc.category] ?? "oklch(0.55 0.02 240)"} / 0.15`,
                            color: CAT_COLORS[inc.category] ?? "oklch(0.55 0.02 240)",
                            border: `1px solid ${CAT_COLORS[inc.category] ?? "oklch(0.55 0.02 240)"} / 0.4`,
                          }}
                        >
                          {CATEGORY_LABELS[inc.category] ?? inc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            color: RISK_COLORS[inc.riskLevel] ?? "oklch(0.55 0.02 240)",
                          }}
                        >
                          {RISK_LABELS[inc.riskLevel] ?? inc.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "oklch(0.75 0.01 240)" }}>
                        {inc.confidence != null
                          ? `${Math.round(inc.confidence * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
                        {new Date(inc.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/incidents/${inc.id}`}>
                            <button
                              className="p-1.5 rounded transition-colors"
                              style={{
                                color: "oklch(0.85 0.2 195)",
                                background: "oklch(0.85 0.2 195 / 0.1)",
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button
                            className="p-1.5 rounded transition-colors"
                            style={{
                              color: "oklch(0.9 0.25 100)",
                              background: "oklch(0.9 0.25 100 / 0.1)",
                            }}
                            title="Reclassificar"
                            onClick={() => {
                              setReclassifyTarget({
                                id: inc.id,
                                title: inc.title,
                                category: inc.category,
                                riskLevel: inc.riskLevel,
                              });
                              setNewCategory(inc.category);
                              setNewRisk(inc.riskLevel);
                            }}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div
            className="rounded overflow-hidden"
            style={{ border: "1px solid oklch(0.22 0.03 240)" }}
          >
            <table className="w-full text-sm font-mono">
              <thead>
                <tr style={{ background: "oklch(0.10 0.015 240)" }}>
                  {["ID", "Nome", "Email", "Perfil", "Status", "Último Acesso", "Ações"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs uppercase tracking-wider"
                      style={{ color: "oklch(0.55 0.02 240)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "oklch(0.55 0.02 240)" }}>
                      Carregando...
                    </td>
                  </tr>
                ) : (usersData ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "oklch(0.55 0.02 240)" }}>
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  (usersData ?? []).map((u, idx) => (
                    <tr
                      key={u.id}
                      style={{
                        background: idx % 2 === 0 ? "oklch(0.08 0.012 240)" : "oklch(0.09 0.013 240)",
                        borderBottom: "1px solid oklch(0.15 0.02 240)",
                      }}
                    >
                      <td className="px-4 py-3" style={{ color: "oklch(0.55 0.02 240)" }}>
                        #{u.id}
                      </td>
                      <td className="px-4 py-3" style={{ color: "oklch(0.85 0.01 240)" }}>
                        {u.name ?? "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "oklch(0.75 0.01 240)" }}>
                        {u.email ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            color: u.role === "admin" ? "oklch(0.65 0.32 0)" : "oklch(0.85 0.2 195)",
                            background:
                              u.role === "admin"
                                ? "oklch(0.65 0.32 0 / 0.1)"
                                : "oklch(0.85 0.2 195 / 0.1)",
                            border: `1px solid ${u.role === "admin" ? "oklch(0.65 0.32 0 / 0.4)" : "oklch(0.85 0.2 195 / 0.4)"}`,
                          }}
                        >
                          {u.role === "admin" ? "ADMIN" : "USER"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs"
                          style={{
                            color: u.isActive ? "oklch(0.75 0.25 145)" : "oklch(0.55 0.02 240)",
                          }}
                        >
                          {u.isActive ? "● Ativo" : "○ Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
                        {new Date(u.lastSignedIn).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        {u.id !== user.id && (
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                            style={{
                              color: u.role === "admin" ? "oklch(0.85 0.2 195)" : "oklch(0.65 0.32 0)",
                              background:
                                u.role === "admin"
                                  ? "oklch(0.85 0.2 195 / 0.1)"
                                  : "oklch(0.65 0.32 0 / 0.1)",
                              border: `1px solid ${u.role === "admin" ? "oklch(0.85 0.2 195 / 0.3)" : "oklch(0.65 0.32 0 / 0.3)"}`,
                            }}
                            onClick={() =>
                              updateRoleMutation.mutate({
                                userId: u.id,
                                role: u.role === "admin" ? "user" : "admin",
                              })
                            }
                            disabled={updateRoleMutation.isPending}
                          >
                            {u.role === "admin" ? (
                              <>
                                <UserCheck className="w-3 h-3" /> Rebaixar
                              </>
                            ) : (
                              <>
                                <Crown className="w-3 h-3" /> Promover
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reclassify Dialog */}
      <Dialog
        open={!!reclassifyTarget}
        onOpenChange={(open) => !open && setReclassifyTarget(null)}
      >
        <DialogContent
          style={{
            background: "oklch(0.10 0.015 240)",
            border: "1px solid oklch(0.22 0.03 240)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-mono neon-text-cyan">
              RECLASSIFICAR INCIDENTE
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p
              className="text-sm font-mono"
              style={{ color: "oklch(0.75 0.01 240)" }}
            >
              {reclassifyTarget?.title}
            </p>
            <div>
              <label
                className="block text-xs font-mono mb-1"
                style={{ color: "oklch(0.55 0.02 240)" }}
              >
                NOVA CATEGORIA
              </label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="cyber-input font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                className="block text-xs font-mono mb-1"
                style={{ color: "oklch(0.55 0.02 240)" }}
              >
                NOVO NÍVEL DE RISCO
              </label>
              <Select value={newRisk} onValueChange={setNewRisk}>
                <SelectTrigger className="cyber-input font-mono">
                  <SelectValue />
                </SelectTrigger>
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
            <Button
              variant="outline"
              className="font-mono"
              onClick={() => setReclassifyTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              className="cyber-btn-primary font-mono"
              disabled={reclassifyMutation.isPending}
              onClick={() => {
                if (!reclassifyTarget) return;
                reclassifyMutation.mutate({
                  id: reclassifyTarget.id,
                  category: newCategory as
                    | "phishing"
                    | "malware"
                    | "brute_force"
                    | "ddos"
                    | "vazamento_de_dados"
                    | "unknown",
                  riskLevel: newRisk as "critical" | "high" | "medium" | "low",
                });
              }}
            >
              {reclassifyMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CyberLayout>
  );
}
