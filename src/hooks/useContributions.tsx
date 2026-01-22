import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ContributionType = 'dizimo' | 'oferta' | 'campanha' | 'voto' | 'outro';

export interface Contribution {
  id: string;
  church_id: string;
  member_id: string | null;
  transaction_id: string | null;
  amount: number;
  contribution_date: string;
  contribution_type: ContributionType;
  campaign_name: string | null;
  receipt_number: string | null;
  notes: string | null;
  receipt_generated: boolean;
  receipt_generated_at: string | null;
  created_at: string;
  updated_at: string;
  member?: { full_name: string; email: string | null } | null;
}

export interface ContributionFormData {
  member_id?: string | null;
  amount: number;
  contribution_date: string;
  contribution_type: ContributionType;
  campaign_name?: string;
  notes?: string;
}

export interface ContributionStats {
  totalDizimos: number;
  totalOfertas: number;
  totalCampanhas: number;
  totalGeral: number;
  countDizimos: number;
  countOfertas: number;
  countCampanhas: number;
  countGeral: number;
}

export function useContributions(filters?: {
  startDate?: string;
  endDate?: string;
  type?: ContributionType;
  memberId?: string;
}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['contributions', profile?.church_id, filters],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      let query = supabase
        .from('contributions')
        .select(`
          *,
          member:member_id (full_name, email)
        `)
        .eq('church_id', profile.church_id)
        .order('contribution_date', { ascending: false });
      
      if (filters?.startDate) {
        query = query.gte('contribution_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('contribution_date', filters.endDate);
      }
      if (filters?.type) {
        query = query.eq('contribution_type', filters.type);
      }
      if (filters?.memberId) {
        query = query.eq('member_id', filters.memberId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Contribution[];
    },
    enabled: !!profile?.church_id,
  });
}

export function useContributionStats(period?: { startDate: string; endDate: string }) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['contribution-stats', profile?.church_id, period],
    queryFn: async () => {
      if (!profile?.church_id) return null;
      
      let query = supabase
        .from('contributions')
        .select('amount, contribution_type')
        .eq('church_id', profile.church_id);
      
      if (period?.startDate) {
        query = query.gte('contribution_date', period.startDate);
      }
      if (period?.endDate) {
        query = query.lte('contribution_date', period.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const stats: ContributionStats = {
        totalDizimos: 0,
        totalOfertas: 0,
        totalCampanhas: 0,
        totalGeral: 0,
        countDizimos: 0,
        countOfertas: 0,
        countCampanhas: 0,
        countGeral: 0,
      };
      
      data?.forEach((c) => {
        const amount = Number(c.amount);
        stats.totalGeral += amount;
        stats.countGeral += 1;
        
        switch (c.contribution_type) {
          case 'dizimo':
            stats.totalDizimos += amount;
            stats.countDizimos += 1;
            break;
          case 'oferta':
            stats.totalOfertas += amount;
            stats.countOfertas += 1;
            break;
          case 'campanha':
          case 'voto':
            stats.totalCampanhas += amount;
            stats.countCampanhas += 1;
            break;
        }
      });
      
      return stats;
    },
    enabled: !!profile?.church_id,
  });
}

export function useMemberContributions(memberId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['member-contributions', memberId],
    queryFn: async () => {
      if (!memberId || !profile?.church_id) return [];
      
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('member_id', memberId)
        .order('contribution_date', { ascending: false });
      
      if (error) throw error;
      return data as Contribution[];
    },
    enabled: !!memberId && !!profile?.church_id,
  });
}

export function useCreateContribution() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContributionFormData) => {
      if (!profile?.church_id) throw new Error('Igreja não encontrada');
      
      // Generate receipt number
      const { data: receiptNumber } = await supabase
        .rpc('generate_receipt_number', { p_church_id: profile.church_id });
      
      const { data: contribution, error } = await supabase
        .from('contributions')
        .insert({
          ...data,
          church_id: profile.church_id,
          receipt_number: receiptNumber,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Also create a transaction record for financial tracking
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          church_id: profile.church_id,
          member_id: data.member_id,
          description: `${data.contribution_type === 'dizimo' ? 'Dízimo' : data.contribution_type === 'oferta' ? 'Oferta' : data.campaign_name || 'Contribuição'} - ${receiptNumber}`,
          amount: data.amount,
          type: 'Receita',
          status: 'Pago',
          payment_date: data.contribution_date,
          due_date: data.contribution_date,
          origin: 'Manual',
          created_by: user?.id,
        });
      
      if (transactionError) console.error('Error creating transaction:', transactionError);
      
      return contribution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
      queryClient.invalidateQueries({ queryKey: ['contribution-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Contribuição registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar contribuição: ${error.message}`);
    },
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contributions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
      queryClient.invalidateQueries({ queryKey: ['contribution-stats'] });
      toast.success('Contribuição removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover contribuição: ${error.message}`);
    },
  });
}

export function useMarkReceiptGenerated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('contributions')
        .update({
          receipt_generated: true,
          receipt_generated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
    },
  });
}
