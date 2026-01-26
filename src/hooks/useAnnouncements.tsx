import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Announcement {
  id: string;
  church_id: string;
  ministry_id: string | null;
  title: string;
  content: string;
  priority: "normal" | "urgent";
  target_audience: "all" | "classroom" | "specific_children";
  target_classrooms: string[];
  target_child_ids: string[];
  scheduled_at: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  priority: "normal" | "urgent";
  target_audience: "all" | "classroom" | "specific_children";
  target_classrooms?: string[];
  target_child_ids?: string[];
  scheduled_at?: string | null;
  publish_now?: boolean;
}

export function useAnnouncements() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const churchId = profile?.church_id;

  // Fetch announcements for staff
  const {
    data: announcements = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["announcements", churchId],
    queryFn: async () => {
      if (!churchId) return [];

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!churchId && !!user,
  });

  // Fetch announcements for parents (with read status)
  const {
    data: parentAnnouncements = [],
    isLoading: isLoadingParent,
  } = useQuery({
    queryKey: ["parent-announcements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from("announcements")
        .select("*")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });

      if (announcementsError) throw announcementsError;

      // Get read status
      const { data: readsData } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);

      const readIds = new Set(readsData?.map((r) => r.announcement_id) || []);

      return (announcementsData || []).map((a) => ({
        ...a,
        is_read: readIds.has(a.id),
      })) as Announcement[];
    },
    enabled: !!user?.id,
  });

  // Create announcement
  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      if (!churchId || !user?.id) throw new Error("Missing church or user");

      const insertData = {
        church_id: churchId,
        title: data.title,
        content: data.content,
        priority: data.priority,
        target_audience: data.target_audience,
        target_classrooms: data.target_classrooms || [],
        target_child_ids: data.target_child_ids || [],
        scheduled_at: data.scheduled_at || null,
        published_at: data.publish_now ? new Date().toISOString() : null,
        created_by: user.id,
      };

      const { data: result, error } = await supabase
        .from("announcements")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Comunicado criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating announcement:", error);
      toast.error("Erro ao criar comunicado");
    },
  });

  // Update announcement
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnnouncementFormData> }) => {
      const updateData: Record<string, unknown> = {
        title: data.title,
        content: data.content,
        priority: data.priority,
        target_audience: data.target_audience,
        target_classrooms: data.target_classrooms || [],
        target_child_ids: data.target_child_ids || [],
        scheduled_at: data.scheduled_at || null,
      };

      if (data.publish_now) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("announcements")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Comunicado atualizado!");
    },
    onError: (error) => {
      console.error("Error updating announcement:", error);
      toast.error("Erro ao atualizar comunicado");
    },
  });

  // Publish announcement
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements")
        .update({ published_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Comunicado publicado!");
    },
    onError: (error) => {
      console.error("Error publishing announcement:", error);
      toast.error("Erro ao publicar comunicado");
    },
  });

  // Delete announcement
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Comunicado excluído!");
    },
    onError: (error) => {
      console.error("Error deleting announcement:", error);
      toast.error("Erro ao excluir comunicado");
    },
  });

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("announcement_reads")
        .upsert({
          announcement_id: announcementId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-announcements"] });
    },
  });

  return {
    // Staff data
    announcements,
    isLoading,
    error,

    // Parent data
    parentAnnouncements,
    isLoadingParent,
    unreadCount: parentAnnouncements.filter((a) => !a.is_read).length,

    // Mutations
    createAnnouncement: createMutation.mutate,
    updateAnnouncement: updateMutation.mutate,
    publishAnnouncement: publishMutation.mutate,
    deleteAnnouncement: deleteMutation.mutate,
    markAsRead: markAsReadMutation.mutate,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isPublishing: publishMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
