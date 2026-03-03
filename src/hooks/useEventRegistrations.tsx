import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EventRegistration {
  id: string;
  event_id: string;
  church_id: string | null;
  profile_id: string | null;
  member_id: string | null;
  child_id: string | null;
  guardian_id: string | null;
  status: string;
  payment_status: string;
  payment_amount: number;
  payment_date: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  ticket_number: string | null;
  notes: string | null;
  registered_at: string;
  profiles?: { full_name: string } | null;
  members?: { full_name: string } | null;
  children?: { full_name: string; classroom: string } | null;
}

export function useEventRegistrations(eventId?: string | null) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const churchId = profile?.church_id;

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["event-registrations-v2", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("registered_at", { ascending: true });
      if (error) throw error;
      return data as EventRegistration[];
    },
    enabled: !!eventId,
  });

  const { data: myRegistrations = [] } = useQuery({
    queryKey: ["my-event-registrations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, event:ministry_events(id, title, start_datetime, end_datetime, location, event_type, status)")
        .eq("profile_id", user.id)
        .neq("status", "cancelled")
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const registerForEvent = useMutation({
    mutationFn: async ({ eventId, notes }: { eventId: string; notes?: string }) => {
      if (!user?.id || !churchId) throw new Error("Not authenticated");
      
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("event_registrations")
        .insert({
          event_id: eventId,
          profile_id: user.id,
          church_id: churchId,
          status: "registered",
          payment_status: "free",
          ticket_number: ticketNumber,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations-v2"] });
      queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] });
      toast.success("Inscrição realizada com sucesso!");
    },
    onError: () => toast.error("Erro ao realizar inscrição"),
  });

  const cancelRegistration = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: "cancelled" })
        .eq("id", registrationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations-v2"] });
      queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] });
      toast.success("Inscrição cancelada");
    },
    onError: () => toast.error("Erro ao cancelar inscrição"),
  });

  const checkInRegistration = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ check_in_at: new Date().toISOString(), status: "checked_in" })
        .eq("id", registrationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations-v2"] });
      toast.success("Check-in realizado!");
    },
    onError: () => toast.error("Erro no check-in"),
  });

  const checkOutRegistration = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ check_out_at: new Date().toISOString(), status: "checked_out" })
        .eq("id", registrationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-registrations-v2"] });
      toast.success("Check-out realizado!");
    },
    onError: () => toast.error("Erro no check-out"),
  });

  const registeredCount = registrations.filter(r => r.status === "registered" || r.status === "checked_in").length;
  const checkedInCount = registrations.filter(r => r.status === "checked_in").length;
  const paidCount = registrations.filter(r => r.payment_status === "paid").length;
  const totalRevenue = registrations.filter(r => r.payment_status === "paid").reduce((sum, r) => sum + (r.payment_amount || 0), 0);

  return {
    registrations,
    myRegistrations,
    isLoading,
    registeredCount,
    checkedInCount,
    paidCount,
    totalRevenue,
    registerForEvent: registerForEvent.mutate,
    cancelRegistration: cancelRegistration.mutate,
    checkInRegistration: checkInRegistration.mutate,
    checkOutRegistration: checkOutRegistration.mutate,
    isRegistering: registerForEvent.isPending,
  };
}
