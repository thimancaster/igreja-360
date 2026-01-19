import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateAllTransactionQueries } from "@/lib/queryKeys";
import { toast } from "sonner";

export function useTransactionsRealtime() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.church_id) return;

    const channel = supabase
      .channel(`transactions-realtime-${profile.church_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `church_id=eq.${profile.church_id}`,
        },
        (payload) => {
          console.log("[Realtime] Transaction change detected:", payload.eventType);
          
          // Invalidate all transaction-related queries
          invalidateAllTransactionQueries(queryClient);

          // Show subtle notification for external changes
          if (payload.eventType === "INSERT") {
            toast.info("Nova transação adicionada", { duration: 2000 });
          } else if (payload.eventType === "UPDATE") {
            // Silent update - just refresh data
          } else if (payload.eventType === "DELETE") {
            toast.info("Transação removida", { duration: 2000 });
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Unsubscribing from transactions channel");
      supabase.removeChannel(channel);
    };
  }, [profile?.church_id, queryClient]);
}
