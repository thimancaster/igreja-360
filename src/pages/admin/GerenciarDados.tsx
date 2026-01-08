import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Database, FileSpreadsheet, Tag, Building2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type DataType = 'transactions' | 'categories' | 'ministries' | 'all';

export default function GerenciarDados() {
  const { profile } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<DataType | null>(null);

  // Delete transactions
  const deleteTransactionsMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("church_id", profile.church_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Todas as transações foram excluídas!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir transações: " + error.message);
    },
  });

  // Delete categories
  const deleteCategoriesMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      // First, remove category references from transactions
      await supabase
        .from("transactions")
        .update({ category_id: null })
        .eq("church_id", profile.church_id);
      
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("church_id", profile.church_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Todas as categorias foram excluídas!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir categorias: " + error.message);
    },
  });

  // Delete ministries
  const deleteMinistriesMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      // First, remove ministry references from transactions
      await supabase
        .from("transactions")
        .update({ ministry_id: null })
        .eq("church_id", profile.church_id);
      
      const { error } = await supabase
        .from("ministries")
        .delete()
        .eq("church_id", profile.church_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Todos os ministérios foram excluídos!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir ministérios: " + error.message);
    },
  });

  // Delete all data
  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      // Delete in order to respect foreign keys
      // 1. Delete transactions first
      const { error: transError } = await supabase
        .from("transactions")
        .delete()
        .eq("church_id", profile.church_id);
      if (transError) throw transError;

      // 2. Delete sheet_uploads
      const { error: uploadsError } = await supabase
        .from("sheet_uploads")
        .delete()
        .eq("church_id", profile.church_id);
      if (uploadsError) throw uploadsError;

      // 3. Delete categories
      const { error: catError } = await supabase
        .from("categories")
        .delete()
        .eq("church_id", profile.church_id);
      if (catError) throw catError;

      // 4. Delete ministries
      const { error: minError } = await supabase
        .from("ministries")
        .delete()
        .eq("church_id", profile.church_id);
      if (minError) throw minError;

      // 5. Delete column_mappings
      const { error: mapError } = await supabase
        .from("column_mappings")
        .delete()
        .eq("church_id", profile.church_id);
      if (mapError) throw mapError;

      // 6. Delete notifications
      const { error: notifError } = await supabase
        .from("notifications")
        .delete()
        .eq("church_id", profile.church_id);
      if (notifError) throw notifError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Todos os dados da igreja foram excluídos!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir dados: " + error.message);
    },
  });

  const handleConfirmDelete = () => {
    switch (selectedAction) {
      case 'transactions':
        deleteTransactionsMutation.mutate();
        break;
      case 'categories':
        deleteCategoriesMutation.mutate();
        break;
      case 'ministries':
        deleteMinistriesMutation.mutate();
        break;
      case 'all':
        deleteAllDataMutation.mutate();
        break;
    }
    setSelectedAction(null);
  };

  const isPending = 
    deleteTransactionsMutation.isPending || 
    deleteCategoriesMutation.isPending || 
    deleteMinistriesMutation.isPending || 
    deleteAllDataMutation.isPending;

  if (roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Apenas administradores podem acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!profile?.church_id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Nenhuma Igreja Associada</CardTitle>
            <CardDescription>
              Você precisa estar associado a uma igreja para gerenciar dados.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Dados</h1>
        <p className="text-muted-foreground mt-1">
          Exclua ou limpe dados do banco de dados da sua igreja
        </p>
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            As ações abaixo são irreversíveis. Tenha certeza antes de executar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delete Transactions */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Excluir Todas as Transações</p>
                <p className="text-sm text-muted-foreground">
                  Remove todas as transações (receitas e despesas) da igreja.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isPending}
                  onClick={() => setSelectedAction('transactions')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todas as transações?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todas as transações (receitas e despesas) 
                    da sua igreja serão permanentemente excluídas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedAction(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleConfirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Separator />

          {/* Delete Categories */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Excluir Todas as Categorias</p>
                <p className="text-sm text-muted-foreground">
                  Remove todas as categorias. Transações existentes terão suas categorias removidas.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isPending}
                  onClick={() => setSelectedAction('categories')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todas as categorias?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todas as categorias serão excluídas e 
                    as transações existentes terão suas categorias removidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedAction(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleConfirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Separator />

          {/* Delete Ministries */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Excluir Todos os Ministérios</p>
                <p className="text-sm text-muted-foreground">
                  Remove todos os ministérios. Transações existentes terão seus ministérios removidos.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isPending}
                  onClick={() => setSelectedAction('ministries')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todos os ministérios?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todos os ministérios serão excluídos e 
                    as transações existentes terão seus ministérios removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedAction(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleConfirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Separator />

          {/* Delete All Data */}
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg bg-destructive/5">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Limpar Todo o Banco de Dados</p>
                <p className="text-sm text-muted-foreground">
                  Remove TODOS os dados: transações, categorias, ministérios, 
                  histórico de importações e mapeamentos.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isPending}
                  onClick={() => setSelectedAction('all')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Tudo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    ⚠️ Limpar TODO o banco de dados?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      <strong>Esta ação é IRREVERSÍVEL!</strong>
                    </p>
                    <p>
                      Todos os seguintes dados serão permanentemente excluídos:
                    </p>
                    <ul className="list-disc list-inside text-sm">
                      <li>Todas as transações (receitas e despesas)</li>
                      <li>Todas as categorias</li>
                      <li>Todos os ministérios</li>
                      <li>Histórico de importações</li>
                      <li>Mapeamentos de colunas</li>
                      <li>Notificações</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedAction(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleConfirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, LIMPAR TUDO
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {isPending && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>Excluindo dados...</span>
        </div>
      )}
    </div>
  );
}
