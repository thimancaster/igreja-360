import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { User, Building2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatCNPJ, validateCNPJ } from "@/lib/cnpjUtils";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";

type ProfileRow = Tables<'profiles'>;
type ChurchRow = Tables<'churches'>;

type ProfileUpdateData = Pick<ProfileRow, 'full_name' | 'avatar_url'>;
type ChurchUpdateData = {
  name: string;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
};

export default function Configuracoes() {
  const { user, profile } = useAuth();
  const { isAdmin, isTesoureiro, isLoading: roleLoading } = useRole(); // Usar isAdmin e isTesoureiro
  const queryClient = useQueryClient();

  // Fetch church data - usando apenas profile.church_id (fonte única de verdade)
  const { data: church, isLoading: churchLoading } = useQuery({
    queryKey: ["church", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;
      
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching church:", error);
        return null;
      }
      
      return data as ChurchRow;
    },
    enabled: !!profile?.church_id,
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

  const [cnpjError, setCnpjError] = useState<string | null>(null);

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
      // Usar church.id se disponível
      const churchId = church?.id || profile?.church_id;
      if (!churchId) throw new Error("Igreja não encontrada");
      
      const { error } = await supabase
        .from("churches")
        .update(data)
        .eq("id", churchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church"] });
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

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setChurchData({ ...churchData, cnpj: formatted });
    
    // Validar quando preenchido
    if (formatted && !validateCNPJ(formatted)) {
      setCnpjError("CNPJ inválido. Verifique os dígitos.");
    } else {
      setCnpjError(null);
    }
  };

  const handleChurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar CNPJ antes de submeter
    if (churchData.cnpj && !validateCNPJ(churchData.cnpj)) {
      toast.error("CNPJ inválido. Corrija antes de salvar.");
      return;
    }
    
    // Transform empty strings to null to avoid unique constraint issues
    const cleanedData: ChurchUpdateData = {
      name: churchData.name,
      cnpj: churchData.cnpj?.trim() === "" ? null : churchData.cnpj,
      address: churchData.address?.trim() === "" ? null : churchData.address,
      city: churchData.city?.trim() === "" ? null : churchData.city,
      state: churchData.state?.trim() === "" ? null : churchData.state,
    };
    updateChurchMutation.mutate(cleanedData);
  };

  const canEditChurch = isAdmin || isTesoureiro; // Apenas admin e tesoureiro podem editar

  if (roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
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
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Configurações</h1>
        <p className="text-muted-foreground mt-1">Configure suas preferências e dados do sistema</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList>
          <TabsTrigger value="perfil" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
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
                    <LoadingSpinner size="sm" className="mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

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
                  <LoadingSpinner size="md" />
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
                      disabled={!canEditChurch} // Desabilitar se não puder editar
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                    <Input
                      id="cnpj"
                      value={churchData.cnpj || ""}
                      onChange={(e) => handleCNPJChange(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      disabled={!canEditChurch}
                      className={cnpjError ? "border-destructive" : ""}
                    />
                    {cnpjError && (
                      <p className="text-xs text-destructive">{cnpjError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco se não possuir CNPJ
                    </p>
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
                      disabled={!canEditChurch} // Desabilitar se não puder editar
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
                        disabled={!canEditChurch} // Desabilitar se não puder editar
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
                        disabled={!canEditChurch} // Desabilitar se não puder editar
                      />
                    </div>
                  </div>

                  <Separator />

                  <Button
                    type="submit"
                    disabled={updateChurchMutation.isPending || !canEditChurch} // Desabilitar se não puder editar
                  >
                    {updateChurchMutation.isPending && (
                      <LoadingSpinner size="sm" className="mr-2" />
                    )}
                    Salvar Alterações
                  </Button>
                  {!canEditChurch && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Você não tem permissão para editar os dados da igreja.
                    </p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}