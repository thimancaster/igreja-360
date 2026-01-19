import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QUERY_KEYS } from "@/lib/queryKeys";

export interface TransactionFilters {
  period: string;
  ministryId: string;
  status: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  due_date: string | null;
  payment_date: string | null;
  created_at: string;
  categories?: { name: string } | null;
  ministries?: { name: string } | null;
}

export function useFilteredTransactions(filters: TransactionFilters) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.filteredTransactions, profile?.church_id, filters],
    queryFn: async () => {
      if (!user?.id || !profile?.church_id) {
        throw new Error("User not authenticated");
      }

      // Calculate date range based on period
      let startDate: Date | null = null;
      const now = new Date();

      switch (filters.period) {
        case "mes-atual":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "trimestre":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case "ano":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Build query
      let query = supabase
        .from("transactions")
        .select(`
          *,
          categories (name),
          ministries (name)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false });

      // Apply date filter
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      // Apply ministry filter
      if (filters.ministryId !== "todos") {
        query = query.eq("ministry_id", filters.ministryId);
      }

      // Apply status filter
      if (filters.status !== "todos-status") {
        const statusMap: Record<string, string> = {
          "pendente": "Pendente",
          "pago": "Pago",
          "vencido": "Vencido"
        };
        query = query.eq("status", statusMap[filters.status]);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as Transaction[];
    },
    enabled: !!user?.id && !!profile?.church_id,
  });
}
