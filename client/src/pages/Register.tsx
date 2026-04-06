import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, Lock, Mail, Eye, EyeOff, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Operador registrado. Faça login para continuar.");
      navigate("/login");
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

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColors = ["oklch(0.22 0.03 240)", "oklch(0.6 0.28 20)", "oklch(0.9 0.25 100)", "oklch(0.75 0.25 145)"];
  const strengthLabels = ["", "FRACA", "MÉDIA", "FORTE"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "oklch(0.06 0.01 240)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(oklch(0.65 0.32 0 / 0.025) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.32 0 / 0.025) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: "oklch(0.65 0.32 0 / 0.04)", filter: "blur(80px)" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded mb-4 relative" style={{ background: "oklch(0.65 0.32 0 / 0.08)", border: "1px solid oklch(0.65 0.32 0 / 0.3)" }}>
            <Shield className="w-8 h-8 neon-text-pink" />
            <span className="absolute top-0 left-0 w-3 h-3" style={{ borderTop: "1px solid oklch(0.65 0.32 0 / 0.7)", borderLeft: "1px solid oklch(0.65 0.32 0 / 0.7)" }} />
            <span className="absolute bottom-0 right-0 w-3 h-3" style={{ borderBottom: "1px solid oklch(0.65 0.32 0 / 0.7)", borderRight: "1px solid oklch(0.65 0.32 0 / 0.7)" }} />
          </div>
          <h1 className="text-2xl font-bold font-mono neon-text-pink tracking-wider">NOVO<span className="neon-text-cyan">_OPERADOR</span></h1>
          <p className="text-sm mt-1 font-mono" style={{ color: "oklch(0.45 0.02 240)" }}>REGISTRO DE ACESSO AO SISTEMA</p>
        </div>

        {/* Card */}
        <div className="relative p-6 rounded" style={{ background: "oklch(0.09 0.012 240)", border: "1px solid oklch(0.22 0.03 240)" }}>
          <span className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: "1px solid oklch(0.65 0.32 0 / 0.5)", borderLeft: "1px solid oklch(0.65 0.32 0 / 0.5)" }} />
          <span className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: "1px solid oklch(0.65 0.32 0 / 0.5)", borderRight: "1px solid oklch(0.65 0.32 0 / 0.5)" }} />

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block font-mono text-xs mb-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>NOME DO OPERADOR</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.02 240)" }} />
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "oklch(0.65 0.32 0 / 0.6)"; e.target.style.boxShadow = "0 0 0 1px oklch(0.65 0.32 0 / 0.2), 0 0 12px oklch(0.65 0.32 0 / 0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "oklch(0.22 0.03 240)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block font-mono text-xs mb-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>IDENTIFICADOR [EMAIL]</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.02 240)" }} />
                <input
                  type="email"
                  placeholder="usuario@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "oklch(0.65 0.32 0 / 0.6)"; e.target.style.boxShadow = "0 0 0 1px oklch(0.65 0.32 0 / 0.2), 0 0 12px oklch(0.65 0.32 0 / 0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "oklch(0.22 0.03 240)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-mono text-xs mb-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>CREDENCIAL [SENHA]</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.02 240)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  onFocus={(e) => { e.target.style.borderColor = "oklch(0.65 0.32 0 / 0.6)"; e.target.style.boxShadow = "0 0 0 1px oklch(0.65 0.32 0 / 0.2), 0 0 12px oklch(0.65 0.32 0 / 0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "oklch(0.22 0.03 240)"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.02 240)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((level) => (
                      <div key={level} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: level <= passwordStrength ? strengthColors[passwordStrength] : "oklch(0.22 0.03 240)" }} />
                    ))}
                  </div>
                  <span className="font-mono text-xs" style={{ color: strengthColors[passwordStrength] }}>
                    FORÇA: {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            {/* Security note */}
            <div className="p-3 rounded" style={{ background: "oklch(0.85 0.2 195 / 0.05)", border: "1px solid oklch(0.85 0.2 195 / 0.15)" }}>
              <p className="font-mono text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>
                🔒 Senha protegida com <span className="neon-text-cyan">bcrypt (salt=12)</span>. Credenciais nunca armazenadas em texto plano.
              </p>
            </div>

            {/* Submit */}
            <button
              onClick={() => registerMutation.mutate({ name, email, password })}
              disabled={registerMutation.isPending || !name || !email || !password}
              className="w-full py-2.5 rounded font-mono text-sm font-bold tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
              style={{ background: "oklch(0.65 0.32 0 / 0.12)", border: "1px solid oklch(0.65 0.32 0 / 0.5)", color: "oklch(0.65 0.32 0)" }}
              onMouseEnter={(e) => { if (!registerMutation.isPending) { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.32 0 / 0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px oklch(0.65 0.32 0 / 0.3)"; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.32 0 / 0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              {registerMutation.isPending ? "REGISTRANDO..." : "CRIAR ACESSO"}
            </button>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: "1px solid oklch(0.22 0.03 240)" }}>
            <button onClick={() => navigate("/login")} className="flex items-center gap-2 mx-auto font-mono text-xs transition-colors" style={{ color: "oklch(0.45 0.02 240)" }}>
              <ArrowLeft className="w-3 h-3" />
              VOLTAR AO LOGIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
