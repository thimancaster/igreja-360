import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QUERY_KEYS } from "@/lib/queryKeys";

interface TodaysDueTransaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  type: string;
  status: string;
  category_name?: string;
}

export function useTodaysDueTransactions() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.todaysDueTransactions, profile?.church_id],
    queryFn: async () => {
      if (!user?.id || !profile?.church_id) {
        return [];
      }

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, 
          description, 
          amount, 
          due_date, 
          type,
          status,
          categories(name)
        `)
        .eq("church_id", profile.church_id)
        .eq("status", "Pendente")
        .eq("due_date", today)
        .order("amount", { ascending: false });

      if (error) throw error;

      const transactions: TodaysDueTransaction[] = (data || []).map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        due_date: t.due_date!,
        type: t.type,
        status: t.status,
        category_name: t.categories?.name,
      }));

      return transactions;
    },
    enabled: !!user?.id && !!profile?.church_id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}
