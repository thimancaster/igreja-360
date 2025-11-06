import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tables } from "@/integrations/supabase/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type Profile = Tables<'profiles'>;

const churchSchema = z.object({
  name: z.string().min(1, "Nome da igreja é obrigatório").max(100, "Nome muito longo"),
  // Transforma string vazia em null para evitar violação de unicidade em CNPJs vazios
  cnpj: z.string().optional().transform(e => e === "" ? null : e),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type ChurchFormValues = z.infer<typeof churchSchema>;

export function CreateChurchForm() {
  const { user, profile, loading: authLoading, setProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const createChurchMutation = useMutation({
    mutationFn: async (data: ChurchFormValues) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");

      // 1. Create the church
      const { data: newChurch, error: churchError } = await supabase
        .from("churches")
        .insert({
          name: data.name,
          cnpj: data.cnpj, // Agora o schema já garante que será string ou null
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          owner_user_id: user.id, // Link the current user as the owner
          status: 'active', // Default status
        })
        .select()
        .maybeSingle(); // Alterado para maybeSingle()

      if (churchError) {
        throw churchError; // Lança o erro para ser capturado no onError
      }
      if (!newChurch) { // Verifica explicitamente se newChurch é null
        throw new Error("Falha ao criar a igreja: nenhuma igreja foi retornada após a criação.");
      }

      // 2. Update the user's profile with the new church_id
      const { data: updatedProfile, error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ church_id: newChurch.id })
        .eq("id", user.id)
        .select()
        .maybeSingle(); // Alterado para maybeSingle()

      if (profileUpdateError) {
        throw new Error(profileUpdateError.message || "Falha ao associar igreja ao perfil.");
      }
      if (!updatedProfile) { // Verifica explicitamente se updatedProfile é null
        throw new Error("Falha ao associar igreja ao perfil: perfil não encontrado ou não atualizado.");
      }

      return { church: newChurch, profile: updatedProfile };
    },
    onSuccess: async (data) => {
      // Update profile state immediately to trigger redirect
      if (data.profile) {
        setProfile(data.profile as Profile);
      }
      
      toast({
        title: "Sucesso!",
        description: "Igreja criada e associada ao seu perfil.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["church", user?.id] });

      navigate("/app/church-confirmation");
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Ocorreu um erro inesperado.";
      if (error.code === '23505' && error.constraint === 'churches_cnpj_key') {
        errorMessage = "Já existe uma igreja cadastrada com este CNPJ. Por favor, verifique os dados ou entre em contato com o suporte.";
      }
      toast({
        title: "Erro ao criar igreja",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ChurchFormValues) => {
    createChurchMutation.mutate(values);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.church_id) {
    navigate("/app/dashboard", { replace: true });
    return null;
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-lg">
              <Building2 className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Criar Igreja</CardTitle>
          <CardDescription className="text-base">
            Parece que você ainda não tem uma igreja associada. Crie uma para começar!
          </CardDescription>
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
                      <Input placeholder="Nome da sua igreja" {...field} />
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
              <Button type="submit" className="w-full" disabled={createChurchMutation.isPending}>
                {createChurchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Igreja
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}