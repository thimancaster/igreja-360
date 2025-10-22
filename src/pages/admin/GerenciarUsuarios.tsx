import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type ProfileWithRoles = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  user_roles: { role: string }[];
};

const ROLES = ["admin", "tesoureiro", "pastor", "lider"];

export default function GerenciarUsuarios() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          user:users(email),
          user_roles(role)
        `);

      if (error) throw error;

      // Manually structure the data to match what the component expects
      return data.map(p => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        // @ts-ignore
        email: p.user?.email,
        // @ts-ignore
        user_roles: p.user_roles,
      })) as ProfileWithRoles[];
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // This is a simple implementation: remove all roles and add the new one.
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
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cargo: ${error.message}`);
    },
  });

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

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
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
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
                          {profile.user_roles[0]?.role || "Nenhum"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={profile.user_roles[0]?.role}
                          onValueChange={(role) => updateUserRoleMutation.mutate({ userId: profile.id, role })}
                          disabled={updateUserRoleMutation.isPending}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}