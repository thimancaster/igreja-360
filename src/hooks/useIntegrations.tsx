import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Interface that matches the current database schema after migration
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
  sheet_url: string | null;
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
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as GoogleIntegration[];
    },
    enabled: !!user?.id,
  });

  // Removendo startOAuth mutation
  // Removendo disconnectGoogle mutation
  // Removendo listSheets mutation

  // Create integration
  const createIntegration = useMutation({
    mutationFn: async (params: {
      churchId: string;
      sheetId: string;
      sheetName: string;
      columnMapping: Record<string, string>;
      sheetUrl: string;
    }) => {
      const insertData: any = {
        user_id: user?.id,
        church_id: params.churchId,
        sheet_id: params.sheetId,
        sheet_name: params.sheetName,
        column_mapping: params.columnMapping,
        sheet_url: params.sheetUrl,
      };
      
      const { error } = await supabase.from("google_integrations").insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-integrations"] });
      toast({
        title: "Integração criada",
        description: "A planilha foi conectada com sucesso.",
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
      toast({
        title: "Sincronização concluída",
        description: `${data.recordsImported} transações foram importadas.`,
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