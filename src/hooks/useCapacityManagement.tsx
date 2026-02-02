import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ClassroomSettings {
  id: string;
  church_id: string;
  classroom_name: string;
  max_capacity: number;
  min_age_months: number | null;
  max_age_months: number | null;
  ratio_children_per_adult: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClassroomFormData {
  classroom_name: string;
  max_capacity: number;
  min_age_months?: number;
  max_age_months?: number;
  ratio_children_per_adult?: number;
  is_active?: boolean;
}

export interface WaitlistEntry {
  id: string;
  church_id: string;
  child_id: string;
  classroom: string;
  position: number;
  requested_at: string | null;
  status: string;
  notes: string | null;
  notified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  child?: {
    id: string;
    full_name: string;
    birth_date: string;
  };
}

export interface WaitlistFormData {
  child_id: string;
  classroom: string;
  notes?: string;
}

export function useClassroomSettings() {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["classroom-settings", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      
      const { data, error } = await supabase
        .from("classroom_settings")
        .select("*")
        .eq("church_id", churchId)
        .order("classroom_name");

      if (error) throw error;
      return data as ClassroomSettings[];
    },
    enabled: !!churchId,
  });
}

export function useCreateClassroomSettings() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useMutation({
    mutationFn: async (data: ClassroomFormData) => {
      if (!churchId) throw new Error("Church ID not found");

      const { data: result, error } = await supabase
        .from("classroom_settings")
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
      queryClient.invalidateQueries({ queryKey: ["classroom-settings"] });
      toast.success("Sala configurada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating classroom settings:", error);
      toast.error("Erro ao configurar sala");
    },
  });
}

export function useUpdateClassroomSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: ClassroomFormData & { id: string }) => {
      const { data: result, error } = await supabase
        .from("classroom_settings")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-settings"] });
      toast.success("Sala atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating classroom settings:", error);
      toast.error("Erro ao atualizar sala");
    },
  });
}

export function useDeleteClassroomSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("classroom_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-settings"] });
      toast.success("Sala removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting classroom settings:", error);
      toast.error("Erro ao remover sala");
    },
  });
}

export function useWaitlist(classroom?: string) {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["waitlist", churchId, classroom],
    queryFn: async () => {
      if (!churchId) return [];
      
      let query = supabase
        .from("waitlist")
        .select(`
          *,
          child:children(id, full_name, birth_date)
        `)
        .eq("church_id", churchId)
        .order("position");

      if (classroom) {
        query = query.eq("classroom", classroom);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WaitlistEntry[];
    },
    enabled: !!churchId,
  });
}

export function useAddToWaitlist() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useMutation({
    mutationFn: async (data: WaitlistFormData) => {
      if (!churchId) throw new Error("Church ID not found");

      // Get next position
      const { data: existingEntries } = await supabase
        .from("waitlist")
        .select("position")
        .eq("church_id", churchId)
        .eq("classroom", data.classroom)
        .eq("status", "waiting")
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = existingEntries && existingEntries.length > 0 
        ? existingEntries[0].position + 1 
        : 1;

      const { data: result, error } = await supabase
        .from("waitlist")
        .insert({
          church_id: churchId,
          position: nextPosition,
          status: "waiting",
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Criança adicionada à lista de espera!");
    },
    onError: (error) => {
      console.error("Error adding to waitlist:", error);
      toast.error("Erro ao adicionar à lista de espera");
    },
  });
}

export function useUpdateWaitlistStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notified_at }: { id: string; status: string; notified_at?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (notified_at) updateData.notified_at = notified_at;

      const { data: result, error } = await supabase
        .from("waitlist")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Error updating waitlist status:", error);
      toast.error("Erro ao atualizar status");
    },
  });
}

export function useRemoveFromWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("waitlist")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Removido da lista de espera!");
    },
    onError: (error) => {
      console.error("Error removing from waitlist:", error);
      toast.error("Erro ao remover da lista de espera");
    },
  });
}

export function useClassroomOccupancy(classroom: string, eventDate?: string) {
  const { profile } = useAuth();
  const churchId = profile?.church_id;

  return useQuery({
    queryKey: ["classroom-occupancy", churchId, classroom, eventDate],
    queryFn: async () => {
      if (!churchId) return { current: 0, max: 0 };

      // Get classroom settings
      const { data: settings } = await supabase
        .from("classroom_settings")
        .select("max_capacity")
        .eq("church_id", churchId)
        .eq("classroom_name", classroom)
        .single();

      // Get current check-ins for this classroom
      const date = eventDate || new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("child_check_ins")
        .select("*", { count: "exact", head: true })
        .eq("church_id", churchId)
        .eq("classroom", classroom)
        .eq("event_date", date)
        .is("checked_out_at", null);

      return {
        current: count || 0,
        max: settings?.max_capacity || 20,
      };
    },
    enabled: !!churchId && !!classroom,
  });
}
