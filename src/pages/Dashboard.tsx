import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTransactionStats } from "@/hooks/useTransactions";
import { useFilteredTransactions } from "@/hooks/useFilteredTransactions";
import { useCategoriesAndMinistries } from "@/hooks/useCategoriesAndMinistries";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [filters, setFilters] = useState({
    period: "mes-atual",
    ministryId: "todos",
    status: "todos-status"
  });

  const { data: transactions, isLoading: transactionsLoading } = useFilteredTransactions(filters);
  const { data: stats, isLoading: statsLoading } = useTransactionStats();
  const { data: categoriesAndMinistries } = useCategoriesAndMinistries();
  const ministries = categoriesAndMinistries?.ministries || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
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

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground mt-1">Visão geral das finanças da sua igreja</p>
      </div>

      {/* Cards de Destaque */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Contas a Pagar"
              value={formatCurrency(stats?.totalPayable || 0)}
              icon={DollarSign}
              variant="warning"
            />
            <StatsCard
              title="Contas Pagas"
              value={formatCurrency(stats?.totalPaid || 0)}
              icon={TrendingUp}
              variant="success"
            />
            <StatsCard
              title="Contas Vencidas"
              value={formatCurrency(stats?.totalOverdue || 0)}
              icon={TrendingDown}
              variant="destructive"
            />
            <StatsCard
              title="Saldo Total"
              value={formatCurrency(stats?.balance || 0)}
              icon={Wallet}
              variant="default"
            />
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <Select value={filters.period} onValueChange={(value) => setFilters({ ...filters, period: value })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes-atual">Mês Atual</SelectItem>
            <SelectItem value="trimestre">Último Trimestre</SelectItem>
            <SelectItem value="ano">Ano Atual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.ministryId} onValueChange={(value) => setFilters({ ...filters, ministryId: value })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ministério" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Ministérios</SelectItem>
            {ministries?.map((ministry) => (
              <SelectItem key={ministry.id} value={ministry.id}>
                {ministry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
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
      </div>

      {/* Tabela de Transações Recentes */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Transações Recentes</h2>
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
              {transactionsLoading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[70px]" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : transactions && transactions.length > 0 ? (
                transactions.slice(0, 10).map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{transaction.categories?.name || "Sem categoria"}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === "Receita" ? "default" : "secondary"}>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={transaction.type === "Receita" ? "text-success" : ""}>
                      {formatCurrency(Number(transaction.amount))}
                    </TableCell>
                    <TableCell>
                      {transaction.payment_date 
                        ? formatDate(transaction.payment_date)
                        : transaction.due_date 
                        ? formatDate(transaction.due_date)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
