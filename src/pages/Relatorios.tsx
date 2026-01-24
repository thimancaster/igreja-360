import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFinancialSummary, useReportFiltersData, useExpensesByCategory, useRevenueByMinistry, useCashFlow } from "@/hooks/useReports";
import { ExpensesByCategoryChart } from "@/components/reports/ExpensesByCategoryChart";
import { RevenueByMinistryChart } from "@/components/reports/RevenueByMinistryChart";
import { CashFlowReport } from "@/components/reports/CashFlowReport";
import { TrendingUp, TrendingDown, Scale, FileDown, FileText, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/utils/exportHelpers";
// Dynamic imports for PDF generation - loaded only when user exports
import { LoadingSpinner } from "@/components/LoadingSpinner";

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
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    ministryId?: string;
    status?: string;
    searchTerm?: string;
  }>({});

  const { toast } = useToast();
  const { data: summary, isFetching: summaryFetching, refetch: refetchSummary } = useFinancialSummary(filters);
  const { data: expensesData, isFetching: expensesFetching, refetch: refetchExpenses } = useExpensesByCategory(filters);
  const { data: revenueData, isFetching: revenueFetching, refetch: refetchRevenue } = useRevenueByMinistry(filters);
  const { data: cashFlowData, isFetching: cashFlowFetching, refetch: refetchCashFlow } = useCashFlow(filters);
  const { data: filterOptions, isLoading: filtersLoading } = useReportFiltersData();

  const isFetching = summaryFetching || expensesFetching || revenueFetching || cashFlowFetching;

  const getDateRange = () => ({
    start: startDate ? format(startDate, "dd/MM/yyyy") : "",
    end: endDate ? format(endDate, "dd/MM/yyyy") : "",
  });

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
      searchTerm: searchTerm.trim(),
    };
    setFilters(newFilters);
    setTimeout(() => {
      refetchSummary();
      refetchExpenses();
      refetchRevenue();
      refetchCashFlow();
    }, 0);
  };

  // Excel exports
  const handleExportExpenses = async () => {
    if (!expensesData || expensesData.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    try {
      const dataToExport = expensesData.map(item => ({ 'Categoria': item.name, 'Valor': item.value }));
      const total = expensesData.reduce((sum, item) => sum + item.value, 0);
      dataToExport.push({ 'Categoria': 'TOTAL', 'Valor': total });
      await exportToExcel(dataToExport, `Despesas_por_Categoria_${format(new Date(), "yyyy-MM-dd")}`, 'Despesas');
      toast({ title: "Exportação Concluída", description: "O arquivo Excel foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro na Exportação", description: error.message, variant: "destructive" });
    }
  };

  const handleExportRevenue = async () => {
    if (!revenueData || revenueData.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    try {
      const dataToExport = revenueData.map(item => ({ 'Ministério': item.name, 'Valor': item.value }));
      const total = revenueData.reduce((sum, item) => sum + item.value, 0);
      dataToExport.push({ 'Ministério': 'TOTAL', 'Valor': total });
      await exportToExcel(dataToExport, `Receitas_por_Ministerio_${format(new Date(), "yyyy-MM-dd")}`, 'Receitas');
      toast({ title: "Exportação Concluída", description: "O arquivo Excel foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro na Exportação", description: error.message, variant: "destructive" });
    }
  };

  const handleExportCashFlow = async () => {
    if (!cashFlowData || cashFlowData.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    try {
      const dataToExport = cashFlowData.map(item => ({
        'Data': item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString("pt-BR") : '-',
        'Descrição': item.description,
        'Tipo': item.type,
        'Valor': item.value,
        'Saldo': item.balance,
      }));
      await exportToExcel(dataToExport, `Fluxo_de_Caixa_${format(new Date(), "yyyy-MM-dd")}`, 'Fluxo de Caixa');
      toast({ title: "Exportação Concluída", description: "O arquivo Excel foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro na Exportação", description: error.message, variant: "destructive" });
    }
  };

  // PDF exports
  const handleExportSummaryPDF = async () => {
    if (!summary) {
      toast({ title: "Nenhum dado", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    try {
      const { exportFinancialSummaryPDF } = await import("@/utils/pdfExportHelpers");
      exportFinancialSummaryPDF(
        { totalRevenue: summary.totalRevenue, totalExpenses: summary.totalExpenses, balance: summary.netBalance },
        getDateRange()
      );
      toast({ title: "PDF Exportado", description: "O relatório PDF foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleExportCashFlowPDF = async () => {
    if (!cashFlowData || cashFlowData.length === 0) {
      toast({ title: "Nenhum dado", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    try {
      const formattedData = cashFlowData.map(item => ({
        date: item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString("pt-BR") : '-',
        description: item.description,
        type: item.type,
        amount: item.value,
        balance: item.balance,
      }));
      const { exportCashFlowPDF } = await import("@/utils/pdfExportHelpers");
      exportCashFlowPDF(formattedData, getDateRange());
      toast({ title: "PDF Exportado", description: "O relatório PDF foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleExportExpensesPDF = async () => {
    if (!expensesData || expensesData.length === 0) {
      toast({ title: "Nenhum dado", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    try {
      const formattedData = expensesData.map(item => ({
        category: item.name,
        total: item.value,
        color: item.color,
      }));
      const { exportExpensesByCategoryPDF } = await import("@/utils/pdfExportHelpers");
      exportExpensesByCategoryPDF(formattedData, getDateRange());
      toast({ title: "PDF Exportado", description: "O relatório PDF foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleExportRevenuePDF = async () => {
    if (!revenueData || revenueData.length === 0) {
      toast({ title: "Nenhum dado", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    try {
      const formattedData = revenueData.map(item => ({
        ministry: item.name,
        total: item.value,
      }));
      const { exportRevenueByMinistryPDF } = await import("@/utils/pdfExportHelpers");
      exportRevenueByMinistryPDF(formattedData, getDateRange());
      toast({ title: "PDF Exportado", description: "O relatório PDF foi baixado." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleExportFullReport = async (format: 'pdf' | 'excel') => {
    if (!summary || !cashFlowData) {
      toast({ title: "Nenhum dado", description: "Gere um relatório primeiro.", variant: "destructive" });
      return;
    }
    
    try {
      if (format === 'pdf') {
        const cashFlowFormatted = cashFlowData.map(item => ({
          date: item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString("pt-BR") : '-',
          description: item.description,
          type: item.type,
          amount: item.value,
          balance: item.balance,
        }));
        const expensesFormatted = (expensesData || []).map(item => ({
          category: item.name,
          total: item.value,
          color: item.color,
        }));
        const revenueFormatted = (revenueData || []).map(item => ({
          ministry: item.name,
          total: item.value,
        }));
        
        const { exportFullReportPDF } = await import("@/utils/pdfExportHelpers");
        exportFullReportPDF(
          { totalRevenue: summary.totalRevenue, totalExpenses: summary.totalExpenses, balance: summary.netBalance },
          cashFlowFormatted,
          expensesFormatted,
          revenueFormatted,
          getDateRange()
        );
        toast({ title: "PDF Completo Exportado", description: "O relatório completo foi baixado." });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold">Relatórios Financeiros</h1>
        <p className="text-muted-foreground mt-1">Gere e visualize relatórios detalhados.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Filtros do Relatório</CardTitle>
            {summary && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" />
                    Exportar Completo
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportFullReport('pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar PDF Completo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
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
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="search">Buscar por Descrição</Label>
              <Input
                id="search"
                placeholder="Ex: Dízimo, conta de luz, oferta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerateReport} disabled={isFetching} className="w-full">
              {isFetching && <LoadingSpinner size="sm" className="mr-2" />}
              Gerar Relatório
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {isFetching && (
        <div className="flex justify-center items-center p-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {summary && !isFetching && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Resumo Financeiro</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Resultados para o período de {startDate ? format(startDate, "dd/MM/yyyy") : ""} a {endDate ? format(endDate, "dd/MM/yyyy") : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportSummaryPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <motion.div 
                className="p-6 border rounded-lg bg-emerald-500/10 border-emerald-500/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-emerald-600">Total de Receitas</h3>
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(summary.totalRevenue)}</p>
              </motion.div>
              <motion.div 
                className="p-6 border rounded-lg bg-rose-500/10 border-rose-500/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-rose-600">Total de Despesas</h3>
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(summary.totalExpenses)}</p>
              </motion.div>
              <motion.div 
                className="p-6 border rounded-lg bg-primary/10 border-primary/20"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-primary">Saldo Líquido</h3>
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <p className={`mt-2 text-3xl font-bold ${summary.netBalance >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                  {formatCurrency(summary.netBalance)}
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {cashFlowData && !isFetching && cashFlowData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fluxo de Caixa Detalhado</CardTitle>
                <CardDescription>Movimentações e saldo acumulado no período.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCashFlowPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCashFlow}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CashFlowReport data={cashFlowData} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {expensesData && !isFetching && expensesData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição das despesas nas diferentes categorias no período selecionado.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportExpensesPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExpenses}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
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
                    {expensesData.map((item, index) => (
                      <motion.tr 
                        key={item.name}
                        className="border-b"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TableCell className="font-medium flex items-center">
                          <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {revenueData && !isFetching && revenueData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Receitas por Ministério</CardTitle>
                <CardDescription>Distribuição das receitas nos diferentes ministérios no período selecionado.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportRevenuePDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportRevenue}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
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
                    {revenueData.map((item, index) => (
                      <motion.tr 
                        key={item.name}
                        className="border-b"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
