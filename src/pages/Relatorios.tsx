import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { useFinancialSummary } from "@/hooks/useReports";
import { Loader2, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function Relatorios() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string }>({});

  const { toast } = useToast();
  const { data: summary, isFetching, refetch } = useFinancialSummary(filters);

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      toast({ title: "Datas inválidas", description: "Por favor, selecione data de início e fim.", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Período inválido", description: "A data de fim deve ser posterior à data de início.", variant: "destructive" });
      return;
    }
    const newFilters = {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
    setFilters(newFilters);
    // Use a timeout to ensure state is updated before refetching
    setTimeout(() => refetch(), 0);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios Financeiros</h1>
        <p className="text-muted-foreground mt-1">Gere e visualize relatórios detalhados.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Data de Início</label>
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Data de Fim</label>
            <DatePicker date={endDate} setDate={setEndDate} />
          </div>
          <Button onClick={handleGenerateReport} disabled={isFetching} className="self-end">
            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Relatório
          </Button>
        </CardContent>
      </Card>

      {isFetching && (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {summary && !isFetching && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
            <p className="text-sm text-muted-foreground">
              Resultados para o período de {startDate ? format(startDate, "dd/MM/yyyy") : ""} a {endDate ? format(endDate, "dd/MM/yyyy") : ""}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="p-6 border rounded-lg bg-success/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-success">Total de Receitas</h3>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="p-6 border rounded-lg bg-destructive/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-destructive">Total de Despesas</h3>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <div className="p-6 border rounded-lg bg-primary/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-primary">Saldo Líquido</h3>
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <p className={`mt-2 text-3xl font-bold ${summary.netBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {formatCurrency(summary.netBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}