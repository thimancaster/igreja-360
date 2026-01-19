import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Database, FileSpreadsheet, Tag, Building2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { SelectiveDeleteSection } from "@/components/admin/SelectiveDeleteSection";
import { exportToExcel } from "@/utils/exportHelpers";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";

type DataType = 'transactions' | 'categories' | 'ministries' | 'all';

export default function GerenciarDados() {
  const { user, profile } = useAuth();
  const { canDeleteData, isLoading: roleLoading } = useRole();
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<DataType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch church name for confirmation
  const { data: church } = useQuery({
    queryKey: ["church", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;
      const { data, error } = await supabase
        .from("churches")
        .select("name")
        .eq("id", profile.church_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });

  // Fetch data for backup export
  const fetchDataForBackup = async (type: DataType) => {
    if (!profile?.church_id) return null;

    const data: Record<string, unknown[]> = {};

    if (type === 'transactions' || type === 'all') {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*, categories(name), ministries(name)")
        .eq("church_id", profile.church_id);
      data.transactions = transactions || [];
    }

    if (type === 'categories' || type === 'all') {
      const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .eq("church_id", profile.church_id);
      data.categories = categories || [];
    }

    if (type === 'ministries' || type === 'all') {
      const { data: ministries } = await supabase
        .from("ministries")
        .select("*")
        .eq("church_id", profile.church_id);
      data.ministries = ministries || [];
    }

    return data;
  };

  // Log audit action
  const logAuditAction = async (action: string, entityType: string, entityCount: number) => {
    if (!profile?.church_id || !user?.id) return;

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase.from("audit_logs").insert({
      church_id: profile.church_id,
      user_id: user.id,
      user_name: userProfile?.full_name || user.email || "Desconhecido",
      action,
      entity_type: entityType,
      entity_count: entityCount,
    });
  };

  // Delete transactions
  const deleteTransactionsMutation = useMutation({
    mutationFn: async (exportBackup: boolean) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      // Count transactions before deletion
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      if (exportBackup) {
        const data = await fetchDataForBackup('transactions');
        if (data?.transactions && (data.transactions as unknown[]).length > 0) {
          await exportToExcel(data.transactions as Record<string, unknown>[], `backup_transacoes_${new Date().toISOString().split('T')[0]}`, "Transações");
        }
      }
      
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("church_id", profile.church_id);
      
      if (error) throw error;

      // Log audit
      await logAuditAction("DELETE_TRANSACTIONS", "transactions", count || 0);

      return count || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(`${count} transação(ões) excluída(s)!`);
    },
    onError: (error) => {
      toast.error("Erro ao excluir transações: " + error.message);
    },
  });

  // Delete categories
  const deleteCategoriesMutation = useMutation({
    mutationFn: async (exportBackup: boolean) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      const { count } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      if (exportBackup) {
        const data = await fetchDataForBackup('categories');
        if (data?.categories && (data.categories as unknown[]).length > 0) {
          await exportToExcel(data.categories as Record<string, unknown>[], `backup_categorias_${new Date().toISOString().split('T')[0]}`, "Categorias");
        }
      }
      
      await supabase
        .from("transactions")
        .update({ category_id: null })
        .eq("church_id", profile.church_id);
      
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("church_id", profile.church_id);
      
      if (error) throw error;

      await logAuditAction("DELETE_CATEGORIES", "categories", count || 0);

      return count || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(`${count} categoria(s) excluída(s)!`);
    },
    onError: (error) => {
      toast.error("Erro ao excluir categorias: " + error.message);
    },
  });

  // Delete ministries
  const deleteMinistriesMutation = useMutation({
    mutationFn: async (exportBackup: boolean) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      const { count } = await supabase
        .from("ministries")
        .select("*", { count: "exact", head: true })
        .eq("church_id", profile.church_id);

      if (exportBackup) {
        const data = await fetchDataForBackup('ministries');
        if (data?.ministries && (data.ministries as unknown[]).length > 0) {
          await exportToExcel(data.ministries as Record<string, unknown>[], `backup_ministerios_${new Date().toISOString().split('T')[0]}`, "Ministérios");
        }
      }
      
      await supabase
        .from("transactions")
        .update({ ministry_id: null })
        .eq("church_id", profile.church_id);
      
      const { error } = await supabase
        .from("ministries")
        .delete()
        .eq("church_id", profile.church_id);
      
      if (error) throw error;

      await logAuditAction("DELETE_MINISTRIES", "ministries", count || 0);

      return count || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(`${count} ministério(s) excluído(s)!`);
    },
    onError: (error) => {
      toast.error("Erro ao excluir ministérios: " + error.message);
    },
  });

  // Delete all data
  const deleteAllDataMutation = useMutation({
    mutationFn: async (exportBackup: boolean) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      if (exportBackup) {
        const data = await fetchDataForBackup('all');
        if (data) {
          const allData = [
            ...(data.transactions as Record<string, unknown>[] || []).map(t => ({ ...t, _tipo: "Transação" })),
            ...(data.categories as Record<string, unknown>[] || []).map(c => ({ ...c, _tipo: "Categoria" })),
            ...(data.ministries as Record<string, unknown>[] || []).map(m => ({ ...m, _tipo: "Ministério" })),
          ];
          if (allData.length > 0) {
            await exportToExcel(allData, `backup_completo_${new Date().toISOString().split('T')[0]}`, "Backup Completo");
          }
        }
      }
      
      // Delete in order to respect foreign keys
      const { error: transError } = await supabase
        .from("transactions")
        .delete()
        .eq("church_id", profile.church_id);
      if (transError) throw transError;

      const { error: uploadsError } = await supabase
        .from("sheet_uploads")
        .delete()
        .eq("church_id", profile.church_id);
      if (uploadsError) throw uploadsError;

      const { error: catError } = await supabase
        .from("categories")
        .delete()
        .eq("church_id", profile.church_id);
      if (catError) throw catError;

      const { error: minError } = await supabase
        .from("ministries")
        .delete()
        .eq("church_id", profile.church_id);
      if (minError) throw minError;

      const { error: mapError } = await supabase
        .from("column_mappings")
        .delete()
        .eq("church_id", profile.church_id);
      if (mapError) throw mapError;

      const { error: notifError } = await supabase
        .from("notifications")
        .delete()
        .eq("church_id", profile.church_id);
      if (notifError) throw notifError;

      await logAuditAction("DELETE_ALL", "all", 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Todos os dados da igreja foram excluídos!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir dados: " + error.message);
    },
  });

  const handleOpenDialog = (type: DataType) => {
    setSelectedAction(type);
    setDialogOpen(true);
  };

  const handleConfirmDelete = (exportBackup: boolean) => {
    switch (selectedAction) {
      case 'transactions':
        deleteTransactionsMutation.mutate(exportBackup);
        break;
      case 'categories':
        deleteCategoriesMutation.mutate(exportBackup);
        break;
      case 'ministries':
        deleteMinistriesMutation.mutate(exportBackup);
        break;
      case 'all':
        deleteAllDataMutation.mutate(exportBackup);
        break;
    }
    setDialogOpen(false);
    setSelectedAction(null);
  };

  const isPending = 
    deleteTransactionsMutation.isPending || 
    deleteCategoriesMutation.isPending || 
    deleteMinistriesMutation.isPending || 
    deleteAllDataMutation.isPending;

  const getActionLabel = (type: DataType | null) => {
    switch (type) {
      case 'transactions': return "excluir todas as transações";
      case 'categories': return "excluir todas as categorias";
      case 'ministries': return "excluir todos os ministérios";
      case 'all': return "limpar TODO o banco de dados";
      default: return "";
    }
  };

  if (roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!canDeleteData) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Apenas administradores e tesoureiros podem acessar esta página.
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
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Gerenciar Dados</h1>
        <p className="text-muted-foreground mt-1">
          Exclua ou limpe dados do banco de dados da sua igreja
        </p>
      </div>

      {/* Selective Delete Section */}
      <SelectiveDeleteSection />

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
            <Button 
              variant="destructive" 
              size="sm"
              disabled={isPending}
              onClick={() => handleOpenDialog('transactions')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
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
            <Button 
              variant="destructive" 
              size="sm"
              disabled={isPending}
              onClick={() => handleOpenDialog('categories')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
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
            <Button 
              variant="destructive" 
              size="sm"
              disabled={isPending}
              onClick={() => handleOpenDialog('ministries')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
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
            <Button 
              variant="destructive" 
              disabled={isPending}
              onClick={() => handleOpenDialog('all')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {isPending && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>Excluindo dados...</span>
        </div>
      )}

      {/* Audit Log Viewer */}
      <AuditLogViewer />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        churchName={church?.name || ""}
        actionType={getActionLabel(selectedAction)}
        requireTyping={selectedAction === 'all'}
        onConfirm={handleConfirmDelete}
        isLoading={isPending}
      />
    </motion.div>
  );
}