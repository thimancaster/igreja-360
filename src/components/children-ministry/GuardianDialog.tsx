import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChildMutations, Guardian, RELATIONSHIPS } from "@/hooks/useChildrenMinistry";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const guardianSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  relationship: z.string().min(1, "Selecione o parentesco"),
  access_pin: z.string().length(6, "PIN deve ter 6 dígitos").optional().or(z.literal("")),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

type GuardianDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardian: Guardian | null;
};

export function GuardianDialog({ open, onOpenChange, guardian }: GuardianDialogProps) {
  const { createGuardian } = useChildMutations();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

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
    },
  });

  useEffect(() => {
    if (guardian) {
      form.reset({
        full_name: guardian.full_name,
        email: guardian.email || "",
        phone: guardian.phone || "",
        relationship: guardian.relationship,
        access_pin: guardian.access_pin || "",
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        phone: "",
        relationship: "Pai/Mãe",
        access_pin: "",
      });
    }
  }, [guardian, form]);

  const onSubmit = async (data: GuardianFormData) => {
    try {
      const payload = {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        relationship: data.relationship,
        access_pin: data.access_pin || null,
        photo_url: null,
        profile_id: null,
      };

      if (guardian) {
        await updateGuardian.mutateAsync({ id: guardian.id, ...payload });
      } else {
        await createGuardian.mutateAsync(payload);
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
                      placeholder="000000"
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
