import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ReportFilters {
  startDate?: string;
  endDate?: string;
}

export function useFinancialSummary(filters: ReportFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-summary", user?.id, filters],
    queryFn: async () => {
      if (!user || !filters.startDate || !filters.endDate) {
        return null;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada");
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("church_id", profile.church_id)
        .eq("status", "Pago")
        .gte("payment_date", filters.startDate)
        .lte("payment_date", filters.endDate);

      if (error) throw error;

      const summary = {
        totalRevenue: 0,
        totalExpenses: 0,
        netBalance: 0,
      };

      data.forEach(transaction => {
        if (transaction.type === "Receita") {
          summary.totalRevenue += transaction.amount;
        } else if (transaction.type === "Despesa") {
          summary.totalExpenses += transaction.amount;
        }
      });

      summary.netBalance = summary.totalRevenue - summary.totalExpenses;

      return summary;
    },
    enabled: false, // This query will be run manually via refetch
  });
}