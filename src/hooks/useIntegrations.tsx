import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface GoogleIntegration {
  id: string;
  sheet_id: string;
  sheet_name: string;
  column_mapping: Record<string, string>;
  last_sync_at: string | null;
  created_at: string;
}

export interface GoogleSheet {
  id: string;
  name: string;
  modifiedTime: string;
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
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GoogleIntegration[];
    },
    enabled: !!user?.id,
  });

  // Start OAuth flow
  const startOAuth = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-auth-start");
      
      if (error) throw error;
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao conectar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // List Google Sheets
  const listSheets = useMutation({
    mutationFn: async (accessToken: string) => {
      const { data, error } = await supabase.functions.invoke("list-google-sheets", {
        body: { accessToken },
      });

      if (error) throw error;
      return data.sheets as GoogleSheet[];
    },
  });

  // Create integration
  const createIntegration = useMutation({
    mutationFn: async (params: {
      churchId: string;
      sheetId: string;
      sheetName: string;
      columnMapping: Record<string, string>;
      accessToken: string;
      refreshToken: string;
    }) => {
      const { error } = await supabase.from("google_integrations").insert({
        user_id: user?.id,
        church_id: params.churchId,
        sheet_id: params.sheetId,
        sheet_name: params.sheetName,
        column_mapping: params.columnMapping,
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });

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
    isLoading,
    startOAuth,
    listSheets,
    createIntegration,
    syncIntegration,
    deleteIntegration,
  };
};