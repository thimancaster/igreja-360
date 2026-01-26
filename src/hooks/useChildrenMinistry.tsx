import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Child = {
  id: string;
  church_id: string;
  full_name: string;
  birth_date: string;
  photo_url: string | null;
  classroom: string;
  allergies: string | null;
  medications: string | null;
  special_needs: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  image_consent: boolean;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Guardian = {
  id: string;
  church_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  relationship: string;
  access_pin: string | null;
  created_at: string;
  updated_at: string;
};

export type ChildGuardian = {
  id: string;
  child_id: string;
  guardian_id: string;
  is_primary: boolean;
  can_pickup: boolean;
  created_at: string;
};

export type AuthorizedPickup = {
  id: string;
  child_id: string;
  authorized_name: string;
  authorized_phone: string | null;
  authorized_photo: string | null;
  relationship: string | null;
  pickup_pin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChildCheckIn = {
  id: string;
  child_id: string;
  church_id: string;
  event_date: string;
  event_name: string;
  classroom: string | null;
  label_number: string | null;
  qr_code: string;
  checked_in_at: string;
  checked_in_by: string | null;
  checked_out_at: string | null;
  checked_out_by: string | null;
  pickup_person_name: string | null;
  pickup_method: string;
  notes: string | null;
  created_at: string;
};

export type ChildWithGuardians = Child & {
  guardians: (Guardian & { is_primary: boolean; can_pickup: boolean })[];
};

export const CLASSROOMS = [
  "Berçário",
  "Maternal",
  "Infantil 1",
  "Infantil 2",
  "Infantil 3",
  "Pré-adolescente",
];

export const RELATIONSHIPS = [
  "Pai",
  "Mãe",
  "Avô",
  "Avó",
  "Tio",
  "Tia",
  "Irmão(ã)",
  "Outro",
];

export function useChildren() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["children", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("full_name");

      if (error) throw error;
      return data as Child[];
    },
    enabled: !!profile?.church_id,
  });
}

export function useChildWithGuardians(childId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["child-with-guardians", childId],
    queryFn: async () => {
      if (!childId) return null;

      // Fetch child
      const { data: child, error: childError } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .single();

      if (childError) throw childError;

      // Fetch guardians linked to this child
      const { data: childGuardians, error: cgError } = await supabase
        .from("child_guardians")
        .select(`
          guardian_id,
          is_primary,
          can_pickup,
          guardians:guardian_id (*)
        `)
        .eq("child_id", childId);

      if (cgError) throw cgError;

      const guardians = childGuardians.map((cg: any) => ({
        ...cg.guardians,
        is_primary: cg.is_primary,
        can_pickup: cg.can_pickup,
      }));

      return { ...child, guardians } as ChildWithGuardians;
    },
    enabled: !!childId && !!profile?.church_id,
  });
}

// Safe guardian type for display (excludes PII like access_pin)
export type GuardianSafe = Omit<Guardian, 'access_pin' | 'email' | 'phone'> & {
  access_pin?: never;
  email?: never;
  phone?: never;
};

export function useGuardians() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["guardians", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Use guardians_safe view to prevent PII exposure (hashed PINs, emails, phones)
      // Staff with management access can still use the full guardians table when needed
      const { data, error } = await supabase
        .from("guardians_safe")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("full_name");

      if (error) throw error;
      
      // Map to Guardian type with null PII fields for compatibility
      return (data || []).map(g => ({
        ...g,
        email: null,
        phone: null,
        access_pin: null,
      })) as Guardian[];
    },
    enabled: !!profile?.church_id,
  });
}

// Hook to get guardian data for management (admin/tesoureiro/pastor only)
// Uses a SECURITY DEFINER RPC that returns only necessary fields (excludes access_pin)
export function useGuardianManagement() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["guardians-management", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      // Use secure RPC that enforces role checks and excludes access_pin
      const { data, error } = await supabase.rpc("get_guardians_for_management");

      if (error) throw error;
      
      // Map to Guardian type with null access_pin for compatibility
      return (data || []).map((g: any) => ({
        ...g,
        access_pin: null,
      })) as Guardian[];
    },
    enabled: !!profile?.church_id,
  });
}

export function useAuthorizedPickups(childId: string | undefined) {
  return useQuery({
    queryKey: ["authorized-pickups", childId],
    queryFn: async () => {
      if (!childId) return [];

      const { data, error } = await supabase
        .from("authorized_pickups")
        .select("*")
        .eq("child_id", childId)
        .eq("is_active", true)
        .order("authorized_name");

      if (error) throw error;
      return data as AuthorizedPickup[];
    },
    enabled: !!childId,
  });
}

export function useTodayCheckIns() {
  const { profile } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["today-check-ins", profile?.church_id, today],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("child_check_ins")
        .select(`
          *,
          children:child_id (id, full_name, photo_url, classroom)
        `)
        .eq("church_id", profile.church_id)
        .eq("event_date", today)
        .order("checked_in_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

export function usePresentChildren() {
  const { profile } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["present-children", profile?.church_id, today],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("child_check_ins")
        .select(`
          *,
          children:child_id (id, full_name, photo_url, classroom, emergency_contact, emergency_phone)
        `)
        .eq("church_id", profile.church_id)
        .eq("event_date", today)
        .is("checked_out_at", null)
        .order("checked_in_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

export function useChildMutations() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const createChild = useMutation({
    mutationFn: async (child: Omit<Child, "id" | "church_id" | "created_at" | "updated_at">) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");

      const { data, error } = await supabase
        .from("children")
        .insert({ ...child, church_id: profile.church_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Criança cadastrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["children"] });
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar criança: ${error.message}`);
    },
  });

  const updateChild = useMutation({
    mutationFn: async ({ id, ...child }: Partial<Child> & { id: string }) => {
      const { data, error } = await supabase
        .from("children")
        .update(child)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Criança atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["child-with-guardians"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar criança: ${error.message}`);
    },
  });

  const deleteChild = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Criança removida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["children"] });
    },
    onError: (error) => {
      toast.error(`Erro ao remover criança: ${error.message}`);
    },
  });

  const createGuardian = useMutation({
    mutationFn: async (guardian: Omit<Guardian, "id" | "church_id" | "created_at" | "updated_at">) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");

      const { data, error } = await supabase
        .from("guardians")
        .insert({ ...guardian, church_id: profile.church_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Responsável cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar responsável: ${error.message}`);
    },
  });

  const linkGuardianToChild = useMutation({
    mutationFn: async ({ childId, guardianId, isPrimary = false, canPickup = true }: {
      childId: string;
      guardianId: string;
      isPrimary?: boolean;
      canPickup?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("child_guardians")
        .insert({
          child_id: childId,
          guardian_id: guardianId,
          is_primary: isPrimary,
          can_pickup: canPickup,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Responsável vinculado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["child-with-guardians"] });
    },
    onError: (error) => {
      toast.error(`Erro ao vincular responsável: ${error.message}`);
    },
  });

  const checkIn = useMutation({
    mutationFn: async ({ childId, eventName, classroom }: {
      childId: string;
      eventName: string;
      classroom: string;
    }) => {
      if (!profile?.church_id || !user?.id) throw new Error("Usuário não autenticado");

      const today = new Date().toISOString().split("T")[0];
      const qrCode = `${childId}-${today}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const labelNumber = Math.floor(1000 + Math.random() * 9000).toString();

      const { data, error } = await supabase
        .from("child_check_ins")
        .insert({
          child_id: childId,
          church_id: profile.church_id,
          event_date: today,
          event_name: eventName,
          classroom: classroom,
          label_number: labelNumber,
          qr_code: qrCode,
          checked_in_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Check-in realizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["today-check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["present-children"] });
    },
    onError: (error) => {
      toast.error(`Erro no check-in: ${error.message}`);
    },
  });

  const checkOut = useMutation({
    mutationFn: async ({ checkInId, pickupPersonName, pickupMethod = "QR" }: {
      checkInId: string;
      pickupPersonName: string;
      pickupMethod?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("child_check_ins")
        .update({
          checked_out_at: new Date().toISOString(),
          checked_out_by: user.id,
          pickup_person_name: pickupPersonName,
          pickup_method: pickupMethod,
        })
        .eq("id", checkInId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Check-out realizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["today-check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["present-children"] });
    },
    onError: (error) => {
      toast.error(`Erro no check-out: ${error.message}`);
    },
  });

  const findCheckInByQR = async (qrCode: string) => {
    const { data, error } = await supabase
      .from("child_check_ins")
      .select(`
        *,
        children:child_id (id, full_name, photo_url, classroom)
      `)
      .eq("qr_code", qrCode)
      .is("checked_out_at", null)
      .single();

    if (error) throw error;
    return data;
  };

  return {
    createChild,
    updateChild,
    deleteChild,
    createGuardian,
    linkGuardianToChild,
    checkIn,
    checkOut,
    findCheckInByQR,
  };
}
