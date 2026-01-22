import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Member {
  id: string;
  church_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  member_since: string | null;
  created_at: string;
  updated_at: string;
  member_ministries?: {
    ministry_id: string;
    role: string;
    ministries: { name: string } | null;
  }[];
}

export interface MemberFormData {
  full_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  member_since?: string;
  ministry_ids?: string[];
}

export function useMembers() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['members', profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          member_ministries (
            ministry_id,
            role,
            ministries:ministry_id (name)
          )
        `)
        .eq('church_id', profile.church_id)
        .order('full_name');
      
      if (error) throw error;
      return data as Member[];
    },
    enabled: !!profile?.church_id,
  });
}

export function useMember(memberId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          member_ministries (
            ministry_id,
            role,
            ministries:ministry_id (name)
          )
        `)
        .eq('id', memberId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Member | null;
    },
    enabled: !!memberId && !!profile?.church_id,
  });
}

export function useBirthdaysThisMonth() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['birthdays', profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      
      const { data, error } = await supabase
        .rpc('get_birthdays_this_month', { p_church_id: profile.church_id });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id,
  });
}

export function useCreateMember() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: MemberFormData) => {
      if (!profile?.church_id) throw new Error('Igreja não encontrada');
      
      const { ministry_ids, ...memberFields } = memberData;
      
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert({ ...memberFields, church_id: profile.church_id })
        .select()
        .single();
      
      if (memberError) throw memberError;

      // Link ministries if provided
      if (ministry_ids && ministry_ids.length > 0) {
        const ministryLinks = ministry_ids.map(ministry_id => ({
          member_id: member.id,
          ministry_id,
        }));
        
        const { error: linkError } = await supabase
          .from('member_ministries')
          .insert(ministryLinks);
        
        if (linkError) console.error('Error linking ministries:', linkError);
      }
      
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      toast.success('Membro cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar membro: ${error.message}`);
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...memberData }: MemberFormData & { id: string }) => {
      const { ministry_ids, ...memberFields } = memberData;
      
      const { data: member, error: memberError } = await supabase
        .from('members')
        .update(memberFields)
        .eq('id', id)
        .select()
        .single();
      
      if (memberError) throw memberError;

      // Update ministry links if provided
      if (ministry_ids !== undefined) {
        // Remove existing links
        await supabase
          .from('member_ministries')
          .delete()
          .eq('member_id', id);
        
        // Add new links
        if (ministry_ids.length > 0) {
          const ministryLinks = ministry_ids.map(ministry_id => ({
            member_id: id,
            ministry_id,
          }));
          
          await supabase
            .from('member_ministries')
            .insert(ministryLinks);
        }
      }
      
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      toast.success('Membro atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar membro: ${error.message}`);
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover membro: ${error.message}`);
    },
  });
}
