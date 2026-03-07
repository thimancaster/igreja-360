import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type CreateChildData = {
  full_name: string;
  birth_date: string;
  classroom: string;
  allergies?: string | null;
  medications?: string | null;
  special_needs?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  image_consent: boolean;
  notes?: string | null;
};

export function useParentChildMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createChild = useMutation({
    mutationFn: async (data: CreateChildData) => {
      if (!user?.id) throw new Error("Não autenticado");

      // Get guardian record for this user
      const { data: guardian, error: guardianError } = await supabase
        .from("guardians")
        .select("id, church_id")
        .eq("profile_id", user.id)
        .single();

      if (guardianError || !guardian) {
        throw new Error("Você precisa estar cadastrado como responsável. Entre em contato com a liderança.");
      }

      // Insert child
      const { data: child, error: childError } = await supabase
        .from("children")
        .insert({
          ...data,
          church_id: guardian.church_id,
          status: "active",
          photo_url: null,
        })
        .select()
        .single();

      if (childError) throw childError;

      // Link guardian to child
      const { error: linkError } = await supabase
        .from("child_guardians")
        .insert({
          child_id: child.id,
          guardian_id: guardian.id,
          is_primary: true,
          can_pickup: true,
        });

      if (linkError) throw linkError;

      return child;
    },
    onSuccess: () => {
      toast.success("Filho cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["parent-children"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateChild = useMutation({
    mutationFn: async ({ id, ...data }: CreateChildData & { id: string }) => {
      const { error } = await supabase
        .from("children")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados atualizados!");
      queryClient.invalidateQueries({ queryKey: ["parent-children"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  return { createChild, updateChild };
}
