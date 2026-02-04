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
  ChevronRight,
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
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const EventCard = ({
    event,
    showRegister = false,
    index = 0,
  }: {
    event: MinistryEvent;
    showRegister?: boolean;
    index?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden active:scale-[0.98] transition-transform">
        <div className={`h-1 ${EVENT_TYPE_COLORS[event.event_type]}`} />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">
              {event.title}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {EVENT_TYPE_LABELS[event.event_type]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(parseISO(event.start_datetime), "dd/MM", { locale: ptBR })}
            </span>
            {!event.all_day && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {format(parseISO(event.start_datetime), "HH:mm")}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </span>
            )}
            {event.max_capacity && (
              <span className="flex items-center gap-1.5">
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
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 p-4"
    >
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Atividades do ministério infantil
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="upcoming" className="gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Próximos ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2 text-sm">
            <CalendarX className="h-4 w-4" />
            Anteriores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Nenhum evento programado</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Novos eventos serão exibidos aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map((event, index) => (
              <EventCard key={event.id} event={event} showRegister index={index} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-4">
          {pastEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CalendarX className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Nenhum evento anterior</p>
              </CardContent>
            </Card>
          ) : (
            pastEvents.slice(0, 10).map((event, index) => (
              <div key={event.id} className="opacity-70">
                <EventCard event={event} index={index} />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Registration Dialog */}
      <Dialog
        open={registrationDialogOpen}
        onOpenChange={setRegistrationDialogOpen}
      >
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Inscrever Criança</DialogTitle>
            <DialogDescription>
              Selecione a criança para o evento "{selectedEvent?.title}"
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

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setRegistrationDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRegistration}
              disabled={!selectedChildId || isRegistering}
              className="w-full sm:w-auto"
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CalendarCheck className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
