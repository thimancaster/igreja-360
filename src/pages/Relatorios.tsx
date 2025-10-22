import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinancialSummary, useReportFiltersData, useExpensesByCategory, useRevenueByMinistry } from "@/hooks/useReports";
import { ExpensesByCategoryChart } from "@/components/reports/ExpensesByCategoryChart";
import { RevenueByMinistryChart } from "@/components/reports/RevenueByMinistryChart";
import { Loader2, TrendingUp, TrendingDown, Scale, FileDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/utils/exportHelpers";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function Relatorios() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMinistry, setSelectedMinistry] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("Pago");

  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    ministryId?: string;
    status?: string;
  }>({});

  const { toast } = useToast();
  const { data: summary, isFetching: summaryFetching, refetch: refetchSummary } = useFinancialSummary(filters);
  const { data: expensesData, isFetching: expensesFetching, refetch: refetchExpenses } = useExpensesByCategory(filters);
  const { data: revenueData, isFetching: revenueFetching, refetch: refetchRevenue } = useRevenueByMinistry(filters);
  const { data: filterOptions, isLoading: filtersLoading } = useReportFiltersData();

  const isFetching = summaryFetching || expensesFetching || revenueFetching;

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
      categoryId: selectedCategory,
      ministryId: selectedMinistry,
      status: selectedStatus,
    };
    setFilters(newFilters);
    setTimeout(() => {
      refetchSummary();
      refetchExpenses();
      refetchRevenue();
    }, 0);
  };

  const handleExportExpenses = () => {
    if (!expensesData || expensesData.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }

    try {
      const dataToExport = expensesData.map(item => ({
        'Categoria': item.name,
        'Valor': item.value,
      }));

      const total = expensesData.reduce((sum, item) => sum + item.value, 0);
      dataToExport.push({ 'Categoria': 'TOTAL', 'Valor': total });

      const fileName = `Despesas_por_Categoria_${format(new Date(), "yyyy-MM-dd")}`;
      exportToExcel(dataToExport, fileName, 'Despesas');
      
      toast({ title: "Exportação Concluída", description: "O arquivo Excel foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro na Exportação", description: error.message, variant: "destructive" });
    }
  };

  const handleExportRevenue = () => {
    if (!revenueData || revenueData.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }

    try {
      const dataToExport = revenueData.map(item => ({
        'Ministério': item.name,
        'Valor': item.value,
      }));

      const total = revenueData.reduce((sum, item) => sum + item.value, 0);
      dataToExport.push({ 'Ministério': 'TOTAL', 'Valor': total });

      const fileName = `Receitas_por_Ministerio_${format(new Date(), "yyyy-MM-dd")}`;
      exportToExcel(dataToExport, fileName, 'Receitas');
      
      toast({ title: "Exportação Concluída", description: "O arquivo Excel foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro na Exportação", description: error.message, variant: "destructive" });
    }
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>
          <div className="space-y-2">
            <Label>Data de Fim</Label>
            <DatePicker date={endDate} setDate={setEndDate} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={filtersLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {filterOptions?.categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ministério</Label>
            <Select value={selectedMinistry} onValueChange={setSelectedMinistry} disabled={filtersLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ministério" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Ministérios</SelectItem>
                {filterOptions?.ministries?.map(min => (
                  <SelectItem key={min.id} value={min.id}>{min.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerateReport} disabled={isFetching} className="w-full md:w-auto">
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
            <div className="p-6 border rounded-lg bg-success/10"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-success">Total de Receitas</h3><TrendingUp className="h-5 w-5 text-success" /></div><p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(summary.totalRevenue)}</p></div>
            <div className="p-6 border rounded-lg bg-destructive/10"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-destructive">Total de Despesas</h3><TrendingDown className="h-5 w-5 text-destructive" /></div><p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(summary.totalExpenses)}</p></div>
            <div className="p-6 border rounded-lg bg-primary/10"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-primary">Saldo Líquido</h3><Scale className="h-5 w-5 text-primary" /></div><p className={`mt-2 text-3xl font-bold ${summary.netBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(summary.netBalance)}</p></div>
          </CardContent>
        </Card>
      )}

      {expensesData && !isFetching && expensesData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Despesas por Categoria</CardTitle>
              <CardDescription>Distribuição das despesas nas diferentes categorias no período selecionado.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportExpenses}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </CardHeader>
          <CardContent className="grid gap-8 md:grid-cols-2 items-center">
            <div className="min-h-[300px]">
              <ExpensesByCategoryChart data={expensesData} />
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesData.map(item => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium flex items-center">
                        <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {revenueData && !isFetching && revenueData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Receitas por Ministério</CardTitle>
              <CardDescription>Distribuição das receitas nos diferentes ministérios no período selecionado.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportRevenue}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </CardHeader>
          <CardContent className="grid gap-8 md:grid-cols-2 items-center">
            <div className="min-h-[300px]">
              <RevenueByMinistryChart data={revenueData} />
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ministério</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.map(item => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}