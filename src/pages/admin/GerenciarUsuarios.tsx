import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRole } from "@/hooks/useRole"; // Importar useRole

type AppRole = Database["public"]["Enums"]["app_role"];

type ProfileWithRoles = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  roles: AppRole[];
};

const ROLES: AppRole[] = ["admin", "tesoureiro", "pastor", "lider"];

export default function GerenciarUsuarios() {
  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading } = useAuth(); // Obter profile
  const { isAdmin, isLoading: roleLoading } = useRole(); // Usar isAdmin

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles", profile?.church_id], // Adicionar church_id ao queryKey
    queryFn: async () => {
      if (!profile?.church_id) return []; // Retornar vazio se não houver church_id
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          user:users(email)
        `)
        .eq("church_id", profile.church_id); // Filtrar perfis pela church_id

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
        // @ts-ignore - Supabase types for joined tables can be tricky
        email: p.user?.email || null,
        roles: rolesMap.get(p.id) || [],
      })) as ProfileWithRoles[];
    },
    enabled: !!user?.id && !!profile?.church_id, // Habilitar query apenas se user e church_id existirem
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!isAdmin) throw new Error("Você não tem permissão para alterar cargos.");

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

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  if (authLoading || isLoading || roleLoading || profile === undefined) { // Adicionar roleLoading e profile === undefined
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
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            <div>
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>Visualize e edite os cargos dos usuários do sistema.</CardDescription>
            </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles?.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback>
                              {profile.full_name ? getInitials(profile.full_name) : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{profile.full_name}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {profile.roles[0] || "Nenhum"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={profile.roles[0]}
                          onValueChange={(role: AppRole) => updateUserRoleMutation.mutate({ userId: profile.id, role })}
                          disabled={updateUserRoleMutation.isPending || !isAdmin} // Desabilitar se não for admin
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(role => (
                              <SelectItem key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum usuário encontrado.</p>
            </div>
          )}
          {!isAdmin && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Você não tem permissão para alterar cargos de usuários.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}