import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

interface InstallmentTransaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  installment_number: number;
  total_installments: number;
  status: string;
  installment_group_id?: string;
}

interface InstallmentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: "paid" | "pending" | "overdue" | "all";
  installments: InstallmentTransaction[];
  totalAmount: number;
}

export function InstallmentDetailSheet({
  open,
  onOpenChange,
  title,
  type,
  installments,
  totalAmount,
}: InstallmentDetailSheetProps) {
  const queryClient = useQueryClient();
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
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

  const handlePayAll = async () => {
    const pendingInstallments = installments.filter(
      (i) => i.status === "Pendente" || i.status === "Vencido"
    );
    if (pendingInstallments.length === 0) return;

    const ids = pendingInstallments.map((i) => i.id);
    setPayingIds(new Set(ids));

    try {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          status: "Pago", 
          payment_date: new Date().toISOString().split("T")[0] 
        })
        .in("id", ids);

      if (error) throw error;

      toast.success(`${pendingInstallments.length} parcela(s) marcada(s) como paga(s)!`);
      queryClient.invalidateQueries({ queryKey: ["installment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao marcar parcelas como pagas");
    } finally {
      setPayingIds(new Set());
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pago":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "Vencido":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pago":
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Pago</Badge>;
      case "Vencido":
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const hasPendingOrOverdue = installments.some(
    (i) => i.status === "Pendente" || i.status === "Vencido"
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {title}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {installments.length} parcela{installments.length !== 1 ? "s" : ""} • Total: {formatCurrency(totalAmount)}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6 pr-4">
          <div className="space-y-3">
            {installments.map((installment) => (
              <div
                key={installment.id}
                className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                      {getStatusIcon(installment.status)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {installment.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {installment.installment_number}/{installment.total_installments}
                        </Badge>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDate(installment.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(installment.status)}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className={`font-semibold ${
                    installment.status === "Pago" 
                      ? "text-emerald-600" 
                      : installment.status === "Vencido" 
                      ? "text-rose-600" 
                      : "text-foreground"
                  }`}>
                    {formatCurrency(installment.amount)}
                  </span>
                  {(installment.status === "Pendente" || installment.status === "Vencido") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePayInstallment(installment.id)}
                      disabled={payingIds.has(installment.id)}
                    >
                      {payingIds.has(installment.id) ? "Pagando..." : "Marcar Pago"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {hasPendingOrOverdue && type !== "paid" && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button
              className="w-full"
              onClick={handlePayAll}
              disabled={payingIds.size > 0}
            >
              {payingIds.size > 0 ? "Processando..." : `Pagar Todas (${formatCurrency(
                installments
                  .filter((i) => i.status !== "Pago")
                  .reduce((sum, i) => sum + i.amount, 0)
              )})`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
