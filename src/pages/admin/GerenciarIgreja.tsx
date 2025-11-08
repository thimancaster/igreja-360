import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { LoadingSpinner } from "@/components/LoadingSpinner"; // Importar LoadingSpinner

type ChurchRow = Tables<'churches'>;

const churchSchema = z.object({
  name: z.string().min(1, "Nome da igreja é obrigatório").max(100, "Nome muito longo"),
  cnpj: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().max(2, "Estado deve ter 2 caracteres").optional().or(z.literal("")),
});

type ChurchFormValues = z.infer<typeof churchSchema>;

export default function GerenciarIgreja() {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<ChurchFormValues>({
    resolver: zodResolver(churchSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      address: "",
      city: "",
      state: "",
    },
  });

  const { data: church, isLoading: churchLoading } = useQuery({
    queryKey: ["church", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return null;
      
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .single();
      
      if (error) throw error;
      return data as ChurchRow;
    },
    enabled: !!profile?.church_id && !!user?.id,
  });

  useEffect(() => {
    if (church) {
      form.reset({
        name: church.name || "",
        cnpj: church.cnpj || "",
        address: church.address || "",
        city: church.city || "",
        state: church.state || "",
      });
    } else {
      form.reset({
        name: "",
        cnpj: "",
        address: "",
        city: "",
        state: "",
      });
    }
  }, [church, form]);

  const updateChurchMutation = useMutation({
    mutationFn: async (data: ChurchFormValues) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      
      const { error } = await supabase
        .from("churches")
        .update({
          name: data.name,
          cnpj: data.cnpj || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
        })
        .eq("id", profile.church_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church", profile?.church_id] });
      toast.success("Dados da igreja atualizados com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar igreja: " + error.message);
    },
  });

  const onSubmit = (values: ChurchFormValues) => {
    // Transform empty strings to null to avoid unique constraint issues
    const cleanedValues = {
      ...values,
      cnpj: values.cnpj?.trim() === "" ? null : values.cnpj,
      address: values.address?.trim() === "" ? null : values.address,
      city: values.city?.trim() === "" ? null : values.city,
      state: values.state?.trim() === "" ? null : values.state,
    };
    updateChurchMutation.mutate(cleanedValues);
  };

  if (authLoading || churchLoading || profile === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile?.church_id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Nenhuma Igreja Associada</CardTitle>
            <CardDescription>Seu perfil não está associado a nenhuma igreja. Por favor, crie uma igreja primeiro.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            <div>
              <CardTitle>Gerenciar Igreja</CardTitle>
              <CardDescription>Gerencie as informações da sua igreja.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Igreja</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da igreja" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número, complemento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={updateChurchMutation.isPending}
              >
                {updateChurchMutation.isPending && (
                  <LoadingSpinner size="sm" className="mr-2" />
                )}
                Salvar Alterações
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}