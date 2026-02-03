import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type MedicationSchedule = {
  id: string;
  church_id: string;
  child_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  administration_times: string[] | null;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  requires_refrigeration: boolean;
  parent_authorization_date: string | null;
  authorized_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MedicationLog = {
  id: string;
  schedule_id: string;
  child_id: string;
  church_id: string;
  administered_at: string;
  administered_by: string;
  dosage_given: string;
  notes: string | null;
  witnessed_by: string | null;
  created_at: string;
};

export type ChildAnamnesis = {
  id: string;
  child_id: string;
  church_id: string;
  blood_type: string | null;
  chronic_conditions: string | null;
  previous_surgeries: string | null;
  hospitalizations: string | null;
  current_medications: string | null;
  vaccination_up_to_date: boolean;
  vaccination_notes: string | null;
  dietary_restrictions: string | null;
  physical_restrictions: string | null;
  behavioral_notes: string | null;
  pediatrician_name: string | null;
  pediatrician_phone: string | null;
  health_insurance: string | null;
  health_insurance_number: string | null;
  photo_consent: boolean;
  medical_treatment_consent: boolean;
  emergency_transport_consent: boolean;
  consent_signed_by: string | null;
  consent_signed_at: string | null;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type IncidentReport = {
  id: string;
  church_id: string;
  child_id: string;
  check_in_id: string | null;
  incident_date: string;
  incident_time: string;
  location: string | null;
  incident_type: string;
  severity: string;
  description: string;
  immediate_action_taken: string | null;
  first_aid_administered: boolean;
  first_aid_details: string | null;
  medical_attention_required: boolean;
  medical_attention_details: string | null;
  witnesses: string[] | null;
  staff_present: string[] | null;
  parent_notified_at: string | null;
  parent_notified_by: string | null;
  parent_response: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  follow_up_completed_at: string | null;
  reported_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

// =====================================================
// Medication Schedules
// =====================================================

export function useMedicationSchedules(childId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["medication-schedules", profile?.church_id, childId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("medication_schedules")
        .select(`
          *,
          children:child_id (id, full_name, photo_url, classroom)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false });

      if (childId) {
        query = query.eq("child_id", childId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

export function useActiveMedications() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["active-medications", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("medication_schedules")
        .select(`
          *,
          children:child_id (id, full_name, photo_url, classroom)
        `)
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("medication_name");

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

export function useMedicationMutations() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<MedicationSchedule, "id" | "church_id" | "created_at" | "updated_at">) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");

      const { data, error } = await supabase
        .from("medication_schedules")
        .insert({ ...schedule, church_id: profile.church_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Medicação cadastrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["medication-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["active-medications"] });
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar medicação: ${error.message}`);
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...schedule }: Partial<MedicationSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from("medication_schedules")
        .update(schedule)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Medicação atualizada!");
      queryClient.invalidateQueries({ queryKey: ["medication-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["active-medications"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const logAdministration = useMutation({
    mutationFn: async (log: Omit<MedicationLog, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("medication_logs")
        .insert(log)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Administração registrada!");
      queryClient.invalidateQueries({ queryKey: ["medication-logs"] });
    },
    onError: (error) => {
      toast.error(`Erro ao registrar: ${error.message}`);
    },
  });

  return { createSchedule, updateSchedule, logAdministration };
}

// =====================================================
// Anamnesis
// =====================================================

export function useChildAnamnesis(childId: string | undefined) {
  return useQuery({
    queryKey: ["child-anamnesis", childId],
    queryFn: async () => {
      if (!childId) return null;

      const { data, error } = await supabase
        .from("child_anamnesis")
        .select("*")
        .eq("child_id", childId)
        .maybeSingle();

      if (error) throw error;
      return data as ChildAnamnesis | null;
    },
    enabled: !!childId,
  });
}

export function useAnamnesisMutations() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const upsertAnamnesis = useMutation({
    mutationFn: async (anamnesis: Partial<ChildAnamnesis> & { child_id: string }) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");

      const { data, error } = await supabase
        .from("child_anamnesis")
        .upsert(
          { ...anamnesis, church_id: profile.church_id },
          { onConflict: "child_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ficha de anamnese salva!");
      queryClient.invalidateQueries({ queryKey: ["child-anamnesis"] });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar anamnese: ${error.message}`);
    },
  });

  return { upsertAnamnesis };
}

// =====================================================
// Incident Reports
// =====================================================

export function useIncidentReports(childId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["incident-reports", profile?.church_id, childId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("incident_reports")
        .select(`
          *,
          children:child_id (id, full_name, photo_url, classroom)
        `)
        .eq("church_id", profile.church_id)
        .order("incident_date", { ascending: false })
        .order("incident_time", { ascending: false });

      if (childId) {
        query = query.eq("child_id", childId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

export function useOpenIncidents() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["open-incidents", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("incident_reports")
        .select(`
          *,
          children:child_id (id, full_name, photo_url, classroom)
        `)
        .eq("church_id", profile.church_id)
        .in("status", ["open", "in_review"])
        .order("severity", { ascending: false })
        .order("incident_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });
}

export function useIncidentMutations() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const createIncident = useMutation({
    mutationFn: async (incident: Omit<IncidentReport, "id" | "church_id" | "created_at" | "updated_at" | "reported_by"> & { reported_by?: string }) => {
      if (!profile?.church_id || !user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("incident_reports")
        .insert({
          ...incident,
          church_id: profile.church_id,
          reported_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Incidente registrado!");
      queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
      queryClient.invalidateQueries({ queryKey: ["open-incidents"] });
    },
    onError: (error) => {
      toast.error(`Erro ao registrar incidente: ${error.message}`);
    },
  });

  const updateIncident = useMutation({
    mutationFn: async ({ id, ...incident }: Partial<IncidentReport> & { id: string }) => {
      const { data, error } = await supabase
        .from("incident_reports")
        .update(incident)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Incidente atualizado!");
      queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
      queryClient.invalidateQueries({ queryKey: ["open-incidents"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const notifyParent = useMutation({
    mutationFn: async ({ incidentId, response }: { incidentId: string; response?: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("incident_reports")
        .update({
          parent_notified_at: new Date().toISOString(),
          parent_notified_by: user.id,
          parent_response: response,
        })
        .eq("id", incidentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Notificação aos pais registrada!");
      queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
    },
    onError: (error) => {
      toast.error(`Erro ao notificar: ${error.message}`);
    },
  });

  return { createIncident, updateIncident, notifyParent };
}

// =====================================================
// Constants
// =====================================================

export const INCIDENT_TYPES = [
  { value: "injury", label: "Lesão" },
  { value: "illness", label: "Doença/Mal-estar" },
  { value: "behavioral", label: "Comportamental" },
  { value: "accident", label: "Acidente" },
  { value: "other", label: "Outro" },
];

export const SEVERITY_LEVELS = [
  { value: "low", label: "Baixa", color: "bg-green-500" },
  { value: "medium", label: "Média", color: "bg-yellow-500" },
  { value: "high", label: "Alta", color: "bg-orange-500" },
  { value: "critical", label: "Crítica", color: "bg-red-500" },
];

export const INCIDENT_STATUS = [
  { value: "open", label: "Aberto" },
  { value: "in_review", label: "Em Análise" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
