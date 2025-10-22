import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  ministryId?: string;
  status?: string;
  searchTerm?: string;
}

export function useFinancialSummary(filters: ReportFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-summary", user?.id, filters],
    queryFn: async () => {
      if (!user || !filters.startDate || !filters.endDate) {
        return null;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada");
      }

      let query = supabase
        .from("transactions")
        .select("amount, type")
        .eq("church_id", profile.church_id)
        .gte("payment_date", filters.startDate)
        .lte("payment_date", filters.endDate);

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      } else {
        query = query.eq("status", "Pago");
      }

      if (filters.categoryId && filters.categoryId !== 'all') {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.ministryId && filters.ministryId !== 'all') {
        query = query.eq("ministry_id", filters.ministryId);
      }

      if (filters.searchTerm) {
        query = query.ilike("description", `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary = {
        totalRevenue: 0,
        totalExpenses: 0,
        netBalance: 0,
      };

      data.forEach(transaction => {
        if (transaction.type === "Receita") {
          summary.totalRevenue += transaction.amount;
        } else if (transaction.type === "Despesa") {
          summary.totalExpenses += transaction.amount;
        }
      });

      summary.netBalance = summary.totalRevenue - summary.totalExpenses;

      return summary;
    },
    enabled: false,
  });
}

export function useExpensesByCategory(filters: ReportFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expenses-by-category", user?.id, filters],
    queryFn: async () => {
      if (!user || !filters.startDate || !filters.endDate) return null;

      const { data: profile } = await supabase.from("profiles").select("church_id").eq("id", user.id).single();
      if (!profile?.church_id) throw new Error("Igreja não encontrada");

      let query = supabase
        .from("transactions")
        .select("amount, categories(id, name, color)")
        .eq("church_id", profile.church_id)
        .eq("type", "Despesa")
        .gte("payment_date", filters.startDate)
        .lte("payment_date", filters.endDate);

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      } else {
        query = query.eq("status", "Pago");
      }
      
      if (filters.ministryId && filters.ministryId !== 'all') {
        query = query.eq("ministry_id", filters.ministryId);
      }

      if (filters.searchTerm) {
        query = query.ilike("description", `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const expensesByCategory = data.reduce((acc, transaction) => {
        const categoryName = transaction.categories?.name || "Sem Categoria";
        const categoryColor = transaction.categories?.color || "#8884d8";
        
        if (!acc[categoryName]) {
          acc[categoryName] = { name: categoryName, value: 0, color: categoryColor };
        }
        acc[categoryName].value += transaction.amount;
        return acc;
      }, {} as Record<string, { name: string; value: number; color: string }>);

      return Object.values(expensesByCategory).sort((a, b) => b.value - a.value);
    },
    enabled: false,
  });
}

export function useRevenueByMinistry(filters: ReportFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-by-ministry", user?.id, filters],
    queryFn: async () => {
      if (!user || !filters.startDate || !filters.endDate) return null;

      const { data: profile } = await supabase.from("profiles").select("church_id").eq("id", user.id).single();
      if (!profile?.church_id) throw new Error("Igreja não encontrada");

      let query = supabase
        .from("transactions")
        .select("amount, ministries(id, name)")
        .eq("church_id", profile.church_id)
        .eq("type", "Receita")
        .gte("payment_date", filters.startDate)
        .lte("payment_date", filters.endDate);

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      } else {
        query = query.eq("status", "Pago");
      }
      
      if (filters.categoryId && filters.categoryId !== 'all') {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.searchTerm) {
        query = query.ilike("description", `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const revenueByMinistry = data.reduce((acc, transaction) => {
        const ministryName = transaction.ministries?.name || "Sem Ministério";
        
        if (!acc[ministryName]) {
          acc[ministryName] = { name: ministryName, value: 0 };
        }
        acc[ministryName].value += transaction.amount;
        return acc;
      }, {} as Record<string, { name: string; value: number }>);

      return Object.values(revenueByMinistry).sort((a, b) => b.value - a.value);
    },
    enabled: false,
  });
}

export function useCashFlow(filters: ReportFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cash-flow", user?.id, filters],
    queryFn: async () => {
      if (!user || !filters.startDate || !filters.endDate) return null;

      const { data: profile } = await supabase.from("profiles").select("church_id").eq("id", user.id).single();
      if (!profile?.church_id) throw new Error("Igreja não encontrada");

      let query = supabase
        .from("transactions")
        .select("payment_date, description, type, amount")
        .eq("church_id", profile.church_id)
        .eq("status", "Pago")
        .gte("payment_date", filters.startDate)
        .lte("payment_date", filters.endDate)
        .order("payment_date", { ascending: true });

      if (filters.categoryId && filters.categoryId !== 'all') {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.ministryId && filters.ministryId !== 'all') {
        query = query.eq("ministry_id", filters.ministryId);
      }

      if (filters.searchTerm) {
        query = query.ilike("description", `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let runningBalance = 0;
      const cashFlowData = data.map(tx => {
        const value = tx.type === "Receita" ? tx.amount : -tx.amount;
        runningBalance += value;
        return {
          date: tx.payment_date,
          description: tx.description,
          type: tx.type,
          value: tx.amount,
          balance: runningBalance,
        };
      });

      return cashFlowData;
    },
    enabled: false,
  });
}

export function useReportFiltersData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["report-filters-data", user?.id],
    queryFn: async () => {
      if (!user) return { categories: [], ministries: [] };

      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) {
        return { categories: [], ministries: [] };
      }

      const [categoriesRes, ministriesRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("church_id", profile.church_id),
        supabase.from("ministries").select("id, name").eq("church_id", profile.church_id),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (ministriesRes.error) throw ministriesRes.error;

      return {
        categories: categoriesRes.data,
        ministries: ministriesRes.data,
      };
    },
    enabled: !!user,
  });
}