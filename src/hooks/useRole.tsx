import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = 'admin' | 'tesoureiro' | 'pastor' | 'lider' | 'user';

export function useRole() {
  const { user, loading: authLoading } = useAuth();

  // Fetch all roles for the user
  const { data: roles, isLoading: queryLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data?.map(r => r.role as AppRole) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user ministries (for lider)
  const { data: userMinistries } = useQuery({
    queryKey: ["user-ministries", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_ministries")
        .select("ministry_id")
        .eq("user_id", user.id);

      if (error) {
        console.error('Error fetching user ministries:', error);
        return [];
      }

      return data?.map(m => m.ministry_id) || [];
    },
    enabled: !!user?.id,
  });

  // isLoading deve ser true se auth está carregando OU (tem user E query está carregando)
  const isLoading = authLoading || (!!user?.id && queryLoading);

  const hasRole = (role: AppRole): boolean => {
    return roles?.includes(role) || false;
  };

  const hasAnyRole = (rolesList: AppRole[]): boolean => {
    return rolesList.some(role => hasRole(role));
  };

  const isAdmin = hasRole('admin');
  const isTesoureiro = hasRole('tesoureiro');
  const isPastor = hasRole('pastor');
  const isLider = hasRole('lider');
  const isUser = hasRole('user');
  
  // Permissões específicas
  const canManageUsers = isAdmin; // Apenas admin pode gerenciar usuários
  const canDeleteData = isAdmin || isTesoureiro; // Admin e tesoureiro podem apagar dados
  const canManageTransactions = isAdmin || isTesoureiro || isPastor;
  const canAddExpenses = isAdmin || isTesoureiro || isPastor;
  const canAddRevenue = true; // Todos podem adicionar receitas
  const canViewAllTransactions = isAdmin || isTesoureiro || isPastor;
  const canViewMinistryTransactions = isLider;
  const canOnlyViewOwnTransactions = isUser && !isAdmin && !isTesoureiro && !isPastor && !isLider;
  
  // Temporariamente, qualquer usuário logado é considerado privilegiado para acesso interno.
  const isPrivileged = !!user?.id;

  // Função para verificar se o usuário pode acessar um ministério específico
  const canAccessMinistry = (ministryId: string): boolean => {
    if (isAdmin || isTesoureiro || isPastor) return true;
    if (isLider && userMinistries?.includes(ministryId)) return true;
    return false;
  };

  return {
    roles: roles || [],
    userMinistries: userMinistries || [],
    hasRole,
    hasAnyRole,
    isAdmin,
    isTesoureiro,
    isPastor,
    isLider,
    isUser,
    isPrivileged,
    isLoading,
    // Permissões
    canManageUsers,
    canDeleteData,
    canManageTransactions,
    canAddExpenses,
    canAddRevenue,
    canViewAllTransactions,
    canViewMinistryTransactions,
    canOnlyViewOwnTransactions,
    canAccessMinistry,
  };
}
