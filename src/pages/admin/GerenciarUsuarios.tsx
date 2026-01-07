import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRole } from "@/hooks/useRole";
import { UserDialog } from "@/components/users/UserDialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppRole = Database["public"]["Enums"]["app_role"];

type ProfileWithRoles = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  roles: AppRole[];
};

const ROLES: AppRole[] = ["admin", "tesoureiro", "pastor", "lider", "user"];

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  tesoureiro: "Tesoureiro",
  pastor: "Pastor",
  lider: "Líder",
  user: "Usuário",
};

export default function GerenciarUsuarios() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [selectedUser, setSelectedUser] = useState<ProfileWithRoles | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ProfileWithRoles | null>(null);

  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading } = useAuth();
  const { isAdmin, isTesoureiro, isLoading: roleLoading } = useRole();

  const canManage = isAdmin || isTesoureiro;

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url
        `)
        .eq("church_id", profile.church_id);

      if (profilesError) throw profilesError;

      // Fetch user roles separately
      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (userRolesError) throw userRolesError;

      const rolesMap = new Map<string, AppRole[]>();
      userRolesData.forEach(ur => {
        if (!rolesMap.has(ur.user_id)) {
          rolesMap.set(ur.user_id, []);
        }
        rolesMap.get(ur.user_id)?.push(ur.role);
      });

      return profilesData.map(p => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        email: null, // Email will need auth.users access
        roles: rolesMap.get(p.id) || [],
      })) as ProfileWithRoles[];
    },
    enabled: !!user?.id && !!profile?.church_id,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!canManage) throw new Error("Você não tem permissão para alterar cargos.");

      // Remove existing roles for the user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      // Insert the new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Cargo do usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles", user?.id] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cargo: ${error.message}`);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, fullName, role }: { userId: string; fullName: string; role: AppRole }) => {
      if (!canManage) throw new Error("Você não tem permissão para editar usuários.");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);
      if (profileError) throw profileError;

      // Update role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!canManage) throw new Error("Você não tem permissão para remover usuários.");
      if (userId === user?.id) throw new Error("Você não pode remover a si mesmo.");

      // Remove user from church by setting church_id to null
      const { error } = await supabase
        .from("profiles")
        .update({ church_id: null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário removido da igreja com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao remover usuário: ${error.message}`);
    },
  });

  const handleEditUser = (profile: ProfileWithRoles) => {
    setSelectedUser(profile);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setDialogMode("add");
    setDialogOpen(true);
  };

  const handleDeleteUser = (profile: ProfileWithRoles) => {
    setUserToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDialogSubmit = async (data: { email: string; full_name: string; role: AppRole }) => {
    if (dialogMode === "edit" && selectedUser) {
      await updateProfileMutation.mutateAsync({
        userId: selectedUser.id,
        fullName: data.full_name,
        role: data.role,
      });
    } else {
      // For adding new users, we would need to implement an invitation system
      // For now, show a message
      toast.info("Sistema de convites ainda não implementado. Usuários devem se cadastrar e solicitar acesso.");
      setDialogOpen(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  if (authLoading || isLoading || roleLoading || profile === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile?.church_id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Nenhuma Igreja Associada</CardTitle>
            <CardDescription>Seu perfil não está associado a nenhuma igreja. Por favor, crie uma igreja primeiro.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <div>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>Visualize e gerencie os usuários do sistema.</CardDescription>
              </div>
            </div>
            {canManage && (
              <Button onClick={handleAddUser} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Convidar Usuário
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {profiles && profiles.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cargo Atual</TableHead>
                    <TableHead className="w-[200px]">Alterar Cargo</TableHead>
                    {canManage && <TableHead className="w-[80px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles?.map((profileItem) => (
                    <TableRow key={profileItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={profileItem.avatar_url || undefined} />
                            <AvatarFallback>
                              {getInitials(profileItem.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{profileItem.full_name || "Sem nome"}</p>
                            {profileItem.id === user?.id && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {profileItem.roles[0] ? ROLE_LABELS[profileItem.roles[0]] : "Sem cargo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={profileItem.roles[0] || "user"}
                          onValueChange={(role: AppRole) => updateUserRoleMutation.mutate({ userId: profileItem.id, role })}
                          disabled={updateUserRoleMutation.isPending || !canManage || profileItem.id === user?.id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(role => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                disabled={profileItem.id === user?.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(profileItem)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(profileItem)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          )}
          {!canManage && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Você não tem permissão para gerenciar usuários.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        user={selectedUser ? {
          id: selectedUser.id,
          full_name: selectedUser.full_name,
          email: selectedUser.email,
          role: selectedUser.roles[0] || "user",
        } : undefined}
        onSubmit={handleDialogSubmit}
        isLoading={updateProfileMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{userToDelete?.full_name}</strong> da igreja? 
              O usuário perderá acesso aos dados desta igreja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && removeUserMutation.mutate(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeUserMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
