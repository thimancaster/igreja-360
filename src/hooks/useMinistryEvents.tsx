import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MinistryEvent {
  id: string;
  church_id: string;
  ministry_id: string | null;
  title: string;
  description: string | null;
  event_type: "service" | "special" | "activity" | "meeting";
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  location: string | null;
  recurring: boolean;
  recurrence_rule: string | null;
  max_capacity: number | null;
  registration_required: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  registrations_count?: number;
}

export interface EventFormData {
  title: string;
  description?: string;
  event_type: "service" | "special" | "activity" | "meeting";
  start_datetime: string;
  end_datetime?: string | null;
  all_day?: boolean;
  location?: string;
  recurring?: boolean;
  recurrence_rule?: string;
  max_capacity?: number | null;
  registration_required?: boolean;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  child_id: string;
  guardian_id: string;
  status: "registered" | "waitlisted" | "cancelled";
  registered_at: string;
  notes: string | null;
  child?: {
    full_name: string;
    classroom: string;
  };
}

export function useMinistryEvents() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const churchId = profile?.church_id;

  // Fetch all events
  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ministry-events", churchId],
    queryFn: async () => {
      if (!churchId) return [];

      const { data, error } = await supabase
        .from("ministry_events")
        .select("*")
        .eq("church_id", churchId)
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      return data as MinistryEvent[];
    },
    enabled: !!churchId && !!user,
  });

  // Fetch upcoming events (next 30 days)
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcoming-events", churchId],
    queryFn: async () => {
      if (!churchId) return [];

      const now = new Date().toISOString();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from("ministry_events")
        .select("*")
        .eq("church_id", churchId)
        .gte("start_datetime", now)
        .lte("start_datetime", thirtyDaysFromNow.toISOString())
        .order("start_datetime", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as MinistryEvent[];
    },
    enabled: !!churchId && !!user,
  });

  // Fetch registrations for an event
  const useEventRegistrations = (eventId: string | null) => {
    return useQuery({
      queryKey: ["event-registrations", eventId],
      queryFn: async () => {
        if (!eventId) return [];

        const { data, error } = await supabase
          .from("event_registrations")
          .select(`
            *,
            child:children(full_name, classroom)
          `)
          .eq("event_id", eventId)
          .order("registered_at", { ascending: true });

        if (error) throw error;
        return data as EventRegistration[];
      },
      enabled: !!eventId,
    });
  };

  // Create event
  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!churchId || !user?.id) throw new Error("Missing church or user");

      const insertData = {
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
        created_by: user.id,
      };

      const { data: result, error } = await supabase
        .from("ministry_events")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast.error("Erro ao criar evento");
    },
  });

  // Update event
  const updateMutation = useMutation({
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
          recurring: data.recurring || false,
          recurrence_rule: data.recurrence_rule || null,
          max_capacity: data.max_capacity || null,
          registration_required: data.registration_required || false,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Evento atualizado!");
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast.error("Erro ao atualizar evento");
    },
  });

  // Delete event
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ministry_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Evento excluído!");
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast.error("Erro ao excluir evento");
    },
  });

  // Register child for event
  const registerChildMutation = useMutation({
    mutationFn: async ({
      eventId,
      childId,
      guardianId,
      notes,
    }: {
      eventId: string;
      childId: string;
      guardianId: string;
      notes?: string;
    }) => {
      // Check event capacity
      const event = events.find((e) => e.id === eventId);
      if (event?.max_capacity) {
        const { count } = await supabase
          .from("event_registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("status", "registered");

        const status = (count || 0) >= event.max_capacity ? "waitlisted" : "registered";

        const { error } = await supabase.from("event_registrations").insert({
          event_id: eventId,
          child_id: childId,
          guardian_id: guardianId,
          status,
          notes: notes || null,
        });

        if (error) throw error;
        return { status };
      }

      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        child_id: childId,
        guardian_id: guardianId,
        notes: notes || null,
      });

      if (error) throw error;
      return { status: "registered" };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations"] });
      if (result.status === "waitlisted") {
        toast.info("Criança adicionada à lista de espera");
      } else {
        toast.success("Inscrição realizada!");
      }
    },
    onError: (error) => {
      console.error("Error registering:", error);
      toast.error("Erro ao realizar inscrição");
    },
  });

  // Cancel registration
  const cancelRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: "cancelled" })
        .eq("id", registrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations"] });
      toast.success("Inscrição cancelada");
    },
    onError: (error) => {
      console.error("Error cancelling registration:", error);
      toast.error("Erro ao cancelar inscrição");
    },
  });

  return {
    events,
    upcomingEvents,
    isLoading,
    error,

    useEventRegistrations,

    createEvent: createMutation.mutate,
    updateEvent: updateMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    registerChild: registerChildMutation.mutate,
    cancelRegistration: cancelRegistrationMutation.mutate,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRegistering: registerChildMutation.isPending,
  };
}
