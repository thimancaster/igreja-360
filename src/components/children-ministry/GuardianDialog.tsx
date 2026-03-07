import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useChildMutations, Guardian, RELATIONSHIPS } from "@/hooks/useChildrenMinistry";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link2, Unlink, UserCheck } from "lucide-react";

const guardianSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  relationship: z.string().min(1, "Selecione o parentesco"),
  access_pin: z.string().length(6, "PIN deve ter 6 dígitos").optional().or(z.literal("")),
  profile_id: z.string().optional().or(z.literal("")),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

type GuardianDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardian: Guardian | null;
  onCreated?: (guardian: any) => void;
};

export function GuardianDialog({ open, onOpenChange, guardian, onCreated }: GuardianDialogProps) {
  const { createGuardian } = useChildMutations();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch profiles from same church for linking
  const { data: profiles } = useQuery({
    queryKey: ["church-profiles", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("church_id", profile.church_id)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.church_id && open,
  });

  const updateGuardian = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Guardian> & { id: string }) => {
      const { error } = await supabase
        .from("guardians")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Responsável atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
      queryClient.invalidateQueries({ queryKey: ["guardians-management"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const form = useForm<GuardianFormData>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      relationship: "Pai/Mãe",
      access_pin: "",
      profile_id: "",
    },
  });

  const selectedProfileId = form.watch("profile_id");

  useEffect(() => {
    if (guardian) {
      form.reset({
        full_name: guardian.full_name,
        email: guardian.email || "",
        phone: guardian.phone || "",
        relationship: guardian.relationship,
        access_pin: "",
        profile_id: guardian.profile_id || "",
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        phone: "",
        relationship: "Pai/Mãe",
        access_pin: "",
        profile_id: "",
      });
    }
  }, [guardian, form]);

  // Auto-fill name when profile is selected
  const handleProfileChange = (profileId: string) => {
    form.setValue("profile_id", profileId);
    if (profileId && profiles) {
      const selectedProfile = profiles.find(p => p.id === profileId);
      if (selectedProfile) {
        form.setValue("full_name", selectedProfile.full_name || "");
      }
    }
  };

  const handleUnlinkProfile = () => {
    form.setValue("profile_id", "");
  };

  const onSubmit = async (data: GuardianFormData) => {
    try {
      const payload: Record<string, any> = {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        relationship: data.relationship,
        photo_url: null,
        profile_id: data.profile_id || null,
      };

      // Only send access_pin if it was actually filled in
      if (data.access_pin && data.access_pin.length === 6) {
        payload.access_pin = data.access_pin;
      } else if (!guardian) {
        // For new guardians, explicitly set null if no PIN provided
        payload.access_pin = null;
      }

      if (guardian) {
        await updateGuardian.mutateAsync({ id: guardian.id, ...payload });
      } else {
        const result = await createGuardian.mutateAsync(payload as any);
        onCreated?.(result);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {guardian ? "Editar Responsável" : "Novo Responsável"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Profile Linking */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Vincular a Usuário do Sistema
              </FormLabel>
              {selectedProfileId ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-primary/5 border-primary/20">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium flex-1">
                    {profiles?.find(p => p.id === selectedProfileId)?.full_name || "Usuário vinculado"}
                  </span>
                  <Badge variant="default" className="text-xs">Portal Ativo</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={handleUnlinkProfile}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Select onValueChange={handleProfileChange} value="">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || "Sem nome"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Vincular permite que o responsável veja seus filhos no Portal do Membro
              </p>
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parentesco *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RELATIONSHIPS.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {rel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="access_pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN de Acesso (6 dígitos)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={guardian ? "Deixe vazio para manter" : "000000"}
                      maxLength={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    PIN usado para retirar a criança no check-out
                  </p>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createGuardian.isPending || updateGuardian.isPending}
              >
                {guardian ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}