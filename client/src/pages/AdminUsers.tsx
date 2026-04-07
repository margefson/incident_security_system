import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, Users, ShieldCheck, User, Crown, Pencil, Trash2, KeyRound } from "lucide-react";

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
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Perfil do usuário atualizado com sucesso!");
      utils.admin.listUsers.invalidate();
      setRoleTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Dados do usuário atualizados!");
      utils.admin.listUsers.invalidate();
      setEditTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      utils.admin.listUsers.invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success('Senha resetada para "Security2026@"!');
      setResetTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setEditName(u.name ?? "");
    setEditEmail(u.email ?? "");
  };

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

  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;
  const userCount = users?.filter((u) => u.role === "user").length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Gerencie perfis, permissões e credenciais dos usuários do sistema.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-mono font-bold text-yellow-400">{adminCount}</p>
              <p className="text-xs text-muted-foreground font-mono">Admins</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-mono font-bold text-primary">{userCount}</p>
              <p className="text-xs text-muted-foreground font-mono">Usuários</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Usuário</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Perfil</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Método Login</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Último Acesso</th>
                  <th className="text-right px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-xs">
                      Carregando usuários...
                    </td>
                  </tr>
                ) : !users?.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-xs">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  (users as UserRow[]).map((u) => (
                    <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                            {u.role === "admin" ? (
                              <Crown className="w-3.5 h-3.5 text-yellow-400" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-primary" />
                            )}
                          </div>
                          <span className="font-mono text-sm text-foreground">
                            {u.name ?? "—"}
                            {u.id === currentUser?.id && (
                              <span className="ml-1 text-xs text-muted-foreground">(você)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{u.email ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "admin" ? (
                          <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 font-mono text-xs">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                            <User className="w-3 h-3 mr-1" /> Usuário
                          </Badge>
                        )}
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
                        <div className="flex items-center justify-end gap-1.5">
                          {u.id !== currentUser?.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(u)}
                                className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted/20"
                                title="Editar usuário"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetTarget(u)}
                                className="h-7 w-7 p-0 border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                                title="Resetar senha"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>
                              {u.role === "admin" ? (
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
                                  Promover
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTarget(u)}
                                className="h-7 w-7 p-0 border-red-400/30 text-red-400 hover:bg-red-400/10"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
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
        </div>

        <div className="bg-muted/20 border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-mono">
            <span className="text-primary font-semibold">Nota:</span>{" "}
            A senha padrão de reset é{" "}
            <span className="text-yellow-400 font-semibold">Security2026@</span> — oriente o usuário a alterá-la no primeiro acesso.
            A exclusão de um usuário remove permanentemente todos os seus incidentes e histórico.
          </p>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atualize os dados de <span className="font-semibold text-foreground">"{editTarget?.name}"</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-mono text-xs text-muted-foreground">Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-mono text-sm bg-muted/20 border-border"
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="font-mono text-sm bg-muted/20 border-border"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} className="font-mono">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!editTarget) return;
                updateUserMutation.mutate({ userId: editTarget.id, name: editName || undefined, email: editEmail || undefined });
              }}
              disabled={updateUserMutation.isPending}
              className="font-mono bg-primary hover:bg-primary/90"
            >
              {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              Resetar Senha
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              A senha de <span className="font-semibold text-foreground">"{resetTarget?.name}"</span> será redefinida para{" "}
              <span className="font-mono text-yellow-400 font-semibold">Security2026@</span>.
              O usuário deverá alterar a senha no próximo acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetTarget && resetPasswordMutation.mutate({ userId: resetTarget.id })}
              className="bg-blue-600 hover:bg-blue-700 font-mono"
            >
              {resetPasswordMutation.isPending ? "Resetando..." : "Confirmar Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Excluir Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>?
              Esta ação é <span className="text-red-400 font-semibold">irreversível</span> e removerá
              todos os incidentes e histórico deste usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteUserMutation.mutate({ userId: deleteTarget.id })}
              className="bg-red-600 hover:bg-red-700 font-mono"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir Permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change */}
      <AlertDialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground">
              {roleTarget?.newRole === "admin" ? "Promover a Administrador" : "Rebaixar para Usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {roleTarget?.newRole === "admin" ? (
                <>Promover <span className="font-semibold text-foreground">"{roleTarget?.user.name}"</span> a <span className="text-yellow-400 font-semibold">administrador</span>? Este usuário terá acesso completo ao painel admin.</>
              ) : (
                <>Rebaixar <span className="font-semibold text-foreground">"{roleTarget?.user.name}"</span> para <span className="text-green-400 font-semibold">usuário comum</span>? Este usuário perderá o acesso ao painel admin.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleTarget && updateRoleMutation.mutate({ userId: roleTarget.user.id, role: roleTarget.newRole })}
              className={roleTarget?.newRole === "admin" ? "bg-yellow-600 hover:bg-yellow-700 font-mono" : "bg-red-600 hover:bg-red-700 font-mono"}
            >
              {updateRoleMutation.isPending ? "Atualizando..." : roleTarget?.newRole === "admin" ? "Promover" : "Rebaixar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
