import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Transaction {
  id: string;
  description: string;
  category_id: string | null;
  type: string;
  amount: number;
  due_date: string | null;
  payment_date: string | null;
  status: string;
  ministry_id: string | null;
  church_id: string;
  created_at: string;
  created_by: string | null;
  invoice_url: string | null;
  installment_number: number | null;
  total_installments: number | null;
  notes: string | null;
  origin: string | null;
  categories?: {
    name: string;
    color: string | null;
  } | null;
  ministries?: {
    name: string;
  } | null;
}

export function useTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (name, color),
          ministries (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
}

export function useTransactionStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transaction-stats", user?.id],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("amount, type, status, due_date, payment_date");

      if (error) throw error;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const stats = {
        totalPayable: 0,
        totalPaid: 0,
        totalOverdue: 0,
        balance: 0,
        payableTrend: 0,
        paidTrend: 0,
        overdueTrend: 0,
      };

      transactions?.forEach((t) => {
        const amount = Number(t.amount);
        const dueDate = t.due_date ? new Date(t.due_date) : null;
        const paymentDate = t.payment_date ? new Date(t.payment_date) : null;

        if (t.type === "Receita") {
          stats.balance += amount;
        } else {
          stats.balance -= amount;
        }

        if (t.status === "Pendente" && t.type === "Despesa") {
          stats.totalPayable += amount;
          
          if (dueDate && dueDate < now) {
            stats.totalOverdue += amount;
          }
        }

        if (t.status === "Pago") {
          stats.totalPaid += amount;
        }
      });

      return stats;
    },
    enabled: !!user,
  });
}
