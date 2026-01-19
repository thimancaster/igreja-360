import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateAllTransactionQueries } from "@/lib/queryKeys";

/**
 * Hook que atualiza automaticamente o status das transações vencidas
 * ao carregar o Dashboard, garantindo dados precisos.
 */
export function useAutoUpdateOverdue() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    // Executar apenas uma vez por sessão do dashboard e quando há church_id
    if (!profile?.church_id || hasRun.current) return;

    const updateOverdueStatus = async () => {
      try {
        console.log("[useAutoUpdateOverdue] Atualizando transações vencidas...");
        
        const { data, error } = await supabase.rpc('check_and_update_overdue');
        
        if (error) {
          console.error("[useAutoUpdateOverdue] Erro ao atualizar:", error);
          return;
        }
        
        const result = data as { updated_count?: number } | null;
        if (result?.updated_count && result.updated_count > 0) {
          console.log(`[useAutoUpdateOverdue] ${result.updated_count} transações atualizadas para "Vencido"`);
          // Invalidar todas as queries para refletir as mudanças
          invalidateAllTransactionQueries(queryClient);
        }
        
        hasRun.current = true;
      } catch (err) {
        console.error("[useAutoUpdateOverdue] Erro inesperado:", err);
      }
    };

    updateOverdueStatus();
  }, [profile?.church_id, queryClient]);
}
