import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PickupAuthorization = {
  id: string;
  child_id: string;
  church_id: string;
  authorized_by: string;
  authorized_person_name: string;
  authorized_person_phone: string | null;
  authorized_person_document: string | null;
  authorization_type: 'one_time' | 'date_range' | 'permanent';
  valid_from: string;
  valid_until: string | null;
  security_pin: string;
  reason: string | null;
  approved_by_leader: string | null;
  leader_approval_required: boolean;
  status: 'pending' | 'approved' | 'active' | 'used' | 'expired' | 'cancelled';
  used_at: string | null;
  used_by_checkin_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaderCheckoutOverride = {
  id: string;
  check_in_id: string;
  leader_id: string;
  reason: string;
  pickup_person_name: string;
  pickup_person_document: string | null;
  created_at: string;
};

// Hook para pais verem seus filhos
export function useParentChildren() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["parent-children", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar guardians vinculados ao profile do usuário
      const { data: guardianData, error: guardianError } = await supabase
        .from("guardians")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (guardianError || !guardianData) return [];

      // Buscar filhos vinculados a esse guardian
      const { data, error } = await supabase
        .from("child_guardians")
        .select(`
          is_primary,
          can_pickup,
          children:child_id (
            id,
            full_name,
            photo_url,
            classroom,
            birth_date,
            status
          )
        `)
        .eq("guardian_id", guardianData.id);

      if (error) throw error;
      return data.map((cg: any) => ({
        ...cg.children,
        is_primary: cg.is_primary,
        can_pickup: cg.can_pickup,
      }));
    },
    enabled: !!user?.id,
  });
}

// Hook para pais verem check-ins dos seus filhos
export function useParentChildCheckIns(childId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["parent-child-checkins", childId],
    queryFn: async () => {
      if (!childId) return [];

      const { data, error } = await supabase
        .from("child_check_ins")
        .select("*")
        .eq("child_id", childId)
        .order("event_date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
    enabled: !!childId && !!user?.id,
  });
}

// Hook para pais verem filhos presentes agora
export function useParentPresentChildren() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["parent-present-children", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar guardian do usuário
      const { data: guardianData, error: guardianError } = await supabase
        .from("guardians")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (guardianError || !guardianData) return [];

      // Buscar filhos vinculados
      const { data: childGuardiansData, error: cgError } = await supabase
        .from("child_guardians")
        .select("child_id")
        .eq("guardian_id", guardianData.id);

      if (cgError || !childGuardiansData.length) return [];

      const childIds = childGuardiansData.map(cg => cg.child_id);

      // Buscar check-ins ativos para esses filhos
      const { data, error } = await supabase
        .from("child_check_ins")
        .select(`
          *,
          children:child_id (id, full_name, photo_url, classroom)
        `)
        .in("child_id", childIds)
        .eq("event_date", today)
        .is("checked_out_at", null);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Hook para autorizações temporárias
export function usePickupAuthorizations(childId: string | undefined) {
  return useQuery({
    queryKey: ["pickup-authorizations", childId],
    queryFn: async () => {
      if (!childId) return [];

      const { data, error } = await supabase
        .from("pickup_authorizations")
        .select("*")
        .eq("child_id", childId)
        .in("status", ["pending", "approved", "active"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PickupAuthorization[];
    },
    enabled: !!childId,
  });
}

// Hook para autorizações válidas (para checkout)
export function useValidPickupAuthorizations(childId: string | undefined) {
  return useQuery({
    queryKey: ["valid-pickup-authorizations", childId],
    queryFn: async () => {
      if (!childId) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("pickup_authorizations")
        .select("*")
        .eq("child_id", childId)
        .in("status", ["approved", "active"])
        .lte("valid_from", now)
        .or(`valid_until.is.null,valid_until.gte.${now}`);

      if (error) throw error;
      return data as PickupAuthorization[];
    },
    enabled: !!childId,
  });
}

// Mutations para autorizações
export function usePickupAuthorizationMutations() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const createAuthorization = useMutation({
    mutationFn: async (data: {
      child_id: string;
      authorized_person_name: string;
      authorized_person_phone?: string;
      authorized_person_document?: string;
      authorization_type: 'one_time' | 'date_range' | 'permanent';
      valid_from?: string;
      valid_until?: string;
      security_pin: string;
      reason?: string;
      leader_approval_required?: boolean;
    }) => {
      if (!user?.id || !profile?.church_id) throw new Error("Usuário não autenticado");

      const { data: result, error } = await supabase
        .from("pickup_authorizations")
        .insert({
          ...data,
          church_id: profile.church_id,
          authorized_by: user.id,
          status: data.leader_approval_required ? 'pending' : 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Autorização criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pickup-authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["valid-pickup-authorizations"] });
    },
    onError: (error) => {
      toast.error(`Erro ao criar autorização: ${error.message}`);
    },
  });

  const cancelAuthorization = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pickup_authorizations")
        .update({ status: 'cancelled' })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorização cancelada!");
      queryClient.invalidateQueries({ queryKey: ["pickup-authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["valid-pickup-authorizations"] });
    },
    onError: (error) => {
      toast.error(`Erro ao cancelar autorização: ${error.message}`);
    },
  });

  const approveAuthorization = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("pickup_authorizations")
        .update({ 
          status: 'active',
          approved_by_leader: user.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorização aprovada!");
      queryClient.invalidateQueries({ queryKey: ["pickup-authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["valid-pickup-authorizations"] });
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar autorização: ${error.message}`);
    },
  });

  const markAsUsed = useMutation({
    mutationFn: async ({ id, checkInId }: { id: string; checkInId: string }) => {
      const { error } = await supabase
        .from("pickup_authorizations")
        .update({ 
          status: 'used',
          used_at: new Date().toISOString(),
          used_by_checkin_id: checkInId,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["valid-pickup-authorizations"] });
    },
  });

  return {
    createAuthorization,
    cancelAuthorization,
    approveAuthorization,
    markAsUsed,
  };
}

// Mutations para override do líder
export function useLeaderOverrideMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createOverride = useMutation({
    mutationFn: async (data: {
      check_in_id: string;
      reason: string;
      pickup_person_name: string;
      pickup_person_document?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Criar registro de override
      const { data: override, error: overrideError } = await supabase
        .from("leader_checkout_overrides")
        .insert({
          ...data,
          leader_id: user.id,
        })
        .select()
        .single();

      if (overrideError) throw overrideError;

      // Realizar o checkout
      const { error: checkoutError } = await supabase
        .from("child_check_ins")
        .update({
          checked_out_at: new Date().toISOString(),
          checked_out_by: user.id,
          pickup_person_name: `${data.pickup_person_name} (Override: ${data.reason})`,
          pickup_method: "LEADER_OVERRIDE",
        })
        .eq("id", data.check_in_id);

      if (checkoutError) throw checkoutError;

      return override;
    },
    onSuccess: () => {
      toast.success("Check-out de emergência realizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["today-check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["present-children"] });
      queryClient.invalidateQueries({ queryKey: ["parent-present-children"] });
    },
    onError: (error) => {
      toast.error(`Erro no check-out de emergência: ${error.message}`);
    },
  });

  return { createOverride };
}
