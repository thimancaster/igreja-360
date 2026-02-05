import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { VolunteerSchedule } from "@/hooks/useVolunteerSchedules";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduleCalendarProps {
  schedules: VolunteerSchedule[];
  schedulesByDate: Record<string, VolunteerSchedule[]>;
  isLoading: boolean;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onScheduleClick?: (schedule: VolunteerSchedule) => void;
  canEdit?: boolean;
}

export function ScheduleCalendar({
  schedules,
  schedulesByDate,
  isLoading,
  currentMonth,
  onMonthChange,
  onDayClick,
  onScheduleClick,
  canEdit = false,
}: ScheduleCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  // Pad with empty cells for proper alignment
  const paddedDays = Array(startDayOfWeek).fill(null).concat(days);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getSchedulesForDay = (date: Date): VolunteerSchedule[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedulesByDate[dateStr] || [];
  };

  const getScheduleTypeColor = (type: 'primary' | 'backup') => {
    return type === 'primary' ? 'bg-primary' : 'bg-secondary';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="min-h-[80px]" />;
            }

            const daySchedules = getSchedulesForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[80px] p-1 border rounded-md transition-colors",
                  isCurrentMonth ? "bg-background" : "bg-muted/50",
                  isCurrentDay && "ring-2 ring-primary",
                  canEdit && "hover:bg-muted/50 cursor-pointer"
                )}
                onClick={() => canEdit && onDayClick?.(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isCurrentDay && "text-primary font-bold",
                      !isCurrentMonth && "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {canEdit && daySchedules.length === 0 && (
                    <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  )}
                </div>

                {/* Schedules for this day */}
                <div className="space-y-1">
                  {daySchedules.slice(0, 3).map((schedule) => (
                    <div
                      key={schedule.id}
                      className={cn(
                        "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80",
                        schedule.schedule_type === 'primary'
                          ? "bg-primary/20 text-primary-foreground"
                          : "bg-secondary/40 text-secondary-foreground",
                        !schedule.confirmed && "border-l-2 border-warning"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleClick?.(schedule);
                      }}
                      title={`${schedule.volunteer_name} - ${schedule.shift_start.slice(0, 5)} às ${schedule.shift_end.slice(0, 5)}`}
                    >
                      <div className="flex items-center gap-1">
                        <User className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{schedule.volunteer_name}</span>
                      </div>
                    </div>
                  ))}
                  {daySchedules.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{daySchedules.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20" />
            <span>Titular</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-secondary/40" />
            <span>Reserva</span>
          </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border-l-2 border-warning bg-muted" />
                    <span>Não confirmado</span>
                  </div>
        </div>
      </CardContent>
    </Card>
  );
}
