import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addMonths, startOfMonth, endOfMonth, format, parseISO, isAfter, isBefore } from "date-fns";

interface InstallmentGroup {
  installment_group_id: string;
  description: string;
  total_amount: number;
  total_installments: number;
  paid_installments: number;
  pending_installments: number;
  overdue_installments: number;
  next_due_date: string | null;
  first_due_date: string;
  last_due_date: string;
}

interface MonthlyProjection {
  month: string;
  monthLabel: string;
  totalDue: number;
  installmentCount: number;
}

interface InstallmentStats {
  totalGroups: number;
  totalPendingAmount: number;
  totalPaidAmount: number;
  totalOverdueAmount: number;
  upcomingInstallments: Array<{
    id: string;
    description: string;
    amount: number;
    due_date: string;
    installment_number: number;
    total_installments: number;
    status: string;
  }>;
  installmentGroups: InstallmentGroup[];
  monthlyProjection: MonthlyProjection[];
  paidVsPendingStats: {
    paid: number;
    pending: number;
    overdue: number;
  };
}

export function useInstallmentStats() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["installment-stats", churchId],
    queryFn: async (): Promise<InstallmentStats> => {
      if (!churchId) {
        return {
          totalGroups: 0,
          totalPendingAmount: 0,
          totalPaidAmount: 0,
          totalOverdueAmount: 0,
          upcomingInstallments: [],
          installmentGroups: [],
          monthlyProjection: [],
          paidVsPendingStats: { paid: 0, pending: 0, overdue: 0 },
        };
      }

      // Fetch all installment transactions
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("church_id", churchId)
        .not("installment_group_id", "is", null)
        .order("due_date", { ascending: true });

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        return {
          totalGroups: 0,
          totalPendingAmount: 0,
          totalPaidAmount: 0,
          totalOverdueAmount: 0,
          upcomingInstallments: [],
          installmentGroups: [],
          monthlyProjection: [],
          paidVsPendingStats: { paid: 0, pending: 0, overdue: 0 },
        };
      }

      // Group by installment_group_id
      const groupsMap = new Map<string, typeof transactions>();
      transactions.forEach((t) => {
        const groupId = t.installment_group_id!;
        if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, []);
        }
        groupsMap.get(groupId)!.push(t);
      });

      // Calculate stats per group
      const installmentGroups: InstallmentGroup[] = [];
      let totalPaidAmount = 0;
      let totalPendingAmount = 0;
      let totalOverdueAmount = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;

      groupsMap.forEach((groupTransactions, groupId) => {
        const first = groupTransactions[0];
        const baseDescription = first.description.replace(/\s*\(\d+\/\d+\)$/, "");
        
        let groupPaid = 0;
        let groupPending = 0;
        let groupOverdue = 0;
        let groupPaidAmount = 0;
        let groupPendingAmount = 0;
        let groupOverdueAmount = 0;
        let nextDueDate: string | null = null;
        
        groupTransactions.forEach((t) => {
          const amount = Number(t.amount);
          if (t.status === "Pago") {
            groupPaid++;
            groupPaidAmount += amount;
            paidCount++;
            totalPaidAmount += amount;
          } else if (t.status === "Vencido") {
            groupOverdue++;
            groupOverdueAmount += amount;
            overdueCount++;
            totalOverdueAmount += amount;
          } else {
            groupPending++;
            groupPendingAmount += amount;
            pendingCount++;
            totalPendingAmount += amount;
            if (!nextDueDate && t.due_date) {
              nextDueDate = t.due_date;
            }
          }
        });

        const dueDates = groupTransactions
          .filter((t) => t.due_date)
          .map((t) => t.due_date!)
          .sort();

        installmentGroups.push({
          installment_group_id: groupId,
          description: baseDescription,
          total_amount: groupPaidAmount + groupPendingAmount + groupOverdueAmount,
          total_installments: groupTransactions.length,
          paid_installments: groupPaid,
          pending_installments: groupPending,
          overdue_installments: groupOverdue,
          next_due_date: nextDueDate,
          first_due_date: dueDates[0] || "",
          last_due_date: dueDates[dueDates.length - 1] || "",
        });
      });

      // Get upcoming installments (next 30 days, pending)
      const today = new Date();
      const thirtyDaysFromNow = addMonths(today, 1);
      const upcomingInstallments = transactions
        .filter((t) => {
          if (t.status !== "Pendente" || !t.due_date) return false;
          const dueDate = parseISO(t.due_date);
          return isAfter(dueDate, today) && isBefore(dueDate, thirtyDaysFromNow);
        })
        .slice(0, 10)
        .map((t) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          due_date: t.due_date!,
          installment_number: t.installment_number || 1,
          total_installments: t.total_installments || 1,
          status: t.status,
        }));

      // Calculate monthly projection (next 6 months)
      const monthlyProjection: MonthlyProjection[] = [];
      for (let i = 0; i < 6; i++) {
        const monthDate = addMonths(today, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthLabel = format(monthDate, "MMM/yy");

        const monthTransactions = transactions.filter((t) => {
          if (!t.due_date || t.status === "Pago") return false;
          const dueDate = parseISO(t.due_date);
          return isAfter(dueDate, monthStart) && isBefore(dueDate, monthEnd);
        });

        const totalDue = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

        monthlyProjection.push({
          month: monthKey,
          monthLabel,
          totalDue,
          installmentCount: monthTransactions.length,
        });
      }

      return {
        totalGroups: groupsMap.size,
        totalPendingAmount,
        totalPaidAmount,
        totalOverdueAmount,
        upcomingInstallments,
        installmentGroups: installmentGroups.sort((a, b) => {
          if (a.overdue_installments > 0 && b.overdue_installments === 0) return -1;
          if (b.overdue_installments > 0 && a.overdue_installments === 0) return 1;
          return (a.next_due_date || "z").localeCompare(b.next_due_date || "z");
        }),
        monthlyProjection,
        paidVsPendingStats: {
          paid: paidCount,
          pending: pendingCount,
          overdue: overdueCount,
        },
      };
    },
    enabled: !!churchId,
    staleTime: 1000 * 60 * 5,
  });
}
