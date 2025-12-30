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
  churchName: z.string().min(3, {
    message: 'O nome da igreja deve ter pelo menos 3 caracteres.'
  })
});
const CreateChurchForm: React.FC = () => {
  const {
    user,
    refetchProfile
  } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      churchName: ''
    }
  });
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive'
      });
      return;
    }
    setIsLoading(true);
    try {
      console.log('[CreateChurch] Iniciando criação da igreja para user:', user.id);

      // 1. Create the church
      const {
        data: churchData,
        error: churchError
      } = await supabase.from('churches').insert({
        name: values.churchName,
        owner_user_id: user.id
      }).select().single();
      if (churchError) {
        console.error('[CreateChurch] Erro ao criar igreja:', churchError);
        throw churchError;
      }
      console.log('[CreateChurch] Igreja criada:', churchData.id);

      // 2. Update user's profile with church_id
      const {
        error: profileError,
        count
      } = await supabase.from('profiles').update({
        church_id: churchData.id
      }).eq('id', user.id).select();
      if (profileError) {
        console.error('[CreateChurch] Erro ao atualizar perfil:', profileError);
        throw profileError;
      }
      console.log('[CreateChurch] Perfil atualizado, count:', count);

      // 3. Wait for profile refresh to complete
      await refetchProfile();
      console.log('[CreateChurch] Profile refetch completado');
      toast({
        title: 'Igreja criada com sucesso!'
      });

      // 4. Navigate with small delay to ensure state is updated
      setTimeout(() => {
        console.log('[CreateChurch] Navegando para /church-confirmation');
        navigate('/church-confirmation', {
          replace: true
        });
      }, 150);
    } catch (error: any) {
      console.error('[CreateChurch] Erro completo:', error);
      toast({
        title: 'Erro ao criar igreja',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border-primary-dark">
            <Church className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Crie sua Igreja</CardTitle>
          <CardDescription className="text-[sidebar-accent-foreground] text-sidebar-border">
            Você ainda não está vinculado a uma igreja. Crie a sua primeira igreja para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="churchName" render={({
              field
            }) => <FormItem>
                    <FormLabel>Nome da Igreja</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Igreja Batista da Esperança" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
                {isLoading ? 'Criando...' : 'Criar Igreja'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>;
};
export default CreateChurchForm;