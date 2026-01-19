import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DueTransaction } from "@/hooks/useDueTransactionAlerts";
import { invalidateAllTransactionQueries } from "@/lib/queryKeys";

interface DayTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  transactions: DueTransaction[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const DayTransactionsDialog: React.FC<DayTransactionsDialogProps> = ({
  open,
  onOpenChange,
  date,
  transactions,
}) => {
  const queryClient = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);

  const handleMarkAsPaid = async (transactionId: string) => {
    setPayingId(transactionId);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          status: "Pago",
          payment_date: format(new Date(), "yyyy-MM-dd")
        })
        .eq("id", transactionId);

      if (error) throw error;

      toast.success("Transação marcada como paga!");
      invalidateAllTransactionQueries(queryClient);
    } catch (error: any) {
      toast.error("Erro ao atualizar transação: " + error.message);
    } finally {
      setPayingId(null);
    }
  };

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Vencimentos de {format(date, "dd 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
          <span className="text-sm text-muted-foreground">
            {transactions.length} {transactions.length === 1 ? "transação" : "transações"}
          </span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-background border rounded-lg"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-medium truncate">{transaction.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Badge variant={transaction.type === "Receita" ? "default" : "secondary"} className="text-xs">
                      {transaction.type}
                    </Badge>
                    {transaction.categories?.name && (
                      <span>{transaction.categories.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold whitespace-nowrap ${transaction.type === "Despesa" ? "text-destructive" : "text-success"}`}>
                    {formatCurrency(transaction.amount)}
                  </span>
                  {transaction.status === "Pendente" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsPaid(transaction.id)}
                      disabled={payingId === transaction.id}
                    >
                      {payingId === transaction.id ? (
                        "..."
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Pagar
                        </>
                      )}
                    </Button>
                  )}
                  {transaction.status === "Pago" && (
                    <Badge variant="default">Pago</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
