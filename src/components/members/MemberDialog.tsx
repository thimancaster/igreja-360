import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, UserPlus, Edit2, FileUp, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Member, MemberFormData, useCreateMember, useUpdateMember } from '@/hooks/useMembers';
import { useCategoriesAndMinistries } from '@/hooks/useCategoriesAndMinistries';
import { useAuth } from '@/contexts/AuthContext';

const memberSchema = z.object({
  // Core
  full_name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  birth_date: z.date().optional(),
  status: z.enum(['active', 'inactive']),
  member_since: z.date().optional(),

  // Address
  address: z.string().trim().max(255).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  state: z.string().trim().max(2).optional().or(z.literal('')),
  zip_code: z.string().trim().max(20).optional().or(z.literal('')),

  // Notes
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  leadership_notes: z.string().trim().max(2000).optional().or(z.literal('')),

  // Ministries
  ministry_ids: z.array(z.string()).optional(),

  // Transfer & onboarding
  admission_type: z.enum(['new', 'transfer']).default('new'),
  marital_status: z.enum(['single', 'married', 'widowed', 'divorced', 'stable_union']).optional().or(z.literal('')),
  profession: z.string().trim().max(120).optional().or(z.literal('')),

  spouse_name: z.string().trim().max(120).optional().or(z.literal('')),
  spouse_attends_church: z.enum(['yes', 'no', 'other']).optional().or(z.literal('')),
  children_names: z.string().trim().max(2000).optional().or(z.literal('')),

  baptism_date: z.date().optional(),
  baptism_church: z.string().trim().max(180).optional().or(z.literal('')),
  baptism_pastor: z.string().trim().max(120).optional().or(z.literal('')),
  holy_spirit_baptism: z.enum(['yes', 'no', 'unsure']).optional().or(z.literal('')),

  previous_church: z.string().trim().max(180).optional().or(z.literal('')),
  previous_church_duration: z.string().trim().max(60).optional().or(z.literal('')),
  time_without_church: z.enum(['direct', 'lt_3m', '3m_1y', 'gt_1y']).optional().or(z.literal('')),
  previous_denominations: z.string().trim().max(2000).optional().or(z.literal('')),

  previous_ministry: z.string().trim().max(180).optional().or(z.literal('')),
  previous_ministry_roles: z.string().trim().max(2000).optional().or(z.literal('')),
  technical_skills: z.string().trim().max(2000).optional().or(z.literal('')),

  departure_conversation: z.boolean().optional(),
  departure_details: z.string().trim().max(2000).optional().or(z.literal('')),
  departure_reason: z.string().trim().max(2000).optional().or(z.literal('')),

  wants_pastoral_visit: z.boolean().optional(),
  has_transfer_letter: z.boolean().optional(),
  transfer_letter_url: z.string().trim().max(500).optional().or(z.literal('')),
});

type MemberFormSchema = z.infer<typeof memberSchema>;

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function sanitizeFilename(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

export function MemberDialog({ open, onOpenChange, member }: MemberDialogProps) {
  const { user, profile } = useAuth();
  const { data: categoriesData } = useCategoriesAndMinistries();
  const ministries = categoriesData?.ministries || [];

  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  const isEditing = !!member;
  const isLoading = createMember.isPending || updateMember.isPending;

  const [selectedMinistries, setSelectedMinistries] = useState<string[]>(
    member?.member_ministries?.map(mm => mm.ministry_id) || []
  );

  const [transferFile, setTransferFile] = useState<File | null>(null);
  const [viewUrlLoading, setViewUrlLoading] = useState(false);

  const form = useForm<MemberFormSchema>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: member?.full_name || '',
      email: member?.email || '',
      phone: member?.phone || '',
      birth_date: member?.birth_date ? new Date(member.birth_date) : undefined,
      status: member?.status || 'active',
      member_since: member?.member_since ? new Date(member.member_since) : new Date(),

      address: member?.address || '',
      city: member?.city || '',
      state: member?.state || '',
      zip_code: member?.zip_code || '',

      notes: member?.notes || '',
      leadership_notes: member?.leadership_notes || '',

      admission_type: (member?.admission_type as any) || 'new',
      marital_status: (member?.marital_status as any) || '',
      profession: member?.profession || '',

      spouse_name: member?.spouse_name || '',
      spouse_attends_church: (member?.spouse_attends_church as any) || '',
      children_names: member?.children_names || '',

      baptism_date: member?.baptism_date ? new Date(member.baptism_date) : undefined,
      baptism_church: member?.baptism_church || '',
      baptism_pastor: member?.baptism_pastor || '',
      holy_spirit_baptism: (member?.holy_spirit_baptism as any) || '',

      previous_church: member?.previous_church || '',
      previous_church_duration: member?.previous_church_duration || '',
      time_without_church: (member?.time_without_church as any) || '',
      previous_denominations: member?.previous_denominations || '',

      previous_ministry: member?.previous_ministry || '',
      previous_ministry_roles: member?.previous_ministry_roles || '',
      technical_skills: member?.technical_skills || '',

      departure_conversation: member?.departure_conversation ?? undefined,
      departure_details: member?.departure_details || '',
      departure_reason: member?.departure_reason || '',

      wants_pastoral_visit: member?.wants_pastoral_visit ?? undefined,
      has_transfer_letter: member?.has_transfer_letter ?? false,
      transfer_letter_url: member?.transfer_letter_url || '',

      ministry_ids: member?.member_ministries?.map(mm => mm.ministry_id) || [],
    },
  });

  const admissionType = form.watch('admission_type');

  const toggleMinistry = (ministryId: string) => {
    setSelectedMinistries(prev =>
      prev.includes(ministryId) ? prev.filter(id => id !== ministryId) : [...prev, ministryId]
    );
  };

  const uploadTransferLetterIfNeeded = async (memberId: string) => {
    if (!transferFile) return;
    if (!user?.id || !profile?.church_id) {
      toast.error('Você precisa estar logado para anexar documentos');
      return;
    }

    const safeName = sanitizeFilename(transferFile.name);
    const path = `${profile.church_id}/${user.id}/${memberId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('transfer-letters')
      .upload(path, transferFile, {
        upsert: true,
        contentType: transferFile.type || undefined,
      });

    if (uploadError) {
      throw uploadError;
    }

    await updateMember.mutateAsync({
      id: memberId,
      has_transfer_letter: true,
      transfer_letter_url: path,
    });

    form.setValue('has_transfer_letter', true);
    form.setValue('transfer_letter_url', path);
    setTransferFile(null);
  };

  const viewTransferLetter = async () => {
    const path = form.getValues('transfer_letter_url');
    if (!path) return;

    setViewUrlLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('transfer-letters')
        .createSignedUrl(path, 60 * 30); // 30 min

      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível abrir o arquivo');
    } finally {
      setViewUrlLoading(false);
    }
  };

  const onSubmit = async (data: MemberFormSchema) => {
    const payload: MemberFormData = {
      full_name: data.full_name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      birth_date: data.birth_date ? format(data.birth_date, 'yyyy-MM-dd') : undefined,
      status: data.status,
      member_since: data.member_since ? format(data.member_since, 'yyyy-MM-dd') : undefined,

      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      zip_code: data.zip_code || undefined,

      notes: data.notes || undefined,
      leadership_notes: data.leadership_notes || undefined,

      admission_type: data.admission_type,
      marital_status: data.marital_status || undefined,
      profession: data.profession || undefined,

      spouse_name: data.spouse_name || undefined,
      spouse_attends_church: data.spouse_attends_church || undefined,
      children_names: data.children_names || undefined,

      baptism_date: data.baptism_date ? format(data.baptism_date, 'yyyy-MM-dd') : undefined,
      baptism_church: data.baptism_church || undefined,
      baptism_pastor: data.baptism_pastor || undefined,
      holy_spirit_baptism: data.holy_spirit_baptism || undefined,

      previous_church: data.previous_church || undefined,
      previous_church_duration: data.previous_church_duration || undefined,
      time_without_church: data.time_without_church || undefined,
      previous_denominations: data.previous_denominations || undefined,

      previous_ministry: data.previous_ministry || undefined,
      previous_ministry_roles: data.previous_ministry_roles || undefined,
      technical_skills: data.technical_skills || undefined,

      departure_conversation: data.departure_conversation,
      departure_details: data.departure_details || undefined,
      departure_reason: data.departure_reason || undefined,

      wants_pastoral_visit: data.wants_pastoral_visit,
      has_transfer_letter: data.has_transfer_letter,
      transfer_letter_url: data.transfer_letter_url || undefined,

      ministry_ids: selectedMinistries,
    };

    try {
      let saved: Member;
      if (isEditing && member) {
        saved = await updateMember.mutateAsync({ id: member.id, ...payload }) as any;
      } else {
        saved = await createMember.mutateAsync(payload) as any;
      }

      // Upload after save (needs member id)
      if (payload.admission_type === 'transfer') {
        await uploadTransferLetterIfNeeded(saved.id);
      } else {
        // If user created as "new" ensure transfer metadata stays clean
        // (no extra action)
      }

      onOpenChange(false);
      form.reset();
      setTransferFile(null);
    } catch {
      // Errors handled in hooks / toast
    }
  };

  const resetOnClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      form.reset();
      setTransferFile(null);
      setSelectedMinistries(member?.member_ministries?.map(mm => mm.ministry_id) || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {isEditing ? 'Editar Membro' : 'Novo Membro'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="pessoal" className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
                <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
                <TabsTrigger value="familia">Família</TabsTrigger>
                <TabsTrigger value="fe">Fé</TabsTrigger>
                <TabsTrigger value="transfer">Transferência</TabsTrigger>
                <TabsTrigger value="docs">Documentos</TabsTrigger>
              </TabsList>

              {/* PESSOAL */}
              <TabsContent value="pessoal" className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do membro" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="admission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Admissão</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">Novo membro</SelectItem>
                            <SelectItem value="transfer">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Input {...field} type="email" placeholder="email@exemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (WhatsApp)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marital_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado civil</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Solteiro(a)</SelectItem>
                            <SelectItem value="married">Casado(a)</SelectItem>
                            <SelectItem value="widowed">Viúvo(a)</SelectItem>
                            <SelectItem value="divorced">Divorciado(a)</SelectItem>
                            <SelectItem value="stable_union">União Estável</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissão / Ocupação</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Professor, Autônomo..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
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
                    name="member_since"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membro desde</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel>Endereço</FormLabel>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Rua, número, bairro, complemento" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Cidade" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BRAZILIAN_STATES.map((uf) => (
                                <SelectItem key={uf} value={uf}>
                                  {uf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="CEP" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {ministries.length > 0 && (
                  <div className="space-y-2">
                    <FormLabel>Ministérios</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ministries.map((ministry) => (
                        <div key={ministry.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ministry-${ministry.id}`}
                            checked={selectedMinistries.includes(ministry.id)}
                            onCheckedChange={() => toggleMinistry(ministry.id)}
                          />
                          <label
                            htmlFor={`ministry-${ministry.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {ministry.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Anotações gerais..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* FAMÍLIA */}
              <TabsContent value="familia" className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="spouse_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do cônjuge</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(se aplicável)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="spouse_attends_church"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>O cônjuge frequenta a igreja?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Sim</SelectItem>
                            <SelectItem value="no">Não</SelectItem>
                            <SelectItem value="other">Em outra denominação</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="children_names"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filhos (nome e idade)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={'Ex:\n1) João - 8 anos\n2) Maria - 5 anos'}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* FÉ */}
              <TabsContent value="fe" className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="baptism_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de batismo nas águas</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
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
                    name="baptism_church"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Igreja do batismo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da igreja" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="baptism_pastor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pastor/Líder que batizou</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="holy_spirit_baptism"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batismo no Espírito Santo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Sim</SelectItem>
                            <SelectItem value="no">Não</SelectItem>
                            <SelectItem value="unsure">Tenho dúvidas</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* TRANSFERÊNCIA */}
              <TabsContent value="transfer" className="pt-4 space-y-4">
                {admissionType !== 'transfer' ? (
                  <div className="text-sm text-muted-foreground">
                    Marque <strong>Tipo de Admissão</strong> como <strong>Transferência</strong> para preencher o questionário.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="time_without_church"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Há quanto tempo está sem congregar?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="direct">Vim direto (transferência)</SelectItem>
                                <SelectItem value="lt_3m">Menos de 3 meses</SelectItem>
                                <SelectItem value="3m_1y">Entre 3 meses e 1 ano</SelectItem>
                                <SelectItem value="gt_1y">Mais de 1 ano</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="wants_pastoral_visit"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0 rounded-md border p-3">
                            <Checkbox checked={field.value || false} onCheckedChange={(v) => field.onChange(v === true)} />
                            <div className="space-y-1 leading-none">
                              <FormLabel>Gostaria de receber visita pastoral?</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Se desmarcar, a pessoa prefere atendimento na igreja.
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="previous_church"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Última igreja que frequentou</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome da igreja" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="previous_church_duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tempo como membro na última igreja</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: 2 anos" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="previous_denominations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Denominações anteriores e tempo em cada</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} placeholder="Ex: Assembleia de Deus (3 anos), Batista (1 ano)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="previous_ministry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exercia algum ministério/cargo?</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Louvor, Infantil..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="technical_skills"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Habilidades técnicas/artísticas</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Som, Mídia, Instrumentos..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="previous_ministry_roles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detalhes de ministério/serviço</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} placeholder="Conte um pouco sobre sua experiência" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="departure_conversation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Houve conversa com a liderança anterior?</FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(v === 'yes')}
                              defaultValue={field.value === true ? 'yes' : field.value === false ? 'no' : ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Sim</SelectItem>
                                <SelectItem value="no">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="has_transfer_letter"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0 rounded-md border p-3">
                            <Checkbox checked={field.value || false} onCheckedChange={(v) => field.onChange(v === true)} />
                            <div className="space-y-1 leading-none">
                              <FormLabel>Possui carta de transferência?</FormLabel>
                              <p className="text-sm text-muted-foreground">Você pode anexar no aba “Documentos”.</p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="departure_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Como foi a saída / conversa?</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="(Confidencial - cuidado pastoral)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="departure_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo do desligamento</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="(Confidencial - cuidado pastoral)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="leadership_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas da liderança / secretaria</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Apenas para uso interno" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>

              {/* DOCUMENTOS */}
              <TabsContent value="docs" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <FormLabel>Carta de transferência (PDF ou foto)</FormLabel>

                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (!file) return;
                        if (file.size > 20 * 1024 * 1024) {
                          toast.error('Arquivo muito grande (máx. 20MB)');
                          return;
                        }
                        setTransferFile(file);
                        form.setValue('has_transfer_letter', true);
                      }}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={viewTransferLetter}
                      disabled={viewUrlLoading || !form.getValues('transfer_letter_url')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {viewUrlLoading ? 'Abrindo...' : 'Ver arquivo'}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    O upload é salvo com segurança e só pessoas autorizadas da sua igreja conseguem acessar.
                  </p>

                  {transferFile && (
                    <div className="text-sm text-muted-foreground">
                      Arquivo selecionado: <span className="font-medium text-foreground">{transferFile.name}</span>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
