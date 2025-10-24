import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = 'admin' | 'tesoureiro' | 'pastor' | 'lider' | 'user';

export function useRole() {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        return [];
      }

      return data?.map(r => r.role as AppRole) || [];
    },
    enabled: !!user?.id,
  });

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
  // Incluindo 'lider' como um papel privilegiado para acesso total conforme solicitado
  const isPrivileged = hasAnyRole(['admin', 'tesoureiro', 'pastor', 'lider']);

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