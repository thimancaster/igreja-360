import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MinistryStaff {
  id: string;
  church_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  trained_classrooms: string[] | null;
  is_active: boolean | null;
  background_check_date: string | null;
  certifications: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StaffFormData {
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  trained_classrooms?: string[];
  is_active?: boolean;
  background_check_date?: string;
  certifications?: string;
  notes?: string;
  profile_id?: string;
}

export interface StaffSchedule {
  id: string;
  church_id: string;
  staff_id: string;
  event_id: string | null;
  classroom: string | null;
  shift_start: string;
  shift_end: string;
  role: string;
  confirmed: boolean | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  staff?: MinistryStaff;
  event?: {
    id: string;
    title: string;
    start_datetime: string;
  };
}

export interface ScheduleFormData {
  staff_id: string;
  event_id?: string;
  classroom?: string;
  shift_start: string;
  shift_end: string;
  role?: string;
  notes?: string;
}

export function useMinistryStaff(activeOnly = false) {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["ministry-staff", churchId, activeOnly],
    queryFn: async () => {
      if (!churchId) return [];
      
      let query = supabase
        .from("ministry_staff")
        .select("*")
        .eq("church_id", churchId)
        .order("full_name");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MinistryStaff[];
    },
    enabled: !!churchId,
  });
}

export function useCreateMinistryStaff() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useMutation({
    mutationFn: async (data: StaffFormData) => {
      if (!churchId) throw new Error("Church ID not found");

      const { data: result, error } = await supabase
        .from("ministry_staff")
        .insert({
          church_id: churchId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-staff"] });
      toast.success("Voluntário cadastrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating ministry staff:", error);
      toast.error("Erro ao cadastrar voluntário");
    },
  });
}

export function useUpdateMinistryStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: StaffFormData & { id: string }) => {
      const { data: result, error } = await supabase
        .from("ministry_staff")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-staff"] });
      toast.success("Voluntário atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating ministry staff:", error);
      toast.error("Erro ao atualizar voluntário");
    },
  });
}

export function useDeleteMinistryStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ministry_staff")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-staff"] });
      toast.success("Voluntário removido com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting ministry staff:", error);
      toast.error("Erro ao remover voluntário");
    },
  });
}

export function useStaffSchedules(startDate?: string, endDate?: string) {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["staff-schedules", churchId, startDate, endDate],
    queryFn: async () => {
      if (!churchId) return [];
      
      let query = supabase
        .from("staff_schedules")
        .select(`
          *,
          staff:ministry_staff(id, full_name, role),
          event:ministry_events(id, title, start_datetime)
        `)
        .eq("church_id", churchId)
        .order("shift_start");

      if (startDate) {
        query = query.gte("shift_start", startDate);
      }
      if (endDate) {
        query = query.lte("shift_end", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StaffSchedule[];
    },
    enabled: !!churchId,
  });
}

export function useCreateStaffSchedule() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      if (!churchId) throw new Error("Church ID not found");

      const { data: result, error } = await supabase
        .from("staff_schedules")
        .insert({
          church_id: churchId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
      toast.success("Escala criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating staff schedule:", error);
      toast.error("Erro ao criar escala");
    },
  });
}

export function useUpdateStaffSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ScheduleFormData> & { id: string; confirmed?: boolean; confirmed_at?: string }) => {
      const { data: result, error } = await supabase
        .from("staff_schedules")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
      toast.success("Escala atualizada!");
    },
    onError: (error) => {
      console.error("Error updating staff schedule:", error);
      toast.error("Erro ao atualizar escala");
    },
  });
}

export function useDeleteStaffSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
      toast.success("Escala removida!");
    },
    onError: (error) => {
      console.error("Error deleting staff schedule:", error);
      toast.error("Erro ao remover escala");
    },
  });
}

export function useCheckScheduleConflicts() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useMutation({
    mutationFn: async ({ staffId, shiftStart, shiftEnd, excludeId }: {
      staffId: string; 
      shiftStart: string; 
      shiftEnd: string;
      excludeId?: string;
    }) => {
      if (!churchId) return [];

      let query = supabase
        .from("staff_schedules")
        .select("*, staff:ministry_staff(full_name)")
        .eq("staff_id", staffId)
        .or(`and(shift_start.lte.${shiftEnd},shift_end.gte.${shiftStart})`);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}
