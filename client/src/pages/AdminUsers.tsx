import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, Users, ShieldCheck, User, Crown } from "lucide-react";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  loginMethod: string;
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date;
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const [roleTarget, setRoleTarget] = useState<{ user: UserRow; newRole: "admin" | "user" } | null>(null);

  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Perfil do usuário atualizado com sucesso!");
      utils.admin.listUsers.invalidate();
      setRoleTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">Acesso restrito a administradores.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {users?.length ?? 0} usuário(s) cadastrado(s) no sistema
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total",
              value: users?.length ?? 0,
              icon: Users,
              color: "text-blue-400",
              bg: "bg-blue-400/10 border-blue-400/20",
            },
            {
              label: "Admins",
              value: users?.filter((u) => u.role === "admin").length ?? 0,
              icon: Crown,
              color: "text-yellow-400",
              bg: "bg-yellow-400/10 border-yellow-400/20",
            },
            {
              label: "Usuários",
              value: users?.filter((u) => u.role === "user").length ?? 0,
              icon: User,
              color: "text-green-400",
              bg: "bg-green-400/10 border-green-400/20",
            },
            {
              label: "Ativos",
              value: users?.filter((u) => u.isActive).length ?? 0,
              icon: ShieldCheck,
              color: "text-primary",
              bg: "bg-primary/10 border-primary/20",
            },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Usuário</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Login</th>
                <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Último acesso</th>
                <th className="text-right px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-sm">
                    Carregando usuários...
                  </td>
                </tr>
              ) : !users || users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              ) : (
                (users as UserRow[]).map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary font-mono">
                            {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground font-mono text-sm">{u.name}</p>
                          {u.id === currentUser?.id && (
                            <span className="text-[10px] text-primary font-mono">(você)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground font-mono">{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          u.role === "admin"
                            ? "border-yellow-400/40 text-yellow-400 bg-yellow-400/10 font-mono text-xs"
                            : "border-green-400/40 text-green-400 bg-green-400/10 font-mono text-xs"
                        }
                      >
                        {u.role === "admin" ? (
                          <><Crown className="w-3 h-3 mr-1" /> Admin</>
                        ) : (
                          <><User className="w-3 h-3 mr-1" /> Usuário</>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground capitalize">{u.loginMethod}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {u.lastSignedIn
                          ? new Date(u.lastSignedIn).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {u.id !== currentUser?.id ? (
                          u.role === "admin" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRoleTarget({ user: u, newRole: "user" })}
                              className="h-7 text-xs font-mono border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                            >
                              Rebaixar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRoleTarget({ user: u, newRole: "admin" })}
                              className="h-7 text-xs font-mono border-primary/30 text-primary hover:bg-primary/10"
                            >
                              Promover Admin
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-mono">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info box */}
        <div className="bg-muted/20 border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-mono">
            <span className="text-primary font-semibold">Nota:</span>{" "}
            Administradores têm acesso completo ao painel admin, incluindo reclassificação de incidentes,
            gestão de categorias e configurações do motor ML. Promova usuários com cautela.
          </p>
        </div>
      </div>

      {/* Role Change Confirmation */}
      <AlertDialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground">
              {roleTarget?.newRole === "admin" ? "Promover a Administrador" : "Rebaixar para Usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {roleTarget?.newRole === "admin" ? (
                <>
                  Tem certeza que deseja promover{" "}
                  <span className="font-semibold text-foreground">"{roleTarget?.user.name}"</span> a{" "}
                  <span className="text-yellow-400 font-semibold">administrador</span>?
                  Este usuário terá acesso completo ao painel admin.
                </>
              ) : (
                <>
                  Tem certeza que deseja rebaixar{" "}
                  <span className="font-semibold text-foreground">"{roleTarget?.user.name}"</span> para{" "}
                  <span className="text-green-400 font-semibold">usuário comum</span>?
                  Este usuário perderá o acesso ao painel admin.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                roleTarget &&
                updateRoleMutation.mutate({
                  userId: roleTarget.user.id,
                  role: roleTarget.newRole,
                })
              }
              className={
                roleTarget?.newRole === "admin"
                  ? "bg-yellow-600 hover:bg-yellow-700 font-mono"
                  : "bg-red-600 hover:bg-red-700 font-mono"
              }
            >
              {updateRoleMutation.isPending
                ? "Atualizando..."
                : roleTarget?.newRole === "admin"
                ? "Promover"
                : "Rebaixar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
