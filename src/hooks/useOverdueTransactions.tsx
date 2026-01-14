import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";

export interface OverdueTransaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  type: string;
  category_name: string | null;
  ministry_name: string | null;
}

export function useOverdueTransactions() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["overdue-transactions", profile?.church_id],
    queryFn: async (): Promise<OverdueTransaction[]> => {
      if (!profile?.church_id) return [];

      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          description,
          amount,
          due_date,
          type,
          categories(name),
          ministries(name)
        `)
        .eq("church_id", profile.church_id)
        .eq("status", "Pendente")
        .lt("due_date", today)
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Error fetching overdue transactions:", error);
        throw error;
      }

      return (data || []).map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        due_date: t.due_date!,
        days_overdue: differenceInDays(new Date(), new Date(t.due_date!)),
        type: t.type,
        category_name: t.categories?.name || null,
        ministry_name: t.ministries?.name || null,
      }));
    },
    enabled: !!profile?.church_id,
  });
}
