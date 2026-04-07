import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, Eye, EyeOff, AlertCircle, Lock, Mail, User, Check, X } from "lucide-react";
import { toast } from "sonner";

const PASSWORD_CRITERIA = [
  { key: "minLength", label: "Mínimo 8 caracteres",          test: (p: string) => p.length >= 8 },
  { key: "maxLength", label: "Máximo 128 caracteres",         test: (p: string) => p.length <= 128 },
  { key: "hasLower",  label: "Letra minúscula",               test: (p: string) => /[a-z]/.test(p) },
  { key: "hasUpper",  label: "Letra maiúscula",               test: (p: string) => /[A-Z]/.test(p) },
  { key: "hasNumber", label: "Número",                        test: (p: string) => /[0-9]/.test(p) },
  { key: "hasSpecial",label: "Caractere especial",            test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

function getStrength(met: number): { label: string; color: string; pct: number } {
  if (met <= 1) return { label: "Muito Fraca", color: "oklch(0.62 0.22 25)",  pct: 16 };
  if (met <= 2) return { label: "Fraca",       color: "oklch(0.72 0.18 55)",  pct: 33 };
  if (met <= 4) return { label: "Média",        color: "oklch(0.82 0.18 85)",  pct: 66 };
  return              { label: "Forte",         color: "oklch(0.82 0.20 155)", pct: 100 };
}

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const criteria = useMemo(
    () => PASSWORD_CRITERIA.map((c) => ({ ...c, met: password.length > 0 && c.test(password) })),
    [password]
  );
  const metCount = criteria.filter((c) => c.met).length;
  const allMet = metCount === PASSWORD_CRITERIA.length;
  const strength = getStrength(metCount);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Conta criada com sucesso.");
      window.location.href = "/dashboard";
    },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email || !password) { setError("Preencha todos os campos."); return; }
    if (!allMet) { setError("A senha não atende todos os critérios de segurança."); return; }
    registerMutation.mutate({ name: name.trim(), email, password });
  };

  return (
    <div className="soc-auth-page">
      <div className="soc-auth-card soc-fade-in" style={{ maxWidth: 420 }}>
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

        <div style={{ marginBottom: "1.25rem" }}>
          <h1 style={{ fontSize: "1rem", fontWeight: 600, color: "oklch(0.92 0.008 240)", marginBottom: "0.2rem" }}>
            Criar Acesso
          </h1>
          <p style={{ fontSize: "0.78rem", color: "oklch(0.48 0.010 240)" }}>
            Registre-se como operador do sistema
          </p>
        </div>

        {error && (
          <div className="soc-alert soc-alert-error">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="soc-form-group">
            <label className="soc-label">
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <User size={11} />Nome completo
              </span>
            </label>
            <input
              type="text"
              className="soc-input"
              placeholder="Nome do operador"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

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
                placeholder="Ex: Senha@123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowCriteria(true)}
                autoComplete="new-password"
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

            {/* Strength bar */}
            {password.length > 0 && (
              <div style={{ marginTop: "0.375rem" }}>
                <div className="soc-pwd-strength">
                  <div
                    className="soc-pwd-strength-bar"
                    style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
                  />
                </div>
                <div style={{ fontSize: "0.68rem", color: strength.color, marginTop: "0.2rem" }}>
                  Força: {strength.label}
                </div>
              </div>
            )}

            {/* Criteria checklist */}
            {(showCriteria || (password.length > 0 && !allMet)) && (
              <div className="soc-pwd-criteria">
                {criteria.map((c) => (
                  <div key={c.key} className={`soc-pwd-criterion ${c.met ? "met" : "unmet"}`}>
                    {c.met ? <Check size={11} /> : <X size={11} />}
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* All met indicator */}
            {password.length > 0 && allMet && (
              <div className="soc-alert soc-alert-success" style={{ marginTop: "0.375rem", marginBottom: 0 }}>
                <Check size={13} style={{ flexShrink: 0 }} />
                <span>Senha atende todos os critérios de segurança</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="soc-btn soc-btn-primary"
            disabled={registerMutation.isPending || !allMet}
            style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}
          >
            {registerMutation.isPending ? (
              <><div className="soc-spinner" style={{ width: 14, height: 14 }} />Criando acesso...</>
            ) : "Criar Acesso"}
          </button>
        </form>

        <div style={{
          marginTop: "1.125rem", paddingTop: "1rem",
          borderTop: "1px solid oklch(0.18 0.008 240)",
          textAlign: "center", fontSize: "0.78rem", color: "oklch(0.48 0.010 240)",
        }}>
          Já tem conta?{" "}
          <Link href="/login">
            <span style={{ color: "oklch(0.82 0.20 155)", cursor: "pointer", fontWeight: 500 }}>
              Entrar
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
