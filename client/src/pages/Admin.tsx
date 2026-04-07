import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShieldAlert, Tag, Users } from "lucide-react";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono">Acesso restrito a administradores.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const cards = [
    { icon: Tag, label: "Categorias", desc: "Gerenciar categorias de incidentes", path: "/admin/categories", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
    { icon: Users, label: "Usuários", desc: "Gerenciar usuários do sistema", path: "/admin/users", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerenciamento do sistema</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ icon: Icon, label, desc, path, color }) => (
            <button key={path} onClick={() => navigate(path)} className="bg-card border border-border rounded-xl p-5 text-left hover:border-border/80 hover:bg-muted/20 transition-all group">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground font-mono text-sm mb-1">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
