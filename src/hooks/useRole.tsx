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
  // Temporariamente, qualquer usuário logado é considerado privilegiado para acesso interno.
  const isPrivileged = !!user?.id;

  return {
    roles: roles || [],
    hasRole,
    hasAnyRole,
    isAdmin,
    isTesoureiro,
    isPastor,
    isLider,
    isPrivileged,
    isLoading,
  };
}
