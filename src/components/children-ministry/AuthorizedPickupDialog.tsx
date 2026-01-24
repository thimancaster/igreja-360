import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AuthorizedPickup, RELATIONSHIPS } from "@/hooks/useChildrenMinistry";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const authorizedPickupSchema = z.object({
  authorized_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  authorized_phone: z.string().optional(),
  relationship: z.string().optional(),
  pickup_pin: z.string().min(4, "PIN deve ter pelo menos 4 dígitos").max(6, "PIN deve ter no máximo 6 dígitos"),
  is_active: z.boolean().default(true),
});

type AuthorizedPickupFormData = z.infer<typeof authorizedPickupSchema>;

type AuthorizedPickupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  pickup: AuthorizedPickup | null;
};

export function AuthorizedPickupDialog({ 
  open, 
  onOpenChange, 
  childId, 
  pickup 
}: AuthorizedPickupDialogProps) {
  const queryClient = useQueryClient();

  const createAuthorizedPickup = useMutation({
    mutationFn: async (data: AuthorizedPickupFormData) => {
      const { error } = await supabase
        .from("authorized_pickups")
        .insert({
          child_id: childId,
          authorized_name: data.authorized_name,
          authorized_phone: data.authorized_phone || null,
          relationship: data.relationship || null,
          pickup_pin: data.pickup_pin,
          is_active: data.is_active,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorizado cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["authorized-pickups", childId] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    },
  });

  const updateAuthorizedPickup = useMutation({
    mutationFn: async ({ id, ...data }: AuthorizedPickupFormData & { id: string }) => {
      const { error } = await supabase
        .from("authorized_pickups")
        .update({
          authorized_name: data.authorized_name,
          authorized_phone: data.authorized_phone || null,
          relationship: data.relationship || null,
          pickup_pin: data.pickup_pin,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorizado atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["authorized-pickups", childId] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const form = useForm<AuthorizedPickupFormData>({
    resolver: zodResolver(authorizedPickupSchema),
    defaultValues: {
      authorized_name: "",
      authorized_phone: "",
      relationship: "",
      pickup_pin: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (pickup) {
      form.reset({
        authorized_name: pickup.authorized_name,
        authorized_phone: pickup.authorized_phone || "",
        relationship: pickup.relationship || "",
        pickup_pin: pickup.pickup_pin || "",
        is_active: pickup.is_active,
      });
    } else {
      form.reset({
        authorized_name: "",
        authorized_phone: "",
        relationship: "",
        pickup_pin: "",
        is_active: true,
      });
    }
  }, [pickup, form]);

  const onSubmit = async (data: AuthorizedPickupFormData) => {
    if (pickup) {
      await updateAuthorizedPickup.mutateAsync({ id: pickup.id, ...data });
    } else {
      await createAuthorizedPickup.mutateAsync(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {pickup ? "Editar Autorizado" : "Novo Autorizado"}
          </DialogTitle>
          <DialogDescription>
            Cadastre pessoas autorizadas a retirar a criança
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="authorized_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da pessoa autorizada" {...field} />
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
                  <FormLabel>Parentesco / Relação</FormLabel>
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
                      <SelectItem value="Vizinho(a)">Vizinho(a)</SelectItem>
                      <SelectItem value="Motorista">Motorista</SelectItem>
                      <SelectItem value="Amigo(a) da família">Amigo(a) da família</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authorized_phone"
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
              name="pickup_pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN de Segurança *</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="0000"
                      maxLength={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    PIN de 4-6 dígitos que será validado no check-out
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Autorização Ativa</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Desative para suspender temporariamente
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createAuthorizedPickup.isPending || updateAuthorizedPickup.isPending}
              >
                {pickup ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
