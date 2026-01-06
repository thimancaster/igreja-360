// src/pages/admin/GerenciarIgreja.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { formatCNPJ, validateCNPJ } from '@/lib/cnpjUtils';

type Church = Tables<'churches'>;
type ChurchUpdateData = TablesUpdate<'churches'>;

const GerenciarIgreja = () => {
  const { profile } = useAuth();
  const { isAdmin, isLoading: isRoleLoading } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [churchData, setChurchData] = useState<Church | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  const { data: church, isLoading: isLoadingChurch } = useQuery({
    queryKey: ['church-details', profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .eq('id', profile.church_id)
        .maybeSingle();
      
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!profile?.church_id,
  });

  useEffect(() => {
    if (church) {
      setChurchData(church);
    }
  }, [church]);

  const updateChurchMutation = useMutation({
    mutationFn: async (updatedData: ChurchUpdateData) => {
      if (!churchData?.id) throw new Error('ID da Igreja não encontrado');

      const { error } = await supabase
        .from('churches')
        .update(updatedData)
        .eq('id', churchData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Informações da igreja atualizadas.' });
      queryClient.invalidateQueries({ queryKey: ['church-details', profile?.church_id] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const handleCNPJChange = (value: string) => {
    if (!churchData) return;
    const formatted = formatCNPJ(value);
    setChurchData({ ...churchData, cnpj: formatted });
    
    if (formatted && !validateCNPJ(formatted)) {
      setCnpjError("CNPJ inválido. Verifique os dígitos.");
    } else {
      setCnpjError(null);
    }
  };

  const handleChurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchData) return;

    // Validar CNPJ antes de submeter
    if (churchData.cnpj && !validateCNPJ(churchData.cnpj)) {
      toast({ title: 'Erro', description: 'CNPJ inválido. Corrija antes de salvar.', variant: 'destructive' });
      return;
    }

    const cleanedData: ChurchUpdateData = {
      name: churchData.name,
      cnpj: churchData.cnpj?.trim() === "" ? null : churchData.cnpj,
      address: churchData.address?.trim() === "" ? null : churchData.address,
      city: churchData.city?.trim() === "" ? null : churchData.city,
      state: churchData.state?.trim() === "" ? null : churchData.state,
    };
    updateChurchMutation.mutate(cleanedData);
  };

  if (isLoadingChurch || isRoleLoading) {
    return <div className="flex h-full items-center justify-center p-6"><LoadingSpinner size="lg" /></div>;
  }

  if (!isAdmin && !profile?.church_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Nenhuma Igreja Associada</h2>
        <p className="text-muted-foreground text-center">
          Seu perfil não está associado a nenhuma igreja. Por favor, crie uma igreja primeiro.
        </p>
      </div>
    );
  }

  if (!churchData && !isAdmin) {
     return <div>Carregando dados da igreja...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Igreja</h1>

      {isAdmin && !churchData && (
         <Alert variant="default" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Modo Administrador: Você pode gerenciar todas as igrejas. (Funcionalidade de listar/selecionar todas as igrejas ainda em desenvolvimento).
              Para criar uma nova igreja, use a página <a href="/create-church" className="underline">Criar Igreja</a>.
            </AlertDescription>
         </Alert>
      )}

      {churchData && (
        <Card>
          <CardHeader>
            <CardTitle>Informações da Igreja: {churchData.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChurchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Igreja</Label>
                  <Input
                    id="name"
                    value={churchData.name || ''}
                    onChange={(e) => setChurchData({ ...churchData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                  <Input
                    id="cnpj"
                    value={churchData.cnpj || ''}
                    onChange={(e) => handleCNPJChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className={cnpjError ? "border-destructive" : ""}
                  />
                  {cnpjError && (
                    <p className="text-xs text-destructive mt-1">{cnpjError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe em branco se não possuir CNPJ
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={updateChurchMutation.isPending}>
                {updateChurchMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GerenciarIgreja;
