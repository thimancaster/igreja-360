import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

export interface VolunteerSchedule {
  id: string;
  church_id: string;
  ministry_id: string;
  volunteer_id: string;
  volunteer_name?: string;
  schedule_date: string;
  shift_start: string;
  shift_end: string;
  schedule_type: 'primary' | 'backup';
  confirmed: boolean;
  confirmed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateScheduleData {
  ministry_id: string;
  volunteer_id: string;
  schedule_date: string;
  shift_start: string;
  shift_end: string;
  schedule_type?: 'primary' | 'backup';
  notes?: string;
}

export function useVolunteerSchedules(ministryId?: string, month?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentMonth = month || new Date();
  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  // Fetch schedules for a ministry in a given month
  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ["volunteer-schedules", ministryId, startDate, endDate],
    queryFn: async () => {
      if (!ministryId) return [];

      const { data, error } = await supabase
        .from("volunteer_schedules")
        .select(`
          *,
          volunteer:department_volunteers!inner(full_name)
        `)
        .eq("ministry_id", ministryId)
        .gte("schedule_date", startDate)
        .lte("schedule_date", endDate)
        .order("schedule_date")
        .order("shift_start");

      if (error) {
        console.error("Error fetching schedules:", error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        ...item,
        volunteer_name: item.volunteer?.full_name,
      })) as VolunteerSchedule[];
    },
    enabled: !!ministryId,
  });

  // Fetch my schedules (for volunteers)
  const { data: mySchedules, isLoading: mySchedulesLoading } = useQuery({
    queryKey: ["my-volunteer-schedules", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get volunteer IDs for current user
      const { data: volunteerData } = await supabase
        .from("department_volunteers")
        .select("id, ministry_id, ministries(name)")
        .eq("profile_id", user.id)
        .eq("status", "active");

      if (!volunteerData || volunteerData.length === 0) return [];

      const volunteerIds = volunteerData.map(v => v.id);

      const { data, error } = await supabase
        .from("volunteer_schedules")
        .select("*")
        .in("volunteer_id", volunteerIds)
        .gte("schedule_date", startDate)
        .lte("schedule_date", endDate)
        .order("schedule_date")
        .order("shift_start");

      if (error) {
        console.error("Error fetching my schedules:", error);
        throw error;
      }

      // Attach ministry names
      return (data || []).map((schedule: any) => {
        const volunteer = volunteerData.find(v => v.id === schedule.volunteer_id);
        return {
          ...schedule,
          ministry_name: (volunteer?.ministries as any)?.name || "Ministério",
        };
      });
    },
    enabled: !!user?.id,
  });

  // Create schedule
  const createMutation = useMutation({
    mutationFn: async (data: CreateScheduleData) => {
      // Get church_id from user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada");
      }

      const { data: schedule, error } = await supabase
        .from("volunteer_schedules")
        .insert({
          church_id: profile.church_id,
          ministry_id: data.ministry_id,
          volunteer_id: data.volunteer_id,
          schedule_date: data.schedule_date,
          shift_start: data.shift_start,
          shift_end: data.shift_end,
          schedule_type: data.schedule_type || "primary",
          notes: data.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return schedule;
    },
    onSuccess: () => {
      toast.success("Escala criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["my-volunteer-schedules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar escala");
    },
  });

  // Update schedule
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VolunteerSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from("volunteer_schedules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Escala atualizada!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["my-volunteer-schedules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar escala");
    },
  });

  // Delete schedule
  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from("volunteer_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escala removida");
      queryClient.invalidateQueries({ queryKey: ["volunteer-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["my-volunteer-schedules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover escala");
    },
  });

  // Confirm schedule (volunteer action)
  const confirmMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from("volunteer_schedules")
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Presença confirmada!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["my-volunteer-schedules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao confirmar presença");
    },
  });

  // Group schedules by date for calendar view
  const schedulesByDate = (schedules || []).reduce((acc, schedule) => {
    const date = schedule.schedule_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, VolunteerSchedule[]>);

  // Check for conflicts
  const hasConflict = (volunteerId: string, date: string, start: string, end: string, excludeId?: string) => {
    return (schedules || []).some(s => {
      if (excludeId && s.id === excludeId) return false;
      if (s.volunteer_id !== volunteerId || s.schedule_date !== date) return false;
      
      // Check time overlap
      const existingStart = s.shift_start;
      const existingEnd = s.shift_end;
      return (start < existingEnd && end > existingStart);
    });
  };

  return {
    schedules: schedules || [],
    schedulesByDate,
    mySchedules: mySchedules || [],
    isLoading,
    mySchedulesLoading,
    refetch,
    createSchedule: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSchedule: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteSchedule: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    confirmSchedule: confirmMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    hasConflict,
  };
}
