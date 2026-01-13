import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTransactionStats } from "@/hooks/useTransactions";
import { useFilteredTransactions } from "@/hooks/useFilteredTransactions";
import { useCategoriesAndMinistries } from "@/hooks/useCategoriesAndMinistries";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { AnimatedStatsCard } from "@/components/dashboard/AnimatedStatsCard";
import { RevenueExpenseChart } from "@/components/dashboard/RevenueExpenseChart";
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart";
import { BalanceAreaChart } from "@/components/dashboard/BalanceAreaChart";
import { DueTransactionsBanner } from "@/components/dashboard/DueTransactionsBanner";
import { TodaysDueCard } from "@/components/dashboard/TodaysDueCard";
import { FinancialHealthGauge } from "@/components/dashboard/FinancialHealthGauge";
import { UpcomingPaymentsCalendar } from "@/components/dashboard/UpcomingPaymentsCalendar";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { useEvolutionData, useTrendData } from "@/hooks/useEvolutionData";
import { useSparklineData } from "@/hooks/useSparklineData";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";

export default function Dashboard() {
  const [filters, setFilters] = useState({
    period: "mes-atual",
    ministryId: "todos",
    status: "todos-status"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: transactions,
    isLoading: transactionsLoading
  } = useFilteredTransactions(filters);
  const {
    data: stats,
    isLoading: statsLoading
  } = useTransactionStats();
  const {
    data: categoriesAndMinistries
  } = useCategoriesAndMinistries();
  const {
    data: evolutionData,
    isLoading: evolutionLoading
  } = useEvolutionData(6);
  const {
    data: trendData
  } = useTrendData();
  const {
    data: sparklineData
  } = useSparklineData(7);
  const ministries = categoriesAndMinistries?.ministries || [];

  // Filtrar transações por busca
  const filteredTransactions = (transactions || []).filter(t => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return t.description.toLowerCase().includes(term) || t.categories?.name?.toLowerCase().includes(term) || t.status.toLowerCase().includes(term) || t.type.toLowerCase().includes(term);
  });
  const pagination = usePagination(filteredTransactions, {
    initialPageSize: 10
  });
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Pago":
        return "default";
      case "Pendente":
        return "secondary";
      case "Vencido":
        return "destructive";
      default:
        return "outline";
    }
  };
  return <div className="flex-1 space-y-6 p-6">
      <motion.div initial={{
      opacity: 0,
      y: -20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5
    }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Dashboard Financeiro
        </h1>
        <p className="mt-1 text-sidebar">Visão geral das finanças da sua igreja</p>
      </motion.div>

      {/* Quick Actions Bar */}
      <QuickActionsBar />

      {/* Banner de Vencimentos */}
      <DueTransactionsBanner />

      {/* Top Section: Contas para Pagar Hoje + Saúde Financeira */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodaysDueCard />
        </div>
        <div>
          <FinancialHealthGauge />
        </div>
      </div>

      {/* Calendário de Vencimentos */}
      <UpcomingPaymentsCalendar />

      {/* Cards de Destaque com Animação e Sparklines */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? <>
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </> : <>
            <AnimatedStatsCard 
              title="Contas a Pagar" 
              value={stats?.totalPayable || 0} 
              icon={<DollarSign className="h-5 w-5" />} 
              variant="warning" 
              delay={0}
              sparklineData={sparklineData?.expensesData}
            />
            <AnimatedStatsCard 
              title="Contas Pagas" 
              value={stats?.totalPaid || 0} 
              trend={trendData?.revenueTrend} 
              icon={<TrendingUp className="h-5 w-5" />} 
              variant="success" 
              delay={1}
              sparklineData={sparklineData?.revenueData}
            />
            <AnimatedStatsCard 
              title="Contas Vencidas" 
              value={stats?.totalOverdue || 0} 
              icon={<TrendingDown className="h-5 w-5" />} 
              variant="danger" 
              delay={2}
            />
            <AnimatedStatsCard 
              title="Saldo Total" 
              value={stats?.balance || 0} 
              icon={<Wallet className="h-5 w-5" />} 
              variant="default" 
              delay={3}
              sparklineData={sparklineData?.balanceData}
            />
          </>}
      </div>

      {/* Gráficos Interativos */}
      <div className="grid gap-6 lg:grid-cols-1">
        <RevenueExpenseChart data={evolutionData || []} isLoading={evolutionLoading} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MonthlyComparisonChart data={evolutionData || []} isLoading={evolutionLoading} />
        <BalanceAreaChart data={evolutionData || []} isLoading={evolutionLoading} />
      </div>

      {/* Filtros */}
      <motion.div className="flex flex-wrap gap-4" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      delay: 0.6
    }}>
        <Select value={filters.period} onValueChange={value => setFilters({
        ...filters,
        period: value
      })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes-atual">Mês Atual</SelectItem>
            <SelectItem value="trimestre">Último Trimestre</SelectItem>
            <SelectItem value="ano">Ano Atual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.ministryId} onValueChange={value => setFilters({
        ...filters,
        ministryId: value
      })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ministério" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Ministérios</SelectItem>
            {ministries?.map(ministry => <SelectItem key={ministry.id} value={ministry.id}>
                {ministry.name}
              </SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={value => setFilters({
        ...filters,
        status: value
      })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos-status">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Tabela de Transações Recentes */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5,
      delay: 0.7
    }}>
        <Card className="overflow-hidden border-border/50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <motion.span initial={{
                scale: 0
              }} animate={{
                scale: 1
              }} transition={{
                delay: 0.8,
                type: 'spring'
              }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </motion.span>
                Transações Recentes
              </h2>
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar transações..." className="w-64" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsLoading ? <>
                    {[...Array(5)].map((_, i) => <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
                      </TableRow>)}
                  </> : pagination.paginatedData.length > 0 ? pagination.paginatedData.map((transaction, index) => <motion.tr key={transaction.id} initial={{
                opacity: 0,
                x: -20
              }} animate={{
                opacity: 1,
                x: 0
              }} transition={{
                delay: index * 0.05
              }} className="border-b transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>{transaction.categories?.name || "Sem categoria"}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === "Receita" ? "default" : "secondary"}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={transaction.type === "Receita" ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                        {transaction.type === "Receita" ? "+" : "-"}{formatCurrency(Number(transaction.amount))}
                      </TableCell>
                      <TableCell>
                        {transaction.payment_date ? formatDate(transaction.payment_date) : transaction.due_date ? formatDate(transaction.due_date) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </motion.tr>) : <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchTerm ? "Nenhuma transação encontrada para esta busca." : "Nenhuma transação encontrada"}
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
            <TablePagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} totalItems={pagination.totalItems} startIndex={pagination.startIndex} endIndex={pagination.endIndex} pageSize={pagination.pageSize} canGoNext={pagination.canGoNext} canGoPrevious={pagination.canGoPrevious} onPageChange={pagination.goToPage} onPageSizeChange={pagination.setPageSize} />
          </div>
        </Card>
      </motion.div>
    </div>;
}