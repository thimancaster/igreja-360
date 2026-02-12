import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Check, Clock } from "lucide-react";
import { useVolunteerSchedules } from "@/hooks/useVolunteerSchedules";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalSchedules() {
  const [currentMonth] = useState(new Date());
  const { mySchedules, mySchedulesLoading, confirmSchedule, isConfirming } =
    useVolunteerSchedules(undefined, currentMonth);

  if (mySchedulesLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const upcoming = (mySchedules || []).filter(
    (s) => new Date(s.schedule_date) >= new Date(new Date().toDateString())
  );
  const past = (mySchedules || []).filter(
    (s) => new Date(s.schedule_date) < new Date(new Date().toDateString())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Minhas Escalas</h1>
        <p className="text-sm text-muted-foreground">Seus compromissos como voluntário</p>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">Nenhuma escala encontrada</p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Suas escalas aparecerão aqui quando forem atribuídas
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Próximas ({upcoming.length})
              </h2>
              {upcoming.map((schedule: any, index: number) => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {format(new Date(schedule.schedule_date), "EEEE, dd 'de' MMMM", {
                              locale: ptBR,
                            })}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {schedule.shift_start} - {schedule.shift_end}
                          </div>
                          {schedule.ministry_name && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {schedule.ministry_name}
                            </Badge>
                          )}
                          {schedule.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{schedule.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {schedule.confirmed ? (
                            <Badge variant="default" className="gap-1">
                              <Check className="h-3 w-3" />
                              Confirmado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => confirmSchedule(schedule.id)}
                              disabled={isConfirming}
                            >
                              Confirmar
                            </Button>
                          )}
                          <Badge variant={schedule.schedule_type === "backup" ? "secondary" : "outline"} className="text-xs">
                            {schedule.schedule_type === "backup" ? "Reserva" : "Titular"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-muted-foreground">Anteriores</h2>
              {past.slice(0, 5).map((schedule: any) => (
                <Card key={schedule.id} className="opacity-60">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(schedule.schedule_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {schedule.shift_start} - {schedule.shift_end}
                          {schedule.ministry_name && ` • ${schedule.ministry_name}`}
                        </p>
                      </div>
                      {schedule.confirmed && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Check className="h-3 w-3" /> Presente
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
