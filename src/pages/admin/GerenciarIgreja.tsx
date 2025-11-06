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

  // Adicionado log para depuração do estado do AuthContext
  useEffect(() => {
    console.log("GerenciarIgreja: useEffect - AuthContext state changed.");
    console.log("  User:", user?.id);
    console.log("  Profile:", profile);
    console.log("  Auth Loading:", authLoading);
    console.log("  Church ID from Profile:", profile?.church_id);
  }, [user, profile, authLoading]);

  // Fetch church data
  const { data: church, isLoading: churchLoading } = useQuery({
    queryKey: ["church", profile?.church_id],
    queryFn: async () => {
      console.log("GerenciarIgreja: useQuery - Fetching church data for church_id:", profile?.church_id);
      if (!profile?.church_id) {
        console.log("GerenciarIgreja: useQuery - No church_id in profile, skipping fetch.");
        return null;
      }
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .single();
      
      if (error) {
        console.error("GerenciarIgreja: useQuery - Error fetching church:", error);
        throw error;
      }
      console.log("GerenciarIgreja: useQuery - Church data fetched:", data);
      return data as ChurchRow;
    },
    enabled: !!profile?.church_id && !!user?.id, // Enable query only if user is logged in and has a church
  });

  // Update form with fetched church data
  useEffect(() => {
    if (church) {
      console.log("GerenciarIgreja: useEffect - Updating form with church data:", church);
      form.reset({
        name: church.name || "",
        cnpj: church.cnpj || "",
        address: church.address || "",
        city: church.city || "",
        state: church.state || "",
      });
    } else {
      console.log("GerenciarIgreja: useEffect - No church data to update form, resetting form.");
      form.reset({
        name: "",
        cnpj: "",
        address: "",
        city: "",
        state: "",
      });
    }
  }, [church, form]);

  // Update church mutation
  const updateChurchMutation = useMutation({
    mutationFn: async (data: ChurchFormValues) => {
      console.log("GerenciarIgreja: updateChurchMutation - Attempting to update church for church_id:", profile?.church_id);
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
      
      if (error) {
        console.error("GerenciarIgreja: updateChurchMutation - Error updating church:", error);
        throw error;
      }
      console.log("GerenciarIgreja: updateChurchMutation - Church updated successfully.");
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
    updateChurchMutation.mutate(values);
  };

  if (authLoading || churchLoading || profile === undefined) { // Adicionado profile === undefined
    console.log("GerenciarIgreja: Exibindo spinner de carregamento (authLoading:", authLoading, "churchLoading:", churchLoading, "profile undefined:", profile === undefined, ")");
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile?.church_id) {
    console.log("GerenciarIgreja: Exibindo mensagem 'Nenhuma Igreja Associada'. Perfil:", profile);
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

  console.log("GerenciarIgreja: Renderizando formulário com dados da igreja. Igreja:", church);
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