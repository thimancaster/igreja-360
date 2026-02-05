import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommitmentTerm {
  id: string;
  church_id: string;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export const DEFAULT_TERM_CONTENT = `# TERMO DE COMPROMISSO DE VOLUNTARIADO

## 1. NATUREZA DO TRABALHO VOLUNTÁRIO

Declaro que minha participação como voluntário(a) junto a esta igreja é de livre e espontânea vontade, sem qualquer expectativa de remuneração ou vínculo empregatício, nos termos da Lei nº 9.608/98 (Lei do Voluntariado).

## 2. RESPONSABILIDADES DO VOLUNTÁRIO

Comprometo-me a:
- Cumprir as escalas designadas, comunicando com antecedência eventuais ausências
- Respeitar as normas e diretrizes do ministério
- Manter conduta ética e respeitosa com todos os membros e visitantes
- Preservar o sigilo de informações confidenciais
- Participar dos treinamentos e reuniões quando convocado

## 3. ISENÇÃO DE RESPONSABILIDADE

Declaro estar ciente de que:

### 3.1 Ausência de Vínculo Trabalhista
Não existe e não existirá vínculo empregatício entre mim e a igreja, não fazendo jus a salário, férias, 13º salário, FGTS, INSS ou qualquer outro benefício trabalhista.

### 3.2 Isenção Fiscal
A atividade voluntária não gera obrigação tributária para a igreja, não caracterizando prestação de serviços remunerados.

### 3.3 Responsabilidade Civil
A igreja não se responsabiliza por eventuais despesas pessoais decorrentes da atividade voluntária (transporte, alimentação, etc.), salvo quando expressamente acordado.

## 4. VIGÊNCIA E DESLIGAMENTO

Este termo tem validade por tempo indeterminado, podendo ser encerrado:
- Por vontade do voluntário, mediante comunicação prévia
- Por decisão da liderança, respeitando os princípios da igreja

## 5. ACEITE ELETRÔNICO

Ao clicar em "Aceitar e Continuar", declaro que li, compreendi e concordo integralmente com os termos acima descritos.

**Data do aceite:** Registrado automaticamente pelo sistema
**IP do aceite:** Registrado automaticamente para fins de auditoria`;

export function useCommitmentTerm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch active term for user's church
  const { data: activeTerm, isLoading } = useQuery({
    queryKey: ["active-commitment-term", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get user's church_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) return null;

      const { data, error } = await supabase
        .from("volunteer_commitment_terms")
        .select("*")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching active term:", error);
        return null;
      }

      return data as CommitmentTerm | null;
    },
    enabled: !!user?.id,
  });

  // Fetch all terms (for admin)
  const { data: allTerms, isLoading: allTermsLoading } = useQuery({
    queryKey: ["all-commitment-terms", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) return [];

      const { data, error } = await supabase
        .from("volunteer_commitment_terms")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all terms:", error);
        return [];
      }

      return (data || []) as CommitmentTerm[];
    },
    enabled: !!user?.id,
  });

  // Create or update term
  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; version: string }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada");
      }

      // Deactivate all existing terms
      await supabase
        .from("volunteer_commitment_terms")
        .update({ is_active: false })
        .eq("church_id", profile.church_id);

      // Create new active term
      const { data: term, error } = await supabase
        .from("volunteer_commitment_terms")
        .insert({
          church_id: profile.church_id,
          version: data.version,
          title: data.title,
          content: data.content,
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return term;
    },
    onSuccess: () => {
      toast.success("Termo salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["active-commitment-term"] });
      queryClient.invalidateQueries({ queryKey: ["all-commitment-terms"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar termo");
    },
  });

  // Create default term for church if none exists
  const ensureDefaultTerm = async () => {
    if (activeTerm) return activeTerm;

    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id")
      .eq("id", user?.id)
      .single();

    if (!profile?.church_id) return null;

    // Check if any term exists
    const { data: existingTerms } = await supabase
      .from("volunteer_commitment_terms")
      .select("id")
      .eq("church_id", profile.church_id)
      .limit(1);

    if (existingTerms && existingTerms.length > 0) return null;

    // Create default term
    const { data: newTerm } = await supabase
      .from("volunteer_commitment_terms")
      .insert({
        church_id: profile.church_id,
        version: "1.0",
        title: "Termo de Compromisso de Voluntariado",
        content: DEFAULT_TERM_CONTENT,
        is_active: true,
        created_by: user?.id,
      })
      .select()
      .single();

    queryClient.invalidateQueries({ queryKey: ["active-commitment-term"] });
    return newTerm as CommitmentTerm;
  };

  return {
    activeTerm,
    allTerms: allTerms || [],
    isLoading,
    allTermsLoading,
    saveTerm: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    ensureDefaultTerm,
  };
}
