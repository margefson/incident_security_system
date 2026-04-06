import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, Lock, Mail, Eye, EyeOff, AlertTriangle, Cpu } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      toast.success("Acesso autorizado. Bem-vindo ao sistema.");
      await utils.auth.me.invalidate();
      window.location.href = "/dashboard";
    },
    onError: (e) => toast.error(e.message),
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "oklch(0.10 0.015 240)",
    border: "1px solid oklch(0.22 0.03 240)",
    borderRadius: "0.25rem",
    padding: "0.625rem 0.75rem 0.625rem 2.5rem",
    color: "oklch(0.95 0.01 240)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "oklch(0.06 0.01 240)" }}>
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(oklch(0.85 0.2 195 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0.2 195 / 0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: "oklch(0.85 0.2 195 / 0.04)", filter: "blur(80px)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: "oklch(0.65 0.32 0 / 0.04)", filter: "blur(60px)" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded mb-4 relative" style={{ background: "oklch(0.85 0.2 195 / 0.08)", border: "1px solid oklch(0.85 0.2 195 / 0.3)" }}>
            <Shield className="w-8 h-8 neon-text-cyan" />
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-3 h-3" style={{ borderTop: "1px solid oklch(0.85 0.2 195 / 0.7)", borderLeft: "1px solid oklch(0.85 0.2 195 / 0.7)" }} />
            <span className="absolute bottom-0 right-0 w-3 h-3" style={{ borderBottom: "1px solid oklch(0.85 0.2 195 / 0.7)", borderRight: "1px solid oklch(0.85 0.2 195 / 0.7)" }} />
          </div>
          <h1 className="text-2xl font-bold font-mono neon-text-cyan tracking-wider">INCIDENT<span className="neon-text-pink">_SYS</span></h1>
          <p className="text-sm mt-1 font-mono" style={{ color: "oklch(0.45 0.02 240)" }}>SISTEMA DE SEGURANÇA CIBERNÉTICA</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full neon-pulse" style={{ background: "oklch(0.75 0.25 145)" }} />
            <span className="font-mono text-xs neon-text-green">SISTEMA ATIVO</span>
          </div>
        </div>

        {/* Card */}
        <div className="relative p-6 rounded" style={{ background: "oklch(0.09 0.012 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: "1px solid oklch(0.85 0.2 195 / 0.5)", borderLeft: "1px solid oklch(0.85 0.2 195 / 0.5)" }} />
          <span className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: "1px solid oklch(0.85 0.2 195 / 0.5)", borderRight: "1px solid oklch(0.85 0.2 195 / 0.5)" }} />

          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 neon-text-cyan" />
            <h2 className="font-mono text-sm font-bold tracking-widest" style={{ color: "oklch(0.85 0.01 240)" }}>AUTENTICAÇÃO</h2>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block font-mono text-xs mb-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>
                IDENTIFICADOR [EMAIL]
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.02 240)" }} />
                <input
                  type="email"
                  placeholder="usuario@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "oklch(0.85 0.2 195 / 0.6)"; e.target.style.boxShadow = "0 0 0 1px oklch(0.85 0.2 195 / 0.2), 0 0 12px oklch(0.85 0.2 195 / 0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "oklch(0.22 0.03 240)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-mono text-xs mb-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>
                CREDENCIAL [SENHA]
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.02 240)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate({ email, password })}
                  style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  onFocus={(e) => { e.target.style.borderColor = "oklch(0.85 0.2 195 / 0.6)"; e.target.style.boxShadow = "0 0 0 1px oklch(0.85 0.2 195 / 0.2), 0 0 12px oklch(0.85 0.2 195 / 0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "oklch(0.22 0.03 240)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "oklch(0.45 0.02 240)" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => loginMutation.mutate({ email, password })}
              disabled={loginMutation.isPending || !email || !password}
              className="w-full py-2.5 rounded font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
              style={{
                background: "oklch(0.85 0.2 195 / 0.12)",
                border: "1px solid oklch(0.85 0.2 195 / 0.5)",
                color: "oklch(0.85 0.2 195)",
              }}
              onMouseEnter={(e) => { if (!loginMutation.isPending) { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px oklch(0.85 0.2 195 / 0.3)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.85 0.2 195 / 0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              {loginMutation.isPending ? "AUTENTICANDO..." : "INICIAR SESSÃO"}
            </button>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: "1px solid oklch(0.22 0.03 240)" }}>
            <p className="text-center font-mono text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
              SEM ACESSO?{" "}
              <button
                onClick={() => navigate("/register")}
                className="font-bold transition-colors"
                style={{ color: "oklch(0.65 0.32 0)" }}
              >
                REGISTRAR OPERADOR
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <Cpu className="w-3 h-3" style={{ color: "oklch(0.35 0.02 240)" }} />
          <p className="text-center font-mono text-xs" style={{ color: "oklch(0.35 0.02 240)" }}>
            BCRYPT · JWT · TF-IDF + NAIVE BAYES · CONTROLE DE ACESSO
          </p>
        </div>
      </div>
    </div>
  );
}
