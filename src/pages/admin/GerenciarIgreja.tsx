import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type ChurchRow = Tables<'churches'>;
type ChurchUpdateData = Pick<ChurchRow, 'name' | 'cnpj' | 'address' | 'city' | 'state'>;

export default function GerenciarIgreja() {
  const { user, profile, loading: authLoading } = useAuth();
  const { isPrivileged, isLoading: roleLoading } = useRole();
  const queryClient = useQueryClient();

  const [churchData, setChurchData] = useState<ChurchUpdateData>({
    name: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
  });

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
    enabled: !!profile?.church_id && isPrivileged, // Only fetch if user is privileged and has a church
  });

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

  const handleChurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateChurchMutation.mutate(churchData);
  };

  if (authLoading || roleLoading || churchLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPrivileged) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você não tem permissão para gerenciar os dados da igreja.</CardDescription>
          </CardHeader>
        </Card>
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
            <Building2 className="h-6 w-6" />
            <div>
              <CardTitle>Gerenciar Igreja</CardTitle>
              <CardDescription>Gerencie as informações da sua igreja.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}