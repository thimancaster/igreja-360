import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DepartmentVolunteer {
  id: string;
  church_id: string;
  ministry_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  skills: string[];
  status: 'pending' | 'active' | 'inactive';
  invited_by: string | null;
  invited_at: string;
  term_accepted_at: string | null;
  term_version: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface InviteVolunteerData {
  ministry_id: string;
  profile_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  role?: string;
  skills?: string[];
  notes?: string;
}

export function useDepartmentVolunteers(ministryId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch volunteers for a specific ministry
  const { data: volunteers, isLoading, refetch } = useQuery({
    queryKey: ["department-volunteers", ministryId],
    queryFn: async () => {
      if (!ministryId) return [];

      const { data, error } = await supabase
        .from("department_volunteers")
        .select("*")
        .eq("ministry_id", ministryId)
        .eq("is_active", true)
        .order("full_name");

      if (error) {
        console.error("Error fetching volunteers:", error);
        throw error;
      }

      return (data || []) as DepartmentVolunteer[];
    },
    enabled: !!ministryId,
  });

  // Invite a new volunteer
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteVolunteerData) => {
      // Get church_id from user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada");
      }

      // Create volunteer record
      const { data: volunteer, error } = await supabase
        .from("department_volunteers")
        .insert({
          church_id: profile.church_id,
          ministry_id: data.ministry_id,
          profile_id: data.profile_id || null,
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          role: data.role || "membro",
          skills: data.skills || [],
          status: "pending",
          invited_by: user?.id,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Este membro já é voluntário neste ministério");
        }
        throw error;
      }

      // Try to send invite email via edge function
      if (data.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-volunteer-invite", {
            body: {
              volunteer_id: volunteer.id,
              email: data.email,
              volunteer_name: data.full_name,
              ministry_id: data.ministry_id,
            },
          });

          if (emailError) {
            console.warn("Failed to send invite email:", emailError);
          }
        } catch (e) {
          console.warn("Email sending failed:", e);
        }
      }

      return volunteer;
    },
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["department-volunteers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao convidar voluntário");
    },
  });

  // Update volunteer
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DepartmentVolunteer> & { id: string }) => {
      const { data, error } = await supabase
        .from("department_volunteers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Voluntário atualizado!");
      queryClient.invalidateQueries({ queryKey: ["department-volunteers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar voluntário");
    },
  });

  // Deactivate volunteer
  const deactivateMutation = useMutation({
    mutationFn: async (volunteerId: string) => {
      const { error } = await supabase
        .from("department_volunteers")
        .update({ is_active: false, status: "inactive" })
        .eq("id", volunteerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voluntário desativado");
      queryClient.invalidateQueries({ queryKey: ["department-volunteers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao desativar voluntário");
    },
  });

  // Reactivate volunteer
  const reactivateMutation = useMutation({
    mutationFn: async (volunteerId: string) => {
      const { error } = await supabase
        .from("department_volunteers")
        .update({ is_active: true, status: "active" })
        .eq("id", volunteerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voluntário reativado!");
      queryClient.invalidateQueries({ queryKey: ["department-volunteers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao reativar voluntário");
    },
  });

  // Get active volunteers only
  const activeVolunteers = (volunteers || []).filter(v => v.status === 'active');
  const pendingVolunteers = (volunteers || []).filter(v => v.status === 'pending');

  return {
    volunteers: volunteers || [],
    activeVolunteers,
    pendingVolunteers,
    isLoading,
    refetch,
    inviteVolunteer: inviteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    updateVolunteer: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deactivateVolunteer: deactivateMutation.mutateAsync,
    reactivateVolunteer: reactivateMutation.mutateAsync,
  };
}
