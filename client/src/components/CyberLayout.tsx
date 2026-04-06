import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  PlusCircle,
  List,
  Activity,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Cpu,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: PlusCircle, label: "Novo Incidente", path: "/incidents/new" },
  { icon: List, label: "Meus Incidentes", path: "/incidents" },
  { icon: Activity, label: "Análise de Risco", path: "/risk" },
];

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
            <span className="font-mono text-lg neon-text-cyan tracking-widest">INICIALIZANDO...</span>
          </div>
          <div className="w-48 h-px mx-auto" style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.2 195), transparent)" }} />
        </div>
      </div>
    );
  }

  const totalIncidents = stats?.byCategory.reduce((a, b) => a + b.count, 0) ?? 0;

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.06 0.01 240)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 relative"
        style={{
          width: sidebarOpen ? "260px" : "64px",
          background: "oklch(0.08 0.012 240)",
          borderRight: "1px solid oklch(0.22 0.03 240)",
          flexShrink: 0,
        }}
      >
        {/* Sidebar glow line */}
        <div className="absolute right-0 top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, transparent, oklch(0.85 0.2 195 / 0.3), oklch(0.65 0.32 0 / 0.3), transparent)" }} />

        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "oklch(0.22 0.03 240)", minHeight: "64px" }}>
          <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded" style={{ background: "oklch(0.85 0.2 195 / 0.1)", border: "1px solid oklch(0.85 0.2 195 / 0.4)" }}>
            <Shield className="w-5 h-5 neon-text-cyan" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-mono text-sm font-bold neon-text-cyan tracking-wider whitespace-nowrap">INCIDENT<span className="neon-text-pink">_SYS</span></div>
              <div className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>v2.0 · SECURE</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto flex-shrink-0 p-1 rounded transition-colors"
            style={{ color: "oklch(0.55 0.02 240)" }}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* User info */}
        {sidebarOpen && user && (
          <div className="mx-3 mt-3 p-3 rounded" style={{ background: "oklch(0.12 0.015 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.85 0.2 195 / 0.15)", border: "1px solid oklch(0.85 0.2 195 / 0.4)" }}>
                <User className="w-3.5 h-3.5 neon-text-cyan" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-medium truncate" style={{ color: "oklch(0.85 0.01 240)" }}>{user.name ?? "Usuário"}</div>
                <div className="font-mono text-xs truncate" style={{ color: "oklch(0.45 0.02 240)" }}>{user.email ?? ""}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full neon-pulse" style={{ background: "oklch(0.75 0.25 145)" }} />
              <span className="font-mono text-xs" style={{ color: "oklch(0.75 0.25 145)" }}>ONLINE · {totalIncidents} incidentes</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active = location === path || (path !== "/dashboard" && location.startsWith(path));
            return (
              <Link key={path} href={path}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 group cursor-pointer"
                  style={{
                    background: active ? "oklch(0.85 0.2 195 / 0.1)" : "transparent",
                    border: active ? "1px solid oklch(0.85 0.2 195 / 0.3)" : "1px solid transparent",
                    color: active ? "oklch(0.85 0.2 195)" : "oklch(0.6 0.02 240)",
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ filter: active ? "drop-shadow(0 0 6px oklch(0.85 0.2 195 / 0.8))" : undefined }} />
                  {sidebarOpen && (
                    <>
                      <span className="text-sm font-medium flex-1 whitespace-nowrap">{label}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ML Status */}
        {sidebarOpen && (
          <div className="mx-3 mb-3 p-3 rounded" style={{ background: "oklch(0.10 0.015 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.25 145)" }} />
              <span className="font-mono text-xs font-medium" style={{ color: "oklch(0.75 0.25 145)" }}>ML ENGINE</span>
            </div>
            <div className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>TF-IDF + Naive Bayes</div>
            <div className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>Acurácia: 97%</div>
          </div>
        )}

        {/* Logout */}
        <div className="p-2 border-t" style={{ borderColor: "oklch(0.22 0.03 240)" }}>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded transition-all duration-150"
            style={{ color: "oklch(0.55 0.02 240)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.65 0.32 0)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.32 0 / 0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.55 0.02 240)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3" style={{ background: "oklch(0.07 0.01 240 / 0.95)", borderBottom: "1px solid oklch(0.22 0.03 240)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 neon-text-pink" />
            <span className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
              INCIDENT SECURITY SYSTEM · <span className="neon-text-cyan">SECURE MODE</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
              {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.75 0.25 145)", boxShadow: "0 0 6px oklch(0.75 0.25 145)" }} />
              <span className="font-mono text-xs neon-text-green">SISTEMA ATIVO</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
