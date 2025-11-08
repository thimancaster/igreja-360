// src/components/CreateChurchForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole'; // Importar hook de Role
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';

const formSchema = z.object({
  churchName: z.string().min(3, { message: 'O nome da igreja deve ter pelo menos 3 caracteres.' }),
});

const CreateChurchForm: React.FC = () => {
  const { user, refetchProfile } = useAuth();
  const { isAdmin } = useRole(); // Verificar se é admin
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      churchName: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      // 1. Criar a Igreja (Todos podem fazer isso)
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .insert({
          name: values.churchName,
          owner_user_id: user.id, // O ID do criador é sempre o "owner"
        })
        .select()
        .single();

      if (churchError) throw churchError;

      // 2. Associar o perfil, APENAS SE NÃO FOR ADMIN
      if (!isAdmin && churchData) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ church_id: churchData.id })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // 3. Atualizar o perfil no AuthContext
        // (O refetchProfile do AuthContext que corrigimos anteriormente fará isso)
        await refetchProfile();
      }

      toast({ title: 'Igreja criada com sucesso!' });
      navigate('/app/dashboard'); // Redirecionar para o dashboard

    } catch (error: any) {
      console.error('Erro ao criar igreja:', error);
      toast({
        title: 'Erro ao criar igreja',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Crie sua Igreja</CardTitle>
        <CardDescription>
          {isAdmin 
            ? "Como administrador, você pode cadastrar uma nova igreja no sistema." 
            : "Você ainda não está vinculado a uma igreja. Por favor, crie a sua primeira igreja."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="churchName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Igreja</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Igreja Batista da Esperança" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              {isLoading ? 'Criando...' : 'Criar Igreja e Acessar'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateChurchForm;
