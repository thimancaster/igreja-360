import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEvents } from "@/hooks/useEvents";
import { useEventRegistrations } from "@/hooks/useEventRegistrations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const EVENT_TYPE_LABELS: Record<string, string> = {
  service: "Culto", special: "Especial", activity: "Atividade", meeting: "Reunião",
  conference: "Conferência", workshop: "Workshop", retreat: "Retiro", outreach: "Evangelismo",
};

export default function PortalEvents() {
  const { upcomingEvents, isLoading } = useEvents();
  const { myRegistrations, registerForEvent, cancelRegistration, isRegistering } = useEventRegistrations();
  const [cancelId, setCancelId] = useState<string | null>(null);

  const registeredEventIds = new Set(myRegistrations.map((r: any) => r.event_id));

  if (isLoading) return <div className="flex items-center justify-center p-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-muted-foreground">Confira os eventos e inscreva-se</p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="my">Meus Eventos ({myRegistrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcomingEvents.filter(e => e.status === "published").length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum evento disponível no momento</CardContent></Card>
          ) : (
            upcomingEvents.filter(e => e.status === "published").map(event => {
              const isRegistered = registeredEventIds.has(event.id);
              return (
                <Card key={event.id} variant="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        {event.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(event.start_datetime), "dd/MM/yyyy", { locale: ptBR })}</span>
                          {!event.all_day && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(event.start_datetime), "HH:mm")}</span>}
                          {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
                          {event.max_capacity && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.max_capacity} vagas</span>}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</Badge>
                          {event.is_paid_event && <Badge className="text-xs">R$ {event.ticket_price?.toFixed(2)}</Badge>}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isRegistered ? (
                          <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Inscrito</Badge>
                        ) : event.registration_required ? (
                          <Button size="sm" onClick={() => registerForEvent({ eventId: event.id })} disabled={isRegistering}>
                            Inscrever-se
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-3">
          {myRegistrations.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Você não está inscrito em nenhum evento</CardContent></Card>
          ) : (
            myRegistrations.map((reg: any) => (
              <Card key={reg.id} variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{reg.event?.title || "Evento"}</h3>
                      {reg.event?.start_datetime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(reg.event.start_datetime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          {reg.event.location && ` • ${reg.event.location}`}
                        </p>
                      )}
                      <div className="flex gap-1 mt-2">
                        <Badge variant={reg.status === "registered" ? "default" : "secondary"} className="text-xs capitalize">{reg.status}</Badge>
                        {reg.ticket_number && <Badge variant="outline" className="text-xs">{reg.ticket_number}</Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelId(reg.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Inscrição</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja cancelar sua inscrição?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (cancelId) cancelRegistration(cancelId); setCancelId(null); }} className="bg-destructive text-destructive-foreground">
              Cancelar Inscrição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
