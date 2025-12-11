import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, parseISO } from "date-fns";

interface DueTransaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  daysRemaining: number;
  type: string;
}

export function useDueTransactionAlerts(daysAhead: number = 7) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["due-transaction-alerts", user?.id, daysAhead],
    queryFn: async () => {
      if (!user?.id || !profile?.church_id) {
        return [];
      }

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, due_date, type")
        .eq("church_id", profile.church_id)
        .eq("status", "Pendente")
        .not("due_date", "is", null)
        .gte("due_date", today.toISOString().split("T")[0])
        .lte("due_date", futureDate.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (error) throw error;

      const transactionsWithDays: DueTransaction[] = (data || []).map((t) => ({
        ...t,
        due_date: t.due_date!,
        daysRemaining: differenceInDays(parseISO(t.due_date!), today),
      }));

      return transactionsWithDays;
    },
    enabled: !!user?.id && !!profile?.church_id,
  });
}
