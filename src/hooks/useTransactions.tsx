import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QUERY_KEYS } from "@/lib/queryKeys";

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
  installment_group_id: string | null;
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
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.transactions, profile?.church_id],
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
    enabled: !!user && !!profile?.church_id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useTransactionStats() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.transactionStats, profile?.church_id],
    queryFn: async () => {
      // First, update overdue transactions
      await supabase.rpc('update_overdue_transactions');

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("amount, type, status, due_date, payment_date");

      if (error) throw error;

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

        if (t.type === "Receita") {
          stats.balance += amount;
        } else {
          stats.balance -= amount;
        }

        // CORREÇÃO: Lógica unificada sem duplicação
        // Vencido = apenas transações com status "Vencido"
        if (t.status === "Vencido") {
          stats.totalOverdue += amount;
        }
        
        // Pendente = transações pendentes (despesas a pagar)
        if (t.status === "Pendente" && t.type === "Despesa") {
          stats.totalPayable += amount;
        }

        // Pago = todas as transações pagas
        if (t.status === "Pago") {
          stats.totalPaid += amount;
        }
      });

      return stats;
    },
    enabled: !!user && !!profile?.church_id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

// Hook to get installment group details
export function useInstallmentGroup(groupId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.installmentGroup, groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (name, color),
          ministries (name)
        `)
        .eq("installment_group_id", groupId)
        .order("installment_number", { ascending: true });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user && !!groupId,
  });
}
