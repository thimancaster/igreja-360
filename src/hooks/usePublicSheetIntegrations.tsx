import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface PublicSheetIntegration {
  id: string;
  church_id: string;
  user_id: string;
  sheet_url: string;
  sheet_id: string;
  sheet_name: string;
  column_mapping: Record<string, string>;
  last_sync_at: string | null;
  sync_status: string;
  records_synced: number;
  created_at: string;
  updated_at: string;
}

interface CreatePublicIntegrationData {
  churchId: string;
  sheetUrl: string;
  sheetId: string;
  sheetName: string;
  columnMapping: Record<string, string>;
}

export function usePublicSheetIntegrations() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all public sheet integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["public-sheet-integrations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("public_sheet_integrations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        column_mapping: (item.column_mapping || {}) as Record<string, string>,
      })) as PublicSheetIntegration[];
    },
    enabled: !!user?.id,
  });

  // Create a new integration
  const createIntegration = useMutation({
    mutationFn: async (data: CreatePublicIntegrationData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data: result, error } = await supabase
        .from("public_sheet_integrations")
        .insert({
          church_id: data.churchId,
          user_id: user.id,
          sheet_url: data.sheetUrl,
          sheet_id: data.sheetId,
          sheet_name: data.sheetName,
          column_mapping: data.columnMapping as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-sheet-integrations"] });
      toast({
        title: "Integração criada",
        description: "A planilha pública foi conectada com sucesso.",
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
      const { data, error } = await supabase.functions.invoke("sync-public-sheet", {
        body: { integrationId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["public-sheet-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
      
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
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete integration
  const deleteIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase
        .from("public_sheet_integrations")
        .delete()
        .eq("id", integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-sheet-integrations"] });
      toast({
        title: "Integração removida",
        description: "A planilha pública foi desconectada.",
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
}
