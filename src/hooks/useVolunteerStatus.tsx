import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VolunteerMembership {
  id: string;
  ministry_id: string;
  ministry_name: string;
  role: string;
  status: 'pending' | 'active' | 'inactive';
  term_accepted_at: string | null;
  invited_at: string;
}

export interface PendingInvite {
  id: string;
  ministry_id: string;
  ministry_name: string;
  church_name: string;
  invited_by_name: string;
  invited_at: string;
}

export function useVolunteerStatus() {
  const { user } = useAuth();

  // Fetch all volunteer memberships for current user
  const { data: memberships, isLoading: membershipsLoading, refetch: refetchMemberships } = useQuery({
    queryKey: ["volunteer-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("department_volunteers")
        .select(`
          id,
          ministry_id,
          role,
          status,
          term_accepted_at,
          invited_at,
          ministries!inner(name)
        `)
        .eq("profile_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching volunteer memberships:", error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        ministry_id: item.ministry_id,
        ministry_name: item.ministries?.name || "Ministério",
        role: item.role,
        status: item.status as 'pending' | 'active' | 'inactive',
        term_accepted_at: item.term_accepted_at,
        invited_at: item.invited_at,
      })) as VolunteerMembership[];
    },
    enabled: !!user?.id,
  });

  // Fetch pending invites with more details
  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ["pending-volunteer-invites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("department_volunteers")
        .select(`
          id,
          ministry_id,
          invited_at,
          invited_by,
          ministries!inner(name, church_id, churches!inner(name)),
          inviter:profiles!department_volunteers_invited_by_fkey(full_name)
        `)
        .eq("profile_id", user.id)
        .eq("status", "pending")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching pending invites:", error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        ministry_id: item.ministry_id,
        ministry_name: item.ministries?.name || "Ministério",
        church_name: item.ministries?.churches?.name || "Igreja",
        invited_by_name: item.inviter?.full_name || "Líder",
        invited_at: item.invited_at,
      })) as PendingInvite[];
    },
    enabled: !!user?.id,
  });

  // Check if user is an active volunteer of any ministry
  const isVolunteer = (memberships || []).some(m => m.status === 'active');

  // Check if user has pending invites
  const hasPendingInvites = (pendingInvites || []).length > 0;

  // Get ministries where user is active volunteer
  const activeMinistries = (memberships || []).filter(m => m.status === 'active');

  // Accept volunteer term
  const acceptTerm = async (volunteerId: string, termVersion: string) => {
    const { error } = await supabase
      .from("department_volunteers")
      .update({
        status: "active",
        term_accepted_at: new Date().toISOString(),
        term_version: termVersion,
      })
      .eq("id", volunteerId)
      .eq("profile_id", user?.id);

    if (error) {
      throw error;
    }

    await refetchMemberships();
  };

  // Decline invite
  const declineInvite = async (volunteerId: string) => {
    const { error } = await supabase
      .from("department_volunteers")
      .update({
        status: "inactive",
        is_active: false,
      })
      .eq("id", volunteerId)
      .eq("profile_id", user?.id);

    if (error) {
      throw error;
    }

    await refetchMemberships();
  };

  return {
    memberships: memberships || [],
    pendingInvites: pendingInvites || [],
    isVolunteer,
    hasPendingInvites,
    activeMinistries,
    isLoading: membershipsLoading || invitesLoading,
    acceptTerm,
    declineInvite,
    refetch: refetchMemberships,
  };
}
