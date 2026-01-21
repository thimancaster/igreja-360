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
  // Tokens are stored encrypted in *_enc columns, not exposed here
  has_tokens: boolean;
}

// Removendo a interface GoogleSheet, pois não listaremos mais planilhas via API do Drive
// Removendo o tipo UserCredentials, pois não armazenaremos mais tokens OAuth

export const useIntegrations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Removendo a query para credentials, pois não usaremos mais tokens OAuth
  // const { data: credentials, isLoading: credentialsLoading } = useQuery(...)

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
      
      // Map to interface, checking if tokens exist
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

  // Removendo startOAuth mutation
  // Removendo disconnectGoogle mutation
  // Removendo listSheets mutation

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
      // First, create the integration without tokens (encrypted columns only)
      const insertData = {
        user_id: user?.id,
        church_id: params.churchId,
        sheet_id: params.sheetId,
        sheet_name: params.sheetName,
        column_mapping: params.columnMapping,
        // Encrypted token columns will be populated via RPC
      };
      
      const { data: newIntegration, error: insertError } = await supabase
        .from("google_integrations")
        .insert(insertData)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Now store tokens encrypted using the secure RPC function
      const { error: encryptError } = await supabase.rpc(
        'store_encrypted_integration_tokens',
        {
          p_integration_id: newIntegration.id,
          p_access_token: params.accessToken,
          p_refresh_token: params.refreshToken || null,
        }
      );

      if (encryptError) {
        // Rollback: delete the integration if token encryption fails
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

  // Sync integration
  const syncIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      // A Edge Function 'sync-sheet' agora buscará a sheet_url e a column_mapping
      // diretamente da tabela google_integrations usando o integrationId.
      const { data, error } = await supabase.functions.invoke("sync-sheet", {
        body: { integrationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["google-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      const inserted = data.recordsInserted || 0;
      const updated = data.recordsUpdated || 0;
      const skipped = data.recordsSkipped || 0;
      
      toast({
        title: "Sincronização concluída",
        description: `${inserted} nova(s), ${updated} atualizada(s), ${skipped} ignorada(s).`,
      });
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
    isLoading: isLoading, // credentialsLoading removido
    // credentials removido
    // startOAuth removido
    // disconnectGoogle removido
    // listSheets removido
    createIntegration,
    syncIntegration,
    deleteIntegration,
  };
};