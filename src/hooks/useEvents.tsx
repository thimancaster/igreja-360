import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ChurchEvent {
  id: string;
  church_id: string;
  ministry_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  location: string | null;
  recurring: boolean;
  recurrence_rule: string | null;
  max_capacity: number | null;
  registration_required: boolean;
  ticket_price: number;
  is_paid_event: boolean;
  registration_deadline: string | null;
  cover_image_url: string | null;
  status: string;
  visibility: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ministry?: { name: string } | null;
}

export interface EventFormData {
  title: string;
  description?: string;
  event_type: string;
  start_datetime: string;
  end_datetime?: string | null;
  all_day?: boolean;
  location?: string;
  recurring?: boolean;
  recurrence_rule?: string;
  max_capacity?: number | null;
  registration_required?: boolean;
  ministry_id?: string | null;
  ticket_price?: number;
  is_paid_event?: boolean;
  registration_deadline?: string | null;
  cover_image_url?: string | null;
  status?: string;
  visibility?: string;
  tags?: string[];
}

export function useEvents() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const churchId = profile?.church_id;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["church-events", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      const { data, error } = await supabase
        .from("ministry_events")
        .select("*, ministry:ministries(name)")
        .eq("church_id", churchId)
        .order("start_datetime", { ascending: false });
      if (error) throw error;
      return data as ChurchEvent[];
    },
    enabled: !!churchId && !!user,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcoming-church-events", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("ministry_events")
        .select("*, ministry:ministries(name)")
        .eq("church_id", churchId)
        .gte("start_datetime", now)
        .order("start_datetime", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as ChurchEvent[];
    },
    enabled: !!churchId && !!user,
  });

  const { data: todayEvents = [] } = useQuery({
    queryKey: ["today-events", churchId],
    queryFn: async () => {
      if (!churchId) return [];
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const { data, error } = await supabase
        .from("ministry_events")
        .select("*")
        .eq("church_id", churchId)
        .gte("start_datetime", startOfDay)
        .lt("start_datetime", endOfDay)
        .order("start_datetime", { ascending: true });
      if (error) throw error;
      return data as ChurchEvent[];
    },
    enabled: !!churchId && !!user,
  });

  const createEvent = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!churchId || !user?.id) throw new Error("Missing church or user");
      const { data: result, error } = await supabase
        .from("ministry_events")
        .insert({
          church_id: churchId,
          title: data.title,
          description: data.description || null,
          event_type: data.event_type,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime || null,
          all_day: data.all_day || false,
          location: data.location || null,
          recurring: data.recurring || false,
          recurrence_rule: data.recurrence_rule || null,
          max_capacity: data.max_capacity || null,
          registration_required: data.registration_required || false,
          ministry_id: data.ministry_id || null,
          ticket_price: data.ticket_price || 0,
          is_paid_event: data.is_paid_event || false,
          registration_deadline: data.registration_deadline || null,
          cover_image_url: data.cover_image_url || null,
          status: data.status || "published",
          visibility: data.visibility || "members",
          tags: data.tags || [],
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-church-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-events"] });
      queryClient.invalidateQueries({ queryKey: ["ministry-events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: () => toast.error("Erro ao criar evento"),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventFormData> }) => {
      const { error } = await supabase
        .from("ministry_events")
        .update({
          title: data.title,
          description: data.description || null,
          event_type: data.event_type,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime || null,
          all_day: data.all_day || false,
          location: data.location || null,
          max_capacity: data.max_capacity || null,
          registration_required: data.registration_required || false,
          ministry_id: data.ministry_id || null,
          ticket_price: data.ticket_price || 0,
          is_paid_event: data.is_paid_event || false,
          registration_deadline: data.registration_deadline || null,
          status: data.status || "published",
          visibility: data.visibility || "members",
          tags: data.tags || [],
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-church-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-events"] });
      queryClient.invalidateQueries({ queryKey: ["ministry-events"] });
      toast.success("Evento atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar evento"),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ministry_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-church-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-events"] });
      queryClient.invalidateQueries({ queryKey: ["ministry-events"] });
      toast.success("Evento excluído!");
    },
    onError: () => toast.error("Erro ao excluir evento"),
  });

  return {
    events,
    upcomingEvents,
    todayEvents,
    isLoading,
    createEvent: createEvent.mutate,
    updateEvent: updateEvent.mutate,
    deleteEvent: deleteEvent.mutate,
    isCreating: createEvent.isPending,
    isUpdating: updateEvent.isPending,
  };
}
