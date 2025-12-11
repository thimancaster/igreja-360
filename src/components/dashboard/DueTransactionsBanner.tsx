import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useDueTransactionAlerts } from "@/hooks/useDueTransactionAlerts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const DueTransactionsBanner: React.FC = () => {
  const { data: dueTransactions, isLoading } = useDueTransactionAlerts(7);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || !dueTransactions || dueTransactions.length === 0) {
    return null;
  }

  const urgentCount = dueTransactions.filter((t) => t.daysRemaining <= 2).length;
  const totalAmount = dueTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>
            {dueTransactions.length} transação(ões) próxima(s) do vencimento
            {urgentCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {urgentCount} urgente(s)
              </Badge>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </AlertTitle>
        <AlertDescription>
          Total pendente: {formatCurrency(totalAmount)}
        </AlertDescription>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              {dueTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-md bg-background/50 p-2 text-sm"
                >
                  <div className="flex-1">
                    <span className="font-medium">{transaction.description}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({transaction.type === "Despesa" ? "Saída" : "Entrada"})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <Badge
                      variant={transaction.daysRemaining <= 2 ? "destructive" : "secondary"}
                    >
                      {transaction.daysRemaining === 0
                        ? "Hoje"
                        : transaction.daysRemaining === 1
                        ? "Amanhã"
                        : `${transaction.daysRemaining} dias`}
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(parseISO(transaction.due_date), "dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Alert>
    </motion.div>
  );
};
