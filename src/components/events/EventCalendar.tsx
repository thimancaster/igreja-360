import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users } from "lucide-react";
import { useEvents, ChurchEvent } from "@/hooks/useEvents";
import { ChurchEventDialog } from "./ChurchEventDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const EVENT_TYPE_COLORS: Record<string, string> = {
  service: "bg-blue-500", special: "bg-purple-500", activity: "bg-green-500",
  meeting: "bg-orange-500", conference: "bg-pink-500", workshop: "bg-teal-500",
  retreat: "bg-indigo-500", outreach: "bg-red-500",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  service: "Culto", special: "Especial", activity: "Atividade", meeting: "Reunião",
  conference: "Conferência", workshop: "Workshop", retreat: "Retiro", outreach: "Evangelismo",
};

export function EventCalendar() {
  const { events, isLoading, createEvent, updateEvent, isCreating, isUpdating } = useEvents();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysList = eachDayOfInterval({ start, end });
    const startDayOfWeek = start.getDay();
    const padding = Array.from({ length: startDayOfWeek }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() - (startDayOfWeek - i));
      return d;
    });
    return [...padding, ...daysList];
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ChurchEvent[]>();
    events.forEach(event => {
      const dateKey = format(parseISO(event.start_datetime), "yyyy-MM-dd");
      map.set(dateKey, [...(map.get(dateKey) || []), event]);
    });
    return map;
  }, [events]);

  if (isLoading) return <div className="flex items-center justify-center p-12"><LoadingSpinner size="lg" /></div>;

  const upcomingEvents = events
    .filter(e => new Date(e.start_datetime) >= new Date() && e.status === "published")
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    .slice(0, 8);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Calendário</CardTitle>
            <Button onClick={() => { setSelectedEvent(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Novo</Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <h3 className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h3>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                <div key={d} className="text-center text-sm font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {days.map((day, i) => {
                const dayEvents = eventsByDate.get(format(day, "yyyy-MM-dd")) || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrent = isToday(day);
                return (
                  <motion.div key={day.toISOString()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.005 }}
                    className={`min-h-[80px] p-1 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${!isCurrentMonth ? "opacity-30" : ""} ${isCurrent ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => { setSelectedEvent(null); setDialogOpen(true); }}>
                    <div className="text-right text-sm mb-1">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isCurrent ? "bg-primary text-primary-foreground" : ""}`}>{format(day, "d")}</span>
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div key={ev.id} className={`text-[10px] px-1 rounded truncate text-white ${EVENT_TYPE_COLORS[ev.event_type] || "bg-gray-500"}`}
                          onClick={e => { e.stopPropagation(); setSelectedEvent(ev); setDialogOpen(true); }} title={ev.title}>
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 2}</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader><CardTitle className="text-lg">Próximos Eventos</CardTitle></CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum evento agendado</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => { setSelectedEvent(ev); setDialogOpen(true); }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${EVENT_TYPE_COLORS[ev.event_type] || "bg-gray-500"}`} />
                      <p className="font-medium text-sm truncate">{ev.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(ev.start_datetime), "dd/MM HH:mm")}</span>
                      {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px]">{EVENT_TYPE_LABELS[ev.event_type]}</Badge>
                      {ev.registration_required && <Badge variant="secondary" className="text-[10px]">Inscrição</Badge>}
                      {ev.is_paid_event && <Badge className="text-[10px]">R$ {ev.ticket_price}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ChurchEventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={selectedEvent}
        onSubmit={data => {
          if (selectedEvent) updateEvent({ id: selectedEvent.id, data });
          else createEvent(data);
          setDialogOpen(false);
        }}
        isLoading={isCreating || isUpdating}
      />
    </>
  );
}
