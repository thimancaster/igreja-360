import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";

interface InstallmentGroupDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  description: string;
}

export function InstallmentGroupDetail({
  open,
  onOpenChange,
  groupId,
  description,
}: InstallmentGroupDetailProps) {
  const queryClient = useQueryClient();
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());

  const { data: installments, isLoading } = useQuery({
    queryKey: ["installment-group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("installment_group_id", groupId)
        .order("installment_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!groupId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const handlePayInstallment = async (id: string) => {
    setPayingIds((prev) => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          status: "Pago", 
          payment_date: new Date().toISOString().split("T")[0] 
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Parcela marcada como paga!");
      queryClient.invalidateQueries({ queryKey: ["installment-group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["installment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (error) {
      toast.error("Erro ao marcar parcela como paga");
    } finally {
      setPayingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Pago":
        return {
          icon: CheckCircle2,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500",
          label: "Pago",
        };
      case "Vencido":
        return {
          icon: AlertTriangle,
          color: "text-rose-500",
          bgColor: "bg-rose-500",
          label: "Vencido",
        };
      default:
        return {
          icon: Clock,
          color: "text-amber-500",
          bgColor: "bg-amber-500",
          label: "Pendente",
        };
    }
  };

  const paidCount = installments?.filter((i) => i.status === "Pago").length || 0;
  const totalCount = installments?.length || 0;
  const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const totalAmount = installments?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
  const paidAmount = installments?.filter((i) => i.status === "Pago").reduce((sum, i) => sum + Number(i.amount), 0) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {description}
          </SheetTitle>
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{paidCount}/{totalCount} parcelas</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pago: {formatCurrency(paidAmount)}</span>
              <span>Total: {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-240px)] mt-6 pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {installments?.map((installment, index) => {
                  const config = getStatusConfig(installment.status);
                  const IconComponent = config.icon;

                  return (
                    <motion.div
                      key={installment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-10"
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-2 top-4 w-5 h-5 rounded-full ${config.bgColor} flex items-center justify-center`}
                      >
                        <IconComponent className="h-3 w-3 text-white" />
                      </div>

                      <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {installment.installment_number}/{installment.total_installments}
                              </Badge>
                              <Badge
                                className={`text-xs ${
                                  installment.status === "Pago"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : installment.status === "Vencido"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                }`}
                              >
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Vence: {formatDate(installment.due_date)}</span>
                            </div>
                            {installment.payment_date && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>Pago em: {formatDate(installment.payment_date)}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${config.color}`}>
                              {formatCurrency(Number(installment.amount))}
                            </p>
                          </div>
                        </div>

                        {(installment.status === "Pendente" || installment.status === "Vencido") && (
                          <div className="mt-3 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handlePayInstallment(installment.id)}
                              disabled={payingIds.has(installment.id)}
                            >
                              {payingIds.has(installment.id) ? "Processando..." : "Marcar como Pago"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
