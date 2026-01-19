import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverdueTransactions } from "@/hooks/useOverdueTransactions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { invalidateAllTransactionQueries } from "@/lib/queryKeys";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const OverdueTransactionsCard: React.FC = () => {
  const { data: transactions, isLoading } = useOverdueTransactions();
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

  if (isLoading) {
    return (
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalOverdue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const count = transactions?.length || 0;

  if (count === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <p className="font-semibold">Nenhuma conta vencida</p>
              <p className="text-sm text-muted-foreground">Todas as contas estão em dia!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Contas Vencidas
          </span>
          <Badge variant="destructive" className="text-sm">
            {count} {count === 1 ? "conta" : "contas"} • {formatCurrency(totalOverdue)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-2">
            {transactions?.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{transaction.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-destructive font-medium">
                      {transaction.days_overdue} {transaction.days_overdue === 1 ? "dia" : "dias"} em atraso
                    </span>
                    {transaction.category_name && (
                      <>
                        <span>•</span>
                        <span>{transaction.category_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-destructive whitespace-nowrap">
                    {formatCurrency(transaction.amount)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
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
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
