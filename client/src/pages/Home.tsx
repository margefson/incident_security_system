import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Shield, AlertTriangle, Cpu, Lock, Activity, ArrowRight, Zap } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (!loading && isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: "oklch(0.06 0.01 240)" }}>
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(oklch(0.85 0.2 195 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.2 195 / 0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/6 w-96 h-96 rounded-full pointer-events-none" style={{ background: "oklch(0.85 0.2 195 / 0.04)", filter: "blur(100px)" }} />
      <div className="absolute bottom-1/4 right-1/6 w-80 h-80 rounded-full pointer-events-none" style={{ background: "oklch(0.65 0.32 0 / 0.04)", filter: "blur(80px)" }} />

      <div className="relative z-10 text-center max-w-3xl">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded mb-6 relative" style={{ background: "oklch(0.85 0.2 195 / 0.08)", border: "1px solid oklch(0.85 0.2 195 / 0.3)" }}>
          <Shield className="w-10 h-10 neon-text-cyan" />
          <span className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: "1px solid oklch(0.85 0.2 195 / 0.7)", borderLeft: "1px solid oklch(0.85 0.2 195 / 0.7)" }} />
          <span className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: "1px solid oklch(0.85 0.2 195 / 0.7)", borderRight: "1px solid oklch(0.85 0.2 195 / 0.7)" }} />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-2 tracking-wider" style={{ fontFamily: "Orbitron, JetBrains Mono, monospace", letterSpacing: "0.08em" }}>
          <span className="neon-text-cyan">INCIDENT</span>
          <span className="neon-text-pink">_SYS</span>
        </h1>
        <p className="font-mono text-sm mb-2" style={{ color: "oklch(0.55 0.02 240)" }}>
          SISTEMA WEB SEGURO PARA REGISTRO E CLASSIFICAÇÃO DE INCIDENTES DE SEGURANÇA
        </p>
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 rounded-full neon-pulse" style={{ background: "oklch(0.75 0.25 145)" }} />
          <span className="font-mono text-xs neon-text-green">SISTEMA ATIVO · MODO SEGURO</span>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Cpu, title: "ML Automático", desc: "TF-IDF + Naive Bayes classifica incidentes em 5 categorias com 97% de acurácia", color: "oklch(0.85 0.2 195)" },
            { icon: Lock, title: "Segurança Total", desc: "Autenticação bcrypt, JWT, controle de acesso individual por usuário", color: "oklch(0.65 0.32 0)" },
            { icon: Activity, title: "Análise de Risco", desc: "Score de risco automático, recomendações e dashboard em tempo real", color: "oklch(0.75 0.25 145)" },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="cyber-card p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="font-mono text-xs font-bold" style={{ color }}>{title.toUpperCase()}</span>
              </div>
              <p className="font-mono text-xs" style={{ color: "oklch(0.5 0.02 240)" }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { label: "Phishing", cls: "badge-phishing" },
            { label: "Malware", cls: "badge-malware" },
            { label: "Força Bruta", cls: "badge-brute_force" },
            { label: "DDoS", cls: "badge-ddos" },
            { label: "Vazamento de Dados", cls: "badge-vazamento_de_dados" },
          ].map(({ label, cls }) => (
            <span key={label} className={`${cls} px-3 py-1 rounded font-mono text-xs`}>{label}</span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 px-6 py-3 rounded font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200"
            style={{ background: "oklch(0.85 0.2 195 / 0.12)", border: "1px solid oklch(0.85 0.2 195 / 0.5)", color: "oklch(0.85 0.2 195)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px oklch(0.85 0.2 195 / 0.4)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <Lock className="w-4 h-4" />
            ACESSAR SISTEMA
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/register")}
            className="flex items-center gap-2 px-6 py-3 rounded font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200"
            style={{ background: "oklch(0.65 0.32 0 / 0.08)", border: "1px solid oklch(0.65 0.32 0 / 0.4)", color: "oklch(0.65 0.32 0)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.32 0 / 0.15)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px oklch(0.65 0.32 0 / 0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.32 0 / 0.08)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <Zap className="w-4 h-4" />
            CRIAR CONTA
          </button>
        </div>

        {/* Tech stack */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <AlertTriangle className="w-3 h-3" style={{ color: "oklch(0.35 0.02 240)" }} />
          <p className="font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>
            React · tRPC · Drizzle · MySQL · bcryptjs · TF-IDF · Naive Bayes · Flask
          </p>
        </div>
      </div>
    </div>
  );
}
