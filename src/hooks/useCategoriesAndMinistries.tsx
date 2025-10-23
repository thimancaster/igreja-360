import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

type Category = Tables<'categories'>;
type Ministry = Tables<'ministries'>;

export function useCategoriesAndMinistries() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["categories-and-ministries", user?.id, profile?.church_id],
    queryFn: async () => {
      if (!user?.id || !profile?.church_id) {
        return { categories: [], ministries: [] };
      }

      const [categoriesRes, ministriesRes] = await Promise.all([
        supabase.from("categories").select("id, name, type, color").eq("church_id", profile.church_id),
        supabase.from("ministries").select("id, name").eq("church_id", profile.church_id),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (ministriesRes.error) throw ministriesRes.error;

      return {
        categories: categoriesRes.data as Category[],
        ministries: ministriesRes.data as Ministry[],
      };
    },
    enabled: !!user?.id && !!profile?.church_id,
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    refetchOnWindowFocus: false, // Do not refetch on window focus
  });
}