import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, parseISO, startOfDay, endOfDay } from 'date-fns';

interface DailyData {
  date: string;
  revenue: number;
  expenses: number;
  balance: number;
}

export const useSparklineData = (days: number = 7) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['sparkline-data', profile?.church_id, days],
    queryFn: async (): Promise<{
      revenueData: number[];
      expensesData: number[];
      balanceData: number[];
      dailyData: DailyData[];
    }> => {
      if (!profile?.church_id) {
        return { revenueData: [], expensesData: [], balanceData: [], dailyData: [] };
      }

      const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, payment_date, due_date, status')
        .eq('church_id', profile.church_id)
        .or(`payment_date.gte.${startDate},and(payment_date.is.null,due_date.gte.${startDate})`)
        .order('payment_date', { ascending: true });

      if (error) throw error;

      // Initialize daily data for all days
      const dailyMap = new Map<string, { revenue: number; expenses: number }>();
      
      for (let i = days - 1; i >= 0; i--) {
        const dateKey = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMap.set(dateKey, { revenue: 0, expenses: 0 });
      }

      // Aggregate transactions by day
      transactions?.forEach((t) => {
        const date = t.payment_date || t.due_date;
        if (!date) return;
        
        const dateKey = format(parseISO(date), 'yyyy-MM-dd');
        const current = dailyMap.get(dateKey);
        
        if (current) {
          if (t.type === 'receita') {
            current.revenue += Number(t.amount);
          } else {
            current.expenses += Number(t.amount);
          }
        }
      });

      // Convert to arrays
      const dailyData: DailyData[] = [];
      let cumulativeBalance = 0;
      
      dailyMap.forEach((data, dateKey) => {
        const dayBalance = data.revenue - data.expenses;
        cumulativeBalance += dayBalance;
        
        dailyData.push({
          date: dateKey,
          revenue: data.revenue,
          expenses: data.expenses,
          balance: cumulativeBalance,
        });
      });

      return {
        revenueData: dailyData.map(d => d.revenue),
        expensesData: dailyData.map(d => d.expenses),
        balanceData: dailyData.map(d => d.balance),
        dailyData,
      };
    },
    enabled: !!profile?.church_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};