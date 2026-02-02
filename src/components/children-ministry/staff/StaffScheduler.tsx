import { useState } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, User, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStaffSchedules, useUpdateStaffSchedule, StaffSchedule } from "@/hooks/useMinistryStaff";
import { ScheduleDialog } from "./ScheduleDialog";

export function StaffScheduler() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: schedules, isLoading } = useStaffSchedules(
    weekStart.toISOString(),
    weekEnd.toISOString()
  );
  const updateScheduleMutation = useUpdateStaffSchedule();

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const getSchedulesForDay = (day: Date) => {
    return schedules?.filter((schedule) => {
      const scheduleDate = new Date(schedule.shift_start);
      return isSameDay(scheduleDate, day);
    }) || [];
  };

  const handleConfirmSchedule = async (schedule: StaffSchedule) => {
    await updateScheduleMutation.mutateAsync({
      id: schedule.id,
      confirmed: !schedule.confirmed,
      confirmed_at: !schedule.confirmed ? new Date().toISOString() : undefined,
    });
  };

  const handleAddSchedule = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "primary":
        return <Badge className="bg-blue-600 text-xs">Principal</Badge>;
      case "backup":
        return <Badge variant="outline" className="text-xs">Reserva</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escala de Voluntários
            </CardTitle>
            <CardDescription>
              Visualize e gerencie as escalas semanais
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <span className="text-lg font-semibold">
              {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} - {format(weekEnd, "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando escalas...
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-4">
                {daysOfWeek.map((day) => {
                  const daySchedules = getSchedulesForDay(day);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex-1 min-w-[140px] rounded-lg border p-3 ${
                        isToday ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="text-center mb-3">
                        <div className="text-xs text-muted-foreground uppercase">
                          {format(day, "EEE", { locale: ptBR })}
                        </div>
                        <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {daySchedules.length > 0 ? (
                          daySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className={`p-2 rounded-md border text-sm ${
                                schedule.confirmed
                                  ? "bg-green-50 border-green-200"
                                  : "bg-yellow-50 border-yellow-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium truncate text-xs">
                                    {schedule.staff?.full_name || "—"}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleConfirmSchedule(schedule)}
                                  disabled={updateScheduleMutation.isPending}
                                >
                                  {schedule.confirmed ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <X className="h-3 w-3 text-yellow-600" />
                                  )}
                                </Button>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(schedule.shift_start), "HH:mm")} - {format(new Date(schedule.shift_end), "HH:mm")}
                              </div>
                              {schedule.classroom && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {schedule.classroom}
                                </Badge>
                              )}
                              <div className="mt-1">
                                {getRoleBadge(schedule.role)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-center text-muted-foreground py-4">
                            Sem escalas
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleAddSchedule(day)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
      />
    </>
  );
}
