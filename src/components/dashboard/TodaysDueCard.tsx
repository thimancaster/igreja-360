import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, AlertCircle, CheckCircle } from "lucide-react";
import { useTodaysDueTransactions } from "@/hooks/useTodaysDueTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const TodaysDueCard: React.FC = () => {
  const { data: transactions, isLoading } = useTodaysDueTransactions();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const handleMarkAsPaid = async (transactionId: string) => {
    setProcessingId(transactionId);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          status: "Pago", 
          payment_date: new Date().toISOString().split("T")[0] 
        })
        .eq("id", transactionId);

      if (error) throw error;

      toast({
        title: "Pagamento registrado",
        description: "A transação foi marcada como paga.",
      });

      queryClient.invalidateQueries({ queryKey: ["todays-due-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["due-transaction-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a transação.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const count = transactions?.length || 0;
  const totalAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

  if (count === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-full bg-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              Contas para Pagar Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              🎉 Nenhuma conta vence hoje!
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <motion.div 
                className="p-2 rounded-full bg-destructive/20"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CalendarClock className="h-5 w-5 text-destructive" />
              </motion.div>
              Contas para Pagar Hoje
            </div>
            <Badge variant="destructive" className="text-sm">
              {count} {count === 1 ? "conta" : "contas"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
            <span className="text-sm font-medium">Total a pagar</span>
            <span className="text-xl font-bold text-destructive">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {transactions?.slice(0, 5).map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg bg-background/60 hover:bg-background/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{transaction.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {transaction.type}
                    </Badge>
                    {transaction.category_name && (
                      <span className="text-xs text-muted-foreground truncate">
                        {transaction.category_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="font-semibold text-sm whitespace-nowrap">
                    {formatCurrency(transaction.amount)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleMarkAsPaid(transaction.id)}
                    disabled={processingId === transaction.id}
                  >
                    {processingId === transaction.id ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <AlertCircle className="h-3 w-3" />
                      </motion.div>
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {transactions && transactions.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              + {transactions.length - 5} outras contas
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
