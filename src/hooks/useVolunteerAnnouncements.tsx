import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface VolunteerAnnouncement {
  id: string;
  church_id: string;
  ministry_id: string;
  ministry_name?: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent' | 'meeting';
  meeting_date: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  is_read?: boolean;
}

export interface CreateAnnouncementData {
  ministry_id: string;
  title: string;
  content: string;
  priority?: 'normal' | 'urgent' | 'meeting';
  meeting_date?: string;
  is_published?: boolean;
}

export function useVolunteerAnnouncements(ministryId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch announcements for a ministry (for leaders)
  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ["volunteer-announcements", ministryId],
    queryFn: async () => {
      if (!ministryId) return [];

      const { data, error } = await supabase
        .from("volunteer_announcements")
        .select("*")
        .eq("ministry_id", ministryId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
        throw error;
      }

      return (data || []) as VolunteerAnnouncement[];
    },
    enabled: !!ministryId,
  });

  // Fetch my announcements (for volunteers - across all ministries)
  const { data: myAnnouncements, isLoading: myAnnouncementsLoading } = useQuery({
    queryKey: ["my-volunteer-announcements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get volunteer records for current user
      const { data: volunteerData } = await supabase
        .from("department_volunteers")
        .select("id, ministry_id, ministries(name)")
        .eq("profile_id", user.id)
        .eq("status", "active");

      if (!volunteerData || volunteerData.length === 0) return [];

      const ministryIds = volunteerData.map(v => v.ministry_id);
      const volunteerIds = volunteerData.map(v => v.id);

      // Get published announcements for those ministries
      const { data: announcementsData, error } = await supabase
        .from("volunteer_announcements")
        .select("*")
        .in("ministry_id", ministryIds)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching my announcements:", error);
        throw error;
      }

      // Get read status
      const { data: readsData } = await supabase
        .from("volunteer_announcement_reads")
        .select("announcement_id")
        .in("volunteer_id", volunteerIds);

      const readAnnouncementIds = new Set((readsData || []).map(r => r.announcement_id));

      // Attach ministry names and read status
      return (announcementsData || []).map((announcement: any) => {
        const volunteer = volunteerData.find(v => v.ministry_id === announcement.ministry_id);
        return {
          ...announcement,
          ministry_name: (volunteer?.ministries as any)?.name || "Ministério",
          is_read: readAnnouncementIds.has(announcement.id),
        };
      }) as VolunteerAnnouncement[];
    },
    enabled: !!user?.id,
  });

  // Create announcement
  const createMutation = useMutation({
    mutationFn: async (data: CreateAnnouncementData) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada");
      }

      const { data: announcement, error } = await supabase
        .from("volunteer_announcements")
        .insert({
          church_id: profile.church_id,
          ministry_id: data.ministry_id,
          title: data.title,
          content: data.content,
          priority: data.priority || "normal",
          meeting_date: data.meeting_date || null,
          is_published: data.is_published ?? false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return announcement;
    },
    onSuccess: () => {
      toast.success("Comunicado criado!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-announcements"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar comunicado");
    },
  });

  // Update announcement
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VolunteerAnnouncement> & { id: string }) => {
      const { data, error } = await supabase
        .from("volunteer_announcements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Comunicado atualizado!");
      queryClient.invalidateQueries({ queryKey: ["volunteer-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["my-volunteer-announcements"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar comunicado");
    },
  });

  // Delete announcement
  const deleteMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from("volunteer_announcements")
        .delete()
        .eq("id", announcementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comunicado removido");
      queryClient.invalidateQueries({ queryKey: ["volunteer-announcements"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover comunicado");
    },
  });

  // Mark as read (for volunteers)
  const markAsReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      // Get volunteer ID
      const { data: volunteerData } = await supabase
        .from("department_volunteers")
        .select("id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (!volunteerData) {
        throw new Error("Voluntário não encontrado");
      }

      const { error } = await supabase
        .from("volunteer_announcement_reads")
        .upsert({
          announcement_id: announcementId,
          volunteer_id: volunteerData.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-volunteer-announcements"] });
    },
  });

  // Count unread announcements
  const unreadCount = (myAnnouncements || []).filter(a => !a.is_read).length;

  return {
    announcements: announcements || [],
    myAnnouncements: myAnnouncements || [],
    unreadCount,
    isLoading,
    myAnnouncementsLoading,
    refetch,
    createAnnouncement: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAnnouncement: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAnnouncement: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    markAsRead: markAsReadMutation.mutateAsync,
  };
}
