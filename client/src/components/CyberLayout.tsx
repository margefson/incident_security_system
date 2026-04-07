import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Shield, LayoutDashboard, AlertTriangle, PlusCircle,
  List, Activity, LogOut, Menu, X, ChevronRight,
  User, Cpu, Crown, Bell, Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", accent: "cyan" },
  { icon: PlusCircle, label: "Novo Incidente", path: "/incidents/new", accent: "cyan" },
  { icon: List, label: "Meus Incidentes", path: "/incidents", accent: "cyan" },
  { icon: Activity, label: "Análise de Risco", path: "/risk", accent: "cyan" },
];

const ACCENT = {
  cyan: {
    active: "oklch(0.85 0.2 195)",
    bg: "oklch(0.85 0.2 195 / 0.1)",
    border: "oklch(0.85 0.2 195 / 0.3)",
    glow: "drop-shadow(0 0 6px oklch(0.85 0.2 195 / 0.8))",
  },
  pink: {
    active: "oklch(0.65 0.32 0)",
    bg: "oklch(0.65 0.32 0 / 0.1)",
    border: "oklch(0.65 0.32 0 / 0.3)",
    glow: "drop-shadow(0 0 6px oklch(0.65 0.32 0 / 0.8))",
  },
};

export default function CyberLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { data: stats } = trpc.incidents.stats.useQuery(undefined, { enabled: !!user });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.06 0.01 240)" }}>
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 neon-text-cyan animate-pulse" />
            <span className="font-mono text-lg neon-text-cyan tracking-widest" style={{ fontFamily: "Orbitron, monospace" }}>INICIALIZANDO...</span>
          </div>
          <div className="w-48 h-px mx-auto" style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.2 195), transparent)" }} />
        </div>
      </div>
    );
  }

  const totalIncidents = stats?.byCategory.reduce((a, b) => a + b.count, 0) ?? 0;
  const criticalCount = stats?.byRisk.find((r) => r.riskLevel === "critical")?.count ?? 0;

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.06 0.01 240)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 relative"
        style={{
          width: sidebarOpen ? "256px" : "60px",
          background: "oklch(0.075 0.012 240)",
          borderRight: "1px solid oklch(0.20 0.025 240)",
          flexShrink: 0,
        }}
      >
        {/* Sidebar accent glow line */}
        <div
          className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent 5%, oklch(0.85 0.2 195 / 0.25) 30%, oklch(0.65 0.32 0 / 0.2) 70%, transparent 95%)" }}
        />

        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "oklch(0.20 0.025 240)", minHeight: "64px" }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded glow-pulse"
            style={{ background: "oklch(0.85 0.2 195 / 0.08)", border: "1px solid oklch(0.85 0.2 195 / 0.4)" }}
          >
            <Shield className="w-5 h-5 neon-text-cyan" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden flex-1">
              <div
                className="font-bold tracking-wider whitespace-nowrap text-sm"
                style={{ fontFamily: "Orbitron, JetBrains Mono, monospace", color: "oklch(0.85 0.2 195)" }}
              >
                INCIDENT<span style={{ color: "oklch(0.65 0.32 0)" }}>_SYS</span>
              </div>
              <div className="font-mono text-xs" style={{ color: "oklch(0.38 0.02 240)" }}>v2.0 · SECURE</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex-shrink-0 p-1.5 rounded transition-all duration-150"
            style={{ color: "oklch(0.45 0.02 240)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.85 0.2 195)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.45 0.02 240)"; }}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* User card */}
        {sidebarOpen && user && (
          <div
            className="mx-3 mt-3 p-3 rounded"
            style={{ background: "oklch(0.10 0.015 240)", border: "1px solid oklch(0.20 0.025 240)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                style={{
                  background: "oklch(0.85 0.2 195 / 0.12)",
                  border: "1px solid oklch(0.85 0.2 195 / 0.4)",
                  color: "oklch(0.85 0.2 195)",
                  fontFamily: "Orbitron, monospace",
                }}
              >
                {(user.name ?? "U").charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-semibold truncate" style={{ color: "oklch(0.85 0.01 240)" }}>
                  {user.name ?? "Usuário"}
                </div>
                <div className="font-mono text-xs truncate" style={{ color: "oklch(0.38 0.02 240)" }}>
                  {user.email ?? ""}
                </div>
              </div>
              {user.role === "admin" && (
                <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.65 0.32 0)" }} />
              )}
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full neon-pulse" style={{ background: "oklch(0.75 0.25 145)" }} />
                <span className="font-mono text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>
                  {totalIncidents} incidente{totalIncidents !== 1 ? "s" : ""}
                </span>
              </div>
              {criticalCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" style={{ color: "oklch(0.65 0.32 0)" }} />
                  <span className="font-mono text-xs font-bold" style={{ color: "oklch(0.65 0.32 0)" }}>
                    {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav section label */}
        {sidebarOpen && (
          <div className="px-5 pt-4 pb-1">
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: "oklch(0.30 0.02 240)" }}>
              Navegação
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, path, accent }) => {
            const a = ACCENT[accent as keyof typeof ACCENT];
            const active = location === path || (path !== "/dashboard" && location.startsWith(path));
            return (
              <Link key={path} href={path}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 cursor-pointer group"
                  style={{
                    background: active ? a.bg : "transparent",
                    border: `1px solid ${active ? a.border : "transparent"}`,
                    color: active ? a.active : "oklch(0.55 0.02 240)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "oklch(0.12 0.015 240)";
                      (e.currentTarget as HTMLElement).style.color = "oklch(0.75 0.01 240)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "oklch(0.55 0.02 240)";
                    }
                  }}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ filter: active ? a.glow : undefined }}
                  />
                  {sidebarOpen && (
                    <>
                      <span className="text-sm font-medium flex-1 whitespace-nowrap">{label}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                    </>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Admin section */}
          {user?.role === "admin" && (
            <>
              {sidebarOpen && (
                <div className="px-3 pt-4 pb-1">
                  <span className="font-mono text-xs uppercase tracking-widest" style={{ color: "oklch(0.30 0.02 240)" }}>
                    Administração
                  </span>
                </div>
              )}
              {!sidebarOpen && <div className="my-1 mx-3 h-px" style={{ background: "oklch(0.20 0.025 240)" }} />}
              <Link href="/admin">
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 cursor-pointer"
                  style={{
                    background: location === "/admin" ? ACCENT.pink.bg : "transparent",
                    border: `1px solid ${location === "/admin" ? ACCENT.pink.border : "transparent"}`,
                    color: location === "/admin" ? ACCENT.pink.active : "oklch(0.55 0.02 240)",
                  }}
                  onMouseEnter={(e) => {
                    if (location !== "/admin") {
                      (e.currentTarget as HTMLElement).style.background = "oklch(0.12 0.015 240)";
                      (e.currentTarget as HTMLElement).style.color = "oklch(0.75 0.01 240)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (location !== "/admin") {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "oklch(0.55 0.02 240)";
                    }
                  }}
                >
                  <Crown
                    className="w-4 h-4 flex-shrink-0"
                    style={{ filter: location === "/admin" ? ACCENT.pink.glow : undefined }}
                  />
                  {sidebarOpen && (
                    <>
                      <span className="text-sm font-medium flex-1 whitespace-nowrap">Painel Admin</span>
                      {location === "/admin" && <ChevronRight className="w-3 h-3 opacity-50" />}
                    </>
                  )}
                </div>
              </Link>
            </>
          )}
        </nav>

        {/* ML Status chip */}
        {sidebarOpen && (
          <div
            className="mx-3 mb-3 p-3 rounded"
            style={{ background: "oklch(0.10 0.015 240)", border: "1px solid oklch(0.20 0.025 240)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.25 145)" }} />
              <span className="font-mono text-xs font-semibold" style={{ color: "oklch(0.75 0.25 145)" }}>ML ENGINE</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full neon-pulse" style={{ background: "oklch(0.75 0.25 145)" }} />
            </div>
            <div className="font-mono text-xs" style={{ color: "oklch(0.42 0.02 240)" }}>TF-IDF + Naive Bayes</div>
            <div className="font-mono text-xs mt-0.5" style={{ color: "oklch(0.42 0.02 240)" }}>
              Acurácia: <span style={{ color: "oklch(0.75 0.25 145)" }}>97%</span>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="p-2 border-t" style={{ borderColor: "oklch(0.20 0.025 240)" }}>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded transition-all duration-150"
            style={{ color: "oklch(0.45 0.02 240)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "oklch(0.65 0.32 0)";
              (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.32 0 / 0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "oklch(0.45 0.02 240)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
          style={{
            background: "oklch(0.065 0.01 240 / 0.96)",
            borderBottom: "1px solid oklch(0.20 0.025 240)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-px h-4" style={{ background: "oklch(0.85 0.2 195 / 0.5)" }} />
            <span className="font-mono text-xs" style={{ color: "oklch(0.42 0.02 240)" }}>
              INCIDENT SECURITY SYSTEM
            </span>
            <span className="font-mono text-xs neon-text-cyan">· SECURE MODE</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="font-mono text-xs" style={{ color: "oklch(0.38 0.02 240)" }}>
              {new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).toUpperCase()}
            </div>
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "oklch(0.65 0.32 0 / 0.1)", border: "1px solid oklch(0.65 0.32 0 / 0.3)" }}>
                <Bell className="w-3 h-3" style={{ color: "oklch(0.65 0.32 0)" }} />
                <span className="font-mono text-xs font-bold" style={{ color: "oklch(0.65 0.32 0)" }}>
                  {criticalCount} CRÍTICO{criticalCount !== 1 ? "S" : ""}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.75 0.25 145)", boxShadow: "0 0 6px oklch(0.75 0.25 145)" }} />
              <span className="font-mono text-xs neon-text-green">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
