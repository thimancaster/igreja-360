import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDueTransactionAlerts, DueTransaction } from "@/hooks/useDueTransactionAlerts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { DayTransactionsDialog } from "./DayTransactionsDialog";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const UpcomingPaymentsCalendar: React.FC = () => {
  const { data: transactions, isLoading } = useDueTransactionAlerts(7);
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 flex-1" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTransactionsForDay = (day: Date): DueTransaction[] => {
    return (transactions || []).filter((t) =>
      isSameDay(parseISO(t.due_date), day)
    );
  };

  const getDayTotal = (day: Date) => {
    return getTransactionsForDay(day).reduce((sum, t) => sum + t.amount, 0);
  };

  const handleDayClick = (day: Date) => {
    const dayTransactions = getTransactionsForDay(day);
    if (dayTransactions.length > 0) {
      setSelectedDate(day);
      setDialogOpen(true);
    }
  };

  const handleViewAll = () => {
    // Navegar para transações filtradas por status pendente
    navigate("/app/transacoes");
  };

  const selectedDayTransactions = selectedDate 
    ? getTransactionsForDay(selectedDate)
    : [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximos Vencimentos
            </span>
            <button
              onClick={handleViewAll}
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              Ver todas
              <ChevronRight className="h-4 w-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2">
            <TooltipProvider>
              {days.map((day, index) => {
                const dayTransactions = getTransactionsForDay(day);
                const count = dayTransactions.length;
                const total = getDayTotal(day);
                const isToday = index === 0;

                return (
                  <Tooltip key={day.toISOString()}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleDayClick(day)}
                        className={`
                          flex-1 min-w-[60px] p-2 rounded-lg text-center transition-all
                          ${count > 0 ? "cursor-pointer hover:scale-105" : "cursor-default"}
                          ${isToday ? "bg-primary/10 border-2 border-primary" : "bg-muted/30 hover:bg-muted/50"}
                          ${count > 0 ? "ring-2 ring-warning/30" : ""}
                        `}
                      >
                        <div className="text-xs text-muted-foreground">
                          {format(day, "EEE", { locale: ptBR })}
                        </div>
                        <div className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                          {format(day, "dd")}
                        </div>
                        {count > 0 ? (
                          <div className="space-y-1">
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0"
                            >
                              {count}
                            </Badge>
                            <div className="text-xs font-medium text-muted-foreground truncate">
                              {formatCurrency(total)}
                            </div>
                          </div>
                        ) : (
                          <div className="h-10 mt-1" />
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {count > 0 ? (
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {count} {count === 1 ? "conta" : "contas"} - {formatCurrency(total)}
                          </p>
                          {dayTransactions.slice(0, 3).map((t) => (
                            <p key={t.id} className="text-xs">
                              • {t.description} - {formatCurrency(t.amount)}
                            </p>
                          ))}
                          {count > 3 && (
                            <p className="text-xs text-muted-foreground">
                              + {count - 3} outras
                            </p>
                          )}
                          <p className="text-xs text-primary mt-2">Clique para ver detalhes</p>
                        </div>
                      ) : (
                        <p>Nenhuma conta vence neste dia</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <DayTransactionsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          transactions={selectedDayTransactions}
        />
      )}
    </>
  );
};
