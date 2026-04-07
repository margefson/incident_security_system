import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Shield, Cpu, Lock, Activity, ArrowRight, CheckCircle } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (!loading && isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "oklch(0.07 0.010 240)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header style={{ height: 48, borderBottom: "1px solid oklch(0.18 0.008 240)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield size={16} style={{ color: "#22c55e" }} />
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "oklch(0.92 0.008 240)", letterSpacing: "0.02em" }}>SOC Portal</span>
          <span style={{ fontSize: "0.72rem", color: "oklch(0.40 0.008 240)", marginLeft: "0.25rem" }}>Incident Response</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 600 }}>LIVE</span>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 900, width: "100%" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "4px 12px", borderRadius: 20, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", marginBottom: "1.25rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 600, letterSpacing: "0.06em" }}>SISTEMA ATIVO · MODO SEGURO</span>
            </div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 700, color: "oklch(0.92 0.008 240)", lineHeight: 1.2, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
              Sistema de Gerenciamento de<br />
              <span style={{ color: "#22c55e" }}>Incidentes de Segurança</span>
            </h1>
            <p style={{ fontSize: "0.95rem", color: "oklch(0.50 0.010 240)", maxWidth: 520, margin: "0 auto 2rem", lineHeight: 1.6 }}>
              Plataforma SOC com classificação automática por Machine Learning, controle de acesso individual e análise de risco em tempo real.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/login")}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.5rem", borderRadius: 6, background: "#22c55e", color: "oklch(0.07 0.010 240)", fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <Lock size={14} /> Acessar Sistema <ArrowRight size={14} />
              </button>
              <button
                onClick={() => navigate("/register")}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.5rem", borderRadius: 6, background: "oklch(0.14 0.008 240)", color: "oklch(0.82 0.008 240)", fontWeight: 600, fontSize: "0.85rem", border: "1px solid oklch(0.22 0.008 240)", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.18 0.008 240)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "oklch(0.14 0.008 240)")}
              >
                Criar Conta
              </button>
            </div>
          </div>

          {/* Feature cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
            {[
              { icon: Cpu,      title: "Classificação ML",   desc: "TF-IDF + Naive Bayes classifica incidentes em 5 categorias com 97% de acurácia em cross-validation.", color: "#22c55e" },
              { icon: Lock,     title: "Segurança Robusta",  desc: "Autenticação bcrypt (12 rounds), JWT HttpOnly, rate limiting, CORS, Helmet e proteção IDOR.", color: "#06b6d4" },
              { icon: Activity, title: "Análise de Risco",   desc: "Score de risco automático, recomendações de segurança e dashboard de estatísticas em tempo real.", color: "#a855f7" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} style={{ background: "oklch(0.12 0.008 240)", border: "1px solid oklch(0.20 0.008 240)", borderRadius: 8, padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "oklch(0.88 0.008 240)" }}>{title}</span>
                </div>
                <p style={{ fontSize: "0.80rem", color: "oklch(0.50 0.010 240)", lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Categories & checklist */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Categories */}
            <div style={{ background: "oklch(0.12 0.008 240)", border: "1px solid oklch(0.20 0.008 240)", borderRadius: 8, padding: "1.25rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "oklch(0.50 0.010 240)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>Categorias Detectadas</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {[
                  { label: "Phishing",          color: "#ef4444" },
                  { label: "Malware",            color: "#a855f7" },
                  { label: "Força Bruta",        color: "#f97316" },
                  { label: "DDoS",               color: "#eab308" },
                  { label: "Vazamento de Dados", color: "#06b6d4" },
                ].map(({ label, color }) => (
                  <span key={label} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, color, background: `${color}14`, border: `1px solid ${color}35` }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Security checklist */}
            <div style={{ background: "oklch(0.12 0.008 240)", border: "1px solid oklch(0.20 0.008 240)", borderRadius: 8, padding: "1.25rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "oklch(0.50 0.010 240)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>Requisitos de Segurança</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {["Segredos via variáveis de ambiente", "Hash bcrypt (12 rounds)", "Cookie seguro (httpOnly, sameSite lax)", "Proteção IDOR (404 em vez de 403)", "Rate limiting (100/15min global)", "CORS + Helmet configurados"].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle size={12} style={{ color: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.78rem", color: "oklch(0.65 0.008 240)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid oklch(0.18 0.008 240)", padding: "0.75rem 2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "0.72rem", color: "oklch(0.35 0.008 240)" }}>
          React · tRPC · Drizzle · MySQL · bcryptjs · TF-IDF · Naive Bayes · Flask
        </p>
      </footer>
    </div>
  );
}
