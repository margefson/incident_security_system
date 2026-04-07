import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, Eye, EyeOff, AlertCircle, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Acesso autorizado.");
      window.location.href = "/dashboard";
    },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Preencha todos os campos."); return; }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="soc-auth-page">
      <div className="soc-auth-card soc-fade-in">
        {/* Logo */}
        <div className="soc-auth-logo">
          <div className="soc-auth-logo-icon">
            <Shield size={15} style={{ color: "oklch(0.82 0.20 155)" }} />
          </div>
          <div>
            <div className="soc-auth-title">SOC Portal</div>
            <div className="soc-auth-sub">Incident Response System</div>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <h1 style={{ fontSize: "1rem", fontWeight: 600, color: "oklch(0.92 0.008 240)", marginBottom: "0.2rem" }}>
            Entrar no Sistema
          </h1>
          <p style={{ fontSize: "0.78rem", color: "oklch(0.48 0.010 240)" }}>
            Acesse com suas credenciais de operador
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="soc-alert soc-alert-error">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="soc-form-group">
            <label className="soc-label">
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Mail size={11} />E-mail
              </span>
            </label>
            <input
              type="email"
              className="soc-input"
              placeholder="operador@soc.corp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="soc-form-group">
            <label className="soc-label">
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Lock size={11} />Senha
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                className="soc-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: "absolute", right: "0.625rem", top: "50%",
                  transform: "translateY(-50%)", background: "none", border: "none",
                  cursor: "pointer", color: "oklch(0.45 0.010 240)", padding: 0,
                }}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="soc-btn soc-btn-primary"
            disabled={loginMutation.isPending}
            style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}
          >
            {loginMutation.isPending ? (
              <><div className="soc-spinner" style={{ width: 14, height: 14 }} />Autenticando...</>
            ) : "Entrar"}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: "1.125rem", paddingTop: "1rem",
          borderTop: "1px solid oklch(0.18 0.008 240)",
          textAlign: "center", fontSize: "0.78rem", color: "oklch(0.48 0.010 240)",
        }}>
          Não tem conta?{" "}
          <Link href="/register">
            <span style={{ color: "oklch(0.82 0.20 155)", cursor: "pointer", fontWeight: 500 }}>
              Criar acesso
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
