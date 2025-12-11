// src/components/CreateChurchForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Church } from 'lucide-react';

const formSchema = z.object({
  churchName: z.string().min(3, { message: 'O nome da igreja deve ter pelo menos 3 caracteres.' }),
});

const CreateChurchForm: React.FC = () => {
  const { user, refetchProfile } = useAuth();
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
      // 1. Create the church
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .insert({
          name: values.churchName,
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (churchError) throw churchError;

      // 2. ALWAYS update user's profile with church_id (removed isAdmin condition)
      if (churchData) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ church_id: churchData.id })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // 3. Wait for profile refresh to complete before navigating
        await refetchProfile();
      }

      toast({ title: 'Igreja criada com sucesso!' });
      
      // 4. Navigate to confirmation page
      navigate('/church-confirmation');

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Church className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Crie sua Igreja</CardTitle>
          <CardDescription>
            Você ainda não está vinculado a uma igreja. Crie a sua primeira igreja para continuar.
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
                {isLoading ? 'Criando...' : 'Criar Igreja'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateChurchForm;
