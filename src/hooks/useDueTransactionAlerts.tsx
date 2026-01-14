import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, parseISO } from "date-fns";

export interface DueTransaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  daysRemaining: number;
  type: string;
  status: string;
  categories?: { name: string } | null;
  ministries?: { name: string } | null;
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
        .select("id, description, amount, due_date, type, status, categories(name), ministries(name)")
        .eq("church_id", profile.church_id)
        .eq("status", "Pendente")
        .not("due_date", "is", null)
        .gte("due_date", today.toISOString().split("T")[0])
        .lte("due_date", futureDate.toISOString().split("T")[0])
        .order("due_date", { ascending: true });

      if (error) throw error;

      const transactionsWithDays: DueTransaction[] = (data || []).map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        due_date: t.due_date!,
        type: t.type,
        status: t.status,
        categories: t.categories,
        ministries: t.ministries,
        daysRemaining: differenceInDays(parseISO(t.due_date!), today),
      }));

      return transactionsWithDays;
    },
    enabled: !!user?.id && !!profile?.church_id,
  });
}
