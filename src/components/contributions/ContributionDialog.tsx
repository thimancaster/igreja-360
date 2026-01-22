import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, Heart, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ContributionType, ContributionFormData, useCreateContribution } from '@/hooks/useContributions';
import { useMembers } from '@/hooks/useMembers';

const contributionSchema = z.object({
  member_id: z.string().optional(),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  contribution_date: z.date(),
  contribution_type: z.enum(['dizimo', 'oferta', 'campanha', 'voto', 'outro']),
  campaign_name: z.string().optional(),
  notes: z.string().optional(),
});

type ContributionFormSchema = z.infer<typeof contributionSchema>;

interface ContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMemberId?: string;
}

const CONTRIBUTION_TYPES: { value: ContributionType; label: string }[] = [
  { value: 'dizimo', label: 'Dízimo' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'campanha', label: 'Campanha' },
  { value: 'voto', label: 'Voto' },
  { value: 'outro', label: 'Outro' },
];

export function ContributionDialog({ open, onOpenChange, defaultMemberId }: ContributionDialogProps) {
  const { data: members } = useMembers();
  const createContribution = useCreateContribution();

  const form = useForm<ContributionFormSchema>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      member_id: defaultMemberId || '',
      amount: 0,
      contribution_date: new Date(),
      contribution_type: 'dizimo',
      campaign_name: '',
      notes: '',
    },
  });

  const contributionType = form.watch('contribution_type');

  const onSubmit = async (data: ContributionFormSchema) => {
    const formData: ContributionFormData = {
      amount: data.amount,
      contribution_type: data.contribution_type,
      member_id: data.member_id || null,
      contribution_date: format(data.contribution_date, 'yyyy-MM-dd'),
      campaign_name: data.campaign_name,
      notes: data.notes,
    };

    try {
      await createContribution.mutateAsync(formData);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Registrar Contribuição
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contribution_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Contribuição *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTRIBUTION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(contributionType === 'campanha' || contributionType === 'voto') && (
              <FormField
                control={form.control}
                name="campaign_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Campanha</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Construção do templo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membro</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Anônimo (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Anônimo</SelectItem>
                      {members?.filter(m => m.status === 'active').map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-10"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contribution_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Anotações opcionais..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createContribution.isPending}>
                {createContribution.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
