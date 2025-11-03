import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, User, Building2 } from "lucide-react";
import { Database, Tables, TablesUpdate } from "@/integrations/supabase/types";

// Definir tipos para as linhas das tabelas e para os dados de atualização
type ProfileRow = Tables<'profiles'>;
type ChurchRow = Tables<'churches'>;

type ProfileUpdateData = Pick<ProfileRow, 'full_name' | 'avatar_url'>;
type ChurchUpdateData = Pick<ChurchRow, 'name' | 'cnpj' | 'address' | 'city' | 'state'>;

export default function Configuracoes() {
  const { user, profile } = useAuth(); // Obter profile do AuthContext
  const { isLoading: roleLoading } = useRole(); // isPrivileged não é mais usado para gating de UI aqui
  const queryClient = useQueryClient();

  // Fetch church data
  const { data: church, isLoading: churchLoading } = useQuery({
    queryKey: ["church", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .single();
      
      if (error) throw error;
      return data as ChurchRow;
    },
    enabled: !!profile?.church_id && !!user?.id, // Habilitar se houver usuário e church_id
  });

  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    full_name: "",
    avatar_url: "",
  });

  const [churchData, setChurchData] = useState<ChurchUpdateData>({
    name: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
  });

  // Update profile data when loaded
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  // Update church data when loaded
  useEffect(() => {
    if (church) {
      setChurchData({
        name: church.name || "",
        cnpj: church.cnpj || "",
        address: church.address || "",
        city: church.city || "",
        state: church.state || "",
      });
    }
  }, [church]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    },
  });

  // Update church mutation
  const updateChurchMutation = useMutation({
    mutationFn: async (data: ChurchUpdateData) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      const { error } = await supabase
        .from("churches")
        .update(data)
        .eq("id", profile.church_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church", profile?.church_id] });
      toast.success("Dados da igreja atualizados com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar igreja: " + error.message);
    },
  });


  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleChurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateChurchMutation.mutate(churchData);
  };

  if (roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Configure suas preferências e dados do sistema</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList>
          <TabsTrigger value="perfil" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          {/* Removida a condição isPrivileged para a aba Igreja */}
          <TabsTrigger value="igreja" className="gap-2">
            <Building2 className="h-4 w-4" />
            Igreja
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, full_name: e.target.value })
                    }
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar_url">URL do Avatar</Label>
                  <Input
                    id="avatar_url"
                    value={profileData.avatar_url}
                    onChange={(e) =>
                      setProfileData({ ...profileData, avatar_url: e.target.value })
                    }
                    placeholder="https://exemplo.com/avatar.jpg"
                  />
                </div>

                <Separator />

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alterações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Removida a condição isPrivileged para o conteúdo da aba Igreja */}
        <TabsContent value="igreja">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Igreja</CardTitle>
              <CardDescription>
                Gerencie as informações da sua igreja
              </CardDescription>
            </CardHeader>
            <CardContent>
              {churchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <form onSubmit={handleChurchSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="church_name">Nome da Igreja</Label>
                    <Input
                      id="church_name"
                      value={churchData.name}
                      onChange={(e) =>
                        setChurchData({ ...churchData, name: e.target.value })
                      }
                      placeholder="Nome da igreja"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={churchData.cnpj}
                      onChange={(e) =>
                        setChurchData({ ...churchData, cnpj: e.target.value })
                      }
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={churchData.address}
                      onChange={(e) =>
                        setChurchData({ ...churchData, address: e.target.value })
                      }
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={churchData.city}
                        onChange={(e) =>
                          setChurchData({ ...churchData, city: e.target.value })
                        }
                        placeholder="Cidade"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={churchData.state}
                        onChange={(e) =>
                          setChurchData({ ...churchData, state: e.target.value })
                        }
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <Separator />

                  <Button
                    type="submit"
                    disabled={updateChurchMutation.isPending}
                  >
                    {updateChurchMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Alterações
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}