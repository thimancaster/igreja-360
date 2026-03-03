import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { ChurchEvent, EventFormData } from "@/hooks/useEvents";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  event_type: z.string(),
  start_date: z.string().min(1, "Data é obrigatória"),
  start_time: z.string().optional(),
  end_date: z.string().optional(),
  end_time: z.string().optional(),
  all_day: z.boolean().optional(),
  location: z.string().optional(),
  max_capacity: z.number().min(0).optional().nullable(),
  registration_required: z.boolean().optional(),
  ministry_id: z.string().optional().nullable(),
  ticket_price: z.number().min(0).optional(),
  is_paid_event: z.boolean().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const EVENT_TYPES = [
  { value: "service", label: "Culto" },
  { value: "special", label: "Evento Especial" },
  { value: "activity", label: "Atividade" },
  { value: "meeting", label: "Reunião" },
  { value: "conference", label: "Conferência" },
  { value: "workshop", label: "Workshop" },
  { value: "retreat", label: "Retiro" },
  { value: "outreach", label: "Evangelismo" },
];

interface ChurchEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ChurchEvent | null;
  onSubmit: (data: EventFormData) => void;
  isLoading?: boolean;
}

export function ChurchEventDialog({ open, onOpenChange, event, onSubmit, isLoading }: ChurchEventDialogProps) {
  const { profile } = useAuth();
  const isEditing = !!event;

  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries-list", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      const { data } = await supabase.from("ministries").select("id, name").eq("church_id", profile.church_id).order("name");
      return data || [];
    },
    enabled: !!profile?.church_id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", description: "", event_type: "service", start_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "", end_date: "", end_time: "", all_day: false, location: "",
      max_capacity: null, registration_required: false, ministry_id: null,
      ticket_price: 0, is_paid_event: false, status: "published", visibility: "members", tags: "",
    },
  });

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_datetime);
      const endDate = event.end_datetime ? new Date(event.end_datetime) : null;
      form.reset({
        title: event.title, description: event.description || "", event_type: event.event_type,
        start_date: format(startDate, "yyyy-MM-dd"),
        start_time: event.all_day ? "" : format(startDate, "HH:mm"),
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : "",
        end_time: endDate && !event.all_day ? format(endDate, "HH:mm") : "",
        all_day: event.all_day, location: event.location || "",
        max_capacity: event.max_capacity, registration_required: event.registration_required,
        ministry_id: event.ministry_id, ticket_price: event.ticket_price || 0,
        is_paid_event: event.is_paid_event, status: event.status,
        visibility: event.visibility, tags: event.tags?.join(", ") || "",
      });
    } else {
      form.reset({
        title: "", description: "", event_type: "service", start_date: format(new Date(), "yyyy-MM-dd"),
        start_time: "", end_date: "", end_time: "", all_day: false, location: "",
        max_capacity: null, registration_required: false, ministry_id: null,
        ticket_price: 0, is_paid_event: false, status: "published", visibility: "members", tags: "",
      });
    }
  }, [event, form]);

  const allDay = form.watch("all_day");
  const isPaid = form.watch("is_paid_event");

  const handleSubmit = (values: FormValues) => {
    const startDatetime = values.all_day ? `${values.start_date}T00:00:00` : `${values.start_date}T${values.start_time || "00:00"}:00`;
    let endDatetime: string | null = null;
    if (values.end_date) {
      endDatetime = values.all_day ? `${values.end_date}T23:59:59` : `${values.end_date}T${values.end_time || "23:59"}:00`;
    }
    onSubmit({
      title: values.title, description: values.description, event_type: values.event_type,
      start_datetime: startDatetime, end_datetime: endDatetime, all_day: values.all_day,
      location: values.location, max_capacity: values.max_capacity,
      registration_required: values.registration_required,
      ministry_id: values.ministry_id || null,
      ticket_price: values.is_paid_event ? (values.ticket_price || 0) : 0,
      is_paid_event: values.is_paid_event,
      status: values.status, visibility: values.visibility,
      tags: values.tags ? values.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações" : "Crie um evento para a igreja"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Nome do evento" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Detalhes do evento..." className="min-h-[80px]" {...field} /></FormControl></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="event_type" render={({ field }) => (
                <FormItem><FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="ministry_id" render={({ field }) => (
                <FormItem><FormLabel>Ministério (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Geral (toda a igreja)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Geral (toda a igreja)</SelectItem>
                      {ministries.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="visibility" render={({ field }) => (
                <FormItem><FormLabel>Visibilidade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="members">Apenas Membros</SelectItem>
                      <SelectItem value="ministry">Apenas Ministério</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Local</FormLabel><FormControl><Input placeholder="Local do evento" {...field} /></FormControl></FormItem>
            )} />

            <FormField control={form.control} name="all_day" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel>Dia inteiro</FormLabel>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {!allDay && <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
              )} />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem><FormLabel>Data de Término</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              {!allDay && <FormField control={form.control} name="end_time" render={({ field }) => (
                <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
              )} />}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="max_capacity" render={({ field }) => (
                <FormItem><FormLabel>Capacidade Máxima</FormLabel>
                  <FormControl><Input type="number" min="0" placeholder="Ilimitado" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} /></FormControl>
                  <FormDescription>Deixe vazio para ilimitado</FormDescription>
                </FormItem>
              )} />
              <FormField control={form.control} name="registration_required" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel>Requer inscrição</FormLabel>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="is_paid_event" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div><FormLabel>Evento pago</FormLabel><FormDescription>Defina um valor de ingresso</FormDescription></div>
              </FormItem>
            )} />
            {isPaid && (
              <FormField control={form.control} name="ticket_price" render={({ field }) => (
                <FormItem><FormLabel>Valor do Ingresso (R$)</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem><FormLabel>Tags (separadas por vírgula)</FormLabel>
                <FormControl><Input placeholder="jovens, louvor, especial" {...field} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
