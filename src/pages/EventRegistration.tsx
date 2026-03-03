import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Clock, Users, CheckCircle, AlertCircle, DollarSign } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export default function EventRegistrationPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [registered, setRegistered] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["public-event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("ministry_events")
        .select("*, ministry:ministries(name)")
        .eq("id", eventId)
        .eq("status", "published")
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: registrationCount = 0 } = useQuery({
    queryKey: ["event-reg-count", eventId],
    queryFn: async () => {
      if (!eventId) return 0;
      const { count } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .neq("status", "cancelled");
      return count || 0;
    },
    enabled: !!eventId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !name) return;
    setIsSubmitting(true);
    try {
      const ticket = `TKT-${Date.now().toString(36).toUpperCase()}`;
      // For public registration, we insert without profile_id
      const { error } = await supabase.from("event_registrations").insert({
        event_id: eventId,
        status: "registered",
        payment_status: event?.is_paid_event ? "pending" : "free",
        ticket_number: ticket,
        notes: `Nome: ${name} | Email: ${email} | Telefone: ${phone} | ${notes}`,
      });
      if (error) throw error;
      setTicketNumber(ticket);
      setRegistered(true);
      toast.success("Inscrição realizada com sucesso!");
    } catch (err) {
      toast.error("Erro ao realizar inscrição. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Evento não encontrado</h2>
            <p className="text-muted-foreground">Este evento não existe ou não está mais disponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const spotsLeft = event.max_capacity ? event.max_capacity - registrationCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  if (registered) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">Inscrição Confirmada!</h2>
            <p className="text-muted-foreground">{event.title}</p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Seu número de ingresso:</p>
              <p className="text-2xl font-bold text-primary">{ticketNumber}</p>
            </div>
            <div className="flex justify-center">
              <QRCodeSVG value={ticketNumber} size={150} level="H" />
            </div>
            <p className="text-xs text-muted-foreground">Apresente este QR Code na entrada do evento</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {event.ministry && <Badge variant="outline">{(event.ministry as any)?.name}</Badge>}
            {event.is_paid_event && <Badge>R$ {event.ticket_price?.toFixed(2)}</Badge>}
          </div>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
          {event.description && <CardDescription>{event.description}</CardDescription>}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(parseISO(event.start_datetime), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            {!event.all_day && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{format(parseISO(event.start_datetime), "HH:mm")}</span>}
            {event.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{event.location}</span>}
            {spotsLeft !== null && (
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{isFull ? "Esgotado" : `${spotsLeft} vagas restantes`}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isFull ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="font-semibold text-lg">Vagas Esgotadas</p>
              <p className="text-muted-foreground">Este evento atingiu a capacidade máxima.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome Completo *</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alguma informação adicional..." />
              </div>
              {event.is_paid_event && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-sm">Evento Pago - R$ {event.ticket_price?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">O pagamento será confirmado pela organização</p>
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Inscrevendo..." : "Confirmar Inscrição"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
