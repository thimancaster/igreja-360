import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CalendarCheck,
  CalendarX,
  Loader2,
} from "lucide-react";
import { useMinistryEvents, MinistryEvent } from "@/hooks/useMinistryEvents";
import { useParentChildren } from "@/hooks/useParentData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const EVENT_TYPE_COLORS: Record<string, string> = {
  service: "bg-blue-500",
  special: "bg-purple-500",
  activity: "bg-green-500",
  meeting: "bg-orange-500",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  service: "Culto",
  special: "Especial",
  activity: "Atividade",
  meeting: "Reunião",
};

export default function ParentEvents() {
  const { events, isLoading, registerChild, isRegistering } = useMinistryEvents();
  const { data: children = [] } = useParentChildren();
  const { user } = useAuth();

  const { data: guardianData } = useQuery({
    queryKey: ["parent-guardian", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("guardians")
        .select("id")
        .eq("profile_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const guardianId = guardianData?.id;
  
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MinistryEvent | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming: MinistryEvent[] = [];
    const past: MinistryEvent[] = [];

    events.forEach((event) => {
      const eventDate = startOfDay(parseISO(event.start_datetime));
      if (isBefore(eventDate, today)) {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    });

    return {
      upcomingEvents: upcoming.sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
      ),
      pastEvents: past.sort(
        (a, b) =>
          new Date(b.start_datetime).getTime() -
          new Date(a.start_datetime).getTime()
      ),
    };
  }, [events]);

  const handleRegister = (event: MinistryEvent) => {
    setSelectedEvent(event);
    setSelectedChildId("");
    setRegistrationDialogOpen(true);
  };

  const confirmRegistration = () => {
    if (!selectedEvent || !selectedChildId || !guardianId) return;

    registerChild({
      eventId: selectedEvent.id,
      childId: selectedChildId,
      guardianId,
    });
    setRegistrationDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const EventCard = ({
    event,
    showRegister = false,
  }: {
    event: MinistryEvent;
    showRegister?: boolean;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                EVENT_TYPE_COLORS[event.event_type]
              }`}
            />
            <CardTitle className="text-lg">{event.title}</CardTitle>
          </div>
          <Badge variant="secondary">
            {EVENT_TYPE_LABELS[event.event_type]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {format(parseISO(event.start_datetime), "dd/MM/yyyy", {
              locale: ptBR,
            })}
            {!event.all_day && (
              <>
                {" às "}
                {format(parseISO(event.start_datetime), "HH:mm")}
              </>
            )}
          </span>

          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}

          {event.max_capacity && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {event.max_capacity} vagas
            </span>
          )}
        </div>

        {showRegister && event.registration_required && (
          <Button
            onClick={() => handleRegister(event)}
            className="w-full mt-2"
            variant="outline"
          >
            <CalendarCheck className="h-4 w-4 mr-2" />
            Inscrever Criança
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-4"
    >
      <div>
        <h1 className="text-2xl font-bold">Calendário de Eventos</h1>
        <p className="text-muted-foreground">
          Eventos e atividades do ministério infantil
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Próximos ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <CalendarX className="h-4 w-4" />
            Anteriores ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum evento programado
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EventCard event={event} showRegister />
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum evento anterior
                </p>
              </CardContent>
            </Card>
          ) : (
            pastEvents.slice(0, 10).map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="opacity-75"
              >
                <EventCard event={event} />
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Registration Dialog */}
      <Dialog
        open={registrationDialogOpen}
        onOpenChange={setRegistrationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscrever Criança</DialogTitle>
            <DialogDescription>
              Selecione a criança que deseja inscrever no evento "
              {selectedEvent?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma criança" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.full_name} - {child.classroom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegistrationDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRegistration}
              disabled={!selectedChildId || isRegistering}
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CalendarCheck className="h-4 w-4 mr-2" />
              )}
              Confirmar Inscrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
