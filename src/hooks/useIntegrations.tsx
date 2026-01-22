import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Interface that matches the current database schema with encrypted OAuth tokens
export interface GoogleIntegration {
  id: string;
  church_id: string;
  user_id: string;
  column_mapping: Record<string, string>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  sheet_id: string;
  sheet_name: string;
  has_tokens: boolean;
}

interface SyncResponse {
  success: boolean;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors?: number;
  message?: string;
  error?: string;
  details?: Array<{
    row: number;
    action: string;
    description: string;
    reason?: string;
  }>;
}

export const useIntegrations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["google-integrations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_integrations")
        .select("id, church_id, user_id, column_mapping, last_sync_at, created_at, updated_at, sheet_id, sheet_name, access_token_enc, refresh_token_enc")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        church_id: item.church_id,
        user_id: item.user_id,
        column_mapping: item.column_mapping as Record<string, string>,
        last_sync_at: item.last_sync_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sheet_id: item.sheet_id,
        sheet_name: item.sheet_name,
        has_tokens: !!(item.access_token_enc && item.refresh_token_enc),
      })) as GoogleIntegration[];
    },
    enabled: !!user?.id,
  });

  // Create integration with encrypted token storage
  const createIntegration = useMutation({
    mutationFn: async (params: {
      churchId: string;
      sheetId: string;
      sheetName: string;
      columnMapping: Record<string, string>;
      accessToken: string;
      refreshToken: string;
    }) => {
      const insertData = {
        user_id: user?.id,
        church_id: params.churchId,
        sheet_id: params.sheetId,
        sheet_name: params.sheetName,
        column_mapping: params.columnMapping,
      };
      
      const { data: newIntegration, error: insertError } = await supabase
        .from("google_integrations")
        .insert(insertData)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: encryptError } = await supabase.rpc(
        'store_encrypted_integration_tokens',
        {
          p_integration_id: newIntegration.id,
          p_access_token: params.accessToken,
          p_refresh_token: params.refreshToken || null,
        }
      );

      if (encryptError) {
        await supabase.from("google_integrations").delete().eq('id', newIntegration.id);
        throw new Error('Falha ao criptografar tokens OAuth');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-integrations"] });
      toast({
        title: "Integração criada",
        description: "A planilha foi conectada com sucesso. Tokens armazenados de forma segura.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync integration with improved feedback
  const syncIntegration = useMutation({
    mutationFn: async (integrationId: string): Promise<SyncResponse> => {
      const { data, error } = await supabase.functions.invoke("sync-sheet", {
        body: { integrationId },
      });

      if (error) throw error;
      if (!data?.success && data?.error) throw new Error(data.error);
      
      return data as SyncResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["google-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sync-history"] });
      
      const inserted = data.recordsInserted || 0;
      const updated = data.recordsUpdated || 0;
      const skipped = data.recordsSkipped || 0;
      const errors = data.errors || 0;
      
      // Build detailed message
      const parts: string[] = [];
      if (inserted > 0) parts.push(`${inserted} nova(s)`);
      if (updated > 0) parts.push(`${updated} atualizada(s)`);
      if (skipped > 0) parts.push(`${skipped} ignorada(s)`);
      if (errors > 0) parts.push(`${errors} erro(s)`);
      
      const description = parts.length > 0 
        ? parts.join(', ') + '.'
        : 'Nenhuma alteração necessária.';
      
      // Show appropriate toast based on results
      if (inserted === 0 && updated === 0 && skipped > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${skipped} transação(ões) já existia(m) no sistema. Nenhuma duplicata criada.`,
        });
      } else {
        toast({
          title: errors > 0 ? "Sincronização parcial" : "Sincronização concluída",
          description,
          variant: errors > 0 ? "destructive" : "default",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete integration
  const deleteIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase
        .from("google_integrations")
        .delete()
        .eq("id", integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-integrations"] });
      toast({
        title: "Integração removida",
        description: "A conexão com a planilha foi removida.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    integrations,
    isLoading,
    createIntegration,
    syncIntegration,
    deleteIntegration,
  };
};
