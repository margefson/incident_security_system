import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      toast.success("Login realizado com sucesso!");
      // Invalidar cache do auth.me para forçar re-fetch com o novo cookie JWT
      await utils.auth.me.invalidate();
      // Redirecionar para o dashboard com full page reload para garantir cookie
      window.location.href = "/dashboard";
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Incident Security System</h1>
          <p className="text-muted-foreground text-sm mt-1">Plataforma de Gerenciamento de Incidentes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-foreground mb-6">Acesso ao Sistema</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-9 bg-input border-border" autoComplete="email" />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-sm text-muted-foreground">Senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-9 pr-9 bg-input border-border" autoComplete="current-password" onKeyDown={e => e.key === "Enter" && loginMutation.mutate({ email, password })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={() => loginMutation.mutate({ email, password })} disabled={loginMutation.isPending || !email || !password}>
              {loginMutation.isPending ? "Autenticando..." : "Entrar"}
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <button onClick={() => navigate("/register")} className="text-primary hover:underline font-medium">Criar conta</button>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-center text-xs text-muted-foreground mb-2">Ou acesse via OAuth institucional</p>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = getLoginUrl()}>
              Entrar com OAuth
            </Button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          ICOMP 2026.1 · Segurança da Informação · Grupo ISS
        </p>
      </div>
    </div>
  );
}
