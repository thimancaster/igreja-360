import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Pencil, Trash2, MoreHorizontal, Building2, Search, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRole } from "@/hooks/useRole";
import { AssignUserDialog } from "@/components/users/AssignUserDialog";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";

type AppRole = Database["public"]["Enums"]["app_role"];

type ProfileWithDetails = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  church_id: string | null;
  church_name: string | null;
  roles: AppRole[];
};

type Church = {
  id: string;
  name: string;
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ProfileWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "church">("church");

  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading } = useAuth();
  const { isAdmin, canManageUsers, isLoading: roleLoading } = useRole();

  // Apenas admin pode gerenciar usuários
  const canManage = canManageUsers;

  // Fetch all churches for admin
  const { data: churches } = useQuery({
    queryKey: ["all-churches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("churches")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Church[];
    },
    enabled: isAdmin,
  });

  // Fetch all profiles (for admin) or church profiles (for tesoureiro)
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles", isAdmin, activeTab, profile?.church_id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          church_id
        `);

      // If not admin or viewing church tab, filter by church
      if (!isAdmin || activeTab === "church") {
        if (!profile?.church_id) return [];
        query = query.eq("church_id", profile.church_id);
      }

      const { data: profilesData, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      // Fetch churches for names
      const { data: churchesData } = await supabase
        .from("churches")
        .select("id, name");

      const churchMap = new Map<string, string>();
      churchesData?.forEach(c => churchMap.set(c.id, c.name));

      // Fetch user roles
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
        church_id: p.church_id,
        church_name: p.church_id ? churchMap.get(p.church_id) || null : null,
        roles: rolesMap.get(p.id) || [],
      })) as ProfileWithDetails[];
    },
    enabled: !!user?.id && (!!profile?.church_id || isAdmin),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, fullName, role, churchId }: { userId: string; fullName: string; role: AppRole; churchId: string | null }) => {
      if (!canManage) throw new Error("Você não tem permissão para editar usuários.");

      // Update profile (name and church)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, church_id: churchId })
        .eq("id", userId);
      if (profileError) throw profileError;

      // Update role - delete existing and insert new
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

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!canManage) throw new Error("Você não tem permissão para alterar cargos.");

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
      toast.success("Cargo do usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles", user?.id] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cargo: ${error.message}`);
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

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, fullName, role, churchId }: { email: string; fullName: string; role: AppRole; churchId: string }) => {
      if (!canManage) throw new Error("Você não tem permissão para convidar usuários.");

      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, fullName, role, churchId },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Convite enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setInviteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao convidar usuário: ${error.message}`);
    },
  });

  const handleEditUser = (profileItem: ProfileWithDetails) => {
    setSelectedUser(profileItem);
    setDialogOpen(true);
  };

  const handleDeleteUser = (profileItem: ProfileWithDetails) => {
    setUserToDelete(profileItem);
    setDeleteDialogOpen(true);
  };

  const handleDialogSubmit = async (data: { userId: string; fullName: string; role: AppRole; churchId: string | null }) => {
    await updateUserMutation.mutateAsync(data);
  };

  const handleInviteSubmit = async (data: { email: string; fullName: string; role: AppRole; churchId: string }) => {
    await inviteUserMutation.mutateAsync(data);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  const filteredProfiles = profiles?.filter(p => 
    !searchTerm || 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.church_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || isLoading || roleLoading || profile === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile?.church_id && !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Nenhuma Igreja Associada</CardTitle>
            <CardDescription>Seu perfil não está associado a nenhuma igreja.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 space-y-6 p-6"
    >
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <div>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  {isAdmin 
                    ? "Visualize e gerencie todos os usuários do sistema." 
                    : "Visualize e gerencie os usuários da sua igreja."}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {canManage && (
                <Button onClick={() => setInviteDialogOpen(true)} className="shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convidar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "church")} className="mb-4">
              <TabsList>
                <TabsTrigger value="church">Minha Igreja</TabsTrigger>
                <TabsTrigger value="all">Todos os Usuários</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {filteredProfiles && filteredProfiles.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    {(isAdmin && activeTab === "all") && <TableHead>Igreja</TableHead>}
                    <TableHead>Cargo Atual</TableHead>
                    <TableHead className="w-[200px]">Alterar Cargo</TableHead>
                    {canManage && <TableHead className="w-[80px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profileItem) => (
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
                      {(isAdmin && activeTab === "all") && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{profileItem.church_name || "Sem igreja"}</span>
                          </div>
                        </TableCell>
                      )}
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
                                Remover da Igreja
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

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        churches={churches || []}
        defaultChurchId={profile?.church_id || null}
        onSubmit={handleInviteSubmit}
        isLoading={inviteUserMutation.isPending}
        isAdmin={isAdmin}
      />

      {/* Edit User Dialog */}
      <AssignUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        churches={churches || []}
        onSubmit={handleDialogSubmit}
        isLoading={updateUserMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário da igreja?</AlertDialogTitle>
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
    </motion.div>
  );
}
