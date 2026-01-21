import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, CreditCard, AlertTriangle, CheckCircle2, Clock, TrendingUp, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useInstallmentStats } from "@/hooks/useInstallmentStats";
import { InstallmentDetailSheet } from "./InstallmentDetailSheet";
import { InstallmentGroupDetail } from "./InstallmentGroupDetail";
import { InstallmentFilters, InstallmentFiltersState } from "./InstallmentFilters";
import { InstallmentStatusCard } from "./InstallmentStatusCard";
import { format, parseISO, addDays, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = {
  paid: "hsl(var(--chart-2))",
  pending: "hsl(var(--chart-4))",
  overdue: "hsl(var(--chart-1))",
};

interface DetailSheetState {
  open: boolean;
  type: "paid" | "pending" | "overdue" | "all";
  title: string;
}

interface GroupDetailState {
  open: boolean;
  groupId: string;
  description: string;
}

export function InstallmentsDashboard() {
  const { data: stats, isLoading } = useInstallmentStats();
  const [filters, setFilters] = useState<InstallmentFiltersState>({
    period: "all",
    status: "all",
  });
  const [detailSheet, setDetailSheet] = useState<DetailSheetState>({
    open: false,
    type: "all",
    title: "",
  });
  const [groupDetail, setGroupDetail] = useState<GroupDetailState>({
    open: false,
    groupId: "",
    description: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  // Filter installments based on filters
  const filteredInstallments = useMemo(() => {
    if (!stats) return [];
    
    let allInstallments = stats.upcomingInstallments;
    
    // Add paid/overdue to the list for filtering
    const today = new Date();
    
    return allInstallments.filter((installment) => {
      // Status filter
      if (filters.status !== "all") {
        const statusMap: Record<string, string> = {
          paid: "Pago",
          pending: "Pendente",
          overdue: "Vencido",
        };
        if (installment.status !== statusMap[filters.status]) return false;
      }
      
      // Period filter
      if (filters.period !== "all" && installment.due_date) {
        const dueDate = parseISO(installment.due_date);
        const periodDays = parseInt(filters.period);
        const periodEnd = addDays(today, periodDays);
        if (isAfter(dueDate, periodEnd)) return false;
      }
      
      return true;
    });
  }, [stats, filters]);

  // Get installments by status for detail sheets
  const getInstallmentsByStatus = (status: "paid" | "pending" | "overdue" | "all") => {
    if (!stats) return [];
    
    // We need to reconstruct from installmentGroups since upcomingInstallments is limited
    const allInstallments: Array<{
      id: string;
      description: string;
      amount: number;
      due_date: string;
      installment_number: number;
      total_installments: number;
      status: string;
    }> = [];

    // Use upcoming installments as base (they have the structure we need)
    stats.upcomingInstallments.forEach((inst) => {
      allInstallments.push(inst);
    });

    // For a complete list, we'd need to fetch from the hook
    // For now, filter what we have
    if (status === "all") return stats.upcomingInstallments;
    
    const statusMap: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      overdue: "Vencido",
    };
    
    return stats.upcomingInstallments.filter((i) => i.status === statusMap[status]);
  };

  const openDetailSheet = (type: "paid" | "pending" | "overdue" | "all") => {
    const titles: Record<string, string> = {
      paid: "Parcelas Pagas",
      pending: "Parcelas Pendentes",
      overdue: "Parcelas Vencidas",
      all: "Todas as Parcelas",
    };
    setDetailSheet({ open: true, type, title: titles[type] });
  };

  const openGroupDetail = (groupId: string, description: string) => {
    setGroupDetail({ open: true, groupId, description });
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalGroups === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Dashboard de Parcelas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma transação parcelada encontrada.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ao criar despesas parceladas, elas aparecerão aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: "Pagas", value: stats.paidVsPendingStats.paid, color: COLORS.paid },
    { name: "Pendentes", value: stats.paidVsPendingStats.pending, color: COLORS.pending },
    { name: "Vencidas", value: stats.paidVsPendingStats.overdue, color: COLORS.overdue },
  ].filter((d) => d.value > 0);

  const totalAmount = stats.totalPaidAmount + stats.totalPendingAmount + stats.totalOverdueAmount;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 space-y-4 sm:space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Dashboard de Parcelas
          </h2>
          <Badge variant="outline" className="text-sm w-fit">
            {stats.totalGroups} grupo{stats.totalGroups !== 1 ? "s" : ""} de parcelas
          </Badge>
        </div>

        {/* Filters */}
        <InstallmentFilters filters={filters} onFiltersChange={setFilters} />

        {/* Stats Cards - Responsive Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <InstallmentStatusCard
            title="Parcelas Pagas"
            amount={formatCurrency(stats.totalPaidAmount)}
            count={stats.paidVsPendingStats.paid}
            countLabel={stats.paidVsPendingStats.paid !== 1 ? "parcelas" : "parcela"}
            icon={CheckCircle2}
            borderColor="border-l-emerald-500"
            textColor="text-emerald-600"
            iconColor="text-emerald-500"
            onClick={() => openDetailSheet("paid")}
          />

          <InstallmentStatusCard
            title="Parcelas Pendentes"
            amount={formatCurrency(stats.totalPendingAmount)}
            count={stats.paidVsPendingStats.pending}
            countLabel={stats.paidVsPendingStats.pending !== 1 ? "parcelas" : "parcela"}
            icon={Clock}
            borderColor="border-l-amber-500"
            textColor="text-amber-600"
            iconColor="text-amber-500"
            onClick={() => openDetailSheet("pending")}
          />

          <InstallmentStatusCard
            title="Parcelas Vencidas"
            amount={formatCurrency(stats.totalOverdueAmount)}
            count={stats.paidVsPendingStats.overdue}
            countLabel={stats.paidVsPendingStats.overdue !== 1 ? "parcelas" : "parcela"}
            icon={AlertTriangle}
            borderColor="border-l-rose-500"
            textColor="text-rose-600"
            iconColor="text-rose-500"
            onClick={() => openDetailSheet("overdue")}
          />

          <InstallmentStatusCard
            title="Total Comprometido"
            amount={formatCurrency(totalAmount)}
            count={stats.totalGroups}
            countLabel={stats.totalGroups !== 1 ? "compras parceladas" : "compra parcelada"}
            icon={TrendingUp}
            borderColor="border-l-blue-500"
            textColor="text-foreground"
            iconColor="text-blue-500"
            onClick={() => openDetailSheet("all")}
          />
        </div>

        {/* Charts Row - Stack on mobile */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Pie Chart - Paid vs Pending */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">Status das Parcelas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ value }) => value}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend 
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value) => <span className="text-xs sm:text-sm">{value}</span>}
                  />
                  <Tooltip formatter={(value) => `${value} parcela(s)`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart - Monthly Projection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Projeção de Fluxo de Caixa (6 meses)</span>
                <span className="sm:hidden">Projeção 6 meses</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
                <BarChart data={stats.monthlyProjection}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("pt-BR", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(value)
                    }
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                    width={45}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar
                    dataKey="totalDue"
                    name="Parcelas a Vencer"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Installments */}
        {stats.upcomingInstallments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Próximas Parcelas (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {stats.upcomingInstallments.map((installment) => (
                  <motion.div
                    key={installment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 shrink-0">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{installment.description}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {installment.installment_number}/{installment.total_installments}
                          </Badge>
                          <span className="hidden sm:inline">•</span>
                          <span>{formatDate(installment.due_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right sm:text-left flex items-center justify-between sm:justify-end gap-2">
                      <p className="font-semibold text-rose-600">
                        {formatCurrency(installment.amount)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Installment Groups */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Compras Parceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {stats.installmentGroups.slice(0, 5).map((group) => {
                const progress =
                  ((group.paid_installments) /
                    group.total_installments) *
                  100;

                return (
                  <motion.div
                    key={group.installment_group_id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openGroupDetail(group.installment_group_id, group.description)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm sm:text-base truncate">{group.description}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Total: {formatCurrency(group.total_amount)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {group.overdue_installments > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {group.overdue_installments} vencida{group.overdue_installments !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {group.paid_installments}/{group.total_installments}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {group.first_due_date && formatDate(group.first_due_date)}
                        </span>
                        <span>
                          {group.last_due_date && formatDate(group.last_due_date)}
                        </span>
                      </div>
                    </div>
                    {group.next_due_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Próxima: {formatDate(group.next_due_date)}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Sheets */}
      <InstallmentDetailSheet
        open={detailSheet.open}
        onOpenChange={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
        title={detailSheet.title}
        type={detailSheet.type}
        installments={getInstallmentsByStatus(detailSheet.type)}
        totalAmount={
          detailSheet.type === "paid"
            ? stats?.totalPaidAmount || 0
            : detailSheet.type === "pending"
            ? stats?.totalPendingAmount || 0
            : detailSheet.type === "overdue"
            ? stats?.totalOverdueAmount || 0
            : (stats?.totalPaidAmount || 0) + (stats?.totalPendingAmount || 0) + (stats?.totalOverdueAmount || 0)
        }
      />

      <InstallmentGroupDetail
        open={groupDetail.open}
        onOpenChange={(open) => setGroupDetail((prev) => ({ ...prev, open }))}
        groupId={groupDetail.groupId}
        description={groupDetail.description}
      />
    </>
  );
}
