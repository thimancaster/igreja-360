import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, subMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  expenses: number;
  balance: number;
}

export const useEvolutionData = (months: number = 6) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['evolution-data', profile?.church_id, months],
    queryFn: async (): Promise<MonthlyData[]> => {
      if (!profile?.church_id) return [];

      const startDate = format(subMonths(startOfMonth(new Date()), months - 1), 'yyyy-MM-dd');
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, payment_date, due_date, status')
        .eq('church_id', profile.church_id)
        .gte('payment_date', startDate)
        .order('payment_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
      
      // Initialize all months
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, 'yyyy-MM');
        monthlyMap.set(monthKey, { revenue: 0, expenses: 0 });
      }

      // Aggregate transactions (case-insensitive type comparison)
      transactions?.forEach((t) => {
        const date = t.payment_date || t.due_date;
        if (!date) return;
        
        const monthKey = format(parseISO(date), 'yyyy-MM');
        const current = monthlyMap.get(monthKey);
        
        if (current) {
          const typeNormalized = t.type?.toLowerCase();
          if (typeNormalized === 'receita') {
            current.revenue += Number(t.amount);
          } else if (typeNormalized === 'despesa') {
            current.expenses += Number(t.amount);
          }
        }
      });

      // Convert to array with labels
      const result: MonthlyData[] = [];
      let cumulativeBalance = 0;
      
      monthlyMap.forEach((data, monthKey) => {
        const monthBalance = data.revenue - data.expenses;
        cumulativeBalance += monthBalance;
        
        result.push({
          month: monthKey,
          monthLabel: format(parseISO(`${monthKey}-01`), 'MMM', { locale: ptBR }),
          revenue: data.revenue,
          expenses: data.expenses,
          balance: cumulativeBalance,
        });
      });

      return result;
    },
    enabled: !!profile?.church_id,
  });
};

export const useTrendData = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['trend-data', profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
      const lastMonthEnd = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      // Current month
      const { data: currentData } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('church_id', profile.church_id)
        .gte('payment_date', currentMonthStart);

      // Last month
      const { data: lastData } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('church_id', profile.church_id)
        .gte('payment_date', lastMonthStart)
        .lt('payment_date', lastMonthEnd);

      const currentRevenue = currentData?.filter(t => t.type?.toLowerCase() === 'receita').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const currentExpenses = currentData?.filter(t => t.type?.toLowerCase() === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const lastRevenue = lastData?.filter(t => t.type?.toLowerCase() === 'receita').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const lastExpenses = lastData?.filter(t => t.type?.toLowerCase() === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const revenueTrend = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
      const expensesTrend = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;

      return {
        revenueTrend,
        expensesTrend,
        currentRevenue,
        currentExpenses,
        lastRevenue,
        lastExpenses,
      };
    },
    enabled: !!profile?.church_id,
  });
};
